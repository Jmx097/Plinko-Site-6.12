import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { hasCrmRecordHandle, crmRecordHandle, requireCrmConfiguration, crmWorkspaceAction } from './crm-api.mjs';
import { getPlinkoCoreConfig } from './plinko-core-config.mjs';
import { COPILOT_ACTION_RISKS, COPILOT_LIMITS, COPILOT_POLICY_VERSION, requireCopilotTool } from './copilot-policy-core.mjs';
import { buildBlockedStateExplanation, buildNextActionPlan, normalizeCopilotCommand, toCopilotAccount, toCopilotAccountDetail } from './copilot-bff-core.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const coreHeaders = (config) => ({ apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, 'Content-Type': 'application/json' });
const safeText = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;

async function coreRequest(path, options = {}, environment = process.env, fetchImpl = fetch) {
  const config = getPlinkoCoreConfig(environment);
  const response = await fetchImpl(`${config.url}/rest/v1/${path}`, { cache: 'no-store', ...options, headers: { ...coreHeaders(config), ...(options.headers || {}) } });
  if (!response.ok) throw new Error('Copilot persistence unavailable');
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

export async function resolveCopilotTenant(userId, environment = process.env, fetchImpl = fetch) {
  if (typeof userId !== 'string' || !userId.trim()) throw new Error('Copilot tenant unavailable');
  const memberships = await coreRequest(`copilot_tenant_memberships?user_id=eq.${encodeURIComponent(userId)}&active=eq.true&revoked_at=is.null&select=tenant_id,copilot_tenants(id,tenant_key)&limit=2`, {}, environment, fetchImpl);
  if (!Array.isArray(memberships) || memberships.length !== 1 || !memberships[0]?.copilot_tenants?.tenant_key) throw new Error('Copilot tenant unavailable');
  return { tenantId: memberships[0].tenant_id, tenantKey: memberships[0].copilot_tenants.tenant_key };
}

export async function appendCopilotAuditEvent(event, environment = process.env, fetchImpl = fetch) {
  await coreRequest('copilot_audit_events', { method: 'POST', body: JSON.stringify(event), headers: { Prefer: 'return=minimal' } }, environment, fetchImpl);
}

async function enforceReadRate({ tenantId, userId }, environment = process.env, fetchImpl = fetch, now = new Date()) {
  const minuteAgo = new Date(now.getTime() - 60_000).toISOString();
  const events = await coreRequest(`copilot_audit_events?tenant_id=eq.${encodeURIComponent(tenantId)}&actor_user_id=eq.${encodeURIComponent(userId)}&event_kind=eq.action_terminal&created_at=gte.${encodeURIComponent(minuteAgo)}&select=id&limit=${COPILOT_LIMITS.maxReadToolCallsPerActorOrganizationPerMinute}`, {}, environment, fetchImpl);
  if (!Array.isArray(events) || events.length >= COPILOT_LIMITS.maxReadToolCallsPerActorOrganizationPerMinute) throw new Error('Copilot read limit reached');
}

function accountHandle(id, crmConfig) { return crmRecordHandle('account', id, crmConfig); }
async function accountDirectory(actorEmail, crmConfig, query = '', limit = 25) {
  const result = await crmWorkspaceAction('list_accounts', { q: query || undefined, limit }, actorEmail);
  return (result.accounts || []).filter((account) => account?.id).map((account) => ({ raw: account, public: toCopilotAccount(account, (id) => accountHandle(id, crmConfig)) }));
}
async function resolveAccount(accountKey, actorEmail, crmConfig) {
  const accounts = await accountDirectory(actorEmail, crmConfig, '', 50);
  const match = accounts.find(({ raw }) => hasCrmRecordHandle('account', raw.id, accountKey, crmConfig));
  if (!match) throw new Error('Copilot account selection is unavailable');
  return match.raw;
}
async function accountDetail(accountKey, actorEmail, crmConfig) {
  const account = await resolveAccount(accountKey, actorEmail, crmConfig);
  const fetchedAt = new Date().toISOString();
  const workspace = await crmWorkspaceAction('account_workspace', { account_id: account.id }, actorEmail);
  return toCopilotAccountDetail(workspace, accountKey, fetchedAt);
}
async function taskDirectory(actorEmail, crmConfig, query) {
  const normalizedQuery = query.toLowerCase();
  const accounts = await accountDirectory(actorEmail, crmConfig, '', 25);
  const tasks = [];
  for (const { raw, public: account } of accounts) {
    if (tasks.length >= 25) break;
    const workspace = await crmWorkspaceAction('account_workspace', { account_id: raw.id }, actorEmail);
    for (const task of workspace.tasks || []) {
      const haystack = [task.title, account.name, task.owner, task.created_by].filter(Boolean).join(' ').toLowerCase();
      if (normalizedQuery && !haystack.includes(normalizedQuery)) continue;
      tasks.push({ accountKey: account.accountKey, accountName: account.name, title: safeText(task.title) || 'Untitled task', status: task.status || null, dueAt: task.due_at || null, owner: safeText(task.owner || task.created_by) });
      if (tasks.length >= 25) break;
    }
  }
  return { tasks, fetchedAt: new Date().toISOString(), policyVersion: COPILOT_POLICY_VERSION };
}

async function executeTool(command, actorEmail, crmConfig) {
  const tool = requireCopilotTool(command.tool);
  if (tool.risk !== COPILOT_ACTION_RISKS.read && tool.risk !== COPILOT_ACTION_RISKS.plan) throw new Error('Unsupported Copilot risk');
  if (command.tool === 'my_work') {
    const accounts = await accountDirectory(actorEmail, crmConfig, '', 50);
    return { accounts: accounts.map((item) => item.public), fetchedAt: new Date().toISOString(), policyVersion: COPILOT_POLICY_VERSION };
  }
  if (command.tool === 'account_search') {
    const accounts = await accountDirectory(actorEmail, crmConfig, command.query, 25);
    return { accounts: accounts.map((item) => item.public), fetchedAt: new Date().toISOString(), policyVersion: COPILOT_POLICY_VERSION };
  }
  if (command.tool === 'tasks') return taskDirectory(actorEmail, crmConfig, command.query);
  const detail = await accountDetail(command.accountKey, actorEmail, crmConfig);
  if (command.tool === 'account_detail') return detail;
  if (command.tool === 'blocked_state_explanation') return buildBlockedStateExplanation(detail);
  return buildNextActionPlan(detail);
}

export async function executeCopilotReadInternal({ actorEmail, command }, environment = process.env) {
  const normalized = normalizeCopilotCommand(command);
  const result = await executeTool(normalized, actorEmail, requireCrmConfiguration(environment));
  return { tool: normalized.tool, result, requestCorrelationId: randomUUID(), policyVersion: COPILOT_POLICY_VERSION, persistence: 'transitional_internal' };
}

export async function executeCopilotRead({ userId, actorEmail, tenant, command }, environment = process.env, fetchImpl = fetch) {
  const normalized = normalizeCopilotCommand(command);
  const requestCorrelationId = randomUUID();
  const inputFingerprint = hash(JSON.stringify(normalized));
  const eventBase = { tenant_id: tenant.tenantId, actor_user_id: userId, request_correlation_id: requestCorrelationId, policy_version: COPILOT_POLICY_VERSION, input_fingerprint: inputFingerprint };
  try {
    await enforceReadRate({ tenantId: tenant.tenantId, userId }, environment, fetchImpl);
  } catch (error) {
    await appendCopilotAuditEvent({ ...eventBase, event_kind: 'request_denied', outcome: 'denied', denial_reason: 'Copilot request denied' }, environment, fetchImpl);
    throw error;
  }
  await appendCopilotAuditEvent({ ...eventBase, event_kind: 'request_accepted', outcome: 'accepted' }, environment, fetchImpl);
  try {
    const result = await executeTool(normalized, actorEmail, requireCrmConfiguration(environment));
    const recordCount = Array.isArray(result.accounts) ? result.accounts.length : Array.isArray(result.tasks) ? result.tasks.length : 1;
    await appendCopilotAuditEvent({ ...eventBase, event_kind: 'action_terminal', outcome: 'succeeded', record_count: recordCount }, environment, fetchImpl);
    return { tool: normalized.tool, result, requestCorrelationId, policyVersion: COPILOT_POLICY_VERSION };
  } catch (error) {
    await appendCopilotAuditEvent({ ...eventBase, event_kind: 'action_terminal', outcome: 'failed' }, environment, fetchImpl);
    throw error;
  }
}

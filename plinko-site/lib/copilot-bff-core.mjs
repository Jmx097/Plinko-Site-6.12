import { COPILOT_POLICY_VERSION, requireCopilotTool } from './copilot-policy-core.mjs';

const HANDLE_PATTERN = /^account_[A-Za-z0-9_-]{43}$/;
const queryValue = (value) => typeof value === 'string' ? value.trim() : '';
const safe = (value, fallback = null) => queryValue(value) || fallback;
const hasOnlyCommandKeys = (value, allowed) => Object.keys(value).every((key) => allowed.includes(key));

export function normalizeCopilotCommand(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('Invalid Copilot request');
  const tool = value.tool;
  requireCopilotTool(tool);
  if (tool === 'my_work') {
    if (!hasOnlyCommandKeys(value, ['tool'])) throw new Error('Invalid Copilot request');
    return { tool };
  }
  if (tool === 'account_search' || tool === 'tasks') {
    if (!hasOnlyCommandKeys(value, ['tool', 'query'])) throw new Error('Invalid Copilot request');
    const query = queryValue(value.query);
    if (query.length > 240) throw new Error('Invalid Copilot query');
    return { tool, query };
  }
  if (!hasOnlyCommandKeys(value, ['tool', 'accountKey'])) throw new Error('Invalid Copilot request');
  const accountKey = value.accountKey;
  if (typeof accountKey !== 'string' || !HANDLE_PATTERN.test(accountKey)) throw new Error('Invalid account handle');
  return { tool, accountKey };
}

export function toCopilotAccount(account, accountHandle) {
  return {
    accountKey: accountHandle(account.id),
    name: safe(account.display_name || account.displayName, 'Unnamed account'),
    status: account.status || account.account_approval || 'Needs review',
    nextAction: safe(account.next_action?.label || account.nextAction, 'Open account'),
    updatedAt: account.updated_at || account.updatedAt || account.created_at || null,
  };
}

export function toCopilotAccountDetail(workspace, accountKey, fetchedAt) {
  const account = workspace?.account || {};
  return {
    accountKey,
    name: safe(account.display_name || account.displayName, 'Unnamed account'),
    status: account.status || account.account_approval || 'Needs review',
    nextAction: workspace?.next_action ? {
      label: safe(workspace.next_action.label, 'No next action recorded'),
      owner: safe(workspace.next_action.owner),
      dueAt: workspace.next_action.due_at || null,
    } : null,
    contacts: (workspace?.contacts || []).slice(0, 25).map((contact) => ({
      name: safe(contact.full_name, 'Unnamed person'),
      title: safe(contact.title),
      status: contact.disposition || contact.contact_approval || 'Needs review',
    })),
    tasks: (workspace?.tasks || []).slice(0, 25).map((task) => ({
      title: safe(task.title, 'Untitled task'),
      status: task.status || null,
      dueAt: task.due_at || null,
      owner: safe(task.owner || task.created_by),
    })),
    fetchedAt,
    policyVersion: COPILOT_POLICY_VERSION,
  };
}

export function buildBlockedStateExplanation(detail) {
  const status = String(detail.status || '').toLowerCase();
  const explanation = status.includes('approved') || status === 'active'
    ? 'The account is not blocked at account review. Contact, draft, attempt, and suppression controls remain independently enforced.'
    : status.includes('reject') || status.includes('invalid') || status.includes('do_not_contact')
      ? 'This account has a restrictive lifecycle state. A human must review the authoritative CRM record; Copilot cannot change it.'
      : 'Account review is pending. A designated human must record the next lifecycle decision before contact work can proceed.';
  return { accountKey: detail.accountKey, status: detail.status, explanation, owner: detail.nextAction?.owner || null, fetchedAt: detail.fetchedAt, policyVersion: COPILOT_POLICY_VERSION };
}

export function buildNextActionPlan(detail) {
  const actions = [];
  if (detail.nextAction?.label) actions.push({ step: 1, action: detail.nextAction.label, owner: detail.nextAction.owner || 'Unassigned', dueAt: detail.nextAction.dueAt || null });
  for (const task of detail.tasks.filter((task) => task.status === 'open').slice(0, 5)) actions.push({ step: actions.length + 1, action: task.title, owner: task.owner || 'Unassigned', dueAt: task.dueAt || null });
  if (!actions.length) actions.push({ step: 1, action: 'Review the current CRM account state with the designated owner.', owner: 'Unassigned', dueAt: null });
  return {
    proposal: true,
    accountKey: detail.accountKey,
    actions,
    sources: [{ accountKey: detail.accountKey, fetchedAt: detail.fetchedAt }],
    unauthorized: 'This proposal does not approve lifecycle gates, create tasks or notes, contact people, send outreach, or change CRM records.',
    policyVersion: COPILOT_POLICY_VERSION,
    fetchedAt: detail.fetchedAt,
  };
}

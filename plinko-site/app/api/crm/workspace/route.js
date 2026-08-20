import { auth, currentUser } from '@clerk/nextjs/server';
import {
  CrmIntegrationError,
  crmRecordHandle,
  crmWorkspaceAction,
  hasCrmRecordHandle,
  requireCrmConfiguration,
} from '../../../../lib/crm-api.mjs';
import { requireCrmWorkspaceAccess } from '../../../../lib/crm-equal-admin.mjs';

const MAX_DIRECTORY_PAGES = 20;
const MAX_DIRECTORY_RECORDS = 1000;
const HOME_ACCOUNT_DETAIL_LIMIT = 8;
const HANDLE_KINDS = ['account', 'campaign', 'contact', 'membership', 'draft', 'attempt', 'task', 'email', 'template'];
const HANDLE_PATTERN = new RegExp(`^(?:${HANDLE_KINDS.join('|')})_[A-Za-z0-9_-]{43}$`);
const CHANNELS = new Set(['email', 'call', 'linkedin']);
// The CRM lifecycle uses past-tense decision values. UI labels deliberately
// remain imperative ("Approve" / "Reject") so this is a transport concern.
const DECISIONS = new Set(['approved', 'rejected']);
const DISPOSITIONS = new Set(['active', 'invalid', 'do_not_contact']);

const safe = (value, fallback = null) => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const accountName = (account) => safe(account?.display_name || account?.displayName, 'Unnamed account');
const handle = (kind, id, config) => crmRecordHandle(kind, id, config);

async function actor() {
  const { userId } = await auth();
  if (!userId) return null;
  try {
    return await requireCrmWorkspaceAccess(await currentUser(), userId);
  } catch {
    return null;
  }
}

function invalid(message = 'Invalid CRM command') {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function stringField(value, field, { required = false, max = 500 } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw invalid(`${field} is required`);
    return null;
  }
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw invalid(`Invalid ${field}`);
  return value.trim();
}

function requiredHandle(payload, field, kind) {
  const value = payload[field];
  if (typeof value !== 'string' || !HANDLE_PATTERN.test(value) || !value.startsWith(`${kind}_`)) {
    throw invalid(`Invalid ${field}`);
  }
  return value;
}

function optionalIsoDate(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw invalid('Invalid due date');
  }
  return value;
}

function enumField(value, allowed, field) {
  if (typeof value !== 'string' || !allowed.has(value)) throw invalid(`Invalid ${field}`);
  return value;
}

function commandPayload(action, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw invalid();
  switch (action) {
    case 'create_account': return { displayName: stringField(payload.displayName, 'account name', { required: true, max: 240 }), reference: stringField(payload.reference, 'reference', { max: 1000 }) };
    case 'account_workspace': return { accountKey: requiredHandle(payload, 'accountKey', 'account') };
    case 'campaign_workspace': return { campaignKey: requiredHandle(payload, 'campaignKey', 'campaign') };
    case 'contact_workspace': return { contactKey: requiredHandle(payload, 'contactKey', 'contact') };
    case 'task_workspace': return { taskKey: requiredHandle(payload, 'taskKey', 'task') };
    case 'email_workspace': return { emailKey: requiredHandle(payload, 'emailKey', 'email') };
    case 'template_workspace': return { templateKey: requiredHandle(payload, 'templateKey', 'template') };
    case 'create_note': return { accountKey: requiredHandle(payload, 'accountKey', 'account'), note: stringField(payload.note, 'note', { required: true, max: 4000 }) };
    case 'create_task': return { accountKey: requiredHandle(payload, 'accountKey', 'account'), title: stringField(payload.title, 'title', { required: true, max: 240 }), dueAt: optionalIsoDate(payload.dueAt) };
    case 'complete_task': return { accountKey: requiredHandle(payload, 'accountKey', 'account'), taskKey: requiredHandle(payload, 'taskKey', 'task') };
    case 'create_contact': return { accountKey: requiredHandle(payload, 'accountKey', 'account'), fullName: stringField(payload.fullName, 'name', { required: true, max: 240 }), title: stringField(payload.title, 'title', { max: 240 }), email: stringField(payload.email, 'email', { max: 320 }) };
    case 'account_approval': return { accountKey: requiredHandle(payload, 'accountKey', 'account'), decision: enumField(payload.decision, DECISIONS, 'decision') };
    case 'contact_disposition': return { accountKey: requiredHandle(payload, 'accountKey', 'account'), contactKey: requiredHandle(payload, 'contactKey', 'contact'), disposition: enumField(payload.disposition, DISPOSITIONS, 'disposition') };
    case 'contact_approval': return { accountKey: requiredHandle(payload, 'accountKey', 'account'), contactKey: requiredHandle(payload, 'contactKey', 'contact'), decision: enumField(payload.decision, DECISIONS, 'decision') };
    case 'create_campaign': return { name: stringField(payload.name, 'name', { required: true, max: 240 }), channel: enumField(payload.channel, CHANNELS, 'channel'), purpose: stringField(payload.purpose, 'purpose', { max: 1000 }) };
    case 'add_campaign_member': return { accountKey: requiredHandle(payload, 'accountKey', 'account'), campaignKey: requiredHandle(payload, 'campaignKey', 'campaign'), contactKey: requiredHandle(payload, 'contactKey', 'contact') };
    case 'create_draft': return { campaignKey: requiredHandle(payload, 'campaignKey', 'campaign'), membershipKey: requiredHandle(payload, 'membershipKey', 'membership'), body: stringField(payload.body, 'body', { required: true, max: 12000 }) };
    case 'draft_approval': return { campaignKey: requiredHandle(payload, 'campaignKey', 'campaign'), draftKey: requiredHandle(payload, 'draftKey', 'draft'), decision: enumField(payload.decision, DECISIONS, 'decision') };
    case 'create_attempt': return { campaignKey: requiredHandle(payload, 'campaignKey', 'campaign'), membershipKey: requiredHandle(payload, 'membershipKey', 'membership'), draftKey: requiredHandle(payload, 'draftKey', 'draft') };
    case 'attempt_approval': return { campaignKey: requiredHandle(payload, 'campaignKey', 'campaign'), attemptKey: requiredHandle(payload, 'attemptKey', 'attempt'), decision: enumField(payload.decision, DECISIONS, 'decision') };
    case 'manual_execution': return { campaignKey: requiredHandle(payload, 'campaignKey', 'campaign'), attemptKey: requiredHandle(payload, 'attemptKey', 'attempt'), outcomeNote: stringField(payload.outcomeNote, 'outcome note', { required: true, max: 4000 }) };
    default: throw invalid('Unsupported CRM action');
  }
}

async function scanDirectory(action, actorEmail, collection, predicate) {
  let cursor;
  let records = 0;
  const seenCursors = new Set();
  for (let pageNumber = 0; pageNumber < MAX_DIRECTORY_PAGES; pageNumber += 1) {
    if (cursor && seenCursors.has(cursor)) throw new CrmIntegrationError('Directory scan failed');
    if (cursor) seenCursors.add(cursor);
    const page = await crmWorkspaceAction(action, { cursor, limit: 50 }, actorEmail);
    const items = Array.isArray(page[collection]) ? page[collection] : [];
    records += items.length;
    const found = items.find(predicate);
    if (found) return found;
    if (records >= MAX_DIRECTORY_RECORDS || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  throw invalid('Selection is no longer available');
}

async function collectDirectory(action, actorEmail, collection) {
  let cursor;
  let records = 0;
  const results = [];
  const seenCursors = new Set();
  for (let pageNumber = 0; pageNumber < MAX_DIRECTORY_PAGES; pageNumber += 1) {
    if (cursor && seenCursors.has(cursor)) throw new CrmIntegrationError('Directory scan failed');
    if (cursor) seenCursors.add(cursor);
    const page = await crmWorkspaceAction(action, { cursor, limit: 50 }, actorEmail);
    const items = Array.isArray(page[collection]) ? page[collection] : [];
    results.push(...items);
    records += items.length;
    if (records >= MAX_DIRECTORY_RECORDS || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return results;
}

async function resolveAccount(accountKey, actorEmail, config) {
  return scanDirectory('list_accounts', actorEmail, 'accounts', (item) => item.id && hasCrmRecordHandle('account', item.id, accountKey, config));
}

async function resolveCampaign(campaignKey, actorEmail, config) {
  return scanDirectory('list_campaigns', actorEmail, 'campaigns', (item) => item.id && hasCrmRecordHandle('campaign', item.id, campaignKey, config));
}

function publicPerson(contact, config) {
  return {
    key: handle('contact', contact.id || contact.contact_id, config),
    name: safe(contact.full_name, 'Unnamed person'),
    title: safe(contact.title),
    email: safe(contact.email),
    status: contact.disposition || contact.contact_approval || 'Needs review',
    approval: contact.contact_approval || null,
    disposition: contact.disposition || null,
  };
}

function publicAccount(account, config) {
  return {
    key: handle('account', account.id, config),
    name: accountName(account),
    status: account.status || account.account_approval || 'Needs review',
    source: safe(account.source, 'Source not recorded'),
    qualification: account.account_approval || account.status || null,
    nextAction: account.next_action?.label || account.nextAction || 'Open account',
    updatedAt: account.updated_at || account.updatedAt || account.created_at || null,
  };
}

function accountWorkspace(workspace, accountId, config) {
  return {
    account: { key: handle('account', accountId, config), name: accountName(workspace.account), status: workspace.account?.status || workspace.account?.account_approval || 'Needs review', updatedAt: workspace.account?.updated_at || null },
    nextAction: workspace.next_action ? { kind: workspace.next_action.kind || 'none', label: safe(workspace.next_action.label), owner: safe(workspace.next_action.owner), dueAt: workspace.next_action.due_at || null } : null,
    contacts: (workspace.contacts || []).map((contact) => publicPerson(contact, config)),
    tasks: (workspace.tasks || []).map((task) => ({ key: handle('task', `${accountId}:${task.id}`, config), title: safe(task.title, 'Untitled task'), status: task.status || null, dueAt: task.due_at || null, owner: safe(task.owner || task.created_by) })),
    activities: (workspace.activities || []).map((activity) => ({ type: safe(activity.event_type, 'CRM update'), body: safe(activity.body), actor: safe(activity.actor), occurredAt: activity.occurred_at || null })),
    // Never return external_reference or any raw provider ID to the browser.
    recordDetails: { source: safe(workspace.account?.source), reviewStatus: safe(workspace.account?.account_approval) },
  };
}

function publicTask(task, account, config) {
  return {
    key: handle('task', `${account.id}:${task.id}`, config),
    accountKey: handle('account', account.id, config),
    accountName: accountName(account),
    title: safe(task.title, 'Untitled task'),
    status: task.status || null,
    dueAt: task.due_at || null,
    owner: safe(task.owner || task.created_by),
  };
}

async function taskDirectory(actorEmail, config, query = '') {
  const accounts = await collectDirectory('list_accounts', actorEmail, 'accounts');
  const normalizedQuery = query.trim().toLowerCase();
  const taskGroups = await Promise.all(accounts.filter((account) => account.id).map(async (account) => ({
    account,
    workspace: await crmWorkspaceAction('account_workspace', { account_id: account.id }, actorEmail),
  })));
  return taskGroups.flatMap(({ account, workspace }) => (workspace.tasks || []).filter((task) => task.id).map((task) => publicTask(task, account, config)))
    .filter((task) => !normalizedQuery || [task.title, task.accountName, task.owner].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery));
}

async function taskWorkspace(taskKey, actorEmail, config) {
  const accounts = await collectDirectory('list_accounts', actorEmail, 'accounts');
  for (const account of accounts) {
    if (!account.id) continue;
    const workspace = await crmWorkspaceAction('account_workspace', { account_id: account.id }, actorEmail);
    const task = (workspace.tasks || []).find((item) => item.id && hasCrmRecordHandle('task', `${account.id}:${item.id}`, taskKey, config));
    if (task) {
      const detail = accountWorkspace(workspace, account.id, config);
      return { task: publicTask(task, account, config), account: detail.account, activities: detail.activities };
    }
  }
  throw invalid('Selection is no longer available');
}

async function contactDirectory(actorEmail, config, query = '') {
  const accounts = await collectDirectory('list_accounts', actorEmail, 'accounts');
  const workspaces = await Promise.all(accounts.filter((account) => account.id).map(async (account) => ({
    account,
    workspace: await crmWorkspaceAction('account_workspace', { account_id: account.id }, actorEmail),
  })));
  const normalizedQuery = query.trim().toLowerCase();
  const contacts = workspaces.flatMap(({ account, workspace }) => (workspace.contacts || []).filter((contact) => contact.id).map((contact) => ({
    ...publicPerson(contact, config),
    accountKey: handle('account', account.id, config),
    accountName: accountName(account),
    updatedAt: contact.updated_at || contact.created_at || account.updated_at || null,
  }))).filter((contact) => !normalizedQuery || [contact.name, contact.title, contact.accountName].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery));
  return { contacts, workspaces };
}

async function contactWorkspace(contactKey, actorEmail, config) {
  const directory = await contactDirectory(actorEmail, config);
  const owner = directory.workspaces.find(({ workspace }) => (workspace.contacts || []).some((contact) => contact.id && hasCrmRecordHandle('contact', contact.id, contactKey, config)));
  if (!owner) throw invalid('Selection is no longer available');
  const rawContact = owner.workspace.contacts.find((contact) => contact.id && hasCrmRecordHandle('contact', contact.id, contactKey, config));
  const campaigns = await collectDirectory('list_campaigns', actorEmail, 'campaigns');
  const membershipResults = await Promise.all(campaigns.filter((campaign) => campaign.id && ['approved', 'active'].includes(campaign.status)).map(async (campaign) => ({
    campaign,
    workspace: await crmWorkspaceAction('campaign_workspace', { campaign_id: campaign.id }, actorEmail),
  })));
  const memberships = membershipResults.flatMap(({ campaign, workspace }) => (workspace.members || [])
    .filter((member) => member.contact_id && rawContact.id === member.contact_id)
    .map((member) => ({ key: handle('membership', member.membership_id, config), campaignKey: handle('campaign', campaign.id, config), campaignName: safe(campaign.name, 'Untitled campaign'), campaignStatus: campaign.status || null, status: member.membership_status || null, latestDraftApproval: member.drafts?.at(-1)?.approval || null })));
  return {
    contact: publicPerson(rawContact, config),
    account: { key: handle('account', owner.account.id, config), name: accountName(owner.account), status: owner.workspace.account?.status || owner.workspace.account?.account_approval || 'Needs review', approval: owner.workspace.account?.account_approval || null },
    activities: (owner.workspace.activities || []).map((activity) => ({ type: safe(activity.event_type, 'CRM update'), body: safe(activity.body), actor: safe(activity.actor), occurredAt: activity.occurred_at || null })),
    memberships,
  };
}

function campaignWorkspace(workspace, config) {
  return {
    campaign: { key: handle('campaign', workspace.campaign.id, config), name: safe(workspace.campaign.name, 'Untitled campaign'), channel: workspace.campaign.channel || null, purpose: safe(workspace.campaign.purpose), status: workspace.campaign.status || null },
    members: (workspace.members || []).map((member) => ({
      key: handle('membership', member.membership_id, config),
      person: publicPerson({ ...member, id: member.contact_id }, config),
      accountKey: member.account_id ? handle('account', member.account_id, config) : null,
      accountName: safe(member.account_display_name, 'Unnamed account'),
      status: member.membership_status || null,
      drafts: (member.drafts || []).map((draft) => ({
        key: handle('draft', draft.id, config), revision: draft.revision || null, approval: draft.approval || null,
        content: { body: safe(draft.content?.body, '') }, createdAt: draft.created_at || null,
      })),
      attempts: (member.attempts || []).map((attempt) => ({ key: handle('attempt', attempt.id, config), draftKey: handle('draft', attempt.draft_id, config), approval: attempt.approval || null, status: attempt.status || null, outcomeNote: safe(attempt.outcome_note), executedAt: attempt.executed_at || null })),
    })),
    activities: (workspace.activity || []).map((activity) => ({ type: safe(activity.event_type, 'CRM update'), actor: safe(activity.actor), occurredAt: activity.occurred_at || null })),
  };
}

function assertNotSuppressed(member) {
  if (member?.disposition === 'do_not_contact' || member?.contact_disposition === 'do_not_contact') throw invalid('Do not contact is terminal');
}

function publicEmailRow(row, config) {
  return {
    key: handle('email', row.identity, config),
    campaignKey: handle('campaign', row.campaignId, config),
    contactKey: row.contactId ? handle('contact', row.contactId, config) : null,
    campaignName: row.campaignName,
    accountName: row.accountName,
    recipientName: row.recipientName,
    recipientEmail: row.recipientEmail,
    revision: row.revision,
    approval: row.approval,
    body: row.body,
    createdAt: row.createdAt,
  };
}

function publicTemplateRow(row, config) {
  return {
    ...publicEmailRow(row, config),
    key: handle('template', row.identity, config),
    name: `${row.campaignName} · revision ${row.revision || '—'}`,
  };
}

async function emailDraftRows(actorEmail) {
  const campaigns = await collectDirectory('list_campaigns', actorEmail, 'campaigns');
  const emailCampaigns = campaigns.filter((campaign) => campaign.id && campaign.channel === 'email');
  const workspaces = await Promise.all(emailCampaigns.map(async (campaign) => ({ campaign, workspace: await crmWorkspaceAction('campaign_workspace', { campaign_id: campaign.id }, actorEmail) })));
  return workspaces.flatMap(({ campaign, workspace }) => (workspace.members || []).flatMap((member) => (member.drafts || []).filter((draft) => draft.id && member.membership_id).map((draft) => ({
    identity: `${campaign.id}:${member.membership_id}:${draft.id}`,
    campaignId: campaign.id,
    contactId: member.contact_id || null,
    campaignName: safe(campaign.name, 'Untitled campaign'),
    accountName: safe(member.account_display_name, 'Unnamed account'),
    recipientName: safe(member.full_name, 'Unnamed person'),
    recipientEmail: safe(member.email),
    revision: draft.revision || null,
    approval: draft.approval || null,
    body: safe(draft.content?.body, ''),
    createdAt: draft.created_at || null,
  }))));
}

async function emailDirectory(actorEmail, config, query = '') {
  const normalizedQuery = query.trim().toLowerCase();
  const rows = await emailDraftRows(actorEmail);
  return rows.filter((row) => !normalizedQuery || [row.campaignName, row.accountName, row.recipientName, row.recipientEmail, row.body].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery)).map((row) => publicEmailRow(row, config));
}

async function templateDirectory(actorEmail, config, query = '') {
  const normalizedQuery = query.trim().toLowerCase();
  const rows = await emailDraftRows(actorEmail);
  return rows.filter((row) => !normalizedQuery || [row.campaignName, row.recipientName, row.body].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery)).map((row) => publicTemplateRow(row, config));
}

async function emailWorkspace(emailKey, actorEmail, config) {
  const row = (await emailDraftRows(actorEmail)).find((item) => hasCrmRecordHandle('email', item.identity, emailKey, config));
  if (!row) throw invalid('Selection is no longer available');
  return { email: publicEmailRow(row, config) };
}

async function templateWorkspace(templateKey, actorEmail, config) {
  const row = (await emailDraftRows(actorEmail)).find((item) => hasCrmRecordHandle('template', item.identity, templateKey, config));
  if (!row) throw invalid('Selection is no longer available');
  return { template: publicTemplateRow(row, config) };
}

function errorStatus(error) {
  if (error?.status === 400 || error?.status === 404 || error?.status === 409) return error.status;
  return 502;
}

async function homeDashboard(actorEmail, config) {
  const [accountDirectory, campaignDirectory] = await Promise.all([
    crmWorkspaceAction('list_accounts', { limit: 50 }, actorEmail),
    crmWorkspaceAction('list_campaigns', { limit: 50 }, actorEmail),
  ]);
  const accountRows = (accountDirectory.accounts || []).filter((account) => account.id);
  const recentAccounts = [...accountRows].sort((left, right) => String(right.updated_at || right.updatedAt || right.created_at || '').localeCompare(String(left.updated_at || left.updatedAt || left.created_at || ''))).slice(0, HOME_ACCOUNT_DETAIL_LIMIT);
  const workspaces = await Promise.all(recentAccounts.map(async (account) => ({ account, workspace: await crmWorkspaceAction('account_workspace', { account_id: account.id }, actorEmail) })));
  const activity = workspaces.flatMap(({ account, workspace }) => (workspace.activities || []).map((item) => ({ accountKey: handle('account', account.id, config), accountName: accountName(account), type: safe(item.event_type, 'CRM update'), occurredAt: item.occurred_at || null }))).sort((left, right) => String(right.occurredAt || '').localeCompare(String(left.occurredAt || ''))).slice(0, 8);
  const tasks = workspaces.flatMap(({ account, workspace }) => (workspace.tasks || []).filter((task) => task.status === 'open').map((task) => ({ accountKey: handle('account', account.id, config), accountName: accountName(account), title: safe(task.title, 'Untitled task'), dueAt: task.due_at || null, owner: safe(task.owner || task.created_by) }))).sort((left, right) => String(left.dueAt || '9999-12-31').localeCompare(String(right.dueAt || '9999-12-31'))).slice(0, 8);
  const campaigns = (campaignDirectory.campaigns || []).map((campaign) => ({ key: handle('campaign', campaign.id, config), name: safe(campaign.name, 'Untitled campaign'), status: campaign.status || null, members: Number.isSafeInteger(campaign.member_count) ? campaign.member_count : 0, updatedAt: campaign.updated_at || null }));
  return { accounts: accountRows.map((account) => publicAccount(account, config)), activity, tasks, campaigns, fetchedAt: new Date().toISOString() };
}

export async function GET(request) {
  const actorEmail = await actor();
  if (!actorEmail) return Response.json({ error: 'Staff access required' }, { status: 403 });
  try {
    const url = new URL(request.url);
    const directory = url.searchParams.get('directory');
    if (directory === 'home') return Response.json(await homeDashboard(actorEmail, requireCrmConfiguration()), { headers: { 'cache-control': 'no-store' } });
    if (directory === 'contacts') {
      const query = stringField(url.searchParams.get('q'), 'query', { max: 240 }) || '';
      const config = requireCrmConfiguration();
      const result = await contactDirectory(actorEmail, config, query);
      return Response.json({ contacts: result.contacts }, { headers: { 'cache-control': 'no-store' } });
    }
    if (directory === 'tasks') {
      const query = stringField(url.searchParams.get('q'), 'query', { max: 240 }) || '';
      const config = requireCrmConfiguration();
      return Response.json({ tasks: await taskDirectory(actorEmail, config, query) }, { headers: { 'cache-control': 'no-store' } });
    }
    if (directory === 'emails' || directory === 'templates') {
      const query = stringField(url.searchParams.get('q'), 'query', { max: 240 }) || '';
      const config = requireCrmConfiguration();
      const collection = directory === 'emails' ? 'emails' : 'templates';
      const records = directory === 'emails' ? await emailDirectory(actorEmail, config, query) : await templateDirectory(actorEmail, config, query);
      return Response.json({ [collection]: records }, { headers: { 'cache-control': 'no-store' } });
    }
    const isCampaignDirectory = directory === 'campaigns';
    const query = stringField(url.searchParams.get('q'), 'query', { max: 240 }) || undefined;
    const cursor = stringField(url.searchParams.get('cursor'), 'cursor', { max: 500 }) || undefined;
    const parsedLimit = Number(url.searchParams.get('limit') || 25);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) throw invalid('Invalid limit');
    const config = requireCrmConfiguration();
    const result = await crmWorkspaceAction(isCampaignDirectory ? 'list_campaigns' : 'list_accounts', { q: query, cursor, limit: parsedLimit }, actorEmail);
    if (isCampaignDirectory) {
      return Response.json({ campaigns: (result.campaigns || []).map((campaign) => ({ key: handle('campaign', campaign.id, config), name: safe(campaign.name, 'Untitled campaign'), channel: campaign.channel || null, purpose: safe(campaign.purpose), status: campaign.status || null, members: Number.isSafeInteger(campaign.member_count) ? campaign.member_count : 0, updatedAt: campaign.updated_at || null })), nextCursor: safe(result.nextCursor) }, { headers: { 'cache-control': 'no-store' } });
    }
    return Response.json({ accounts: (result.accounts || []).map((account) => publicAccount(account, config)), nextCursor: safe(result.nextCursor) }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: errorStatus(error) === 400 ? 'Invalid directory request' : 'CRM unavailable' }, { status: errorStatus(error) });
  }
}

export async function POST(request) {
  const actorEmail = await actor();
  if (!actorEmail) return Response.json({ error: 'Staff access required' }, { status: 403 });
  try {
    const command = await request.json();
    if (!command || typeof command.action !== 'string') throw invalid();
    const payload = commandPayload(command.action, command.payload);
    const config = requireCrmConfiguration();
    let membershipCampaign = null;

    if (command.action === 'create_campaign') {
      await crmWorkspaceAction('create_campaign', { name: payload.name, channel: payload.channel, purpose: payload.purpose }, actorEmail);
      return Response.json({ recorded: true }, { status: 201 });
    }

    if (command.action === 'create_account') {
      await crmWorkspaceAction('create_account', { source: 'manual', display_name: payload.displayName, external_reference: payload.reference }, actorEmail);
      return Response.json({ recorded: true }, { status: 201 });
    }

    if (command.action === 'contact_workspace') return Response.json(await contactWorkspace(payload.contactKey, actorEmail, config));
    if (command.action === 'task_workspace') return Response.json(await taskWorkspace(payload.taskKey, actorEmail, config));
    if (command.action === 'email_workspace') return Response.json(await emailWorkspace(payload.emailKey, actorEmail, config));
    if (command.action === 'template_workspace') return Response.json(await templateWorkspace(payload.templateKey, actorEmail, config));

    if (command.action === 'account_workspace' || command.action === 'account_approval' || command.action.startsWith('create_') || command.action.startsWith('contact_') || command.action === 'complete_task' || command.action === 'add_campaign_member') {
      if (command.action === 'campaign_workspace' || command.action === 'create_draft' || command.action === 'create_attempt') {
        // Campaign actions are handled below.
      } else {
        const account = await resolveAccount(payload.accountKey, actorEmail, config);
        const workspace = await crmWorkspaceAction('account_workspace', { account_id: account.id }, actorEmail);
        if (command.action === 'account_workspace') return Response.json(accountWorkspace(workspace, account.id, config));
        if (command.action === 'account_approval') await crmWorkspaceAction('create_account_approval', { account_id: account.id, gate: 'intake', decision: payload.decision }, actorEmail);
        else if (command.action === 'create_note') await crmWorkspaceAction('create_note', { account_id: account.id, note: payload.note }, actorEmail);
        else if (command.action === 'create_task') await crmWorkspaceAction('create_task', { account_id: account.id, title: payload.title, due_at: payload.dueAt }, actorEmail);
        else if (command.action === 'create_contact') await crmWorkspaceAction('create_contact', { account_id: account.id, source: 'manual', external_reference: null, full_name: payload.fullName, title: payload.title, email: payload.email, phone: null, linkedin_url: null }, actorEmail);
        else {
          const contact = (workspace.contacts || []).find((item) => item.id && hasCrmRecordHandle('contact', item.id, payload.contactKey, config));
          if (command.action === 'complete_task') {
            const task = (workspace.tasks || []).find((item) => item.id && hasCrmRecordHandle('task', `${account.id}:${item.id}`, payload.taskKey, config));
            if (!task) throw invalid('Selection is no longer available');
            await crmWorkspaceAction('complete_task', { account_id: account.id, task_id: task.id }, actorEmail);
          } else if (command.action === 'add_campaign_member') {
            const campaign = await resolveCampaign(payload.campaignKey, actorEmail, config);
            if (!contact) throw invalid('Selection is no longer available');
            assertNotSuppressed(contact);
            await crmWorkspaceAction('add_campaign_member', { campaign_id: campaign.id, contact_id: contact.id }, actorEmail);
            membershipCampaign = campaign;
          } else {
            if (!contact) throw invalid('Selection is no longer available');
            await crmWorkspaceAction(command.action, { contact_id: contact.id, ...(command.action === 'contact_disposition' ? { disposition: payload.disposition } : { decision: payload.decision }) }, actorEmail);
          }
        }
        if (membershipCampaign) {
          const updatedCampaign = await crmWorkspaceAction('campaign_workspace', { campaign_id: membershipCampaign.id }, actorEmail);
          return Response.json(campaignWorkspace(updatedCampaign, config), { status: 201 });
        }
        const updated = await crmWorkspaceAction('account_workspace', { account_id: account.id }, actorEmail);
        return Response.json(accountWorkspace(updated, account.id, config), { status: 201 });
      }
    }

    const campaign = await resolveCampaign(payload.campaignKey, actorEmail, config);
    const workspace = await crmWorkspaceAction('campaign_workspace', { campaign_id: campaign.id }, actorEmail);
    if (command.action === 'campaign_workspace') return Response.json(campaignWorkspace(workspace, config));
    const members = workspace.members || [];
    const member = members.find((item) => item.membership_id && hasCrmRecordHandle('membership', item.membership_id, payload.membershipKey, config));
    if (command.action === 'create_draft') {
      if (!member) throw invalid('Selection is no longer available');
      assertNotSuppressed(member);
      await crmWorkspaceAction('create_draft', { membership_id: member.membership_id, content: { body: payload.body } }, actorEmail);
    } else if (command.action === 'draft_approval') {
      const draftWithMember = members.map((item) => ({ item, draft: (item.drafts || []).find((draft) => draft.id && hasCrmRecordHandle('draft', draft.id, payload.draftKey, config)) })).find(({ draft }) => draft);
      if (!draftWithMember) throw invalid('Selection is no longer available');
      assertNotSuppressed(draftWithMember.item);
      await crmWorkspaceAction('draft_approval', { draft_id: draftWithMember.draft.id, decision: payload.decision }, actorEmail);
    } else if (command.action === 'create_attempt') {
      const draft = member && (member.drafts || []).find((item) => item.id && hasCrmRecordHandle('draft', item.id, payload.draftKey, config));
      if (!member || !draft) throw invalid('Selection is no longer available');
      assertNotSuppressed(member);
      await crmWorkspaceAction('create_attempt', { membership_id: member.membership_id, draft_id: draft.id }, actorEmail);
    } else {
      const attemptWithMember = members.map((item) => ({ item, attempt: (item.attempts || []).find((attempt) => attempt.id && hasCrmRecordHandle('attempt', attempt.id, payload.attemptKey, config)) })).find(({ attempt }) => attempt);
      if (!attemptWithMember) throw invalid('Selection is no longer available');
      assertNotSuppressed(attemptWithMember.item);
      if (command.action === 'manual_execution') await crmWorkspaceAction('manual_execution', { attempt_id: attemptWithMember.attempt.id, outcome_note: payload.outcomeNote }, actorEmail);
      else await crmWorkspaceAction('attempt_approval', { attempt_id: attemptWithMember.attempt.id, decision: payload.decision }, actorEmail);
    }
    const updated = await crmWorkspaceAction('campaign_workspace', { campaign_id: campaign.id }, actorEmail);
    return Response.json(campaignWorkspace(updated, config), { status: 201 });
  } catch (error) {
    const status = errorStatus(error);
    return Response.json({ error: status === 400 ? 'CRM request could not be completed' : status === 404 ? 'CRM selection was not found' : status === 409 ? 'CRM request conflicts with current state' : 'CRM unavailable' }, { status });
  }
}

export { commandPayload, scanDirectory };

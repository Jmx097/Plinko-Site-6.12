// The portal broker accepts only these named operations. Record IDs are server-only.
const query = (path, p = {}) => `${path}?${new URLSearchParams(Object.entries(p).filter(([, value]) => value !== undefined && value !== null && value !== '')).toString()}`;
export const CRM_ACTIONS = {
  create_account: { method: 'POST', path: () => '/crm/accounts', fields: ['source', 'display_name', 'external_reference'] },
  create_account_approval: { method: 'POST', path: () => '/crm/approvals', fields: ['account_id', 'gate', 'decision'] },
  list_accounts: { method: 'GET', path: (p) => query('/crm/accounts', { q: p.q, cursor: p.cursor, limit: p.limit ?? 100 }) },
  list_campaigns: { method: 'GET', path: (p) => query('/crm/campaigns', { q: p.q, cursor: p.cursor, limit: p.limit }) },
  account_workspace: { method: 'GET', path: (p) => `/crm/accounts/${encodeURIComponent(p.account_id)}/workspace` },
  campaign_workspace: { method: 'GET', path: (p) => `/crm/campaigns/${encodeURIComponent(p.campaign_id)}/workspace` },
  create_note: { method: 'POST', path: (p) => `/crm/accounts/${encodeURIComponent(p.account_id)}/notes`, fields: ['note'] },
  create_task: { method: 'POST', path: (p) => `/crm/accounts/${encodeURIComponent(p.account_id)}/tasks`, fields: ['title', 'due_at'] },
  complete_task: { method: 'POST', path: (p) => `/crm/accounts/${encodeURIComponent(p.account_id)}/tasks/${encodeURIComponent(p.task_id)}/complete` },
  create_contact: { method: 'POST', path: () => '/crm/contacts', fields: ['account_id', 'source', 'external_reference', 'full_name', 'title', 'email', 'phone', 'linkedin_url'] },
  contact_approval: { method: 'POST', path: (p) => `/crm/contacts/${encodeURIComponent(p.contact_id)}/approval`, fields: ['decision'] },
  contact_disposition: { method: 'POST', path: (p) => `/crm/contacts/${encodeURIComponent(p.contact_id)}/disposition`, fields: ['disposition'] },
  create_campaign: { method: 'POST', path: () => '/crm/campaigns', fields: ['name', 'channel', 'purpose'] },
  add_campaign_member: { method: 'POST', path: (p) => `/crm/campaigns/${encodeURIComponent(p.campaign_id)}/members`, fields: ['contact_id'] },
  create_draft: { method: 'POST', path: (p) => `/crm/memberships/${encodeURIComponent(p.membership_id)}/drafts`, fields: ['content'] },
  draft_approval: { method: 'POST', path: (p) => `/crm/drafts/${encodeURIComponent(p.draft_id)}/approval`, fields: ['decision'] },
  create_attempt: { method: 'POST', path: (p) => `/crm/memberships/${encodeURIComponent(p.membership_id)}/attempts`, fields: ['draft_id'] },
  attempt_approval: { method: 'POST', path: (p) => `/crm/attempts/${encodeURIComponent(p.attempt_id)}/approval`, fields: ['decision'] },
  manual_execution: { method: 'POST', path: (p) => `/crm/attempts/${encodeURIComponent(p.attempt_id)}/manual-execution`, fields: ['outcome_note'] },
};
export function crmActionRequest(action, payload = {}) { const rule = CRM_ACTIONS[action]; if (!rule) throw new Error('Unsupported CRM action'); return { method: rule.method, path: rule.path(payload), body: rule.fields ? Object.fromEntries(rule.fields.filter((f) => Object.hasOwn(payload, f)).map((f) => [f, payload[f]])) : undefined }; }

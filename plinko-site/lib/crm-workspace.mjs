// Server-side allowlist. Browser input cannot select an upstream URL or add fields.
export const CRM_ACTIONS = {
  overview: { method: 'GET', path: () => '/crm/campaign-workbench' },
  create_account: { method: 'POST', path: () => '/crm/accounts', fields: ['source', 'display_name', 'external_reference'] },
  create_account_approval: { method: 'POST', path: () => '/crm/approvals', fields: ['account_id', 'gate', 'decision'] },
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

export function crmActionRequest(action, payload = {}) {
  const rule = CRM_ACTIONS[action];
  if (!rule) throw new Error('Unsupported CRM action');
  const body = rule.fields
    ? Object.fromEntries(rule.fields.filter((field) => Object.hasOwn(payload, field)).map((field) => [field, payload[field]]))
    : undefined;
  return { method: rule.method, path: rule.path(payload), body };
}

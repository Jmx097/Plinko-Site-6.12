export const STAGE_LABELS = {
  pending: 'Needs review',
  approved: 'Approved',
  rejected: 'Rejected',
  draft: 'Draft',
  active: 'Active',
  queued: 'Ready for draft',
  approved_to_execute: 'Ready for manual outreach',
  executed_manually: 'Recorded manually',
  cancelled: 'Cancelled',
  review: 'Needs review',
  do_not_contact: 'Do not contact',
  invalid: 'Invalid',
};

export function stageLabel(value) {
  return STAGE_LABELS[value] || (value ? String(value).replaceAll('_', ' ') : 'Not set');
}

function byId(items) {
  return new Map(items.filter((item) => item?.id).map((item) => [item.id, item]));
}

function nameForContact(contact) {
  return contact?.full_name || 'Unnamed contact';
}

/**
 * The campaign workbench exposes lifecycle IDs only in its audit activity.
 * This builds operator-facing choices from that contract while retaining IDs
 * solely as select values sent to the signed server-side broker.
 */
export function buildWorkflowChoices({ accounts = [], contacts = [], campaigns = [], activity = [] } = {}) {
  const accountsById = byId(accounts);
  const contactsById = byId(contacts);
  const campaignsById = byId(campaigns);
  const memberships = [];
  const drafts = [];
  const attempts = [];

  // Activity is newest-first. Build each lifecycle layer separately so a
  // newly created draft/attempt can resolve its earlier related record.
  for (const event of activity) {
    if (event.event_type !== 'campaign.member_added') continue;
    const campaign = campaignsById.get(event.campaign_id);
    const contact = contactsById.get(event.contact_id);
    memberships.push({ id: event.entity_id, campaignId: event.campaign_id, contactId: event.contact_id, label: `${campaign?.name || 'Campaign'} · ${nameForContact(contact)}` });
  }
  for (const event of activity) {
    if (event.event_type !== 'draft.created') continue;
    const campaign = campaignsById.get(event.campaign_id);
    const contact = contactsById.get(event.contact_id);
    const membership = memberships.find((item) => item.campaignId === event.campaign_id && item.contactId === event.contact_id);
    drafts.push({ id: event.entity_id, membershipId: membership?.id, campaignId: event.campaign_id, contactId: event.contact_id, label: `Draft · ${campaign?.name || 'Campaign'} · ${nameForContact(contact)}` });
  }
  for (const event of activity) {
    if (event.event_type !== 'attempt.planned') continue;
    const campaign = campaignsById.get(event.campaign_id);
    const contact = contactsById.get(event.contact_id);
    const draftId = event.metadata?.draft_id;
    const draft = drafts.find((item) => item.id === draftId);
    attempts.push({ id: event.entity_id, draftId, membershipId: draft?.membershipId, label: `Manual outreach · ${campaign?.name || 'Campaign'} · ${nameForContact(contact)}` });
  }

  return {
    accounts: accounts.map((account) => ({ id: account.id, label: account.displayName || account.display_name || account.externalReference || account.external_reference || 'Unnamed account', detail: account.source })),
    contacts: contacts.map((contact) => ({ id: contact.id, label: nameForContact(contact), detail: [contact.title, contact.account_name].filter(Boolean).join(' · ') })),
    campaigns: campaigns.map((campaign) => ({ id: campaign.id, label: campaign.name || 'Untitled campaign', detail: [stageLabel(campaign.status), campaign.channel].filter(Boolean).join(' · ') })),
    memberships: memberships.filter((item) => item.id),
    drafts: drafts.filter((item) => item.id && item.membershipId),
    attempts: attempts.filter((item) => item.id && item.membershipId && item.draftId),
    accountsById,
  };
}

export function formatActivity(event, choices) {
  const account = choices.accountsById.get(event.account_id);
  const contact = choices.contacts.find((item) => item.id === event.contact_id);
  const campaign = choices.campaigns.find((item) => item.id === event.campaign_id);
  return {
    title: String(event.event_type || 'CRM update').replaceAll('.', ' · ').replaceAll('_', ' '),
    context: [account?.displayName || account?.display_name, contact?.label, campaign?.label].filter(Boolean).join(' · ') || 'Shared CRM record',
    timestamp: event.occurred_at,
  };
}

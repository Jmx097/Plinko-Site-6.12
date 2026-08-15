export const contributorQueueLabels = {
  station_1_account_review: 'Awaiting account review',
  station_1_contact_review: 'Awaiting contact review',
  station_2_draft_review: 'Awaiting draft review',
  station_2_send_review: 'Awaiting send review',
  outreach_authorized: 'Outreach authorized',
  blocked_rejected: 'Blocked or rejected',
};

export function contributorQueueLabel(queueState) {
  return contributorQueueLabels[queueState] || 'Status unavailable';
}

export function normalizeContributorQueueRecord(record) {
  const account = record?.account || {};

  return {
    id: account.id,
    displayName: account.displayName || 'Unnamed company',
    externalReference: account.externalReference,
    queueState: record?.queueState,
    statusLabel: contributorQueueLabel(record?.queueState),
  };
}

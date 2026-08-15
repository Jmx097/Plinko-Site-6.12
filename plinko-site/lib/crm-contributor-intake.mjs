export const CONTRIBUTOR_COMPANY_NAME_MAX_LENGTH = 200;
export const CONTRIBUTOR_REFERENCE_MAX_LENGTH = 500;

export class ContributorValidationError extends Error {
  constructor() {
    super('Invalid contributor intake');
    this.name = 'ContributorValidationError';
  }
}

export function contributorSource(email) {
  return `contributor:${email}`;
}

export function contributorOverviewAccounts(reviewQueue, email) {
  const source = contributorSource(email);
  if (!Array.isArray(reviewQueue)) return [];

  return reviewQueue
    .filter((record) => record?.account?.source === source)
    .map((record) => ({
      id: record.account.id,
      displayName: record.account.displayName || 'Unnamed company',
      externalReference: record.account.externalReference,
      queueState: record.queueState,
    }));
}

function requiredTrimmedString(value, maxLength) {
  if (typeof value !== 'string') throw new ContributorValidationError();
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new ContributorValidationError();
  return normalized;
}

export function normalizeContributorIntake(payload) {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new ContributorValidationError();
  if (!Object.keys(payload).every((key) => key === 'companyName' || key === 'reference')) {
    throw new ContributorValidationError();
  }

  const displayName = requiredTrimmedString(payload.companyName, CONTRIBUTOR_COMPANY_NAME_MAX_LENGTH);
  const rawReference = payload.reference;
  if (rawReference === undefined || rawReference === null || rawReference === '') {
    return { displayName, externalReference: '' };
  }
  if (typeof rawReference !== 'string') throw new ContributorValidationError();
  const externalReference = rawReference.trim();
  if (!externalReference) return { displayName, externalReference: '' };
  if (externalReference.length > CONTRIBUTOR_REFERENCE_MAX_LENGTH) throw new ContributorValidationError();

  let url;
  try {
    url = new URL(externalReference);
  } catch {
    throw new ContributorValidationError();
  }
  if (url.protocol !== 'https:') throw new ContributorValidationError();
  return { displayName, externalReference };
}

export function contributorSubmissionFailure(kind) {
  if (kind === 'configuration') {
    return { status: 503, error: 'Company review is temporarily unavailable' };
  }
  if (kind === 'validation') return { status: 400, error: 'Invalid submission' };
  return { status: 502, error: 'Unable to submit company for review' };
}

export function contributorSubmissionAcknowledgement(account, fallbackDisplayName) {
  const createdAccount = account?.account || account || {};
  return {
    id: createdAccount.id,
    displayName: createdAccount.displayName || createdAccount.display_name || fallbackDisplayName,
    statusLabel: 'Submitted for account review',
  };
}

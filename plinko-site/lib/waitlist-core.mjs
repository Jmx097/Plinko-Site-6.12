const ACCOUNT_TYPES = new Set(['individual', 'business']);
const OUTCOMES = new Set(['learn', 'blueprints', 'both']);
const STATUSES = new Set(['waiting', 'qualified', 'invited', 'joined', 'declined', 'unsubscribed']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_PATTERN = /^[a-z0-9_-]{1,40}$/;
const REFERRAL_PATTERN = /^[a-z0-9-]{1,100}$/;

function clean(value, max = 255) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (result.length > max) throw new Error('Waitlist field is too long');
  return result;
}

export function normalizeWaitlistSubmission(input = {}) {
  if (clean(input.website, 200)) throw new Error('Waitlist submission rejected');
  const email = clean(input.email, 320).toLowerCase();
  const firstName = clean(input.firstName, 80);
  const company = clean(input.company, 160);
  const source = clean(input.source || 'portal_waitlist', 40).toLowerCase();
  const referralCode = clean(input.referralCode, 100).toLowerCase();
  const termsVersion = clean(input.termsVersion, 40);
  const accountType = clean(input.accountType, 20);
  const desiredOutcome = clean(input.desiredOutcome, 30);
  if (!EMAIL_PATTERN.test(email)) throw new Error('Enter a valid email address');
  if (!ACCOUNT_TYPES.has(accountType)) throw new Error('Choose an account type');
  if (!OUTCOMES.has(desiredOutcome)) throw new Error('Choose what you want to access');
  if (!SOURCE_PATTERN.test(source)) throw new Error('Invalid waitlist source');
  if (referralCode && !REFERRAL_PATTERN.test(referralCode)) throw new Error('Invalid referral code');
  if (input.productUpdatesConsent !== true) throw new Error('Consent is required to join the waitlist');
  if (!termsVersion) throw new Error('Waitlist terms version is required');
  return { email, firstName, accountType, company, desiredOutcome, source, referralCode, productUpdatesConsent: true, termsVersion };
}

export async function captureWaitlistEntryWithConfig({ submission, config, fetchImpl = fetch } = {}) {
  const normalized = normalizeWaitlistSubmission(submission);
  const client = createCoreClient(config, fetchImpl);
  const rows = await client.rpc('capture_waitlist_entry', {
    p_email: normalized.email,
    p_first_name: normalized.firstName || null,
    p_account_type: normalized.accountType,
    p_company: normalized.company || null,
    p_desired_outcome: normalized.desiredOutcome,
    p_source: normalized.source,
    p_referral_code: normalized.referralCode || null,
    p_product_updates_consent: true,
    p_terms_version: normalized.termsVersion,
  }, 'Waitlist capture failed');
  if (!Array.isArray(rows) || rows.length !== 1 || !rows[0].id) throw new Error('Waitlist rate_limit reached');
  return { id: rows[0].id };
}

export async function getWaitlistEntriesWithConfig({ config, fetchImpl = fetch } = {}) {
  const client = createCoreClient(config, fetchImpl);
  return client.get('waitlist_entries?select=id,email,first_name,account_type,company,desired_outcome,source,referral_code,status,product_updates_consent,consented_at,terms_version,created_at,updated_at&order=created_at.desc&limit=200');
}

export async function setWaitlistStatusWithConfig({ entryId, status, actorEmail, config, fetchImpl = fetch } = {}) {
  if (!UUID_PATTERN.test(String(entryId))) throw new Error('Invalid waitlist entry');
  if (!STATUSES.has(status)) throw new Error('Invalid waitlist status');
  const email = clean(actorEmail, 320).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new Error('Verified staff email is required');
  const client = createCoreClient(config, fetchImpl);
  const rows = await client.rpc('set_waitlist_status', { p_entry_id: entryId, p_status: status, p_actor_email: email });
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0].status !== status) throw new Error('Waitlist status was not updated');
}

function createCoreClient(config, fetchImpl) {
  if (!config?.url || !config?.serviceRoleKey || typeof fetchImpl !== 'function') throw new Error('Missing Plinko Solutions Core configuration');
  const headers = { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, 'Content-Type': 'application/json' };
  async function request(path, options = {}, failure = 'Plinko Core request failed') {
    const response = await fetchImpl(`${config.url}/rest/v1/${path}`, { ...options, headers: { ...headers, ...options.headers }, cache: 'no-store' });
    if (!response.ok) throw new Error(`${failure} (${response.status})`);
    if (response.status === 204) return [];
    if (typeof response.json === 'function') return response.json();
    return [];
  }
  return {
    get: (path) => request(path),
    rpc: (name, body, failure) => request(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) }, failure),
  };
}

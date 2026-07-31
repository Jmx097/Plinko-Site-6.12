import { randomBytes } from 'node:crypto';

const MAX_CLERK_SUBJECT_LENGTH = 255;

/**
 * Pure activation logic. The server-only wrapper supplies the validated Core
 * configuration; tests supply a harmless fixture and a mocked fetch.
 */
export async function activateMemberWithConfig({ userId, config, fetchImpl = fetch } = {}) {
  const subject = normalizeSubject(userId);
  const client = createCoreClient(config, fetchImpl);

  await client.post('member_profiles?on_conflict=user_id', { user_id: subject }, {
    Prefer: 'resolution=ignore-duplicates,return=minimal',
  });

  const existing = await client.get(`referral_links?owner_user_id=eq.${encodeURIComponent(subject)}&select=code&limit=1`);
  if (existing.length > 0) return { referralCode: existing[0].code, activatedNow: false };

  // The database's unique owner constraint is the concurrency boundary. A second
  // session can win the race; the follow-up read returns that single stable link.
  await client.post('referral_links?on_conflict=owner_user_id', {
    owner_user_id: subject,
    code: createReferralCode(),
  }, {
    Prefer: 'resolution=ignore-duplicates,return=minimal',
  });

  const links = await client.get(`referral_links?owner_user_id=eq.${encodeURIComponent(subject)}&select=code&limit=1`);
  if (links.length !== 1 || typeof links[0].code !== 'string') {
    throw new Error('Member activation did not produce a referral link');
  }
  return { referralCode: links[0].code, activatedNow: true };
}

export async function getMemberOverviewWithConfig({ userId, config, fetchImpl = fetch } = {}) {
  const subject = normalizeSubject(userId);
  const activation = await activateMemberWithConfig({ userId: subject, config, fetchImpl });
  const client = createCoreClient(config, fetchImpl);
  const [attributions, commissions] = await Promise.all([
    client.get(`referral_attributions?referrer_user_id=eq.${encodeURIComponent(subject)}&select=id`),
    client.get(`commission_ledger?referrer_user_id=eq.${encodeURIComponent(subject)}&select=state,commission_cents,currency`),
  ]);

  const availableByCurrency = {};
  let pendingCommissionCount = 0;
  for (const commission of commissions) {
    if (commission.state === 'available') {
      availableByCurrency[commission.currency] = (availableByCurrency[commission.currency] || 0) + commission.commission_cents;
    } else if (commission.state === 'pending') {
      pendingCommissionCount += 1;
    }
  }
  return { ...activation, referralCount: attributions.length, pendingCommissionCount, availableByCurrency };
}

function normalizeSubject(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_CLERK_SUBJECT_LENGTH) {
    throw new Error('Invalid authenticated member subject');
  }
  return value;
}

function createReferralCode() {
  return `p-${randomBytes(12).toString('hex')}`;
}

function createCoreClient(config, fetchImpl) {
  if (!config?.url || !config?.serviceRoleKey || typeof fetchImpl !== 'function') {
    throw new Error('Missing Plinko Solutions Core configuration');
  }
  const headers = {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    'Content-Type': 'application/json',
  };
  async function request(path, options = {}) {
    const response = await fetchImpl(`${config.url}/rest/v1/${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Plinko Core request failed (${response.status})`);
    if (response.status === 204) return [];
    const body = await response.text();
    return body ? JSON.parse(body) : [];
  }
  return {
    get: (path) => request(path),
    post: (path, body, extraHeaders) => request(path, { method: 'POST', body: JSON.stringify(body), headers: extraHeaders }),
  };
}

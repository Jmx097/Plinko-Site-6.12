const MAX_CLERK_SUBJECT_LENGTH = 255;
const MAX_SUBJECT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 5000;
const MODULE_KEYS = new Set(['community', 'referrals', 'workspace']);

export function normalizeMemberSubject(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_CLERK_SUBJECT_LENGTH) {
    throw new Error('Invalid authenticated member subject');
  }
  return value;
}

export function normalizeSupportRequest({ subject, message } = {}) {
  const normalizedSubject = typeof subject === 'string' ? subject.trim() : '';
  const normalizedMessage = typeof message === 'string' ? message.trim() : '';
  if (!normalizedSubject || normalizedSubject.length > MAX_SUBJECT_LENGTH) throw new Error('Support subject is required and must be 160 characters or fewer');
  if (!normalizedMessage || normalizedMessage.length > MAX_MESSAGE_LENGTH) throw new Error('Support message is required and must be 5000 characters or fewer');
  return { subject: normalizedSubject, message: normalizedMessage };
}

export function normalizeModuleGrant({ moduleKey, enabled } = {}) {
  if (!MODULE_KEYS.has(moduleKey)) throw new Error('Unknown module grant');
  return { moduleKey, enabled: enabled === true };
}

export async function getMemberDashboardWithConfig({ userId, config, fetchImpl = fetch } = {}) {
  const subject = normalizeMemberSubject(userId);
  const client = createCoreClient(config, fetchImpl);
  const [grants, supportRequests] = await Promise.all([
    client.get(`member_module_grants?user_id=eq.${encodeURIComponent(subject)}&enabled=eq.true&select=module_key,expires_at&order=module_key.asc`),
    client.get(`member_support_requests?user_id=eq.${encodeURIComponent(subject)}&select=id,subject,status,created_at&order=created_at.desc&limit=10`),
  ]);
  const now = Date.now();
  return {
    modules: grants.filter((grant) => !grant.expires_at || Date.parse(grant.expires_at) > now).map((grant) => grant.module_key),
    supportRequests,
  };
}

export async function createSupportRequestWithConfig({ userId, subject, message, config, fetchImpl = fetch } = {}) {
  const memberSubject = normalizeMemberSubject(userId);
  const request = normalizeSupportRequest({ subject, message });
  const client = createCoreClient(config, fetchImpl);
  const records = await client.post('member_support_requests?select=id,subject,status,created_at', {
    user_id: memberSubject,
    ...request,
  }, { Prefer: 'return=representation' });
  if (records.length !== 1) throw new Error('Support request was not created');
  return records[0];
}

export async function getAdminControlPlaneWithConfig({ config, fetchImpl = fetch } = {}) {
  const client = createCoreClient(config, fetchImpl);
  const [supportRequests, grants, memberProfiles, roleAssignments] = await Promise.all([
    client.get('member_support_requests?select=id,user_id,subject,message,status,created_at&order=created_at.desc&limit=100'),
    client.get('member_module_grants?select=id,user_id,module_key,enabled,expires_at,updated_at&order=updated_at.desc&limit=100'),
    client.get('member_profiles?select=user_id&order=created_at.desc&limit=100'),
    client.get('member_role_assignments?select=id,user_id,role_key,enabled,expires_at,updated_at&order=updated_at.desc&limit=100'),
  ]);
  return { supportRequests, grants, memberProfiles, roleAssignments };
}

export async function setMemberModuleGrantWithConfig({ userId, moduleKey, enabled, actorEmail, config, fetchImpl = fetch } = {}) {
  const subject = normalizeMemberSubject(userId);
  const grant = normalizeModuleGrant({ moduleKey, enabled });
  if (typeof actorEmail !== 'string' || !actorEmail.trim()) throw new Error('Verified staff email is required');
  const client = createCoreClient(config, fetchImpl);
  await client.post('member_module_grants?on_conflict=user_id,module_key', {
    user_id: subject,
    module_key: grant.moduleKey,
    enabled: grant.enabled,
    granted_by_email: actorEmail.trim().toLowerCase(),
  }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
}

export async function setSupportRequestStatusWithConfig({ requestId, status, config, fetchImpl = fetch } = {}) {
  if (!/^[0-9a-f-]{36}$/i.test(String(requestId))) throw new Error('Invalid support request');
  if (!['open', 'in_progress', 'resolved'].includes(status)) throw new Error('Invalid support status');
  const client = createCoreClient(config, fetchImpl);
  await client.patch(`member_support_requests?id=eq.${encodeURIComponent(requestId)}`, { status }, { Prefer: 'return=minimal' });
}

function createCoreClient(config, fetchImpl) {
  if (!config?.url || !config?.serviceRoleKey || typeof fetchImpl !== 'function') throw new Error('Missing Plinko Solutions Core configuration');
  const headers = { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, 'Content-Type': 'application/json' };
  async function request(path, options = {}) {
    const response = await fetchImpl(`${config.url}/rest/v1/${path}`, { ...options, headers: { ...headers, ...options.headers }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Plinko Core request failed (${response.status})`);
    if (response.status === 204) return [];
    const body = await response.text();
    return body ? JSON.parse(body) : [];
  }
  return { get: (path) => request(path), post: (path, body, extraHeaders) => request(path, { method: 'POST', body: JSON.stringify(body), headers: extraHeaders }), patch: (path, body, extraHeaders) => request(path, { method: 'PATCH', body: JSON.stringify(body), headers: extraHeaders }) };
}

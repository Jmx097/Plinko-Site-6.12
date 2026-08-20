const ROLE_KEYS = new Set(['sales', 'demo']);

export const ROLE_CATALOG = Object.freeze({
  sales: {
    label: 'Sales',
    description: 'Shared CRM workspace, My Work, and all five station playbooks.',
    capabilities: ['crm.workspace', 'stations.playbooks'],
  },
  demo: {
    label: 'Demo',
    description: 'Shared access to the Five-Station course library.',
    capabilities: ['demo.course'],
  },
});

export function normalizeRoleKey(roleKey) {
  if (!ROLE_KEYS.has(roleKey)) throw new Error('Unknown Pocket role');
  return roleKey;
}

export function capabilitiesForRoles(roleKeys = []) {
  const capabilities = new Set();
  for (const roleKey of roleKeys) {
    for (const capability of ROLE_CATALOG[roleKey]?.capabilities || []) capabilities.add(capability);
  }
  return [...capabilities].sort();
}

export async function getMemberRoleAccessWithConfig({ userId, config, fetchImpl = fetch, now = Date.now() } = {}) {
  if (typeof userId !== 'string' || !userId.trim()) throw new Error('Invalid authenticated member subject');
  const client = createCoreClient(config, fetchImpl);
  const assignments = await client.get(`member_role_assignments?user_id=eq.${encodeURIComponent(userId)}&select=role_key,enabled,expires_at&order=role_key.asc`);
  const roles = assignments
    .filter((assignment) => assignment.enabled === true && ROLE_KEYS.has(assignment.role_key) && (!assignment.expires_at || Date.parse(assignment.expires_at) > now))
    .map((assignment) => assignment.role_key);
  return { roles, capabilities: capabilitiesForRoles(roles), hasSalesRoleAssignment: assignments.some((assignment) => assignment.role_key === 'sales') };
}

export async function setMemberRoleWithConfig({ userId, roleKey, enabled, actorEmail, config, fetchImpl = fetch } = {}) {
  if (typeof userId !== 'string' || !userId.trim()) throw new Error('Invalid authenticated member subject');
  const normalizedRole = normalizeRoleKey(roleKey);
  if (typeof actorEmail !== 'string' || !actorEmail.trim()) throw new Error('Verified staff email is required');
  const client = createCoreClient(config, fetchImpl);
  await client.post('member_role_assignments?on_conflict=user_id,role_key', {
    user_id: userId,
    role_key: normalizedRole,
    enabled: enabled === true,
    granted_by_email: actorEmail.trim().toLowerCase(),
  }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
}

function createCoreClient(config, fetchImpl) {
  if (!config?.url || !config?.serviceRoleKey || typeof fetchImpl !== 'function') throw new Error('Missing Plinko Solutions Core configuration');
  const headers = { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, 'Content-Type': 'application/json' };
  async function request(path, options = {}) {
    const response = await fetchImpl(`${config.url}/rest/v1/${path}`, { ...options, headers: { ...headers, ...options.headers }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Plinko Core request failed (${response.status})`);
    const body = await response.text();
    return body ? JSON.parse(body) : [];
  }
  return { get: (path) => request(path), post: (path, body, extraHeaders) => request(path, { method: 'POST', body: JSON.stringify(body), headers: extraHeaders }) };
}

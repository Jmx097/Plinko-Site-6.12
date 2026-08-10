import 'server-only';

function requireCrmConfiguration(environment = process.env) {
  const baseUrl = String(environment.CRM_API_BASE_URL || '').trim().replace(/\/$/, '');
  const token = String(environment.CRM_API_TOKEN || '').trim();
  if (!/^https:\/\//.test(baseUrl) || !token) {
    throw new Error('CRM command-center integration is not configured');
  }
  return { baseUrl, token };
}

async function crmRequest(path, { method = 'GET', body, config = requireCrmConfiguration(), fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${config.baseUrl}${path}`, {
    method,
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${config.token}`,
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || `CRM request failed with status ${response.status}`);
  }
  return response.json();
}

export async function getCrmStationOverviewWithConfig({ config, fetchImpl = fetch }) {
  const payload = await crmRequest('/crm/stations/overview?limit=100', { config, fetchImpl });
  if (payload?.governance?.mode !== 'read_only' || !payload?.freshness?.checked_at || !payload?.stations?.metrics || !Array.isArray(payload?.stations?.reviewQueue)) {
    throw new Error('CRM command-center returned an invalid read-only overview');
  }
  return payload;
}

export function getCrmStationOverview(environment = process.env) {
  return getCrmStationOverviewWithConfig({ config: requireCrmConfiguration(environment) });
}

export function getCrmAccountWorkspace(accountId, environment = process.env) {
  return crmRequest(`/crm/accounts/${encodeURIComponent(accountId)}/workspace`, { config: requireCrmConfiguration(environment) });
}

export function addCrmAccountNote(accountId, note, environment = process.env) {
  return crmRequest(`/crm/accounts/${encodeURIComponent(accountId)}/notes`, {
    method: 'POST',
    body: { note },
    config: requireCrmConfiguration(environment),
  });
}

export function addCrmFollowUpTask(accountId, task, environment = process.env) {
  return crmRequest(`/crm/accounts/${encodeURIComponent(accountId)}/tasks`, {
    method: 'POST',
    body: task,
    config: requireCrmConfiguration(environment),
  });
}

export function completeCrmFollowUpTask(accountId, taskId, environment = process.env) {
  return crmRequest(`/crm/accounts/${encodeURIComponent(accountId)}/tasks/${encodeURIComponent(taskId)}/complete`, {
    method: 'POST',
    config: requireCrmConfiguration(environment),
  });
}

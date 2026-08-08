import 'server-only';

function requireCrmConfiguration(environment = process.env) {
  const baseUrl = String(environment.CRM_API_BASE_URL || '').trim().replace(/\/$/, '');
  const token = String(environment.CRM_API_TOKEN || '').trim();
  if (!/^https:\/\//.test(baseUrl) || !token) {
    throw new Error('CRM command-center integration is not configured');
  }
  return { baseUrl, token };
}

export async function getCrmStationOverviewWithConfig({ config, fetchImpl = fetch }) {
  const response = await fetchImpl(`${config.baseUrl}/crm/stations/overview?limit=100`, {
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${config.token}`,
      accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`CRM command-center request failed with status ${response.status}`);
  }
  const payload = await response.json();
  if (payload?.governance?.mode !== 'read_only' || !payload?.freshness?.checked_at || !payload?.stations?.metrics || !Array.isArray(payload?.stations?.reviewQueue)) {
    throw new Error('CRM command-center returned an invalid read-only overview');
  }
  return payload;
}

export function getCrmStationOverview(environment = process.env) {
  return getCrmStationOverviewWithConfig({ config: requireCrmConfiguration(environment) });
}

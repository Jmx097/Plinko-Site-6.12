import 'server-only';

function requireCrmConfiguration(environment = process.env) {
  const baseUrl = String(environment.CRM_API_BASE_URL || '').trim().replace(/\/$/, '');
  const token = String(environment.CRM_API_TOKEN || '').trim();
  if (!/^https:\/\//.test(baseUrl) || !token) {
    throw new Error('CRM admin integration is not configured');
  }
  return { baseUrl, token };
}

async function crmFetch(path, options = {}, environment = process.env) {
  const { baseUrl, token } = requireCrmConfiguration(environment);
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`CRM request failed with status ${response.status}`);
  }
  return response.json();
}

export async function getCrmAccounts() {
  return crmFetch('/crm/accounts?limit=100');
}

export async function decideCrmApproval({ accountId, gate, decision }) {
  return crmFetch('/crm/approvals', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ account_id: accountId, gate, decision }),
  });
}

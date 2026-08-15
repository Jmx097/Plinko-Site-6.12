import 'server-only';

export class CrmConfigurationError extends Error {
  constructor() {
    super('CRM integration is not configured');
    this.name = 'CrmConfigurationError';
  }
}

export class CrmIntegrationError extends Error {
  constructor() {
    super('CRM integration request failed');
    this.name = 'CrmIntegrationError';
  }
}

function requireCrmConfiguration(environment = process.env) {
  const baseUrl = String(environment.CRM_API_BASE_URL || '').trim().replace(/\/$/, '');
  const token = String(environment.CRM_API_TOKEN || '').trim();
  if (!/^https:\/\//.test(baseUrl) || !token) {
    throw new CrmConfigurationError();
  }
  return { baseUrl, token };
}

async function crmRequest(path, { method = 'GET', body, config = requireCrmConfiguration(), fetchImpl = fetch } = {}) {
  let response;
  try {
    response = await fetchImpl(`${config.baseUrl}${path}`, {
      method,
      cache: 'no-store',
      headers: {
        authorization: `Bearer ${config.token}`,
        accept: 'application/json',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new CrmIntegrationError();
  }
  if (!response.ok) throw new CrmIntegrationError();
  try {
    return await response.json();
  } catch {
    throw new CrmIntegrationError();
  }
}

export async function getCrmStationOverviewWithConfig({ config, fetchImpl = fetch }) {
  const payload = await crmRequest('/crm/stations/overview?limit=100', { config, fetchImpl });
  if (payload?.governance?.mode !== 'read_only' || !payload?.freshness?.checked_at || !payload?.stations?.metrics || !Array.isArray(payload?.stations?.reviewQueue)) {
    throw new CrmIntegrationError();
  }
  return payload;
}

export function getCrmStationOverview(environment = process.env) {
  return getCrmStationOverviewWithConfig({ config: requireCrmConfiguration(environment) });
}

function sourceIntakeValue(value, field, { required = false, maxLength }) {
  if (typeof value !== 'string') {
    if (required) throw new Error(`${field} is required`);
    return '';
  }
  const normalized = value.trim();
  if (required && !normalized) throw new Error(`${field} is required`);
  if (normalized.length > maxLength) throw new Error(`${field} is too long`);
  return normalized;
}

export function createSourceIntakeAccount({ source, displayName, externalReference }, environment = process.env) {
  const body = {
    source: sourceIntakeValue(source, 'Source', { required: true, maxLength: 320 }),
    display_name: sourceIntakeValue(displayName, 'Company name', { required: true, maxLength: 200 }),
    external_reference: sourceIntakeValue(externalReference, 'Reference', { maxLength: 500 }),
  };
  return crmRequest('/crm/accounts', {
    method: 'POST',
    body,
    config: requireCrmConfiguration(environment),
  });
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

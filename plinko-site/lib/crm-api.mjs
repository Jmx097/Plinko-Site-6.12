import 'server-only';
import { crmActionRequest } from './crm-workspace.mjs';
import { crmActorSigningHeaders as createCrmActorSigningHeaders } from './crm-actor-signing.mjs';
export { crmActorSigningHeaders } from './crm-actor-signing.mjs';

export class CrmConfigurationError extends Error {
  constructor() { super('CRM integration is not configured'); this.name = 'CrmConfigurationError'; }
}
export class CrmIntegrationError extends Error {
  constructor() { super('CRM integration request failed'); this.name = 'CrmIntegrationError'; }
}

export function requireCrmConfiguration(environment = process.env) {
  const baseUrl = String(environment.CRM_API_BASE_URL || '').trim().replace(/\/$/, '');
  const token = String(environment.CRM_API_TOKEN || '').trim();
  const actorSigningSecret = String(environment.CRM_ACTOR_SIGNING_SECRET || '').trim();
  if (!/^https:\/\//.test(baseUrl) || !token) throw new CrmConfigurationError();
  return { baseUrl, token, actorSigningSecret };
}


export async function crmRequest(path, { method = 'GET', body, actorEmail, config = requireCrmConfiguration(), fetchImpl = fetch, now } = {}) {
  const isWrite = method === 'POST';
  if (isWrite && !config.actorSigningSecret) throw new CrmConfigurationError();
  let response;
  try {
    response = await fetchImpl(`${config.baseUrl}${path}`, {
      method,
      cache: 'no-store',
      headers: {
        authorization: `Bearer ${config.token}`,
        accept: 'application/json',
        ...(isWrite ? (() => { try { return createCrmActorSigningHeaders(actorEmail, config.actorSigningSecret, now ?? Date.now()); } catch { throw new CrmConfigurationError(); } })() : {}),
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error instanceof CrmConfigurationError) throw error;
    throw new CrmIntegrationError();
  }
  if (!response.ok) throw new CrmIntegrationError();
  try { return await response.json(); } catch { throw new CrmIntegrationError(); }
}

/** Server-side, allowlisted CRM command broker. */
export function crmWorkspaceAction(action, payload, actorEmail, environment = process.env) {
  if (!/^\S+@\S+\.\S+$/.test(String(actorEmail || ''))) throw new Error('Verified actor required');
  const request = crmActionRequest(action, payload);
  return crmRequest(request.path, { method: request.method, body: request.body, actorEmail, config: requireCrmConfiguration(environment) });
}

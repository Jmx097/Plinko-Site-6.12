import { createHmac } from 'node:crypto';
export function crmActorSigningHeaders(actorEmail, signingSecret, timestamp = Date.now()) {
  const actor = String(actorEmail || '').trim().toLowerCase();
  if (!actor || !String(signingSecret || '').trim()) throw new Error('CRM actor signing is not configured');
  const actorTimestamp = String(timestamp);
  return { 'X-CRM-Actor': actor, 'X-CRM-Actor-Timestamp': actorTimestamp, 'X-CRM-Actor-Signature': createHmac('sha256', signingSecret).update(`${actorTimestamp}.${actor}`).digest('hex') };
}

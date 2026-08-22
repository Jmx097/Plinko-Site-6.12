const EXPECTED_MAILBOX = 'jon@plinkosolutions.com';
const required = (environment, name) => {
  const value = String(environment[name] || '').trim();
  if (!value) throw new Error('Jon Gmail draft connection unavailable');
  return value;
};
const encode = (value) => Buffer.from(value, 'utf8').toString('base64url');
const header = (value) => String(value || '').replace(/[\r\n]/g, ' ').trim();

export function getJonGmailDraftConfig(environment = process.env) {
  return { clientId: required(environment, 'JON_GMAIL_CLIENT_ID'), clientSecret: required(environment, 'JON_GMAIL_CLIENT_SECRET'), refreshToken: required(environment, 'JON_GMAIL_REFRESH_TOKEN'), mailbox: EXPECTED_MAILBOX };
}
async function accessToken(config, fetchImpl) {
  const body = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: config.refreshToken, grant_type: 'refresh_token' });
  const response = await fetchImpl('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  if (!response.ok) throw new Error('Jon Gmail draft connection unavailable');
  const payload = await response.json();
  if (!payload.access_token) throw new Error('Jon Gmail draft connection unavailable');
  return payload.access_token;
}
export async function createJonGmailDraft({ to, subject, body }, environment = process.env, fetchImpl = fetch) {
  const recipient = header(to), cleanSubject = header(subject), cleanBody = String(body || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || !cleanSubject || !cleanBody) throw new Error('Complete recipient, subject, and body are required');
  const config = getJonGmailDraftConfig(environment), token = await accessToken(config, fetchImpl);
  const profileResponse = await fetchImpl('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: { authorization: `Bearer ${token}` } });
  const profile = profileResponse.ok ? await profileResponse.json() : {};
  if (String(profile.emailAddress || '').toLowerCase() !== EXPECTED_MAILBOX) throw new Error('Jon Gmail mailbox verification failed');
  const raw = encode([`From: ${EXPECTED_MAILBOX}`, `To: ${recipient}`, `Subject: ${cleanSubject}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: 8bit', '', cleanBody].join('\r\n'));
  const response = await fetchImpl('https://gmail.googleapis.com/gmail/v1/users/me/drafts', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ message: { raw } }) });
  if (!response.ok) throw new Error('Gmail draft creation failed');
  const draft = await response.json();
  if (!draft.id) throw new Error('Gmail draft receipt missing');
  return { id: draft.id, mailbox: EXPECTED_MAILBOX };
}

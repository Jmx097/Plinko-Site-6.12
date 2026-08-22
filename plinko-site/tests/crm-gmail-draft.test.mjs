import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createJonGmailDraft, getJonGmailDraftConfig } from '../lib/gmail-draft-core.mjs';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');
const env = { JON_GMAIL_CLIENT_ID: 'client', JON_GMAIL_CLIENT_SECRET: 'secret', JON_GMAIL_REFRESH_TOKEN: 'refresh' };

test('Jon Gmail configuration is server-only and complete', () => {
  assert.deepEqual(getJonGmailDraftConfig(env), { clientId: 'client', clientSecret: 'secret', refreshToken: 'refresh', mailbox: 'jon@plinkosolutions.com' });
  assert.throws(() => getJonGmailDraftConfig({}), /unavailable/);
});

test('compose-only helper verifies Jon mailbox and creates a Gmail draft without a send call', async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.includes('oauth2.googleapis.com')) return Response.json({ access_token: 'access' });
    if (url.endsWith('/profile')) return Response.json({ emailAddress: 'jon@plinkosolutions.com' });
    if (url.endsWith('/drafts')) return Response.json({ id: 'draft-provider-id' });
    return new Response('', { status: 404 });
  };
  const result = await createJonGmailDraft({ to: 'buyer@example.com', subject: 'Pilot', body: 'Hello buyer' }, env, fetchImpl);
  assert.deepEqual(result, { id: 'draft-provider-id', mailbox: 'jon@plinkosolutions.com' });
  assert.equal(calls.some((call) => /\/messages\/send|\/drafts\/send/.test(call.url)), false);
  assert.equal(calls.at(-1).url, 'https://gmail.googleapis.com/gmail/v1/users/me/drafts');
  const payload = JSON.parse(calls.at(-1).init.body);
  const mime = Buffer.from(payload.message.raw, 'base64url').toString('utf8');
  assert.match(mime, /From: jon@plinkosolutions\.com/);
  assert.match(mime, /To: buyer@example\.com/);
  assert.match(mime, /Subject: Pilot/);
});

test('CRM exposes one explicit approve-and-create-draft action and no send action', async () => {
  const [route, ui, helper, envExample] = await Promise.all([
    source('app/api/crm/workspace/route.js'),
    source('app/crm/CrmWorkspace.jsx'),
    source('lib/gmail-draft-core.mjs'),
    source('.env.example'),
  ]);
  assert.match(route, /approve_create_gmail_draft/);
  assert.match(route, /gmail_export_claim/);
  assert.match(route, /gmail_export_complete/);
  assert.match(ui, /Approve & create Gmail draft/);
  assert.match(ui, /It does not send email/);
  assert.match(helper, /gmail\/v1\/users\/me\/drafts/);
  assert.doesNotMatch(helper, /messages\/send|drafts\/send/);
  assert.match(envExample, /JON_GMAIL_REFRESH_TOKEN/);
  assert.doesNotMatch(ui, /JON_GMAIL_|Authorization|refreshToken/);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { CRM_ACTIONS, crmActionRequest } from '../lib/crm-workspace.mjs';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

const APPROVAL_ACTIONS = [
  'create_account_approval',
  'contact_approval',
  'draft_approval',
  'attempt_approval',
];

const DISALLOWED_OPERATION = /send|dispatch|export|dial|schedule|enrich|provider.*(?:send|dispatch)|linkedin.*automation/i;

test('governed parity policy records all distinct lifecycle gates and screen failures', async () => {
  const policy = await source('docs/crm-governance-invariants-v1.md');

  for (const phrase of [
    'Account fit/intake approval is distinct',
    'Research approval is distinct',
    'Contact approval is distinct',
    'Draft approval is distinct and revision-bound',
    'Manual-attempt approval is distinct',
    'DNC/suppression is terminal',
    'Audit attribution is truthful',
    'No activation through parity work',
    'Screen-level fail-closed states',
  ]) assert.match(policy, new RegExp(phrase));

  assert.match(policy, /DNC always wins/i);
  assert.match(policy, /must not show a send, export, dial, dispatch, schedule, or automation control/i);
  assert.match(policy, /Do not restart, migrate, activate, or send/);
});

test('CRM broker allows only bounded manual workflow operations', () => {
  for (const [name, action] of Object.entries(CRM_ACTIONS)) {
    assert.match(action.path({ account_id: 'a', campaign_id: 'c', contact_id: 'p', membership_id: 'm', draft_id: 'd', attempt_id: 't' }), /^\/crm\//, name);
    assert.doesNotMatch(name, DISALLOWED_OPERATION, name);
    assert.doesNotMatch(action.path({ account_id: 'a', campaign_id: 'c', contact_id: 'p', membership_id: 'm', draft_id: 'd', attempt_id: 't' }), DISALLOWED_OPERATION, name);
  }
  assert.deepEqual(Object.keys(CRM_ACTIONS).filter((name) => /approval/.test(name)).sort(), APPROVAL_ACTIONS.slice().sort());
  assert.equal(Object.hasOwn(CRM_ACTIONS, 'manual_execution'), true);
});

test('approval decisions preserve separate exact lifecycle payloads', () => {
  for (const action of APPROVAL_ACTIONS) {
    const fields = CRM_ACTIONS[action].fields;
    const payload = Object.fromEntries(fields.map((field) => [field, field === 'decision' ? 'approved' : 'record-id']));
    assert.deepEqual(crmActionRequest(action, payload).body, payload, action);
  }
  assert.deepEqual(crmActionRequest('contact_disposition', { contact_id: 'contact-id', disposition: 'do_not_contact', ignored: true }).body, {
    disposition: 'do_not_contact',
  });
});

test('portal broker keeps opaque handles and verified actor attribution server-side', async () => {
  const route = await source('app/api/crm/workspace/route.js');
  const integration = await source('lib/crm-api.mjs');

  assert.match(route, /HANDLE_PATTERN/);
  assert.match(route, /requiredHandle\(payload, 'accountKey', 'account'\)/);
  assert.match(route, /requiredHandle\(payload, 'contactKey', 'contact'\)/);
  assert.match(route, /hasCrmRecordHandle\('contact', item\.id, payload\.contactKey, config\)/);
  assert.match(integration, /crmActorSigningHeaders/);
  assert.match(integration, /Verified actor required/);
  assert.doesNotMatch(integration, /x-crm-actor-email/);
});

test('people screen fails closed before account approval and after terminal DNC', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');

  assert.match(client, /const accountApproved = detail\.recordDetails\.reviewStatus === 'approved';/);
  assert.match(client, /const terminalSuppression = person\.disposition === 'do_not_contact';/);
  assert.match(client, /terminalSuppression \? <span className="crm-muted-copy">This person is terminally suppressed\. No further review, campaign, draft, or attempt action is available\.<\/span>/);
  assert.match(client, /terminalSuppression \? <span className="crm-muted-copy">/);
  assert.match(client, /person\.approval !== 'approved'/);
  assert.match(client, /accountApproved \? <details className="crm-disclosure">/);
  assert.match(client, /Account approval is required before a person can be added\./);
  assert.match(client, /Manual only · no provider dispatch/);
  assert.doesNotMatch(client, /command\('(send|dispatch|export|dial|schedule|enrich|linkedin_automation)/i);
});

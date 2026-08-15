import test from 'node:test';
import assert from 'node:assert/strict';
import { CRM_ACTIONS, crmActionRequest } from '../lib/crm-workspace.mjs';

const payloads = {
  create_account: { source: 'import', display_name: 'Shared Co', external_reference: 'ext-1', ignored: 'no' },
  create_account_approval: { account_id: 'a', gate: 'intake', decision: 'approve', ignored: 'no' },
  create_contact: { account_id: 'a', source: 'import', external_reference: 'p-1', full_name: 'Pat Example', title: 'VP', email: 'p@example.com', phone: '1', linkedin_url: 'https://linkedin.example/p', ignored: 'no' },
  contact_approval: { contact_id: 'p', decision: 'approve', ignored: 'no' }, contact_disposition: { contact_id: 'p', disposition: 'dnc', ignored: 'no' },
  create_campaign: { name: 'Q1', channel: 'email', purpose: 'introductions', ignored: 'no' }, add_campaign_member: { campaign_id: 'c', contact_id: 'p', ignored: 'no' },
  create_draft: { membership_id: 'm', content: { body: 'Hello' }, ignored: 'no' }, draft_approval: { draft_id: 'd', decision: 'approve', ignored: 'no' },
  create_attempt: { membership_id: 'm', draft_id: 'd', ignored: 'no' }, attempt_approval: { attempt_id: 't', decision: 'approve', ignored: 'no' }, manual_execution: { attempt_id: 't', outcome_note: 'Left voicemail', ignored: 'no' },
};

test('every CRM command maps only the documented payload fields', () => {
  for (const [action, payload] of Object.entries(payloads)) {
    const request = crmActionRequest(action, payload);
    assert.deepEqual(Object.keys(request.body).sort(), CRM_ACTIONS[action].fields.slice().sort(), action);
    assert.equal(Object.hasOwn(request.body, 'ignored'), false);
  }
  assert.deepEqual(crmActionRequest('create_draft', payloads.create_draft).body, { content: { body: 'Hello' } });
  assert.throws(() => crmActionRequest('../../admin', {}), /Unsupported CRM action/);
});

test('write endpoints are explicit CRM endpoints and exclude provider automation', () => {
  for (const [name, action] of Object.entries(CRM_ACTIONS)) {
    const request = crmActionRequest(name, { ...payloads.create_contact, campaign_id: 'c', membership_id: 'm', draft_id: 'd', attempt_id: 't', contact_id: 'p' });
    assert.match(request.path, /^\/crm\//);
    assert.doesNotMatch(request.path, /send|dial|linkedin.*automation/i);
  }
});

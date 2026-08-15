import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWorkflowChoices, stageLabel } from '../app/crm/workflow.mjs';

test('operator workflow exposes display labels while retaining lifecycle references only for the broker payload', () => {
  const choices = buildWorkflowChoices({
    accounts: [{ id: 'account-internal', displayName: 'Northstar Labs', source: 'Referral' }],
    contacts: [{ id: 'contact-internal', full_name: 'Jordan Lee', title: 'VP', account_name: 'Northstar Labs' }],
    campaigns: [{ id: 'campaign-internal', name: 'Fall introductions', channel: 'email' }],
    activity: [
      // `/campaign-workbench` returns newest activity first.
      { event_type: 'attempt.planned', entity_id: 'attempt-internal', campaign_id: 'campaign-internal', contact_id: 'contact-internal', metadata: { draft_id: 'draft-internal' } },
      { event_type: 'draft.created', entity_id: 'draft-internal', campaign_id: 'campaign-internal', contact_id: 'contact-internal' },
      { event_type: 'campaign.member_added', entity_id: 'membership-internal', campaign_id: 'campaign-internal', contact_id: 'contact-internal' },
    ],
  });
  assert.deepEqual(choices.accounts[0], { id: 'account-internal', label: 'Northstar Labs', detail: 'Referral' });
  assert.equal(choices.memberships[0].label, 'Fall introductions · Jordan Lee');
  assert.equal(choices.drafts[0].label, 'Draft · Fall introductions · Jordan Lee');
  assert.equal(choices.attempts[0].label, 'Manual outreach · Fall introductions · Jordan Lee');
  assert.equal(stageLabel('approved_to_execute'), 'Ready for manual outreach');
});

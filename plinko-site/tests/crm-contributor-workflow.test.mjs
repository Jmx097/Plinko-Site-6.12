import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  ContributorValidationError,
  contributorOverviewAccounts,
  contributorSource,
  contributorSubmissionFailure,
  contributorSubmissionAcknowledgement,
  normalizeContributorIntake,
} from '../lib/crm-contributor-intake.mjs';
import { contributorQueueLabel } from '../lib/crm-contributor-queue.mjs';

const root = new URL('../', import.meta.url);
async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('contributor overview matches the exact server-derived source and exposes only the client DTO', () => {
  const email = 'contributor@example.com';
  assert.equal(contributorSource(email), 'contributor:contributor@example.com');
  const records = contributorOverviewAccounts([
    {
      account: {
        id: 'acct_mine', source: 'contributor:contributor@example.com', displayName: 'My Company',
        externalReference: 'https://example.com', approval: { state: 'approved' }, owner: 'staff',
      },
      queueState: 'station_1_account_review', nextGate: 'account_review',
    },
    {
      account: { id: 'acct_other', source: 'contributor:other@example.com', displayName: 'Other Company' },
      queueState: 'outreach_authorized',
    },
    {
      account: { id: 'acct_similar', source: 'contributor:contributor@example.com.evil', displayName: 'Similar' },
      queueState: 'station_1_account_review',
    },
  ], email);

  assert.deepEqual(records, [{
    id: 'acct_mine', displayName: 'My Company', externalReference: 'https://example.com', queueState: 'station_1_account_review',
  }]);
  assert.deepEqual(Object.keys(records[0]).sort(), ['displayName', 'externalReference', 'id', 'queueState']);
});

test('contributor intake validates and trims company/reference values before the CRM call', () => {
  assert.deepEqual(normalizeContributorIntake({ companyName: '  Example Co  ', reference: ' https://example.com/company ' }), {
    displayName: 'Example Co', externalReference: 'https://example.com/company',
  });
  assert.deepEqual(normalizeContributorIntake({ companyName: 'Example Co', reference: '   ' }), {
    displayName: 'Example Co', externalReference: '',
  });

  for (const payload of [
    { companyName: '   ' },
    { companyName: 12 },
    { companyName: 'Example', reference: 'http://example.com' },
    { companyName: 'Example', reference: 'not a url' },
    { companyName: 'Example', reference: 'ftp://example.com' },
    { companyName: 'x'.repeat(201) },
    { companyName: 'Example', reference: 'https://example.com/' + 'x'.repeat(500) },
    { companyName: 'Example', source: 'caller-controlled' },
  ]) {
    assert.throws(() => normalizeContributorIntake(payload), ContributorValidationError);
  }
});

test('submission failures map to neutral client messages and appropriate HTTP statuses', () => {
  assert.deepEqual(contributorSubmissionFailure('validation'), { status: 400, error: 'Invalid submission' });
  assert.deepEqual(contributorSubmissionFailure('configuration'), { status: 503, error: 'Company review is temporarily unavailable' });
  assert.deepEqual(contributorSubmissionFailure('upstream'), { status: 502, error: 'Unable to submit company for review' });
});

test('submission acknowledgement allowlists only safe response fields', () => {
  const acknowledgement = contributorSubmissionAcknowledgement({
    account: {
      id: 'acct_42', displayName: 'Example Co', source: 'contributor:user@example.com',
      approval: { state: 'approved' }, queueState: 'outreach_authorized', token: 'secret',
    },
  }, 'fallback');
  assert.deepEqual(acknowledgement, {
    id: 'acct_42', displayName: 'Example Co', statusLabel: 'Submitted for account review',
  });
  assert.deepEqual(Object.keys(acknowledgement).sort(), ['displayName', 'id', 'statusLabel']);
});

test('contributor queue labels remain truthful without passing account metadata to the client', () => {
  assert.equal(contributorQueueLabel('station_1_account_review'), 'Awaiting account review');
  assert.equal(contributorQueueLabel('outreach_authorized'), 'Outreach authorized');
  assert.equal(contributorQueueLabel('unknown_queue_state'), 'Status unavailable');
});

test('contributor access helper remains server-only and extends the admin allowlist', async () => {
  const helper = await source('lib/plinko-crm-contributor.mjs');
  assert.match(helper, /import 'server-only'/);
  assert.match(helper, /PLINKO_CRM_CONTRIBUTOR_EMAILS/);
  assert.match(helper, /isAdminEmail\(normalizedEmail, environment\)/);
});

test('contributor POST has neutral validation and integration responses and does not proxy the upstream account', async () => {
  const route = await source('app/api/crm/accounts/route.js');
  assert.match(route, /contributorSubmissionFailure\('validation'\)/);
  assert.match(route, /contributorSubmissionFailure\('configuration'\)/);
  assert.match(route, /contributorSubmissionAcknowledgement/);
  assert.doesNotMatch(route, /Response\.json\(account/);
  assert.doesNotMatch(route, /error\.message/);
});

test('contributor page derives an exact filtered DTO server-side before rendering the client component', async () => {
  const page = await source('app/crm/page.jsx');
  const client = await source('app/crm/CrmContributor.jsx');
  assert.match(page, /requireContributorEmail\(user\)/);
  assert.match(page, /contributorOverviewAccounts\(stations\.reviewQueue, email\)/);
  assert.doesNotMatch(page, /records=\{stations\.reviewQueue\}/);
  assert.match(client, /contributorQueueLabel\(record\.queueState\)/);
  assert.doesNotMatch(client, /normalizeContributorQueueRecord/);
  assert.match(client, /Submitted for account review/);
});

test('middleware protects the contributor page and its API endpoint', async () => {
  const middleware = await source('middleware.js');
  assert.match(middleware, /'\/crm\(\.\*\)'/);
  assert.match(middleware, /'\/api\/crm\(\.\*\)'/);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TAX_FIRM_WEEKLY_CALL_ICP } from '../lib/tax-firm-weekly-call-icp.mjs';

test('tax-firm weekly call ICP treats revenue as a sourced hypothesis, not a fact', () => {
  assert.equal(TAX_FIRM_WEEKLY_CALL_ICP.channel, 'call');
  assert.equal(TAX_FIRM_WEEKLY_CALL_ICP.employeeCount.minimumExclusive, 50);
  assert.equal(TAX_FIRM_WEEKLY_CALL_ICP.revenueCapacityHypothesis.maximumUsdExclusive, 1_000_000);
  assert.match(TAX_FIRM_WEEKLY_CALL_ICP.revenueCapacityHypothesis.label, /hypothesis/i);
  assert.match(TAX_FIRM_WEEKLY_CALL_ICP.evidenceRequirement, /source/i);
  assert.match(TAX_FIRM_WEEKLY_CALL_ICP.evidenceRequirement, /not.*asserted/i);
});

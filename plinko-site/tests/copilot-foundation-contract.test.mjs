import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  COPILOT_ACTION_RISKS,
  COPILOT_CAPABILITY,
  COPILOT_LIMITS,
  COPILOT_PARENT_CAPABILITY,
  COPILOT_POLICY_VERSION,
  COPILOT_TOOL_CATALOG,
  canExecuteCopilotRisk,
  requireCopilotTool,
} from '../lib/copilot-policy-core.mjs';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('Copilot policy is additive to the sales CRM workspace and exposes only the reviewed read/plan catalog', () => {
  assert.equal(COPILOT_POLICY_VERSION, 'copilot-foundation-v1');
  assert.equal(COPILOT_CAPABILITY, 'copilot.workspace');
  assert.equal(COPILOT_PARENT_CAPABILITY, 'crm.workspace');
  assert.deepEqual(Object.keys(COPILOT_TOOL_CATALOG).sort(), [
    'account_detail', 'account_search', 'blocked_state_explanation', 'my_work', 'next_action_plan', 'tasks',
  ]);
  for (const tool of Object.values(COPILOT_TOOL_CATALOG)) {
    assert.ok([COPILOT_ACTION_RISKS.read, COPILOT_ACTION_RISKS.plan].includes(tool.risk));
    assert.ok(Number.isInteger(tool.maxRecords) && tool.maxRecords > 0);
  }
  assert.equal(canExecuteCopilotRisk(COPILOT_ACTION_RISKS.read), true);
  assert.equal(canExecuteCopilotRisk(COPILOT_ACTION_RISKS.plan), true);
  assert.equal(canExecuteCopilotRisk(COPILOT_ACTION_RISKS.write), false);
  assert.equal(canExecuteCopilotRisk(COPILOT_ACTION_RISKS.external), false);
  assert.throws(() => requireCopilotTool('send_email'), /Unsupported Copilot tool/);
});

test('Copilot foundation has bounded run, rate, token, artifact, and cost limits', () => {
  for (const value of Object.values(COPILOT_LIMITS)) assert.equal(typeof value, 'number');
  assert.ok(COPILOT_LIMITS.maxConcurrentRunsPerActor >= 1);
  assert.ok(COPILOT_LIMITS.maxInputTokensPerRun > COPILOT_LIMITS.maxOutputTokensPerRun);
  assert.ok(COPILOT_LIMITS.maxEstimatedModelCostUsdPerRun > 0);
});

test('policy document retains server-derived scope, model routing, audit, and prohibition gates before implementation', async () => {
  const policy = await source('docs/copilot-foundation-v1.md');
  for (const phrase of [
    '`copilot.workspace`',
    'server-derived',
    'signed opaque handle',
    'R0 — read-only',
    'R1 — propose-only',
    'R2 — review-required',
    'R3 — external or irreversible',
    'immutable audit event',
    'No UI, model invocation, worker deployment, or role-catalog change',
    'default Hermes',
    'generic proxy',
  ]) assert.match(policy, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

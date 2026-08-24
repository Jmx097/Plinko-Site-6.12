import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { EventSchemas } from '@ag-ui/core';
import {
  buildPocketHermesInstructions,
  createPocketHermesAguiResponse,
  derivePocketHermesScope,
  getPocketHermesConfig,
  normalizeAguiHermesInput,
} from '../lib/copilot-hermes-agui.mjs';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');
const input = {
  threadId: 'thread-1',
  runId: 'run-1',
  state: {},
  messages: [{ id: 'user-1', role: 'user', content: 'What is next?' }],
  tools: [],
  context: [],
  forwardedProps: {},
};

test('Pocket Hermes configuration is server-only HTTPS and fail-closed', () => {
  assert.deepEqual(getPocketHermesConfig({ POCKET_HERMES_API_BASE_URL: 'https://hermes.example/v1/', POCKET_HERMES_API_KEY: 'bridge-key' }), { baseUrl: 'https://hermes.example/v1', apiKey: 'bridge-key' });
  assert.throws(() => getPocketHermesConfig({ POCKET_HERMES_API_BASE_URL: 'http://remote.example/v1', POCKET_HERMES_API_KEY: 'x' }), /unavailable/);
  assert.throws(() => getPocketHermesConfig({ POCKET_HERMES_API_BASE_URL: 'https://hermes.example/v1' }), /unavailable/);
});

test('AG-UI input is bounded and Hermes scope is server-derived', () => {
  assert.deepEqual(normalizeAguiHermesInput(input), { threadId: 'thread-1', runId: 'run-1', messages: [{ role: 'user', content: 'What is next?' }] });
  assert.throws(() => normalizeAguiHermesInput({ ...input, messages: [{ id: 'a', role: 'assistant', content: 'Only assistant' }] }), /final user/);
  const a = derivePocketHermesScope({ userId: 'user-1', tenantKey: 'tenant-alpha', threadId: 'thread-1' });
  const b = derivePocketHermesScope({ userId: 'user-2', tenantKey: 'tenant-alpha', threadId: 'thread-1' });
  assert.match(a.sessionId, /^pocket_[a-f0-9]{48}$/);
  assert.match(a.sessionKey, /^pocket:[a-f0-9]{48}$/);
  assert.notDeepEqual(a, b);
});

test('Hermes instructions preserve CRM authority and weekly cadence', () => {
  const value = buildPocketHermesInstructions({ crmGrounding: { accounts: [{ name: 'Northstar' }] }, policyVersion: 'copilot-foundation-v1' });
  for (const phrase of ['default Hermes profile', 'CRM snapshot as the authoritative', 'five new accounts per week', 'email Day 1', 'manual founder call Day 2', 'email Day 4', 'manual founder call Day 7']) assert.match(value, new RegExp(phrase, 'i'));
});

test('Hermes Responses stream is translated to valid AG-UI lifecycle and text events', async () => {
  let observed;
  const upstreamBody = [
    'data: {"type":"response.created","response":{"id":"resp_test","status":"in_progress"}}\n\n',
    'data: {"type":"response.output_text.delta","delta":"Hello "}\n\n',
    'data: {"type":"response.output_text.delta","delta":"Pocket"}\n\n',
    'data: {"type":"response.completed","response":{"id":"resp_test","status":"completed"}}\n\n',
  ].join('');
  const response = createPocketHermesAguiResponse({
    input,
    userId: 'user-1',
    tenantKey: 'tenant-alpha',
    crmGrounding: { accounts: [{ name: 'Northstar', status: 'approved' }] },
    policyVersion: 'copilot-foundation-v1',
    config: { baseUrl: 'https://hermes.example/v1', apiKey: 'bridge-key' },
    fetchImpl: async (url, options) => {
      observed = { url, options };
      return new Response(upstreamBody, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    },
  });
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const body = await response.text();
  const events = body.split('\n\n').filter(Boolean).map((frame) => JSON.parse(frame.replace(/^data:\s*/, '')));
  for (const event of events) assert.equal(EventSchemas.safeParse(event).success, true, JSON.stringify(event));
  assert.deepEqual(events.map((event) => event.type), ['RUN_STARTED', 'TEXT_MESSAGE_START', 'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_END', 'RUN_FINISHED']);
  assert.equal(events.filter((event) => event.type === 'TEXT_MESSAGE_CONTENT').map((event) => event.delta).join(''), 'Hello Pocket');
  assert.equal(observed.url, 'https://hermes.example/v1/responses');
  assert.equal(observed.options.headers.authorization, 'Bearer bridge-key');
  assert.equal(observed.options.headers['x-hermes-session-id'], undefined);
  assert.match(observed.options.headers['x-hermes-session-key'], /^pocket:/);
  const hermesBody = JSON.parse(observed.options.body);
  assert.equal(hermesBody.input, 'What is next?');
  assert.match(hermesBody.conversation, /^pocket_/);
  assert.equal(hermesBody.store, true);
  assert.doesNotMatch(body, /bridge-key|user-1|tenant-alpha/);
});

test('protected route derives identity and CRM grounding before creating the AG-UI stream', async () => {
  const [route, ui, env] = await Promise.all([
    source('app/api/copilot/agui/route.js'),
    source('app/copilot/CopilotWorkspace.jsx'),
    source('.env.example'),
  ]);
  assert.match(route, /await auth\(\)/);
  assert.match(route, /requireCopilotWorkspaceAccess/);
  assert.match(route, /crmWorkspaceAction\('list_accounts'/);
  assert.match(route, /createPocketHermesAguiResponse/);
  assert.match(ui, /new HttpAgent/);
  assert.match(ui, /url: '\/api\/copilot\/agui'/);
  assert.match(ui, /default Hermes profile’s durable memory/);
  assert.doesNotMatch(ui, /POCKET_HERMES_API_KEY|API_SERVER_KEY|Authorization/i);
  assert.match(env, /POCKET_HERMES_API_BASE_URL/);
  assert.match(env, /POCKET_HERMES_API_KEY/);
  assert.doesNotMatch(env, /NEXT_PUBLIC_POCKET_HERMES/);
});

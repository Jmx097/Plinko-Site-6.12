import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workerSpecUrl = new URL('../docs/copilot-private-worker-v1.md', import.meta.url);

async function workerSpec() {
  return readFile(workerSpecUrl, 'utf8');
}

test('private Copilot worker is isolated from Hermes, public ingress, and generic execution', async () => {
  const spec = await workerSpec();
  for (const phrase of [
    'dedicated private compute project/host',
    'distinct from the shared Hermes host',
    '`default` Hermes profile',
    'There is no public DNS record, public load balancer, browser route, webhook ingress',
    'Pocket is the only entry point',
    'Egress is deny-by-default',
    'shell, browser, filesystem',
    'No customer context or CRM data is written to Hermes memory',
  ]) assert.match(spec, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('Pocket to worker contract is private, signed, bounded, and replay-safe', async () => {
  const spec = await workerSpec();
  for (const phrase of [
    'Ed25519 detached signature',
    'X-Copilot-Contract-Version',
    'X-Copilot-Key-Id',
    'X-Copilot-Signature',
    'X-Copilot-Request-Id',
    'X-Copilot-Sent-At',
    'private mTLS',
    'accepted skew is at most 60 seconds',
    'replay',
    'idempotency-key reuse with a different signed normalized request is rejected',
    'raw CRM/Core IDs',
    'browser supplies only bounded reviewed-tool input',
  ]) assert.match(spec, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('worker spec provides explicit queue, cancellation, retry, routing, and cost controls', async () => {
  const spec = await workerSpec();
  for (const phrase of [
    'queued -> running -> completed',
    'cancel_requested -> cancelled',
    'cancellation never deletes a run',
    'at most two retries after the original attempt',
    'No hidden spend or unbounded queue replay is permitted',
    'atomic persistence-backed guards reserve actor/org concurrency',
    'Missing pricing, token accounting, a limit counter, reservation, policy version, or audit writer is an `unavailable` denial',
    'No default Hermes, public-chat model, user-selected provider/model',
    'R0 tools never invoke a model',
  ]) assert.match(spec, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('worker health and audit operationalize redacted correlation and safe rollback', async () => {
  const spec = await workerSpec();
  for (const phrase of [
    'Private-only readiness/liveness endpoints',
    '`live`',
    '`ready`',
    '`healthz`',
    'queue depth/age',
    'Pocket creates one correlation ID',
    'They never contain keys, raw prompts, model payloads/responses, contact data, or raw CRM IDs',
    'disable Pocket enqueue',
    'Do not repoint Copilot work to default Hermes, public chat, or a shared worker',
    'downstream private-worker provisioning card remains blocked pending human infrastructure approval',
  ]) assert.match(spec, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

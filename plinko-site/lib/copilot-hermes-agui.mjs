import { createHash, randomUUID } from 'node:crypto';
import {
  EventType,
  RunAgentInputSchema,
  RunErrorEventSchema,
  RunFinishedEventSchema,
  RunStartedEventSchema,
  TextMessageContentEventSchema,
  TextMessageEndEventSchema,
  TextMessageStartEventSchema,
} from '@ag-ui/core';

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 12_000;
const MAX_GROUNDING_CHARS = 16_000;

const text = (value) => typeof value === 'string' ? value.trim() : '';

export function getPocketHermesConfig(environment = process.env) {
  const baseUrl = text(environment.POCKET_HERMES_API_BASE_URL).replace(/\/$/, '');
  const apiKey = text(environment.POCKET_HERMES_API_KEY);
  if (!apiKey || !/^https:\/\//.test(baseUrl)) throw new Error('Pocket Hermes bridge unavailable');
  return { baseUrl, apiKey };
}

export function derivePocketHermesScope({ userId, tenantKey, threadId }) {
  for (const value of [userId, tenantKey, threadId]) {
    if (!text(value) || text(value).length > 256 || /[\r\n\x00]/.test(value)) throw new Error('Invalid Hermes session scope');
  }
  const digest = createHash('sha256').update(`${userId}\n${tenantKey}\n${threadId}`).digest('hex');
  const actorDigest = createHash('sha256').update(`${userId}\n${tenantKey}`).digest('hex');
  return {
    sessionId: `pocket_${digest.slice(0, 48)}`,
    sessionKey: `pocket:${actorDigest.slice(0, 48)}`,
  };
}

function messageContent(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && value.type === 'text' && typeof value.text === 'string') return value.text;
  if (Array.isArray(value)) return value.map(messageContent).filter(Boolean).join('\n');
  return '';
}

export function normalizeAguiHermesInput(input) {
  const parsed = RunAgentInputSchema.parse(input);
  const messages = parsed.messages.slice(-MAX_MESSAGES).flatMap((message) => {
    if (!['user', 'assistant'].includes(message.role)) return [];
    const content = messageContent(message.content).trim();
    if (!content || content.length > MAX_MESSAGE_CHARS) return [];
    return [{ role: message.role, content }];
  });
  if (!messages.length || messages.at(-1).role !== 'user') throw new Error('A final user message is required');
  return { threadId: parsed.threadId, runId: parsed.runId, messages };
}

export function buildPocketHermesInstructions({ crmGrounding, policyVersion }) {
  const grounding = JSON.stringify(crmGrounding || {}).slice(0, MAX_GROUNDING_CHARS);
  return [
    'You are Hermes operating inside the authenticated Plinko Pocket CRM.',
    'Use the default Hermes profile, its durable memory, and its available tools, but treat the supplied CRM snapshot as the authoritative current operating record.',
    'Never infer that account approval grants person research, enrichment, drafting, sending, dialing, or provider authority.',
    'The initial outbound target is five new accounts per week, one verified buyer per account: email Day 1, manual founder call Day 2, email Day 4, manual founder call Day 7.',
    'Emails require approved contact, exact draft, exact attempt, suppression checks, provider receipt, and CRM reconciliation. Calls are manual and require a CRM outcome note.',
    'Do not claim that an email, call, proposal, meeting, or sale occurred unless the CRM snapshot or a verified tool result proves it.',
    'Give concise operator answers with the next permitted action and the blocking gate when applicable.',
    `Pocket policy version: ${policyVersion}.`,
    `Current minimized CRM snapshot: ${grounding}`,
  ].join('\n');
}

function aguiFrame(event) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function parseOpenAiFrames(buffer) {
  const frames = [];
  let rest = buffer;
  while (true) {
    const boundary = rest.indexOf('\n\n');
    if (boundary < 0) break;
    const block = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);
    for (const line of block.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const value = line.slice(5).trim();
      if (value) frames.push(value);
    }
  }
  return { frames, rest };
}

export function createPocketHermesAguiResponse({ input, userId, tenantKey, crmGrounding, policyVersion, config, fetchImpl = fetch }) {
  const normalized = normalizeAguiHermesInput(input);
  const scope = derivePocketHermesScope({ userId, tenantKey, threadId: normalized.threadId });
  const assistantMessageId = `msg_${randomUUID()}`;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event) => controller.enqueue(encoder.encode(aguiFrame(event)));
      const started = RunStartedEventSchema.parse({ type: EventType.RUN_STARTED, threadId: normalized.threadId, runId: normalized.runId });
      send(started);
      try {
        const upstream = await fetchImpl(`${config.baseUrl}/responses`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            'content-type': 'application/json',
            'x-hermes-session-key': scope.sessionKey,
          },
          body: JSON.stringify({
            model: 'hermes-agent',
            input: normalized.messages.at(-1).content,
            conversation: scope.sessionId,
            instructions: buildPocketHermesInstructions({ crmGrounding, policyVersion }),
            stream: true,
            store: true,
          }),
        });
        if (!upstream.ok || !upstream.body) throw new Error('Hermes response unavailable');
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let textStarted = false;
        let terminal = false;
        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
          const parsed = parseOpenAiFrames(buffer);
          buffer = parsed.rest;
          for (const frame of parsed.frames) {
            if (frame === '[DONE]') continue;
            let payload;
            try { payload = JSON.parse(frame); } catch { continue; }
            if (payload?.type === 'response.output_text.delta' && typeof payload.delta === 'string' && payload.delta) {
              if (!textStarted) {
                send(TextMessageStartEventSchema.parse({ type: EventType.TEXT_MESSAGE_START, messageId: assistantMessageId, role: 'assistant' }));
                textStarted = true;
              }
              send(TextMessageContentEventSchema.parse({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: assistantMessageId, delta: payload.delta }));
            }
            if (payload?.type === 'response.completed') {
              if (textStarted) send(TextMessageEndEventSchema.parse({ type: EventType.TEXT_MESSAGE_END, messageId: assistantMessageId }));
              send(RunFinishedEventSchema.parse({ type: EventType.RUN_FINISHED, threadId: normalized.threadId, runId: normalized.runId }));
              terminal = true;
            }
            if (payload?.type === 'response.failed') throw new Error('Hermes response failed');
          }
          if (done) break;
        }
        if (!terminal) throw new Error('Hermes response ended without a terminal event');
      } catch {
        send(RunErrorEventSchema.parse({ type: EventType.RUN_ERROR, message: 'Pocket Hermes chat is unavailable. No CRM or external action was performed.' }));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}

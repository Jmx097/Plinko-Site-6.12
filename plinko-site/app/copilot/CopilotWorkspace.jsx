'use client';

import { useRef, useState } from 'react';
import { HttpAgent } from '@ag-ui/client';

const PLAYBOOKS = [
  {
    title: 'Plan today',
    eyebrow: 'Daily operator loop',
    prompt: 'Review my authorized CRM workspace. What are the three highest-priority items for today, why do they matter, and what is the next permitted action for each?',
  },
  {
    title: 'Work the outbound queue',
    eyebrow: 'Find → follow up',
    prompt: 'Review the current outbound queue against the five-account weekly cadence. Identify who is ready for the next manual step, which approval gates are blocking progress, and the next permitted action.',
  },
  {
    title: 'Prepare a call',
    eyebrow: 'Manual founder call',
    prompt: 'Prepare me for the next permitted manual follow-up call. Give me the account context, the buyer hypothesis, the decision I need to learn, and a concise call opener. Do not imply the call has been made.',
  },
  {
    title: 'Prepare a draft',
    eyebrow: 'Approval-ready work',
    prompt: 'Identify the most appropriate approved-contact path for the next email draft. Prepare a concise draft for human review, state every approval gate still required, and do not send or create anything.',
  },
  {
    title: 'Clear a blocker',
    eyebrow: 'Decision governance',
    prompt: 'Explain the most important blocker in my authorized CRM workspace: what is missing, who owns the next decision, and what is the smallest permitted action that moves it forward?',
  },
  {
    title: 'Reflect on the week',
    eyebrow: 'Report',
    prompt: 'Summarize the current week against the five-account outbound operating model. Separate recorded progress from assumptions, identify exceptions, and recommend one corrective next action.',
  },
];

function visibleMessageText(message) {
  if (typeof message?.content === 'string') return message.content;
  if (Array.isArray(message?.content)) return message.content.map((part) => typeof part === 'string' ? part : part?.text || '').filter(Boolean).join('\n');
  return '';
}

function Message({ children, tone = 'assistant' }) {
  return <article className={`copilot-message copilot-message-${tone}`}><span className="copilot-message-label">{tone === 'operator' ? 'You' : 'Pocket Copilot'}</span><div>{children}</div></article>;
}

export default function CopilotWorkspace() {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatBusy, setChatBusy] = useState(false);
  const composerRef = useRef(null);
  const hermesAgentRef = useRef(null);

  function pocketHermesAgent() {
    if (!hermesAgentRef.current) {
      hermesAgentRef.current = new HttpAgent({
        agentId: 'plinko-pocket-default-hermes',
        description: 'The default Hermes profile’s durable memory, grounded in the authorized Plinko CRM workspace.',
        threadId: crypto.randomUUID(),
        url: '/api/copilot/agui',
        initialMessages: [],
      });
    }
    return hermesAgentRef.current;
  }

  function prefill(prompt) {
    setChatInput(prompt);
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  async function submitHermesChat(event) {
    event.preventDefault();
    const content = chatInput.trim();
    if (!content || chatBusy) return;
    const agent = pocketHermesAgent();
    agent.addMessage({ id: crypto.randomUUID(), role: 'user', content });
    setChatInput('');
    setChatMessages([...agent.messages]);
    setChatBusy(true);
    try {
      await agent.runAgent({}, {
        onMessagesChanged({ messages }) { setChatMessages(messages.map((message) => ({ ...message }))); },
      });
    } catch {
      setChatMessages((items) => [...items, { id: crypto.randomUUID(), role: 'assistant', content: 'Pocket Copilot is unavailable. No CRM or external action was performed.' }]);
    } finally {
      setChatBusy(false);
    }
  }

  return <main className="copilot-shell copilot-command-shell">
    <header className="copilot-topbar">
      <a className="copilot-brand" href="/account">Plinko Pocket</a>
      <nav aria-label="Pocket workspace"><a href="/account">Account home</a><a href="/crm">My Work</a><a aria-current="page" href="/copilot">Copilot</a></nav>
    </header>
    <section className="copilot-command" aria-labelledby="copilot-title">
      <header className="copilot-command-heading">
        <div><p className="copilot-eyebrow">CRM operating partner</p><h1 id="copilot-title">What do you want to move forward?</h1><p>Start from a playbook or write your own request. Copilot grounds each answer in your authorized CRM context and shows the next permitted step.</p></div>
        <span className={chatBusy ? 'copilot-live is-busy' : 'copilot-live'} role="status" aria-live="polite">{chatBusy ? 'Thinking…' : 'CRM-grounded'}</span>
      </header>

      {!chatMessages.length && <section className="copilot-playbook" aria-labelledby="playbook-title">
        <div className="copilot-playbook-heading"><p className="copilot-eyebrow">Prompt playbook</p><h2 id="playbook-title">Choose a starting point</h2><p>Each option prefills a useful question. Review or tailor it before you send.</p></div>
        <div className="copilot-playbook-grid">{PLAYBOOKS.map((item) => <button key={item.title} className="copilot-playbook-card" type="button" onClick={() => prefill(item.prompt)}><span>{item.eyebrow}</span><strong>{item.title}</strong><small>Prefill prompt →</small></button>)}</div>
      </section>}

      <section className="copilot-chat-stage" aria-label="Pocket Copilot conversation">
        {chatMessages.length ? <div className="copilot-transcript copilot-hermes-transcript" aria-live="polite">{chatMessages.filter((message) => ['user', 'assistant'].includes(message.role) && visibleMessageText(message)).map((message) => <Message key={message.id} tone={message.role === 'user' ? 'operator' : 'assistant'}><p>{visibleMessageText(message)}</p></Message>)}</div> : <div className="copilot-empty-chat"><span>✦</span><p>Pick a playbook above, or ask Copilot about a specific account, approval blocker, task, draft, or manual follow-up.</p></div>}
        <form className="copilot-composer copilot-command-composer" onSubmit={submitHermesChat}>
          <label htmlFor="copilot-hermes-chat">Ask Pocket Copilot</label>
          <div><textarea ref={composerRef} id="copilot-hermes-chat" rows="4" maxLength="12000" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="What should I move forward today?" /><button type="submit" disabled={chatBusy || !chatInput.trim()}>{chatBusy ? 'Working…' : 'Send'}</button></div>
          <p>Copilot can read and propose. It cannot approve, create, contact, send, dial, or modify CRM records.</p>
        </form>
      </section>
    </section>
  </main>;
}

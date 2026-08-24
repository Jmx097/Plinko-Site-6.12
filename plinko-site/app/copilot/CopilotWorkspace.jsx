'use client';

import { useEffect, useRef, useState } from 'react';
import { HttpAgent } from '@ag-ui/client';

const PLAYBOOKS = [
  ['Plan today', 'Review my authorized CRM workspace. What are the three highest-priority items for today, why do they matter, and what is the next permitted action for each?'],
  ['Work the queue', 'Review the current outbound queue against the five-account weekly cadence. Identify who is ready for the next manual step, what is blocked, and the next permitted action.'],
  ['Prepare a call', 'Prepare me for the next permitted manual follow-up call: account context, buyer hypothesis, decision to learn, and a concise opener. Do not imply the call has been made.'],
  ['Clear a blocker', 'Explain the most important blocker in my authorized CRM workspace: what is missing, who owns the decision, and the smallest permitted action that moves it forward.'],
];

function text(message) {
  if (typeof message?.content === 'string') return message.content;
  if (Array.isArray(message?.content)) return message.content.map((part) => typeof part === 'string' ? part : part?.text || '').filter(Boolean).join('\n');
  return '';
}

function formatTime(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No date' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function Message({ message }) {
  const operator = message.role === 'user';
  return <article className={`copilot-message ${operator ? 'copilot-message-operator' : 'copilot-message-assistant'}`}><span className="copilot-message-label">{operator ? 'You' : 'Pocket Copilot'}</span><p>{text(message)}</p></article>;
}

export default function CopilotWorkspace() {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [gradient, setGradient] = useState(false);
  const [home, setHome] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [notice, setNotice] = useState('');
  const [mutation, setMutation] = useState(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const composerRef = useRef(null);
  const hermesAgentRef = useRef(null);

  async function refreshHome() {
    try {
      const response = await fetch('/api/crm/workspace?directory=home', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'CRM unavailable');
      setHome(payload);
      setSelectedAccount((current) => payload.accounts?.find((account) => account.key === current?.key) || payload.accounts?.[0] || null);
      return payload;
    } catch (error) {
      setNotice(`Live CRM context is unavailable: ${error.message}.`);
      return null;
    }
  }

  useEffect(() => { refreshHome(); }, []);

  function agent() {
    if (!hermesAgentRef.current) hermesAgentRef.current = new HttpAgent({
      agentId: 'plinko-pocket-default-hermes',
      description: 'The default Hermes profile’s durable memory, grounded in the authorized Plinko CRM workspace.',
      threadId: crypto.randomUUID(),
      url: '/api/copilot/agui',
      initialMessages: [],
    });
    return hermesAgentRef.current;
  }

  function prefill(prompt) {
    setChatInput(prompt);
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  async function submitChat(event) {
    event.preventDefault();
    const content = chatInput.trim();
    if (!content || chatBusy) return;
    const session = agent();
    session.addMessage({ id: crypto.randomUUID(), role: 'user', content });
    setChatInput('');
    setChatMessages([...session.messages]);
    setChatBusy(true);
    try {
      await session.runAgent({}, { onMessagesChanged({ messages }) { setChatMessages(messages.map((message) => ({ ...message }))); } });
    } catch {
      setChatMessages((items) => [...items, { id: crypto.randomUUID(), role: 'assistant', content: 'Pocket Copilot is unavailable. No CRM or external action was performed.' }]);
    } finally {
      setChatBusy(false);
    }
  }

  async function commitMutation() {
    if (!mutation || mutationBusy) return;
    setMutationBusy(true);
    try {
      const response = await fetch('/api/crm/workspace', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: mutation.action, payload: mutation.payload }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'CRM could not save this change');
      await refreshHome();
      setNotice(`${mutation.label} recorded. The live CRM panel has refreshed.`);
      setMutation(null);
    } catch (error) {
      setNotice(`That change was not saved: ${error.message}.`);
    } finally {
      setMutationBusy(false);
    }
  }

  function propose(action, label, payload) { setMutation({ action, label, payload }); }
  const messages = chatMessages.filter((message) => ['user', 'assistant'].includes(message.role) && text(message));
  const accounts = home?.accounts || [];
  const tasks = home?.tasks || [];

  return <main className={`copilot-shell copilot-console${gradient ? ' is-gradient' : ''}`}>
    <header className="copilot-console-header">
      <a className="copilot-brand" href="/account">Plinko Pocket</a>
      <div className="copilot-console-identity"><span>Copilot</span><strong>Day-to-day operating console</strong></div>
      <nav aria-label="Pocket workspace"><a href="/crm">CRM</a><a href="/account">Account</a><button type="button" aria-pressed={gradient} onClick={() => setGradient((value) => !value)}>{gradient ? 'Standard mode' : 'Gradient mode'}</button></nav>
    </header>

    <section className="copilot-console-grid" aria-label="Copilot operating console">
      <section className="copilot-console-chat" aria-labelledby="copilot-title">
        <header className="copilot-console-title"><div><p className="copilot-eyebrow">Operator command center</p><h1 id="copilot-title">What should move next?</h1></div><span className={chatBusy ? 'copilot-live is-busy' : 'copilot-live'} role="status" aria-live="polite">{chatBusy ? 'Thinking…' : 'Live CRM context'}</span></header>
        {!messages.length && <div className="copilot-playbook-row" aria-label="Prompt playbook">{PLAYBOOKS.map(([title, prompt]) => <button key={title} type="button" onClick={() => prefill(prompt)}><strong>{title}</strong><span>Prefill →</span></button>)}</div>}
        <div className="copilot-console-transcript" aria-live="polite">{messages.length ? messages.map((message) => <Message key={message.id} message={message} />) : <div className="copilot-console-empty"><strong>Start with a playbook or ask directly.</strong><span>Copilot will use your authorized CRM context and propose the next permitted move.</span></div>}</div>
        <form className="copilot-console-composer" onSubmit={submitChat}><textarea ref={composerRef} value={chatInput} onChange={(event) => setChatInput(event.target.value)} maxLength="12000" placeholder="Ask Copilot what to move forward…" aria-label="Ask Pocket Copilot" /><button type="submit" disabled={!chatInput.trim() || chatBusy}>{chatBusy ? 'Working…' : 'Send'}</button></form>
        <p className="copilot-console-boundary">Copilot can propose work. Record changes require an explicit, reviewable confirmation and still preserve account, contact, DNC, draft, and send gates.</p>
      </section>

      <aside className="copilot-live-panel" aria-labelledby="live-crm-title">
        <header><div><p className="copilot-eyebrow">Live CRM</p><h2 id="live-crm-title">Work context</h2></div><button type="button" className="copilot-refresh" onClick={refreshHome}>Refresh</button></header>
        {notice && <p className="copilot-console-notice" role="status">{notice}</p>}
        <section className="copilot-context-section"><h3>Accounts</h3><div className="copilot-account-list">{accounts.length ? accounts.slice(0, 6).map((account) => <button key={account.key} type="button" className={selectedAccount?.key === account.key ? 'is-active' : ''} onClick={() => setSelectedAccount(account)}><strong>{account.name}</strong><span>{account.status} · {account.nextAction}</span></button>) : <p>No authorized accounts are available.</p>}</div></section>
        {selectedAccount && <section className="copilot-record-card" aria-label={`Actions for ${selectedAccount.name}`}><p className="copilot-eyebrow">Selected record</p><h3>{selectedAccount.name}</h3><p>{selectedAccount.status} · next: {selectedAccount.nextAction}</p><div className="copilot-record-actions"><button type="button" onClick={() => propose('account_approval', `Approve ${selectedAccount.name}`, { accountKey: selectedAccount.key, decision: 'approved' })}>Approve account</button><button type="button" onClick={() => propose('account_approval', `Reject ${selectedAccount.name}`, { accountKey: selectedAccount.key, decision: 'rejected' })}>Reject account</button><button type="button" onClick={() => propose('create_task', `Create a follow-up task for ${selectedAccount.name}`, { accountKey: selectedAccount.key, title: `Follow up: ${selectedAccount.name}`, dueAt: null })}>Create follow-up task</button><button type="button" onClick={() => propose('create_note', `Add a review note to ${selectedAccount.name}`, { accountKey: selectedAccount.key, note: 'Reviewed in Pocket Copilot. Next action remains operator-owned.' })}>Add review note</button></div></section>}
        <section className="copilot-context-section copilot-task-context"><h3>Open tasks</h3>{tasks.length ? <ol>{tasks.slice(0, 5).map((task, index) => <li key={`${task.accountKey}-${index}`}><strong>{task.title}</strong><span>{task.accountName} · {formatTime(task.dueAt)}</span></li>)}</ol> : <p>No open tasks are recorded.</p>}</section>
      </aside>
    </section>

    {mutation && <div className="copilot-confirm-backdrop" role="presentation"><section className="copilot-confirm" role="dialog" aria-modal="true" aria-labelledby="copilot-confirm-title"><p className="copilot-eyebrow">Confirm CRM change</p><h2 id="copilot-confirm-title">{mutation.label}?</h2><p>This writes a governed CRM record and refreshes the live panel. It does not contact anyone, send email, dial a call, or bypass existing approval gates.</p><div><button type="button" onClick={() => setMutation(null)} disabled={mutationBusy}>Cancel</button><button type="button" className="copilot-confirm-primary" onClick={commitMutation} disabled={mutationBusy}>{mutationBusy ? 'Saving…' : 'Confirm change'}</button></div></section></div>}
  </main>;
}

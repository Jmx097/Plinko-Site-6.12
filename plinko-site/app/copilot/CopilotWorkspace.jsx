'use client';

import { useRef, useState } from 'react';
import { HttpAgent } from '@ag-ui/client';

const SUGGESTIONS = [
  { label: 'Show my work', copy: 'Review the accounts currently available in my authorized CRM workspace.', command: { tool: 'my_work' } },
  { label: 'Find an account', copy: 'Search the authorized account directory by company name.', focusSearch: true },
  { label: 'Open tasks', copy: 'Find open tasks across the authorized account workspace.', command: { tool: 'tasks', query: '' } },
];

function formatDate(value) {
  if (!value) return 'time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'time unavailable' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function crmLink(accountKey) {
  return `/crm?module=accounts&record=${encodeURIComponent(accountKey)}`;
}

function Message({ children, tone = 'assistant' }) {
  return <article className={`copilot-message copilot-message-${tone}`}><span className="copilot-message-label">{tone === 'operator' ? 'You' : 'Copilot'}</span><div>{children}</div></article>;
}

function visibleMessageText(message) {
  if (typeof message?.content === 'string') return message.content;
  if (Array.isArray(message?.content)) return message.content.map((part) => typeof part === 'string' ? part : part?.text || '').filter(Boolean).join('\n');
  return '';
}

function Citation({ accountKey, label = 'Open CRM account' }) {
  if (!accountKey) return null;
  return <a className="copilot-citation" href={crmLink(accountKey)}>{label} <span aria-hidden="true">↗</span></a>;
}

function AccountRows({ accounts, onTool }) {
  if (!accounts?.length) return <p className="copilot-muted">No accounts matched in your authorized CRM workspace.</p>;
  return <ul className="copilot-result-list">{accounts.map((account) => <li key={account.accountKey}>
    <div><strong>{account.name}</strong><span>{account.status} · next: {account.nextAction}</span><small>Updated {formatDate(account.updatedAt)}</small></div>
    <div className="copilot-row-actions"><Citation accountKey={account.accountKey} /><button type="button" onClick={() => onTool({ tool: 'account_detail', accountKey: account.accountKey }, `Inspect ${account.name}`)}>Inspect</button></div>
  </li>)}</ul>;
}

function TaskRows({ tasks, onTool }) {
  if (!tasks?.length) return <p className="copilot-muted">No tasks matched in your authorized CRM workspace.</p>;
  return <ul className="copilot-result-list">{tasks.map((task, index) => <li key={`${task.accountKey}-${index}`}>
    <div><strong>{task.title}</strong><span>{task.accountName} · {task.status || 'status unavailable'}</span><small>{task.owner || 'Unassigned'} · due {formatDate(task.dueAt)}</small></div>
    <Citation accountKey={task.accountKey} />
  </li>)}</ul>;
}

function Result({ response, onTool }) {
  const { tool, result } = response;
  if (tool === 'my_work' || tool === 'account_search') return <><p>{tool === 'my_work' ? 'Here are the accounts available in your current authorized workspace.' : 'Here are the matching authorized accounts.'}</p><AccountRows accounts={result.accounts} onTool={onTool} /></>;
  if (tool === 'tasks') return <><p>These are the matching tasks in the authorized account workspace.</p><TaskRows tasks={result.tasks} onTool={onTool} /></>;
  if (tool === 'account_detail') return <section className="copilot-detail"><p><strong>{result.name}</strong> is currently <span className="copilot-status">{result.status}</span>.</p><dl><div><dt>Next action</dt><dd>{result.nextAction?.label || 'No next action recorded'}</dd></div><div><dt>Owner</dt><dd>{result.nextAction?.owner || 'Unassigned'}</dd></div><div><dt>Due</dt><dd>{formatDate(result.nextAction?.dueAt)}</dd></div></dl><Citation accountKey={result.accountKey} /><div className="copilot-inline-actions"><button type="button" onClick={() => onTool({ tool: 'blocked_state_explanation', accountKey: result.accountKey }, `Explain ${result.name}'s current state`)}>Explain state</button><button type="button" onClick={() => onTool({ tool: 'next_action_plan', accountKey: result.accountKey }, `Propose next actions for ${result.name}`)}>Propose next actions</button></div></section>;
  if (tool === 'blocked_state_explanation') return <section><p>{result.explanation}</p><p className="copilot-muted">Current owner: {result.owner || 'Unassigned'}.</p><Citation accountKey={result.accountKey} /></section>;
  if (tool === 'next_action_plan') return <section><p><strong>Proposal only.</strong> This does not create tasks, approve lifecycle gates, contact people, send outreach, or change CRM records.</p><ol className="copilot-plan">{result.actions.map((action) => <li key={action.step}><strong>{action.action}</strong><span>{action.owner} · due {formatDate(action.dueAt)}</span></li>)}</ol><Citation accountKey={result.accountKey} /></section>;
  return <p className="copilot-muted">The requested read is complete.</p>;
}

export default function CopilotWorkspace() {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [toolState, setToolState] = useState('Ready for a read-only CRM question.');
  const [busy, setBusy] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatBusy, setChatBusy] = useState(false);
  const searchRef = useRef(null);
  const hermesAgentRef = useRef(null);

  function pocketHermesAgent() {
    if (!hermesAgentRef.current) {
      hermesAgentRef.current = new HttpAgent({
        agentId: 'plinko-pocket-default-hermes',
        description: 'Default-profile Hermes grounded in the authorized Plinko CRM workspace.',
        threadId: crypto.randomUUID(),
        url: '/api/copilot/agui',
        initialMessages: [],
      });
    }
    return hermesAgentRef.current;
  }

  async function runTool(command, prompt) {
    if (busy) return;
    setBusy(true);
    setToolState(`Preparing ${command.tool.replaceAll('_', ' ')}…`);
    setMessages((items) => [...items, { id: crypto.randomUUID(), tone: 'operator', content: prompt }, { id: crypto.randomUUID(), tone: 'assistant', loading: true }]);
    try {
      setToolState(`Reading your authorized CRM workspace with ${command.tool.replaceAll('_', ' ')}…`);
      const response = await fetch('/api/copilot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(command) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The Copilot read is unavailable.');
      setMessages((items) => [...items.slice(0, -1), { id: crypto.randomUUID(), tone: 'assistant', response: payload }]);
      setToolState(`Read complete · ${payload.tool.replaceAll('_', ' ')} · policy ${payload.policyVersion}`);
    } catch (error) {
      setMessages((items) => [...items.slice(0, -1), { id: crypto.randomUUID(), tone: 'assistant', error: error.message }]);
      setToolState('Read unavailable. No CRM record was changed.');
    } finally {
      setBusy(false);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    const trimmed = query.trim();
    runTool({ tool: 'account_search', query: trimmed }, trimmed ? `Find account: ${trimmed}` : 'Browse authorized accounts');
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
      setChatMessages((items) => [...items, { id: crypto.randomUUID(), role: 'assistant', content: 'Pocket Hermes chat is unavailable. No CRM or external action was performed.' }]);
    } finally {
      setChatBusy(false);
    }
  }

  return <main className="copilot-shell">
    <header className="copilot-topbar"><a className="copilot-brand" href="/account">Plinko Pocket</a><nav aria-label="Pocket workspace"><a href="/account">Account home</a><a href="/crm">My Work</a><a aria-current="page" href="/copilot">Copilot</a></nav></header>
    <section className="copilot-layout" aria-labelledby="copilot-title">
      <aside className="copilot-sidebar"><p className="copilot-eyebrow">Read-only workspace</p><h1 id="copilot-title">Pocket Copilot</h1><p>Ask focused questions about the CRM records you are authorized to view. Every answer retains an account citation and a route back to My Work.</p><a className="copilot-my-work-link" href="/crm">Open My Work <span aria-hidden="true">→</span></a><section aria-labelledby="suggested-prompts"><h2 id="suggested-prompts">Suggested prompts</h2><div className="copilot-suggestions">{SUGGESTIONS.map((suggestion) => <button key={suggestion.label} type="button" disabled={busy} onClick={() => suggestion.focusSearch ? searchRef.current?.focus() : runTool(suggestion.command, suggestion.copy)}><strong>{suggestion.label}</strong><span>{suggestion.copy}</span></button>)}</div></section><p className="copilot-boundary">Copilot can read and propose. It cannot approve, create, contact, send, or modify CRM records.</p></aside>
      <section className="copilot-conversation" aria-label="Copilot conversation">
        <div className="copilot-conversation-header"><div><p className="copilot-eyebrow">AG-UI · default Hermes profile</p><h2>CRM-grounded Hermes chat</h2></div><span className={chatBusy ? 'copilot-live is-busy' : 'copilot-live'} role="status" aria-live="polite">{chatBusy ? 'Hermes working' : 'Connected by server bridge'}</span></div>
        <p className="copilot-boundary">This chat shares the default Hermes profile’s durable memory, skills, and server tools. Pocket supplies current minimized CRM context on every turn; the CRM remains authoritative. Chat does not itself send email, dial calls, approve gates, or activate Smartlead.</p>
        <div className="copilot-transcript copilot-hermes-transcript" aria-live="polite">{chatMessages.length ? chatMessages.filter((message) => ['user', 'assistant'].includes(message.role) && visibleMessageText(message)).map((message) => <Message key={message.id} tone={message.role === 'user' ? 'operator' : 'assistant'}><p>{visibleMessageText(message)}</p></Message>) : <Message><p>Ask Hermes to review the five-account weekly queue, explain a blocker, prepare a draft for approval, or identify today’s manual follow-up calls.</p></Message>}</div>
        <form className="copilot-composer copilot-hermes-composer" onSubmit={submitHermesChat}><label htmlFor="copilot-hermes-chat">Message Hermes</label><div><textarea id="copilot-hermes-chat" rows="3" maxLength="12000" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="What should I do next in the outbound queue?" /><button type="submit" disabled={chatBusy || !chatInput.trim()}>{chatBusy ? 'Working…' : 'Send'}</button></div><p>AG-UI streams the turn through a server-only bridge to the default Hermes API. No API key reaches the browser.</p></form>
        <div className="copilot-conversation-header copilot-tools-header"><div><p className="copilot-eyebrow">Deterministic CRM tools</p><h2>Bounded reads and proposals</h2></div><span className={busy ? 'copilot-live is-busy' : 'copilot-live'} role="status" aria-live="polite">{busy ? 'Working' : 'Read-only'}</span></div>
        <div className="copilot-tool-state" role="status" aria-live="polite"><span aria-hidden="true" className={busy ? 'copilot-pulse' : ''} />{toolState}</div>
        <div className="copilot-transcript" aria-live="polite">{messages.length ? messages.map((message) => <Message key={message.id} tone={message.tone}>{message.loading ? <p className="copilot-loading">Retrieving a bounded CRM read…</p> : message.error ? <p role="alert">{message.error}</p> : message.response ? <Result response={message.response} onTool={runTool} /> : <p>{message.content}</p>}</Message>) : <Message><p>Use a suggested prompt or search for an account. These tools read current CRM state without model interpretation.</p></Message>}</div>
        <form className="copilot-composer" onSubmit={submitSearch}><label htmlFor="copilot-search">Search authorized accounts</label><div><input ref={searchRef} id="copilot-search" type="search" maxLength="240" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Company name" /><button type="submit" disabled={busy}>{busy ? 'Reading…' : 'Search accounts'}</button></div><p>Searches return only account names, status, next action, freshness, and opaque record links.</p></form>
      </section>
    </section>
  </main>;
}
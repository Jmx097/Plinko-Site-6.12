'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const queueLabels = {
  station_1_account_review: 'Account review',
  station_1_contact_review: 'Contact-review gate',
  station_2_draft_review: 'Draft review',
  station_2_send_review: 'Send review',
  outreach_authorized: 'Human execution authorized',
  blocked_rejected: 'Blocked',
};

const queueTones = {
  station_1_account_review: 'is-review',
  station_1_contact_review: 'is-review',
  station_2_draft_review: 'is-review',
  station_2_send_review: 'is-review',
  outreach_authorized: 'is-authorized',
  blocked_rejected: 'is-blocked',
};

const views = [
  { id: 'week', label: 'This Week' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'activity', label: 'Activity' },
];

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString('en-CA');
}

function gateCopy(record) {
  if (record.queueState === 'station_1_account_review') return 'Confirm account fit before any person-level research.';
  if (record.queueState === 'station_1_contact_review') return 'Account approval does not authorize a person; contact review remains separate.';
  if (record.queueState === 'station_2_draft_review') return 'Review the exact draft revision before any manual execution can be considered.';
  if (record.queueState === 'station_2_send_review') return 'Confirm the final manual-execution gate. No automatic send is available.';
  if (record.queueState === 'outreach_authorized') return 'Visible for a human action only; no external action is dispatched from this workspace.';
  if (record.queueState === 'blocked_rejected') return 'This record is blocked and cannot progress without a new governed decision.';
  return 'This record remains read-only until its next governed decision is recorded.';
}

function metric(label, value, tone = '') {
  return <div className={`workspace-metric ${tone}`}><dt>{label}</dt><dd>{value}</dd></div>;
}

export default function CrmWorkspace({ metrics, records }) {
  const [activeView, setActiveView] = useState('week');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [workspaceError, setWorkspaceError] = useState('');
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [note, setNote] = useState('');
  const [noteStatus, setNoteStatus] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const filters = useMemo(() => [
    { id: 'all', label: 'All accounts' },
    { id: 'station_1_account_review', label: 'Account review' },
    { id: 'station_1_contact_review', label: 'Contact review' },
    { id: 'blocked_rejected', label: 'Blocked' },
  ], []);

  const visibleRecords = useMemo(() => filter === 'all' ? records : records.filter((record) => record.queueState === filter), [filter, records]);
  const selectedRecord = useMemo(() => records.find((record) => record.id === selectedId) || null, [records, selectedId]);
  const heading = activeView === 'campaigns' ? 'Campaign view — governed revenue work' : activeView === 'activity' ? 'Recent governed activity' : activeView === 'accounts' ? 'All source-intake accounts' : 'Accounts requiring a governed next step';
  const description = activeView === 'activity' ? 'Open an account to inspect its source-intake people and internal notes.' : 'Open an account row to inspect its people, source evidence, and persistent internal notes.';

  useEffect(() => {
    if (!selectedId) {
      setWorkspace(null);
      return undefined;
    }
    const controller = new AbortController();
    setLoadingWorkspace(true);
    setWorkspace(null);
    setWorkspaceError('');
    setNote('');
    setNoteStatus('');
    fetch(`/api/admin/crm/accounts/${encodeURIComponent(selectedId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Unable to load account details');
        setWorkspace(payload);
      })
      .catch((error) => { if (error.name !== 'AbortError') setWorkspaceError(error.message || 'Unable to load account details'); })
      .finally(() => { if (!controller.signal.aborted) setLoadingWorkspace(false); });
    return () => controller.abort();
  }, [selectedId]);

  function selectView(id) {
    setActiveView(id);
    setSelectedId(null);
    if (id === 'week') setFilter('all');
  }

  function openAccount(id) {
    setSelectedId(id);
    requestAnimationFrame(() => document.getElementById('workspace-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function submitNote(event) {
    event.preventDefault();
    if (!selectedId || !note.trim() || savingNote) return;
    setSavingNote(true);
    setNoteStatus('');
    try {
      const response = await fetch(`/api/admin/crm/accounts/${encodeURIComponent(selectedId)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note: note.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to save note');
      setNote('');
      setNoteStatus('Saved to the append-only account history.');
      const refreshed = await fetch(`/api/admin/crm/accounts/${encodeURIComponent(selectedId)}`, { cache: 'no-store' });
      const refreshedPayload = await refreshed.json();
      if (refreshed.ok) setWorkspace(refreshedPayload);
    } catch (error) {
      setNoteStatus(error.message || 'Unable to save note');
    } finally {
      setSavingNote(false);
    }
  }

  return <>
    <nav className="workspace-nav" aria-label="CRM workspace navigation">
      {views.map((view) => <button key={view.id} type="button" className={activeView === view.id ? 'is-active' : ''} aria-pressed={activeView === view.id} onClick={() => selectView(view.id)}>{view.label}</button>)}
      <Link href="/admin/crm">Original command center</Link>
    </nav>

    <section className="workspace-metrics" aria-label="Campaign metrics">
      {metric('Accounts', metrics.totalAccounts)}
      {metric('Account review', metrics.station1.accountReviewPending, 'is-review')}
      {metric('Contact review', metrics.station1.contactReviewPending, 'is-review')}
      {metric('Draft / send review', metrics.station2.draftReviewPending + metrics.station2.sendReviewPending, 'is-review')}
      {metric('Human-authorized', metrics.station2.outreachAuthorized, 'is-authorized')}
      {metric('Blocked', metrics.blocked.totalRejected, 'is-blocked')}
    </section>

    <section className="workspace-panel" aria-labelledby="workspace-queue-title">
      <div className="workspace-panel-heading">
        <div><p className="workspace-eyebrow">{activeView === 'campaigns' ? 'Campaign workspace' : activeView === 'activity' ? 'Activity lens' : 'Current operating queue'}</p><h2 id="workspace-queue-title">{heading}</h2></div>
        <p>{visibleRecords.length} visible record{visibleRecords.length === 1 ? '' : 's'} · open an account to see source-intake people and notes</p>
      </div>
      <div className="workspace-filter-bar" aria-label="Queue filters">
        {filters.map((item) => <button key={item.id} type="button" className={filter === item.id ? 'is-active' : ''} aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setSelectedId(null); }}>{item.label}</button>)}
      </div>
      <p className="workspace-interaction-hint">{description}</p>
      {visibleRecords.length ? <div className="workspace-table-wrap"><table className="workspace-table">
        <thead><tr><th scope="col">Account</th><th scope="col">Current gate</th><th scope="col">Next permitted action</th><th scope="col">Evidence</th><th scope="col">Updated</th></tr></thead>
        <tbody>{visibleRecords.map((record) => <tr key={record.id} className={selectedId === record.id ? 'is-selected' : ''}>
          <td><button type="button" className="workspace-row-button" onClick={() => openAccount(record.id)} aria-expanded={selectedId === record.id}><strong>{record.displayName || 'Unnamed source-intake account'}</strong><span className="workspace-id">Open people and notes · {record.id}</span></button></td>
          <td><span className={`workspace-chip ${queueTones[record.queueState] || ''}`}>{queueLabels[record.queueState] || record.queueState || 'Review'}</span></td>
          <td><strong>{record.nextGate || 'No further gate'}</strong><span className="workspace-next">{gateCopy(record)}</span></td>
          <td>{record.externalReference ? <span className="workspace-reference">{record.externalReference}</span> : <span className="workspace-muted">No source reference</span>}</td>
          <td>{formatDate(record.updatedAt || record.createdAt)}</td>
        </tr>)}</tbody>
      </table></div> : <p className="workspace-empty">No records match this filter.</p>}
    </section>

    <section id="workspace-details" className="workspace-details" aria-labelledby="workspace-details-title" tabIndex={-1}>
      <div className="workspace-panel-heading">
        <div><p className="workspace-eyebrow">Account workspace</p><h2 id="workspace-details-title">{selectedRecord ? selectedRecord.displayName || 'Unnamed source-intake account' : 'Select an account to inspect it'}</h2></div>
        <p>{selectedRecord ? 'People and notes are loaded for this account only.' : 'Click an account name in the table to open its people and persistent notes here.'}</p>
      </div>
      {loadingWorkspace ? <p className="workspace-empty">Loading account workspace…</p> : null}
      {workspaceError ? <p className="workspace-empty" role="alert">{workspaceError}</p> : null}
      {workspace ? <div className="workspace-detail">
        <p className="workspace-policy">{workspace.governance?.contacts} {workspace.governance?.notes}</p>
        <h3>People / contacts ({workspace.contacts?.length || 0})</h3>
        {workspace.contacts?.length ? <ul className="workspace-contact-list">{workspace.contacts.map((contact) => <li key={contact.id}><strong>{contact.full_name}</strong>{contact.title ? <span> · {contact.title}</span> : null}<small>{contact.contact_approval === 'approved' ? 'Contact approved' : 'Source intake — contact review pending'} · {contact.source}</small></li>)}</ul> : <p className="workspace-empty">No source-intake people are attached to this account yet.</p>}
        <h3>Internal notes</h3>
        <form className="workspace-note-form" onSubmit={submitNote}>
          <label htmlFor="account-note">Append a durable internal note</label>
          <textarea id="account-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={4} placeholder="Record context, decision rationale, or follow-up needed. Notes cannot be edited or deleted." />
          <div><small>{note.length}/2000 · append-only</small><button type="submit" disabled={!note.trim() || savingNote}>{savingNote ? 'Saving…' : 'Save note'}</button></div>
          {noteStatus ? <p role="status">{noteStatus}</p> : null}
        </form>
        {workspace.notes?.length ? <ol className="workspace-note-list">{workspace.notes.map((item) => <li key={item.id}><p>{item.body}</p><small>{item.actor} · {formatDate(item.occurred_at)}</small></li>)}</ol> : <p className="workspace-empty">No internal notes yet.</p>}
      </div> : null}
    </section>
  </>;
}

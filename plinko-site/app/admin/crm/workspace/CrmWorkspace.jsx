'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

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

  const filters = useMemo(() => [
    { id: 'all', label: 'All accounts' },
    { id: 'station_1_account_review', label: 'Account review' },
    { id: 'station_1_contact_review', label: 'Contact review' },
    { id: 'blocked_rejected', label: 'Blocked' },
  ], []);

  const visibleRecords = useMemo(() => {
    if (filter === 'all') return records;
    return records.filter((record) => record.queueState === filter);
  }, [filter, records]);

  const selectedRecord = useMemo(() => records.find((record) => record.id === selectedId) || null, [records, selectedId]);
  const heading = activeView === 'campaigns' ? 'Campaign view — governed revenue work' : activeView === 'activity' ? 'Recent governed activity' : activeView === 'accounts' ? 'All source-intake accounts' : 'Accounts requiring a governed next step';
  const description = activeView === 'activity' ? 'Select an account to inspect its current state and recorded source context. No activity can be edited here.' : 'Choose an account row to inspect its decision context. Filtering and navigation are local, read-only views of the current queue.';

  function selectView(id) {
    setActiveView(id);
    setSelectedId(null);
    if (id === 'week') setFilter('all');
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
        <p>{visibleRecords.length} visible record{visibleRecords.length === 1 ? '' : 's'} · no contact data or execution controls in this view</p>
      </div>
      <div className="workspace-filter-bar" aria-label="Queue filters">
        {filters.map((item) => <button key={item.id} type="button" className={filter === item.id ? 'is-active' : ''} aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setSelectedId(null); }}>{item.label}</button>)}
      </div>
      <p className="workspace-interaction-hint">{description}</p>

      {visibleRecords.length ? <div className="workspace-table-wrap"><table className="workspace-table">
        <thead><tr><th scope="col">Account</th><th scope="col">Current gate</th><th scope="col">Next permitted action</th><th scope="col">Evidence</th><th scope="col">Updated</th></tr></thead>
        <tbody>{visibleRecords.map((record) => (
          <tr key={record.id} className={selectedId === record.id ? 'is-selected' : ''}>
            <td><button type="button" className="workspace-row-button" onClick={() => setSelectedId(record.id)} aria-expanded={selectedId === record.id}><strong>{record.displayName || 'Unnamed source-intake account'}</strong><span className="workspace-id">Open decision context · {record.id}</span></button></td>
            <td><span className={`workspace-chip ${queueTones[record.queueState] || ''}`}>{queueLabels[record.queueState] || record.queueState || 'Review'}</span></td>
            <td><strong>{record.nextGate || 'No further gate'}</strong><span className="workspace-next">{gateCopy(record)}</span></td>
            <td>{record.externalReference ? <span className="workspace-reference">{record.externalReference}</span> : <span className="workspace-muted">No source reference</span>}</td>
            <td>{formatDate(record.createdAt)}</td>
          </tr>
        ))}</tbody>
      </table></div> : <p className="workspace-empty">No records match this filter.</p>}
    </section>

    <section className="workspace-details" aria-labelledby="workspace-details-title">
      <div className="workspace-panel-heading">
        <div><p className="workspace-eyebrow">Decision context</p><h2 id="workspace-details-title">{selectedRecord ? selectedRecord.displayName || 'Unnamed source-intake account' : 'Select an account to inspect it'}</h2></div>
        <p>{selectedRecord ? 'The open detail is a read-only explanation of its current governed gate.' : 'Click an account name in the table to open its source and policy context here.'}</p>
      </div>
      {selectedRecord ? <details open className="workspace-detail">
        <summary><span><strong>{queueLabels[selectedRecord.queueState] || selectedRecord.queueState || 'Review'}</strong><small>Next: {selectedRecord.nextGate || 'none'}</small></span><span aria-hidden="true">−</span></summary>
        <div><dl><div><dt>Governed record</dt><dd>{selectedRecord.id}</dd></div><div><dt>Source reference</dt><dd>{selectedRecord.externalReference || 'No source reference supplied'}</dd></div><div><dt>Current gate</dt><dd>{queueLabels[selectedRecord.queueState] || selectedRecord.queueState || 'Review'}</dd></div><div><dt>Created</dt><dd>{formatDate(selectedRecord.createdAt)}</dd></div></dl><p>{gateCopy(selectedRecord)}</p><p className="workspace-policy">Policy boundary: account fit, contact research, draft review, and manual execution remain separate decisions. This workspace cannot approve, enrich, draft, export, or send.</p></div>
      </details> : <p className="workspace-empty">No account is selected. Use the table controls above to select one.</p>}
    </section>
  </>;
}

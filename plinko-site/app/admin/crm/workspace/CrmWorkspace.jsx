'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const queueLabels = {
  station_1_account_review: 'Account review',
  station_1_contact_review: 'Contact review',
  station_2_draft_review: 'Draft review',
  station_2_send_review: 'Execution review',
  outreach_authorized: 'Human execution authorized',
  blocked_rejected: 'Blocked',
};

function formatDate(value, fallback = 'Not scheduled') {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
}

function activityLabel(type) {
  return String(type || 'activity').replaceAll('.', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function contactState(contact) {
  if (contact.disposition === 'do_not_contact') return 'Do not contact';
  if (contact.contact_approval === 'approved') return 'Contact approved';
  return 'Source intake · review required';
}

async function responseJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Unable to update the account');
  return payload;
}

export default function CrmWorkspace({ metrics, records }) {
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [workspaceError, setWorkspaceError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [note, setNote] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const filters = [
    { id: 'all', label: 'All accounts' },
    { id: 'station_1_account_review', label: 'Account review' },
    { id: 'station_1_contact_review', label: 'Contact review' },
    { id: 'blocked_rejected', label: 'Blocked' },
  ];
  const visibleRecords = useMemo(() => filter === 'all' ? records : records.filter((record) => record.queueState === filter), [filter, records]);
  const selectedRecord = useMemo(() => records.find((record) => record.id === selectedId) || null, [records, selectedId]);
  const selectedName = workspace?.account?.display_name || selectedRecord?.displayName || 'Account';

  async function loadWorkspace(accountId = selectedId) {
    if (!accountId) return;
    const response = await fetch(`/api/admin/crm/accounts/${encodeURIComponent(accountId)}`, { cache: 'no-store' });
    setWorkspace(await responseJson(response));
  }

  useEffect(() => {
    if (!selectedId) { setWorkspace(null); return undefined; }
    const controller = new AbortController();
    setLoading(true); setWorkspace(null); setWorkspaceError(''); setStatus(''); setActiveTab('overview');
    fetch(`/api/admin/crm/accounts/${encodeURIComponent(selectedId)}`, { cache: 'no-store', signal: controller.signal })
      .then(responseJson)
      .then(setWorkspace)
      .catch((error) => { if (error.name !== 'AbortError') setWorkspaceError(error.message || 'Unable to load account'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedId]);

  function openAccount(id) {
    setSelectedId(id);
    requestAnimationFrame(() => document.getElementById('account-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function mutate(intent, payload = {}) {
    if (!selectedId || saving) return;
    setSaving(true); setStatus('');
    try {
      const response = await fetch(`/api/admin/crm/accounts/${encodeURIComponent(selectedId)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ intent, ...payload }),
      });
      await responseJson(response);
      await loadWorkspace();
      setStatus(intent === 'complete_task' ? 'Task completed and added to activity.' : intent === 'task' ? 'Follow-up created and added to activity.' : 'Note added to the account activity.');
      return true;
    } catch (error) {
      setStatus(error.message || 'Unable to update the account');
      return false;
    } finally {
      setSaving(false);
    }
  }

  function submitNote(event) {
    event.preventDefault();
    if (!note.trim()) return;
    mutate('note', { note: note.trim() }).then((saved) => { if (saved) setNote(''); });
  }

  function submitTask(event) {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    mutate('task', { title: taskTitle.trim(), due_at: taskDueAt ? new Date(taskDueAt).toISOString() : null }).then((saved) => { if (saved) { setTaskTitle(''); setTaskDueAt(''); } });
  }

  return <>
    <nav className="workspace-nav" aria-label="CRM workspace navigation">
      <strong>My work</strong>
      <span>{metrics.station1.accountReviewPending + metrics.station1.contactReviewPending} review queues</span>
      <Link href="/admin/crm">Governance queue</Link>
    </nav>

    <section className="workspace-panel" aria-labelledby="workspace-queue-title">
      <div className="workspace-panel-heading">
        <div><p className="workspace-eyebrow">Internal revenue workspace</p><h2 id="workspace-queue-title">Accounts</h2></div>
        <p>Choose an account to see people, recent context, and the next internal follow-up.</p>
      </div>
      <div className="workspace-filter-bar" aria-label="Account filters">
        {filters.map((item) => <button key={item.id} type="button" className={filter === item.id ? 'is-active' : ''} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
      </div>
      <div className="workspace-table-wrap"><table className="workspace-table">
        <thead><tr><th scope="col">Account</th><th scope="col">Status</th><th scope="col">Next permitted step</th><th scope="col">Last updated</th></tr></thead>
        <tbody>{visibleRecords.map((record) => <tr key={record.id} className={selectedId === record.id ? 'is-selected' : ''}>
          <td><button type="button" className="workspace-row-button" onClick={() => openAccount(record.id)} aria-current={selectedId === record.id ? 'page' : undefined}><strong>{record.displayName || 'Unnamed account'}</strong><span className="workspace-id">Open workspace</span></button></td>
          <td><span className="workspace-chip is-review">{queueLabels[record.queueState] || 'Review'}</span></td>
          <td>{record.nextGate ? `Complete ${record.nextGate} review` : 'No further governed step'}</td>
          <td>{formatDate(record.updatedAt || record.createdAt, 'Unavailable')}</td>
        </tr>)}</tbody>
      </table></div>
    </section>

    <section id="account-workspace" className="workspace-details crm-account" aria-labelledby="account-workspace-title" tabIndex={-1}>
      {!selectedId ? <p className="workspace-empty">Select an account from the table to start working.</p> : null}
      {loading ? <p className="workspace-empty">Loading account workspace…</p> : null}
      {workspaceError ? <p className="workspace-empty" role="alert">{workspaceError}</p> : null}
      {workspace ? <>
        <header className="crm-account-header">
          <div><p className="workspace-eyebrow">Account</p><h2 id="account-workspace-title">{selectedName}</h2><p className="crm-account-meta">Source intake · {workspace.account?.source || 'Source unavailable'} · Updated {formatDate(workspace.account?.updated_at, 'Unavailable')}</p></div>
          <div className="crm-next-action"><span>Next action</span><strong>{workspace.next_action?.label || 'No follow-up scheduled'}</strong><small>{workspace.next_action?.due_at ? `Due ${formatDate(workspace.next_action.due_at)}` : workspace.next_action?.source === 'governance' ? 'Governance-derived' : 'Schedule a follow-up'}</small></div>
        </header>

        <div className="crm-summary-grid">
          <section className="crm-card"><p className="workspace-eyebrow">People</p><strong>{workspace.contacts?.length || 0} contacts</strong><span>{workspace.contacts?.filter((contact) => contact.contact_approval === 'pending').length || 0} awaiting review</span><button type="button" onClick={() => setActiveTab('people')}>View people</button></section>
          <section className="crm-card"><p className="workspace-eyebrow">Open follow-ups</p><strong>{workspace.tasks?.filter((task) => task.status === 'open').length || 0}</strong><span>Internal work only</span><button type="button" onClick={() => setActiveTab('overview')}>Manage tasks</button></section>
          <section className="crm-card"><p className="workspace-eyebrow">Recent activity</p><strong>{workspace.activities?.length || 0}</strong><span>Notes, tasks, and governed history</span><button type="button" onClick={() => setActiveTab('activity')}>View activity</button></section>
        </div>

        <div className="crm-tabs" role="tablist" aria-label="Account detail tabs">
          {['overview', 'people', 'activity'].map((tab) => <button key={tab} role="tab" type="button" aria-selected={activeTab === tab} className={activeTab === tab ? 'is-active' : ''} onClick={() => setActiveTab(tab)}>{tab === 'overview' ? 'Overview' : tab === 'people' ? `People (${workspace.contacts?.length || 0})` : 'Activity'}</button>)}
        </div>

        {activeTab === 'overview' ? <div className="crm-two-column">
          <section className="crm-section"><h3>Open follow-ups</h3>{workspace.tasks?.filter((task) => task.status === 'open').length ? <ul className="crm-task-list">{workspace.tasks.filter((task) => task.status === 'open').map((task) => <li key={task.id}><div><strong>{task.title}</strong><small>{task.due_at ? `Due ${formatDate(task.due_at)}` : 'No due date'} · owner {task.owner || task.created_by}</small></div><button type="button" disabled={saving} onClick={() => mutate('complete_task', { task_id: task.id })}>Complete task</button></li>)}</ul> : <p className="workspace-muted">No follow-ups scheduled.</p>}
            <form className="crm-composer" onSubmit={submitTask}><label htmlFor="task-title">Add follow-up</label><input id="task-title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={500} placeholder="e.g. Review source-intake contacts" /><label htmlFor="task-due">Due date <span>(optional)</span></label><input id="task-due" type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} /><button type="submit" disabled={saving || !taskTitle.trim()}>Create follow-up</button></form>
          </section>
          <section className="crm-section"><h3>Account context</h3><dl className="crm-fields"><div><dt>Account status</dt><dd>{workspace.account?.account_approval || 'pending'} account review</dd></div><div><dt>Contact state</dt><dd>{workspace.account?.contact_approval || 'pending'} contact review</dd></div><div><dt>Last activity</dt><dd>{workspace.activities?.[0] ? formatDate(workspace.activities[0].occurred_at, 'Unavailable') : 'No activity yet'}</dd></div><div><dt>Source</dt><dd>{workspace.account?.source || 'Unavailable'}</dd></div></dl><details className="crm-governance"><summary>Source &amp; governance</summary><p>{workspace.governance?.contacts}</p><p>{workspace.governance?.notes}</p><p>Source reference: {workspace.account?.external_reference || 'Unavailable'}</p></details></section>
        </div> : null}

        {activeTab === 'people' ? <section className="crm-section"><div className="crm-section-heading"><div><h3>People</h3><p>Listed people are source-intake records. Review status does not authorize outreach.</p></div></div>{workspace.contacts?.length ? <div className="workspace-table-wrap"><table className="workspace-table crm-contacts-table"><thead><tr><th>Name</th><th>Role</th><th>Contact state</th><th>Source</th></tr></thead><tbody>{workspace.contacts.map((contact) => <tr key={contact.id}><td><strong>{contact.full_name}</strong></td><td>{contact.title || 'Role unavailable'}</td><td><span className="workspace-chip is-review">{contactState(contact)}</span></td><td><details><summary>View source</summary><span>{contact.source || 'Unavailable'}</span><span>{contact.external_reference || 'No reference'}</span></details></td></tr>)}</tbody></table></div> : <p className="workspace-muted">No source-intake people are attached to this account.</p>}</section> : null}

        {activeTab === 'activity' ? <div className="crm-two-column"><section className="crm-section"><h3>Activity</h3><ol className="crm-activity-list">{workspace.activities?.length ? workspace.activities.map((item) => <li key={item.id}><strong>{activityLabel(item.event_type)}</strong><p>{item.body || 'Governed account activity recorded.'}</p><small>{item.actor} · {formatDate(item.occurred_at, 'Unavailable')}</small></li>) : <li>No activity yet.</li>}</ol></section><section className="crm-section"><h3>Add note</h3><form className="crm-composer" onSubmit={submitNote}><label htmlFor="account-note">Internal note</label><textarea id="account-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={6} placeholder="Capture decision rationale, account context, or the outcome of a manual interaction." /><small>{note.length}/2000 · append-only</small><button type="submit" disabled={saving || !note.trim()}>Add note</button></form></section></div> : null}
        {status ? <p className="crm-status" role="status">{status}</p> : null}
      </> : null}
    </section>
  </>;
}

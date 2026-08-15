'use client';

import { useEffect, useRef, useState } from 'react';

function formatDate(value, fallback = '—') {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function label(value) {
  return value ? String(value).replaceAll('_', ' ') : 'Needs review';
}

async function responseJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'CRM unavailable');
  return body;
}

function asIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function CrmWorkspace() {
  const [view, setView] = useState('Accounts');
  const [accounts, setAccounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [accountCursor, setAccountCursor] = useState(null);
  const [campaignCursor, setCampaignCursor] = useState(null);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [newCampaign, setNewCampaign] = useState(false);
  const directorySequence = useRef(0);
  const detailSequence = useRef(0);

  async function loadDirectory({ reset = true, kind = view, query = search, cursor } = {}) {
    const sequence = ++directorySequence.current;
    setBusy(true);
    try {
      const isCampaign = kind === 'Campaigns';
      const pageCursor = reset ? null : (cursor ?? (isCampaign ? campaignCursor : accountCursor));
      const url = `/api/crm/workspace?directory=${isCampaign ? 'campaigns' : 'accounts'}&q=${encodeURIComponent(query)}&limit=25${pageCursor ? `&cursor=${encodeURIComponent(pageCursor)}` : ''}`;
      const result = await responseJson(await fetch(url, { cache: 'no-store' }));
      if (sequence !== directorySequence.current) return;
      if (isCampaign) {
        setCampaigns((previous) => reset ? result.campaigns : [...previous, ...result.campaigns]);
        setCampaignCursor(result.nextCursor);
      } else {
        setAccounts((previous) => reset ? result.accounts : [...previous, ...result.accounts]);
        setAccountCursor(result.nextCursor);
      }
      setMessage('');
    } catch (error) {
      if (sequence === directorySequence.current) setMessage(error.message);
    } finally {
      if (sequence === directorySequence.current) setBusy(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => loadDirectory({ reset: true, kind: view, query: search }), 250);
    return () => {
      clearTimeout(timer);
      directorySequence.current += 1;
    };
  }, [search, view]);

  async function command(action, payload, { preserveDetail = false } = {}) {
    setBusy(true);
    try {
      const result = await responseJson(await fetch('/api/crm/workspace', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, payload }),
      }));
      if (action === 'create_campaign') {
        setNewCampaign(false);
        setView('Campaigns');
        await loadDirectory({ reset: true, kind: 'Campaigns', query: '' });
        setMessage('Campaign created. Add a person to begin work.');
        return result;
      }
      if (!preserveDetail) setDetail(result);
      setMessage('Saved.');
      return result;
    } catch (error) {
      setMessage(error.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function open(key, type) {
    const sequence = ++detailSequence.current;
    setSelectedKey(key);
    setDetail(null);
    setTab('Overview');
    const result = await command(type === 'campaign' ? 'campaign_workspace' : 'account_workspace', type === 'campaign' ? { campaignKey: key } : { accountKey: key }, { preserveDetail: true });
    if (sequence === detailSequence.current && result) setDetail(result);
  }

  const records = view === 'Accounts' ? accounts : campaigns;
  const cursor = view === 'Accounts' ? accountCursor : campaignCursor;
  const account = detail?.account;
  const campaign = detail?.campaign;

  return <main className="crm-equal-admin">
    <header>
      <p className="member-kicker">Plinko CRM · shared workspace</p>
      <h1>{campaign?.name || account?.name || view}</h1>
      <p>Work from accounts, people, tasks, activity, and campaigns.</p>
    </header>
    <nav aria-label="CRM views">
      {['Accounts', 'Campaigns'].map((name) => <button type="button" key={name} className={view === name ? 'is-active' : ''} onClick={() => { setView(name); setDetail(null); }}>{name}</button>)}
    </nav>

    {!detail && <section className="crm-directory">
      <div className="crm-directory-heading">
        <h2>{view === 'Accounts' ? 'Account directory' : 'Campaign directory'}</h2>
        <label className="crm-search">{view === 'Accounts' ? 'Search accounts' : 'Search campaigns'}<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        {view === 'Campaigns' && <button type="button" onClick={() => setNewCampaign((showing) => !showing)}>New campaign</button>}
      </div>
      {newCampaign && <CampaignForm busy={busy} onSubmit={(payload) => command('create_campaign', payload)} />}
      <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>{view === 'Accounts' ? 'Account' : 'Campaign'}</th><th>Status</th><th>{view === 'Accounts' ? 'Next action' : 'People'}</th><th>Updated</th></tr></thead><tbody>
        {records.map((record) => <tr key={record.key}><td><button type="button" className="workspace-row-button" onClick={() => open(record.key, view === 'Accounts' ? 'account' : 'campaign')}><strong>{record.name}</strong><span>Open {view === 'Accounts' ? 'account' : 'campaign'}</span></button></td><td><span className="crm-stage-chip">{label(record.status)}</span></td><td>{view === 'Accounts' ? record.nextAction : record.members}</td><td>{formatDate(record.updatedAt)}</td></tr>)}
      </tbody></table></div>
      {cursor && <button type="button" className="crm-load-more" disabled={busy} onClick={() => loadDirectory({ reset: false })}>{busy ? 'Loading…' : 'Load more'}</button>}
    </section>}

    {account && <AccountDetail detail={detail} accountKey={selectedKey} tab={tab} setTab={setTab} command={command} busy={busy} />}
    {campaign && <CampaignDetail detail={detail} campaignKey={selectedKey} tab={tab} setTab={setTab} command={command} busy={busy} />}
    {message && <p className="crm-status" role="status">{message}</p>}
  </main>;
}

function SectionButtons({ tab, setTab, names }) {
  return <div className="crm-tabs" aria-label="Workspace sections">{names.map((name) => <button type="button" aria-pressed={tab === name} className={tab === name ? 'is-active' : ''} key={name} onClick={() => setTab(name)}>{name}</button>)}</div>;
}

function CampaignForm({ busy, onSubmit }) {
  return <form className="crm-composer" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSubmit({ name: form.get('name'), channel: form.get('channel'), purpose: form.get('purpose') }); }}>
    <label>Name<input name="name" required maxLength="240" /></label><label>Channel<select name="channel"><option value="email">Email</option><option value="call">Call</option><option value="linkedin">LinkedIn</option></select></label><label>Purpose<input name="purpose" maxLength="1000" /></label><button disabled={busy}>Create campaign</button>
  </form>;
}

function AccountDetail({ detail, accountKey, tab, setTab, command, busy }) {
  return <section className="crm-account-details"><header className="crm-account-header"><div><p className="member-kicker">Account</p><h2>{detail.account.name}</h2><span className="crm-stage-chip">{label(detail.account.status)}</span></div><div className="crm-next-action"><span>Next step</span><strong>{detail.nextAction?.label || 'No follow-up scheduled'}</strong><small>{detail.nextAction?.owner || 'Unassigned'} · {formatDate(detail.nextAction?.dueAt, 'No due date')}</small></div></header>
    <SectionButtons tab={tab} setTab={setTab} names={['Overview', 'People', 'Activity']} />
    {tab === 'Overview' && <section className="crm-section"><h3>Open tasks</h3><ul className="crm-task-list">{detail.tasks.filter((task) => task.status === 'open').map((task) => <li key={task.key}><span><strong>{task.title}</strong><small>{formatDate(task.dueAt)} · {task.owner || 'Unassigned'}</small></span><button type="button" disabled={busy} onClick={() => command('complete_task', { accountKey, taskKey: task.key })}>Complete task</button></li>)}</ul><form className="crm-composer" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); command('create_task', { accountKey, title: form.get('title'), dueAt: asIsoDate(form.get('dueAt')) }); }}><label>New task<input name="title" required maxLength="240" /></label><label>Due date<input name="dueAt" type="datetime-local" /></label><button disabled={busy}>Create task</button></form><details className="crm-record-details"><summary>Record details</summary><p>Source: {detail.recordDetails.source || 'Unavailable'}</p><p>Account status decision: {label(detail.recordDetails.reviewStatus)}</p>{detail.recordDetails.reviewStatus !== 'approved' && <p><button type="button" disabled={busy} onClick={() => command('account_approval', { accountKey, decision: 'approved' })}>Approve account</button> <button type="button" disabled={busy} onClick={() => command('account_approval', { accountKey, decision: 'rejected' })}>Reject account</button></p>}</details></section>}
    {tab === 'People' && <People detail={detail} accountKey={accountKey} command={command} busy={busy} />}
    {tab === 'Activity' && <section className="crm-section"><h3>Activity</h3><ul>{detail.activities.map((activity, index) => <li key={`${activity.occurredAt}-${index}`}><strong>{label(activity.type)}</strong> · {formatDate(activity.occurredAt)}</li>)}</ul><form className="crm-composer" onSubmit={(event) => { event.preventDefault(); command('create_note', { accountKey, note: new FormData(event.currentTarget).get('note') }); }}><label>Add note<textarea name="note" required maxLength="4000" /></label><button disabled={busy}>Add note</button></form></section>}
  </section>;
}

function People({ detail, accountKey, command, busy }) {
  return <section className="crm-section"><h3>People</h3><table className="workspace-table"><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead><tbody>{detail.contacts.map((person) => <tr key={person.key}><td><strong>{person.name}</strong><br />{person.title}</td><td>{person.email}</td><td>{label(person.status)}</td><td>{person.approval !== 'approved' && <><button type="button" disabled={busy} onClick={() => command('contact_approval', { accountKey, contactKey: person.key, decision: 'approved' })}>Approve contact</button> <button type="button" disabled={busy} onClick={() => command('contact_approval', { accountKey, contactKey: person.key, decision: 'rejected' })}>Reject contact</button> </>}<button type="button" disabled={busy} onClick={() => command('contact_disposition', { accountKey, contactKey: person.key, disposition: 'active' })}>Mark active</button> <button type="button" disabled={busy} onClick={() => command('contact_disposition', { accountKey, contactKey: person.key, disposition: 'do_not_contact' })}>Do not contact</button></td></tr>)}</tbody></table><form className="crm-composer" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); command('create_contact', { accountKey, fullName: form.get('fullName'), title: form.get('title'), email: form.get('email') }); }}><h3>Add person</h3><label>Name<input name="fullName" required maxLength="240" /></label><label>Role<input name="title" maxLength="240" /></label><label>Email<input name="email" type="email" maxLength="320" /></label><button disabled={busy}>Add person</button></form></section>;
}

function CampaignDetail({ detail, campaignKey, tab, setTab, command, busy }) {
  const [accounts, setAccounts] = useState([]);
  const [eligiblePeople, setEligiblePeople] = useState([]);
  const [accountKey, setAccountKey] = useState('');
  const requestSequence = useRef(0);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    fetch('/api/crm/workspace?directory=accounts&limit=50', { cache: 'no-store' }).then(responseJson).then((result) => { if (sequence === requestSequence.current) setAccounts(result.accounts || []); }).catch(() => {});
    return () => { requestSequence.current += 1; };
  }, [campaignKey]);

  async function chooseAccount(key) {
    setAccountKey(key);
    setEligiblePeople([]);
    const sequence = ++requestSequence.current;
    const workspace = await command('account_workspace', { accountKey: key }, { preserveDetail: true });
    if (sequence === requestSequence.current && workspace) setEligiblePeople(workspace.contacts || []);
  }

  const campaign = detail.campaign;
  return <section className="crm-account-details"><header className="crm-account-header"><div><p className="member-kicker">Campaign</p><h2>{campaign.name}</h2><span className="crm-stage-chip">{label(campaign.status)}</span></div><div>{campaign.channel} · {campaign.purpose || 'No purpose recorded'}</div></header>
    <SectionButtons tab={tab} setTab={setTab} names={['Overview', 'People', 'Drafts', 'Activity']} />
    {tab === 'Overview' && <section className="crm-section"><h3>Campaign overview</h3><p>{detail.members.length} people in this campaign.</p></section>}
    {tab === 'People' && <section className="crm-section"><h3>People</h3><ul>{detail.members.map((member) => <li key={member.key}><strong>{member.person.name}</strong> · {member.accountName} · {label(member.status)}<DraftForm busy={busy} onSubmit={(body) => command('create_draft', { campaignKey, membershipKey: member.key, body })} /></li>)}</ul><h3>Add person</h3><p>Select an account, then add an eligible person from that account to this campaign.</p><label>Account<select value={accountKey} onChange={(event) => chooseAccount(event.target.value)}><option value="">Choose an account</option>{accounts.map((account) => <option key={account.key} value={account.key}>{account.name}</option>)}</select></label>{accountKey && <ul>{eligiblePeople.map((person) => <li key={person.key}>{person.name} {person.email ? `· ${person.email}` : ''} <button type="button" disabled={busy} onClick={() => command('add_campaign_member', { campaignKey, accountKey, contactKey: person.key })}>Add to campaign</button></li>)}</ul>}</section>}
    {tab === 'Drafts' && <section className="crm-section"><h3>Drafts and manual attempts</h3>{detail.members.flatMap((member) => member.drafts.map((draft) => <article key={draft.key}><strong>{member.person.name} · revision {draft.revision}</strong><p>{draft.content.body || 'Draft content'}</p><p>{label(draft.approval)}</p><button type="button" disabled={busy} onClick={() => command('draft_approval', { campaignKey, draftKey: draft.key, decision: 'approved' })}>Approve draft</button> <button type="button" disabled={busy} onClick={() => command('draft_approval', { campaignKey, draftKey: draft.key, decision: 'rejected' })}>Reject draft</button> <button type="button" disabled={busy} onClick={() => command('create_attempt', { campaignKey, membershipKey: member.key, draftKey: draft.key })}>Create attempt</button></article>))}{detail.members.flatMap((member) => member.attempts.map((attempt) => <article key={attempt.key}><strong>{member.person.name} · {label(attempt.status)}</strong><p>{label(attempt.approval)}</p><button type="button" disabled={busy} onClick={() => command('attempt_approval', { campaignKey, attemptKey: attempt.key, decision: 'approved' })}>Approve attempt</button> <button type="button" disabled={busy} onClick={() => command('attempt_approval', { campaignKey, attemptKey: attempt.key, decision: 'rejected' })}>Reject attempt</button><form className="crm-composer" onSubmit={(event) => { event.preventDefault(); command('manual_execution', { campaignKey, attemptKey: attempt.key, outcomeNote: new FormData(event.currentTarget).get('outcomeNote') }); }}><label>Manual outcome<textarea name="outcomeNote" required maxLength="4000" /></label><button disabled={busy}>Record manual outcome</button></form></article>))}</section>}
    {tab === 'Activity' && <section className="crm-section"><h3>Activity</h3><ul>{detail.activities.map((activity, index) => <li key={`${activity.occurredAt}-${index}`}><strong>{label(activity.type)}</strong> · {formatDate(activity.occurredAt)}</li>)}</ul></section>}
  </section>;
}

function DraftForm({ busy, onSubmit }) {
  return <form className="crm-composer" onSubmit={(event) => { event.preventDefault(); onSubmit(new FormData(event.currentTarget).get('body')); }}><label>Draft text<textarea name="body" required maxLength="12000" /></label><button disabled={busy}>Create draft</button></form>;
}

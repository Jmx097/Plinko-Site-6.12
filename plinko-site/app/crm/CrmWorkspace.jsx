'use client';
import { useEffect, useState } from 'react';

const fields = {
  create_account: ['source', 'display_name', 'external_reference'], create_account_approval: ['account_id', 'gate', 'decision'],
  create_contact: ['account_id', 'source', 'external_reference', 'full_name', 'title', 'email', 'phone', 'linkedin_url'],
  contact_approval: ['contact_id', 'decision'], contact_disposition: ['contact_id', 'disposition'],
  create_campaign: ['name', 'channel', 'purpose'], add_campaign_member: ['campaign_id', 'contact_id'],
  create_draft: ['membership_id', 'content'], draft_approval: ['draft_id', 'decision'], create_attempt: ['membership_id', 'draft_id'],
  attempt_approval: ['attempt_id', 'decision'], manual_execution: ['attempt_id', 'outcome_note'],
};
const labels = { create_account: 'Add account', create_account_approval: 'Record account approval', create_contact: 'Add contact', contact_approval: 'Approve or reject contact', contact_disposition: 'Set contact disposition', create_campaign: 'Create campaign', add_campaign_member: 'Add campaign member', create_draft: 'Create draft', draft_approval: 'Approve or reject draft', create_attempt: 'Create attempt', attempt_approval: 'Approve or reject attempt', manual_execution: 'Record manual outcome' };
const actionViews = { Accounts: ['create_account', 'create_account_approval'], Campaigns: ['create_campaign', 'add_campaign_member', 'create_draft', 'draft_approval', 'create_attempt', 'attempt_approval', 'manual_execution'], People: ['create_contact', 'contact_approval', 'contact_disposition'] };
const required = new Set(['source', 'display_name', 'account_id', 'gate', 'decision', 'full_name', 'name', 'channel', 'purpose', 'campaign_id', 'contact_id', 'membership_id', 'content', 'draft_id', 'attempt_id', 'disposition', 'outcome_note']);

export default function CrmWorkspace() {
  const [data, setData] = useState({ campaigns: [], contacts: [], activity: [] });
  const [view, setView] = useState('Campaigns'); const [form, setForm] = useState(''); const [message, setMessage] = useState('Loading shared workspace…');
  const load = async () => { try { const response = await fetch('/api/crm/workspace', { cache: 'no-store' }); const json = await response.json(); setData(response.ok ? json : { campaigns: [], contacts: [], activity: [] }); setMessage(response.ok ? '' : json.error || 'CRM unavailable'); } catch { setMessage('CRM unavailable'); } };
  useEffect(() => { load(); }, []);
  const submit = async (event) => {
    event.preventDefault(); const payload = Object.fromEntries(new FormData(event.currentTarget)); const action = payload.action; delete payload.action;
    if (action === 'create_draft') { try { payload.content = JSON.parse(payload.content); if (!payload.content || Array.isArray(payload.content) || typeof payload.content !== 'object') throw new Error(); } catch { setMessage('Draft content must be a JSON object.'); return; } }
    try { const response = await fetch('/api/crm/workspace', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, payload }) }); const json = await response.json(); setMessage(response.ok ? `${labels[action]} saved.` : json.error || 'CRM command could not be completed'); if (response.ok) { event.currentTarget.reset(); setForm(''); load(); } } catch { setMessage('CRM command could not be completed'); }
  };
  const rows = view === 'Campaigns' ? data.campaigns : view === 'People' ? data.contacts : view === 'Activity' ? data.activity : [];
  return <main className="crm-equal-admin"><header><p className="member-kicker">Plinko CRM · shared admin workspace</p><h1>Campaign workspace</h1><p>All authorized admins see the same campaign workbench. <strong>Manual outreach only:</strong> this portal never sends through a provider, dialer, or LinkedIn automation.</p></header>
    <nav aria-label="CRM views">{['Accounts', 'Campaigns', 'People', 'Activity'].map((item) => <button key={item} className={view === item ? 'is-active' : ''} onClick={() => setView(item)}>{item}</button>)}</nav>
    {actionViews[view] && <section className="crm-actions"><h2>{view}</h2><div>{actionViews[view].map((action) => <button key={action} onClick={() => setForm(action)}>{labels[action]}</button>)}</div></section>}
    {form && <form className="crm-composer" onSubmit={submit}><h3>{labels[form]}</h3><input type="hidden" name="action" value={form}/>{fields[form].map((field) => <label key={field}>{field.replaceAll('_', ' ')}{field === 'content' ? <textarea name={field} required placeholder={'{"body":"Draft text"}'}/> : <input name={field} required={required.has(field)} placeholder={field === 'channel' ? 'call, email, or linkedin' : field === 'decision' ? 'approve or reject' : ''}/>}</label>)}<button>Save</button><button type="button" onClick={() => setForm('')}>Cancel</button></form>}
    <section className="crm-section"><p className="crm-manual-notice">The workbench returns campaigns, contacts, and activity. Account records are created through the actions above and are not fabricated in this view.</p>{rows.length ? <table className="workspace-table"><thead><tr>{Object.keys(rows[0]).slice(0, 6).map((key) => <th key={key}>{key}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id || index}>{Object.keys(rows[0]).slice(0, 6).map((key) => <td key={key}>{String(row[key] ?? '—')}</td>)}</tr>)}</tbody></table> : <p>{view === 'Accounts' ? 'Account data is not returned by the campaign workbench.' : `No shared ${view.toLowerCase()} yet.`}</p>}</section><p role="status">{message}</p>
  </main>;
}

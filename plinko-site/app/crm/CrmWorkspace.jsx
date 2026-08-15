'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildWorkflowChoices, formatActivity, stageLabel } from './workflow.mjs';

const ACTIONS = {
  create_account: { label: 'Add an account', help: 'Start a governed account record. It will need review before later steps unlock.' },
  create_account_approval: { label: 'Review an account gate', help: 'Record a decision at the selected governance gate.' },
  create_contact: { label: 'Add a contact', help: 'Choose the account by name, then add the person.' },
  contact_approval: { label: 'Review a contact', help: 'Approve or reject a pending contact.' },
  contact_disposition: { label: 'Update contact status', help: 'Set a non-approval contact status.' },
  create_campaign: { label: 'Create a campaign', help: 'Create a manual call, email, or LinkedIn campaign.' },
  add_campaign_member: { label: 'Add a person to a campaign', help: 'Choose both records by name.' },
  create_draft: { label: 'Write a draft', help: 'Choose the campaign and person, then write the proposed text.' },
  draft_approval: { label: 'Review a draft', help: 'Record the draft review decision.' },
  create_attempt: { label: 'Plan manual outreach', help: 'Create a manually performed outreach step from a selected draft.' },
  attempt_approval: { label: 'Review manual outreach', help: 'Record the execution review decision.' },
  manual_execution: { label: 'Record manual outcome', help: 'Log what an operator did manually. This does not send anything.' },
};

const ACTIONS_BY_TAB = {
  Accounts: ['create_account', 'create_account_approval'],
  People: ['create_contact', 'contact_approval', 'contact_disposition'],
  Campaigns: ['create_campaign', 'add_campaign_member', 'create_draft', 'draft_approval', 'create_attempt', 'attempt_approval', 'manual_execution'],
};

function OptionSelect({ name, label, options, required = true }) {
  return <label>{label}<select name={name} required={required} disabled={!options.length} defaultValue="">
    <option value="" disabled>{options.length ? `Choose ${label.toLowerCase()}` : 'No eligible records yet'}</option>
    {options.map((option) => <option key={option.id} value={option.id}>{option.label}{option.detail ? ` — ${option.detail}` : ''}</option>)}
  </select></label>;
}

function TextInput({ name, label, required = false, type = 'text', placeholder }) {
  return <label>{label}<input name={name} type={type} required={required} placeholder={placeholder} /></label>;
}

function DecisionSelect({ name = 'decision', label = 'Decision' }) {
  return <label>{label}<select name={name} required defaultValue=""><option value="" disabled>Choose a decision</option><option value="approved">Approve</option><option value="rejected">Reject</option></select></label>;
}

function ActionForm({ action, choices, onCancel, onSubmit }) {
  const definition = ACTIONS[action];
  const content = (() => {
    switch (action) {
      case 'create_account': return <><TextInput name="display_name" label="Account name" required placeholder="Northstar Labs" /><TextInput name="source" label="Source" required placeholder="Referral, research, event…" /><TextInput name="external_reference" label="Reference (optional)" /></>;
      case 'create_account_approval': return <><OptionSelect name="account" label="Account" options={choices.accounts} /><label>Governance gate<select name="gate" required defaultValue=""><option value="" disabled>Choose a gate</option><option value="account">Account fit</option><option value="contact">Contact review</option><option value="draft">Draft review</option><option value="send">Manual outreach review</option></select></label><DecisionSelect /></>;
      case 'create_contact': return <><OptionSelect name="account" label="Account" options={choices.accounts} /><TextInput name="full_name" label="Full name" required placeholder="Jordan Lee" /><TextInput name="source" label="Source" required placeholder="Referral, research, event…" /><TextInput name="title" label="Role or title" /><TextInput name="email" label="Email" type="email" /><TextInput name="phone" label="Phone" type="tel" /><TextInput name="linkedin_url" label="LinkedIn URL" type="url" /><TextInput name="external_reference" label="Reference (optional)" /></>;
      case 'contact_approval': return <><OptionSelect name="contact" label="Contact" options={choices.contacts} /><DecisionSelect /></>;
      case 'contact_disposition': return <><OptionSelect name="contact" label="Contact" options={choices.contacts} /><label>Contact status<select name="disposition" required defaultValue=""><option value="" disabled>Choose a status</option><option value="review">Needs review</option><option value="active">Active</option><option value="do_not_contact">Do not contact</option><option value="invalid">Invalid</option></select></label></>;
      case 'create_campaign': return <><TextInput name="name" label="Campaign name" required placeholder="Fall partner introductions" /><label>Channel<select name="channel" required defaultValue=""><option value="" disabled>Choose a manual channel</option><option value="email">Email</option><option value="call">Call</option><option value="linkedin">LinkedIn</option></select></label><TextInput name="purpose" label="Purpose" placeholder="Warm introductions" /></>;
      case 'add_campaign_member': return <><OptionSelect name="campaign" label="Campaign" options={choices.campaigns} /><OptionSelect name="contact" label="Contact" options={choices.contacts} /></>;
      case 'create_draft': return <><OptionSelect name="membership" label="Campaign and contact" options={choices.memberships} /><label>Draft text<textarea name="body" required placeholder="Write the proposed message or call notes…" /></label></>;
      case 'draft_approval': return <><OptionSelect name="draft" label="Draft" options={choices.drafts} /><DecisionSelect /></>;
      case 'create_attempt': return <><OptionSelect name="draft" label="Approved draft" options={choices.drafts} /></>;
      case 'attempt_approval': return <><OptionSelect name="attempt" label="Manual outreach" options={choices.attempts} /><DecisionSelect /></>;
      case 'manual_execution': return <><OptionSelect name="attempt" label="Approved manual outreach" options={choices.attempts} /><label>Outcome<textarea name="outcome_note" required placeholder="Example: Called, left voicemail; follow up next week." /></label></>;
      default: return null;
    }
  })();
  return <form className="crm-composer" onSubmit={onSubmit}><div className="crm-composer-heading"><p className="member-kicker">Guided action</p><h2>{definition.label}</h2><p>{definition.help}</p></div><div className="crm-form-fields">{content}</div><div className="crm-form-actions"><button type="submit">Record action</button><button type="button" className="crm-secondary-button" onClick={onCancel}>Cancel</button></div></form>;
}

function GateSummary({ account }) {
  return <dl className="crm-stage-list"><div><dt>Account fit</dt><dd>{stageLabel(account.accountApproval || account.account_approval)}</dd></div><div><dt>Contact review</dt><dd>{stageLabel(account.contactApproval || account.contact_approval)}</dd></div><div><dt>Draft review</dt><dd>{stageLabel(account.draftApproval || account.draft_approval)}</dd></div><div><dt>Manual outreach</dt><dd>{stageLabel(account.sendApproval || account.send_approval)}</dd></div></dl>;
}

export default function CrmWorkspace() {
  const [data, setData] = useState({ accounts: [], campaigns: [], contacts: [], activity: [] });
  const [tab, setTab] = useState('Campaigns');
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('Loading shared workspace…');
  const choices = useMemo(() => buildWorkflowChoices(data), [data]);

  const load = async () => {
    try {
      const response = await fetch('/api/crm/workspace', { cache: 'no-store' });
      const json = await response.json();
      setData(response.ok ? json : { accounts: [], campaigns: [], contacts: [], activity: [] });
      setMessage(response.ok ? '' : json.error || 'CRM unavailable');
    } catch { setMessage('CRM unavailable'); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const selectedDraft = choices.drafts.find((item) => item.id === values.draft);
    let payload;
    switch (action) {
      case 'create_account': payload = values; break;
      case 'create_account_approval': payload = { account_id: values.account, gate: values.gate, decision: values.decision }; break;
      case 'create_contact': payload = { ...values, account_id: values.account }; delete payload.account; break;
      case 'contact_approval': payload = { contact_id: values.contact, decision: values.decision }; break;
      case 'contact_disposition': payload = { contact_id: values.contact, disposition: values.disposition }; break;
      case 'create_campaign': payload = values; break;
      case 'add_campaign_member': payload = { campaign_id: values.campaign, contact_id: values.contact }; break;
      case 'create_draft': payload = { membership_id: values.membership, content: { body: values.body } }; break;
      case 'draft_approval': payload = { draft_id: values.draft, decision: values.decision }; break;
      case 'create_attempt': payload = { membership_id: selectedDraft?.membershipId, draft_id: values.draft }; break;
      case 'attempt_approval': payload = { attempt_id: values.attempt, decision: values.decision }; break;
      case 'manual_execution': payload = { attempt_id: values.attempt, outcome_note: values.outcome_note }; break;
      default: return;
    }
    if (Object.values(payload).some((value) => value === undefined)) { setMessage('That record is no longer available. Refresh and choose it again.'); return; }
    try {
      const response = await fetch('/api/crm/workspace', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, payload }) });
      const json = await response.json();
      setMessage(response.ok ? `${ACTIONS[action].label} recorded.` : json.error || 'CRM command could not be completed');
      if (response.ok) { setAction(''); load(); }
    } catch { setMessage('CRM command could not be completed'); }
  };

  const activity = data.activity.map((event) => formatActivity(event, choices));
  return <main className="crm-equal-admin"><header><p className="member-kicker">Plinko CRM · shared operator workspace</p><h1>Manual campaign workflow</h1><p>Choose people and records by name, follow the review stages, and record work as it happens. <strong>Manual outreach only:</strong> this portal never sends through a provider, dialer, or LinkedIn automation.</p></header>
    <section className="crm-governance-banner"><strong>Governed workflow</strong><span>Reviews progress in order. The server records every decision and rejects invalid transitions.</span></section>
    <nav aria-label="CRM views">{['Accounts', 'Campaigns', 'People', 'Activity'].map((item) => <button key={item} className={tab === item ? 'is-active' : ''} onClick={() => { setTab(item); setAction(''); }}>{item}</button>)}</nav>
    {ACTIONS_BY_TAB[tab] && <section className="crm-actions"><div className="crm-section-heading"><p className="member-kicker">{tab}</p><h2>What do you need to do?</h2></div><div>{ACTIONS_BY_TAB[tab].map((name) => <button key={name} onClick={() => setAction(name)}>{ACTIONS[name].label}</button>)}</div></section>}
    {action && <ActionForm action={action} choices={choices} onCancel={() => setAction('')} onSubmit={submit} />}
    {tab === 'Accounts' && <section className="crm-record-grid">{data.accounts.length ? data.accounts.map((account) => <article className="crm-record-card" key={account.id}><p className="member-kicker">{account.source || 'Account'}</p><h3>{account.displayName || account.display_name || account.externalReference || account.external_reference || 'Unnamed account'}</h3><GateSummary account={account} /></article>) : <p className="workspace-empty">No accounts yet. Add an account to start the governed workflow.</p>}</section>}
    {tab === 'People' && <section className="crm-record-grid">{data.contacts.length ? data.contacts.map((contact) => <article className="crm-record-card" key={contact.id}><p className="member-kicker">{contact.account_name || 'Account not listed'}</p><h3>{contact.full_name || 'Unnamed contact'}</h3><p>{[contact.title, contact.email, contact.phone].filter(Boolean).join(' · ') || 'No contact details recorded'}</p><span className="crm-stage-chip">{stageLabel(contact.contact_approval)} · {stageLabel(contact.disposition)}</span></article>) : <p className="workspace-empty">No contacts yet. Choose an account by name to add one.</p>}</section>}
    {tab === 'Campaigns' && <section className="crm-record-grid">{data.campaigns.length ? data.campaigns.map((campaign) => <article className="crm-record-card" key={campaign.id}><p className="member-kicker">{campaign.channel || 'Manual channel'}</p><h3>{campaign.name || 'Untitled campaign'}</h3><p>{campaign.purpose || 'No purpose recorded'}</p><span className="crm-stage-chip">{stageLabel(campaign.status)} · {campaign.member_count || 0} people</span></article>) : <p className="workspace-empty">No campaigns yet. Create one, then add a person by name.</p>}<p className="crm-workflow-hint">After adding a person, refreshes make the campaign-and-contact choice available for a draft. Drafts and manual outreach are selected by their campaign and contact, never by an ID.</p></section>}
    {tab === 'Activity' && <section className="crm-activity-panel"><h2>Shared activity</h2>{activity.length ? <ol className="crm-activity-list">{activity.map((event, index) => <li key={`${event.title}-${event.timestamp}-${index}`}><strong>{event.title}</strong><span>{event.context}</span>{event.timestamp && <small>{new Date(event.timestamp).toLocaleString()}</small>}</li>)}</ol> : <p className="workspace-empty">No shared activity yet.</p>}</section>}
    <p className="crm-status" role="status">{message}</p>
  </main>;
}

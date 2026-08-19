'use client';

const stations = [
  {
    number: '01',
    name: 'Find',
    subtitle: 'Build a credible account queue',
    destination: 'Accounts',
    action: 'Open Accounts',
    outcome: 'A small, evidence-backed account queue with a clear next action.',
    steps: [
      'Start with the smallest useful account queue; do not create volume that cannot receive follow-up.',
      'Confirm source context and fit, then record a concrete next action or hold the account for the exact missing fact.',
      'Move only approved accounts forward; an account decision never approves a person or outreach.',
    ],
  },
  {
    number: '02',
    name: 'Propose',
    subtitle: 'Turn qualified context into a disciplined next step',
    destination: 'Opportunities',
    action: 'Open Opportunities',
    outcome: 'A clear account-backed opportunity context with no invented deal data.',
    steps: [
      'Open the account context and identify the operator-owned next action, owner, and due date.',
      'Use account activity and people context to prepare discovery or scope work outside unsupported CRM fields.',
      'Do not infer amount, probability, close date, customer commitment, or send authority from qualification alone.',
    ],
  },
  {
    number: '03',
    name: 'Onboard',
    subtitle: 'Map the agreed work into owned follow-ups',
    destination: 'Tasks',
    action: 'Open Tasks',
    outcome: 'Account-linked follow-ups with an owner, due date, and visible activity context.',
    steps: [
      'Create internal, account-linked tasks for the commitments that must happen next.',
      'Keep tasks specific: one owner, one due date, and one observable completion state.',
      'Use the timeline to retain context; do not represent an unrecorded contract, project plan, or client handoff as completed.',
    ],
  },
  {
    number: '04',
    name: 'Deliver',
    subtitle: 'Keep approved manual work moving',
    destination: 'Campaigns',
    action: 'Open Campaigns',
    outcome: 'A focused manual-work queue with approved members, drafts, and recorded outcomes.',
    steps: [
      'Work one or two campaigns at a time and add only individually eligible, non-suppressed people.',
      'Review the exact draft and planned manual attempt before a human performs external work.',
      'Record the real outcome and next follow-up; this CRM does not send, dial, schedule, enrich, or dispatch.',
    ],
  },
  {
    number: '05',
    name: 'Report',
    subtitle: 'Reflect on work completed and exceptions',
    destination: 'Reports',
    action: 'Open Reports',
    outcome: 'A read-only view of account-work and campaign-readiness exceptions with freshness context.',
    steps: [
      'Review what moved, what is waiting, and which accounts lack a next action.',
      'Compare the operating intent with actual recorded work; treat missing data as unavailable, not a performance conclusion.',
      'Choose the next operational correction and return it to My Work, Accounts, Tasks, or Campaigns.',
    ],
  },
];

export default function StationPlaybooks({ openModule }) {
  return <div className="crm-module crm-stations">
    <header className="crm-module-heading">
      <div>
        <p className="crm-eyebrow">Operating system</p>
        <h1>Five station playbooks</h1>
        <p>Use each station as a focused work loop. The CRM keeps account context, people, tasks, campaign work, and reporting connected without treating a station card as authority to perform an unsupported action.</p>
      </div>
      <button className="crm-primary" type="button" onClick={() => openModule('My Work')}>Start in My Work</button>
    </header>
    <section className="crm-station-rail" aria-label="Five stations">
      {stations.map((station) => <a href={`#station-${station.number}`} key={station.number}><span>{station.number}</span>{station.name}</a>)}
    </section>
    <section className="crm-station-list" aria-label="Station playbooks">
      {stations.map((station) => <article className="crm-station-card" id={`station-${station.number}`} key={station.number}>
        <header><span className="crm-station-number">{station.number}</span><div><p className="crm-eyebrow">Station {station.number}</p><h2>{station.name}</h2><p>{station.subtitle}</p></div></header>
        <div className="crm-station-outcome"><span>Done looks like</span><strong>{station.outcome}</strong></div>
        <ol>{station.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <button className="crm-text-button" type="button" onClick={() => openModule(station.destination)}>{station.action} →</button>
      </article>)}
    </section>
  </div>;
}

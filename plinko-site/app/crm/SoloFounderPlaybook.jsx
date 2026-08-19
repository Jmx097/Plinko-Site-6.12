'use client';

const blocks = [
  {
    minutes: '00–10',
    title: 'Choose the few decisions that matter today',
    destination: 'My Work',
    action: 'Open My Work',
    purpose: 'Review overdue or unowned work, then pick one clear next action for each active account. Do not grow the queue if follow-up is already the constraint.',
  },
  {
    minutes: '10–40',
    title: 'Qualify a small account queue',
    destination: 'Accounts',
    action: 'Open Accounts',
    purpose: 'Work 3–5 accounts at a time. Confirm fit and evidence, record the account decision, and hold incomplete records with the exact missing fact.',
  },
  {
    minutes: '40–60',
    title: 'Advance only the permitted people work',
    destination: 'Contacts',
    action: 'Open Contacts',
    purpose: 'Review people only for accounts that are already eligible. Account approval, person/contact approval, and suppression remain separate decisions.',
  },
  {
    minutes: '60–85',
    title: 'Prepare one focused manual campaign',
    destination: 'Campaigns',
    action: 'Open Campaigns',
    purpose: 'Keep one or two active campaigns. Add only approved, non-suppressed people; review the exact draft and manual attempt before any human outreach.',
  },
  {
    minutes: '85–105',
    title: 'Do the human outreach outside this CRM',
    destination: 'Campaigns',
    action: 'Review campaign',
    purpose: 'Perform the approved manual action yourself. This workspace does not send, dial, schedule, enrich, scrape, or dispatch for you.',
  },
  {
    minutes: '105–120',
    title: 'Close the loop before stopping',
    destination: 'Tasks',
    action: 'Open Tasks',
    purpose: 'Record the real outcome, create the next account-linked follow-up, assign a due date, and leave no active account without a next action.',
  },
];

export default function SoloFounderPlaybook({ openModule }) {
  return <div className="crm-module crm-playbook">
    <header className="crm-module-heading">
      <div>
        <p className="crm-eyebrow">Solo founder onboarding</p>
        <h1>Run a focused 2-hour prospecting block</h1>
        <p>Use the CRM to make the next decision obvious—not to create volume without follow-through. Start with a small trusted queue, complete real human work, and record the result.</p>
      </div>
      <button className="crm-primary" type="button" onClick={() => openModule('My Work')}>Start today in My Work</button>
    </header>

    <section className="crm-playbook-principles" aria-label="Operating limits">
      <article><strong>5–10</strong><span>active accounts at once</span></article>
      <article><strong>3–5</strong><span>accounts ready for people review</span></article>
      <article><strong>1–2</strong><span>active manual campaigns</span></article>
      <article><strong>0</strong><span>active accounts without a next action</span></article>
    </section>

    <section className="crm-playbook-grid" aria-label="Two hour workflow">
      {blocks.map((block, index) => <article className="crm-playbook-block" key={block.minutes}>
        <div className="crm-playbook-time">{block.minutes} min</div>
        <div>
          <p className="crm-eyebrow">Step {index + 1}</p>
          <h2>{block.title}</h2>
          <p>{block.purpose}</p>
          <button type="button" className="crm-text-button" onClick={() => openModule(block.destination)}>{block.action} →</button>
        </div>
      </article>)}
    </section>

    <section className="crm-playbook-close">
      <h2>What a good day looks like</h2>
      <ul>
        <li>Every active account has an owner, a concrete next action, and a due date.</li>
        <li>Evidence gaps are held honestly instead of pushed into people or outreach work.</li>
        <li>Manual outreach outcomes are recorded so tomorrow’s follow-up is clear.</li>
      </ul>
      <p>This playbook is guidance only. It does not grant research, contact, draft, attempt, provider, or sending authority beyond the CRM’s existing server-side controls.</p>
    </section>
  </div>;
}

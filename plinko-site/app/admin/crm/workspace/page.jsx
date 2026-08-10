import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCrmStationOverview } from '../../../../lib/crm-api.mjs';
import { requireAdminEmail } from '../../../../lib/plinko-pocket-admin.mjs';

export const dynamic = 'force-dynamic';

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

export default async function CrmWorkspacePage() {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId) redirect('/sign-in');
  try {
    requireAdminEmail(user);
  } catch {
    redirect('/account');
  }

  const { governance, freshness, stations } = await getCrmStationOverview();
  const metrics = stations.metrics;
  const records = Array.isArray(stations.reviewQueue) ? stations.reviewQueue : [];

  return (
    <main className="workspace-page">
      <section className="workspace-shell" aria-labelledby="workspace-title">
        <header className="workspace-header">
          <div>
            <p className="member-kicker">Plinko Revenue OS · internal workspace</p>
            <h1 id="workspace-title">This Week — Governed Campaigns</h1>
            <p className="workspace-lede">A table-first operating view of the current campaign queue. It explains the next permitted decision without turning approvals into a wall of controls.</p>
          </div>
          <div className="workspace-status" aria-label="Workspace status">
            <strong>Read-only</strong>
            <span>Freshness: {formatDate(freshness.checked_at)}</span>
            <span>Mode: {governance.mode}</span>
          </div>
        </header>

        <nav className="workspace-nav" aria-label="CRM workspace navigation">
          <span aria-current="page">This Week</span>
          <span>Accounts</span>
          <span>Campaigns</span>
          <span>Activity</span>
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
            <div>
              <p className="workspace-eyebrow">Current operating queue</p>
              <h2 id="workspace-queue-title">Accounts requiring a governed next step</h2>
            </div>
            <p>{records.length} record{records.length === 1 ? '' : 's'} · no contact data or execution controls in this view</p>
          </div>

          {records.length ? <div className="workspace-table-wrap"><table className="workspace-table">
            <thead><tr><th scope="col">Account</th><th scope="col">Current gate</th><th scope="col">Next permitted action</th><th scope="col">Evidence</th><th scope="col">Updated</th></tr></thead>
            <tbody>{records.map((record) => (
              <tr key={record.id}>
                <td><strong>{record.displayName || 'Unnamed source-intake account'}</strong><span className="workspace-id">{record.id}</span></td>
                <td><span className={`workspace-chip ${queueTones[record.queueState] || ''}`}>{queueLabels[record.queueState] || record.queueState || 'Review'}</span></td>
                <td><strong>{record.nextGate || 'No further gate'}</strong><span className="workspace-next">{gateCopy(record)}</span></td>
                <td>{record.externalReference ? <span className="workspace-reference">{record.externalReference}</span> : <span className="workspace-muted">No source reference</span>}</td>
                <td>{formatDate(record.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table></div> : <p className="workspace-empty">No CRM records are awaiting review.</p>}
        </section>

        <section className="workspace-details" aria-labelledby="workspace-details-title">
          <div className="workspace-panel-heading">
            <div><p className="workspace-eyebrow">Decision context</p><h2 id="workspace-details-title">Account detail and policy explanation</h2></div>
            <p>Open a record to see its source and the reason it stops at its current gate.</p>
          </div>
          <div className="workspace-detail-list">{records.map((record) => (
            <details key={record.id} className="workspace-detail">
              <summary><span><strong>{record.displayName || 'Unnamed source-intake account'}</strong><small>{queueLabels[record.queueState] || record.queueState || 'Review'} · next: {record.nextGate || 'none'}</small></span><span aria-hidden="true">+</span></summary>
              <div>
                <dl>
                  <div><dt>Governed record</dt><dd>{record.id}</dd></div>
                  <div><dt>Source reference</dt><dd>{record.externalReference || 'No source reference supplied'}</dd></div>
                  <div><dt>Current gate</dt><dd>{queueLabels[record.queueState] || record.queueState || 'Review'}</dd></div>
                  <div><dt>Created</dt><dd>{formatDate(record.createdAt)}</dd></div>
                </dl>
                <p>{gateCopy(record)}</p>
                <p className="workspace-policy">Policy boundary: account fit, contact research, draft review, and manual execution remain separate decisions. This workspace cannot approve, enrich, draft, export, or send.</p>
              </div>
            </details>
          ))}</div>
        </section>
      </section>
    </main>
  );
}

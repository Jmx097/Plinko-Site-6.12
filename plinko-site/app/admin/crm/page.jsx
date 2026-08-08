import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { getCrmStationOverview } from '../../../lib/crm-api.mjs';
import { requireAdminEmail } from '../../../lib/plinko-pocket-admin.mjs';

export const dynamic = 'force-dynamic';

const queueLabels = {
  station_1_account_review: 'Station 1 · account review',
  station_1_contact_review: 'Station 1 · contact-review gate',
  station_2_draft_review: 'Station 2 · draft review',
  station_2_send_review: 'Station 2 · send review',
  outreach_authorized: 'Outreach authorized · no automatic send',
  blocked_rejected: 'Blocked · rejected',
};

function metric(label, value) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

export default async function CrmAdminPage() {
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

  return (
    <main className="admin-page">
      <section className="admin-panel" aria-labelledby="crm-title">
        <p className="member-kicker">Plinko Revenue OS · Station 1–2</p>
        <h1 id="crm-title">Governed CRM command center</h1>
        <p className="admin-intro">Value practiced: account fit, contact research, draft review, and send approval remain separate decisions. This view is read-only and cannot approve, enrich, draft, export, or send.</p>
        <p className="member-email">Freshness: {new Date(freshness.checked_at).toLocaleString('en-CA')} · Mode: {governance.mode}</p>

        <section aria-labelledby="crm-metrics-title">
          <h2 id="crm-metrics-title">Current review load</h2>
          <dl className="member-stats">
            {metric('Accounts', metrics.totalAccounts)}
            {metric('Account review', metrics.station1.accountReviewPending)}
            {metric('Contact review', metrics.station1.contactReviewPending)}
            {metric('Draft review', metrics.station2.draftReviewPending)}
            {metric('Send review', metrics.station2.sendReviewPending)}
            {metric('Authorized', metrics.station2.outreachAuthorized)}
            {metric('Blocked', metrics.blocked.totalRejected)}
          </dl>
        </section>

        <section aria-labelledby="crm-queue-title">
          <h2 id="crm-queue-title">Review queue</h2>
          <p className="admin-intro">Each record has one derived next gate. An authorized status is visibility only; external outreach remains a separate human action.</p>
          {stations.reviewQueue.length ? <div className="admin-list">{stations.reviewQueue.map((record) => (
            <article key={record.id} className="admin-request">
              <header>
                <strong>{record.displayName || 'Unnamed source-intake account'}</strong>
                <span>{queueLabels[record.queueState] || record.queueState}</span>
              </header>
              {record.externalReference ? <p>Source reference: {record.externalReference}</p> : null}
              <small>Next gate: {record.nextGate || 'none'} · Created: {new Date(record.createdAt).toLocaleString('en-CA')}</small>
            </article>
          ))}</div> : <p>No CRM records are awaiting review.</p>}
        </section>
      </section>
    </main>
  );
}

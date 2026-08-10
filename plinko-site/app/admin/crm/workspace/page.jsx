import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { getCrmStationOverview } from '../../../../lib/crm-api.mjs';
import { requireAdminEmail } from '../../../../lib/plinko-pocket-admin.mjs';
import CrmWorkspace from './CrmWorkspace.jsx';

export const dynamic = 'force-dynamic';

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString('en-CA');
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
        <CrmWorkspace metrics={metrics} records={records} />
      </section>
    </main>
  );
}

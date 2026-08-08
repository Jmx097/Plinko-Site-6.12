import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { getCrmAccounts } from '../../../lib/crm-api.mjs';
import { requireAdminEmail } from '../../../lib/plinko-pocket-admin.mjs';
import { decideCrmApprovalAction } from './actions';

export const dynamic = 'force-dynamic';

const gates = ['account', 'contact', 'draft', 'send'];

function statusFor(account, gate) {
  return account[`${gate}Approval`];
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

  const { accounts, freshness } = await getCrmAccounts();
  return (
    <main className="admin-page">
      <section className="admin-panel" aria-labelledby="crm-title">
        <p className="member-kicker">Plinko Revenue OS · Station 1</p>
        <h1 id="crm-title">Governed CRM review</h1>
        <p className="admin-intro">Account, contact, draft, and send approvals are distinct, ordered, and irreversible. This surface cannot initiate outreach.</p>
        <p className="member-email">Freshness: {new Date(freshness.checked_at).toLocaleString('en-CA')}</p>

        {accounts.length ? <div className="admin-list">{accounts.map((account) => (
          <article key={account.id} className="admin-request">
            <header>
              <strong>{account.displayName || 'Unnamed source-intake account'}</strong>
              <span>{account.source}</span>
            </header>
            {account.externalReference ? <p>Source reference: {account.externalReference}</p> : null}
            <small>Created: {new Date(account.createdAt).toLocaleString('en-CA')}</small>
            <div className="crm-gates" aria-label="Approval gates">
              {gates.map((gate) => {
                const status = statusFor(account, gate);
                return <form key={gate} action={decideCrmApprovalAction.bind(null, account.id)}>
                  <strong>{gate}</strong>
                  <span>{status}</span>
                  <input type="hidden" name="gate" value={gate} />
                  {status === 'pending' ? <>
                    <button className="btn btn-ghost" type="submit" name="decision" value="approved">Approve</button>
                    <button className="btn btn-ghost" type="submit" name="decision" value="rejected">Reject</button>
                  </> : null}
                </form>;
              })}
            </div>
          </article>
        ))}</div> : <p>No source-intake accounts are awaiting review.</p>}
      </section>
    </main>
  );
}

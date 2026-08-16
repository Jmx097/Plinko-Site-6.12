import { auth, currentUser } from '@clerk/nextjs/server';

import { getMemberOverview } from '../../lib/member-activation.mjs';
import { getMemberDashboard } from '../../lib/member-dashboard.mjs';
import { isAdminEmail } from '../../lib/plinko-pocket-admin.mjs';
import { requireCrmEqualAdminEmail } from '../../lib/crm-equal-admin.mjs';
import { submitSupportRequest } from './actions';

export const dynamic = 'force-dynamic';

function formatCents(cents, currency) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: String(currency || 'usd').toUpperCase(), maximumFractionDigits: 2 }).format((Number(cents) || 0) / 100);
}

const moduleCopy = {
  community: ['Community space', 'Your member community access is enabled.'],
  referrals: ['Referral workspace', 'Share and track your governed referral program link.'],
  workspace: ['Pocket workspace', 'Your guided workspace module is ready.'],
};

export default async function AccountPage() {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId) throw new Error('Authenticated member session required');

  const firstName = user?.firstName || 'Member';
  const email = user?.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress
    || user?.emailAddresses[0]?.emailAddress;
  let crmAdmin = false;
  try { requireCrmEqualAdminEmail(user); crmAdmin = true; } catch { /* Non-CRM members keep the standard Pocket home. */ }

  // The CRM is an independent operating surface. Its authorized operators must
  // not be blocked by an outage in the separate Pocket/referral Core.
  if (crmAdmin) {
    return (
      <main className="member-page">
        <section className="member-panel member-dashboard" aria-labelledby="account-title">
          <p className="member-kicker">Plinko CRM · operator home</p>
          <h1 id="account-title">Welcome, {firstName}</h1>
          {email ? <p className="member-email">{email}</p> : null}
          <div className="member-status">
            <strong>Your shared campaign workspace is ready.</strong>
            <span>Open Accounts to work the weekly queue, then use Campaigns to record manual outcomes and follow-ups.</span>
          </div>
          <p className="member-admin-link"><a href="/crm">Open campaign CRM →</a></p>
        </section>
      </main>
    );
  }

  const [overview, dashboard] = await Promise.all([getMemberOverview({ userId }), getMemberDashboard({ userId })]);
  const referralUrl = `${process.env.PLINKO_APP_URL}/sign-up?ref=${encodeURIComponent(overview.referralCode)}`;
  const availableEarnings = Object.entries(overview.availableByCurrency);
  const modules = dashboard.modules.map((key) => moduleCopy[key]).filter(Boolean);

  return (
    <main className="member-page">
      <section className="member-panel member-dashboard" aria-labelledby="account-title">
        <p className="member-kicker">Plinko Pocket · member home</p>
        <h1 id="account-title">Welcome, {firstName}</h1>
        {email ? <p className="member-email">{email}</p> : null}
        {crmAdmin ? <p className="member-admin-link"><a href="/crm">Open campaign CRM →</a></p> : null}
        {email && isAdminEmail(email) ? <p className="member-admin-link"><a href="/admin">Open Pocket staff control plane →</a></p> : null}

        <div className="member-status" aria-live="polite">
          <strong>{overview.activatedNow ? 'Your referral space is ready.' : 'Your referral space is active.'}</strong>
          <span>Your enabled Pocket modules and support requests live in one place.</span>
        </div>

        <section className="member-link" aria-labelledby="referral-link-title">
          <h2 id="referral-link-title">Your referral link</h2>
          <a href={referralUrl}>{referralUrl}</a>
          <p>Only verified paid subscriptions can create earnings. A referral never guarantees a payout.</p>
        </section>

        <dl className="member-stats">
          <div><dt>Attributed referrals</dt><dd>{overview.referralCount}</dd></div>
          <div><dt>Pending commissions</dt><dd>{overview.pendingCommissionCount}</dd></div>
          <div><dt>Available to review</dt><dd>{availableEarnings.length ? availableEarnings.map(([currency, cents]) => formatCents(cents, currency)).join(' · ') : '—'}</dd></div>
        </dl>

        <section className="member-modules" aria-labelledby="module-title">
          <h2 id="module-title">Your Pocket modules</h2>
          {modules.length ? <ul>{modules.map(([title, copy]) => <li key={title}><strong>{title}</strong><span>{copy}</span></li>)}</ul> : <p>No optional modules are enabled yet. Your core member home and support remain available.</p>}
        </section>

        <section className="member-support" aria-labelledby="support-title">
          <h2 id="support-title">Request support</h2>
          <p>Send a request directly to the Pocket team. Email notification delivery is not configured in this release.</p>
          <form action={submitSupportRequest} className="support-form">
            <label>Subject<input name="subject" required maxLength="160" /></label>
            <label>What can we help with?<textarea name="message" required maxLength="5000" rows="5" /></label>
            <button className="btn btn-green" type="submit">Send support request</button>
          </form>
          <h3>Your recent requests</h3>
          {dashboard.supportRequests.length ? <ul className="support-list">{dashboard.supportRequests.map((request) => <li key={request.id}><strong>{request.subject}</strong><span>{request.status.replace('_', ' ')} · {new Date(request.created_at).toLocaleDateString('en-CA')}</span></li>)}</ul> : <p>No support requests yet.</p>}
        </section>

        <p className="member-copy">The 40% program applies to eligible net collected subscription revenue for the first 12 paid months. Taxes, refunds, chargebacks, credits, discounts, provider pass-through, and implementation fees do not qualify. Amounts remain pending through the 30-day clearance period and are paid only after review.</p>
      </section>
    </main>
  );
}

import { auth, currentUser } from '@clerk/nextjs/server';

import { getMemberOverview } from '../../lib/member-activation.mjs';

export const dynamic = 'force-dynamic';

function formatCents(cents, currency) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: String(currency || 'usd').toUpperCase(),
    maximumFractionDigits: 2,
  }).format((Number(cents) || 0) / 100);
}

export default async function AccountPage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId) {
    // Middleware owns redirect behavior. This remains a fail-closed safeguard.
    throw new Error('Authenticated member session required');
  }

  const overview = await getMemberOverview({ userId });
  const firstName = user?.firstName || 'Member';
  const email = user?.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress
    || user?.emailAddresses[0]?.emailAddress;
  const referralUrl = `${process.env.PLINKO_APP_URL}/sign-up?ref=${encodeURIComponent(overview.referralCode)}`;
  const availableEarnings = Object.entries(overview.availableByCurrency);

  return (
    <main className="member-page">
      <section className="member-panel member-dashboard" aria-labelledby="account-title">
        <p className="member-kicker">Plinko Pocket · member portal</p>
        <h1 id="account-title">Welcome, {firstName}</h1>
        {email ? <p className="member-email">{email}</p> : null}

        <div className="member-status" aria-live="polite">
          <strong>{overview.activatedNow ? 'Your referral space is ready.' : 'Your referral space is active.'}</strong>
          <span>Share your link. Referral eligibility and payout status remain visible here.</span>
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

        <p className="member-copy">The 40% program applies to eligible net collected subscription revenue for the first 12 paid months. Taxes, refunds, chargebacks, credits, discounts, provider pass-through, and implementation fees do not qualify. Amounts remain pending through the 30-day clearance period and are paid only after review.</p>
      </section>
    </main>
  );
}

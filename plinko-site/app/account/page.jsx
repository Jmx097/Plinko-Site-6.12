import { auth, currentUser } from '@clerk/nextjs/server';

export default async function AccountPage() {
  const { userId } = await auth();
  const user = await currentUser();

  const firstName = user?.firstName || 'Member';
  const email = user?.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress
    || user?.emailAddresses[0]?.emailAddress;

  return (
    <main className="member-page">
      <section className="member-panel" aria-labelledby="account-title">
        <p className="member-kicker">Plinko community portal</p>
        <h1 id="account-title">Welcome, {firstName}</h1>
        {userId && email ? <p className="member-email">{email}</p> : null}
        <p className="member-copy">Referral and payout data will appear after account activation.</p>
      </section>
    </main>
  );
}

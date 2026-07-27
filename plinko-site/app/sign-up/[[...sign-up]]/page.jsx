import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main className="member-page">
      <div className="member-panel">
        <p className="member-kicker">Plinko community portal</p>
        <p className="member-copy">Join the Plinko community portal.</p>
        <SignUp forceRedirectUrl="/account" />
      </div>
    </main>
  );
}

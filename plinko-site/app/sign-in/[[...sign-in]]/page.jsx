import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="member-page">
      <div className="member-panel">
        <p className="member-kicker">Plinko community portal</p>
        <h1>Welcome back</h1>
        <p className="member-copy">Sign in to access your member account.</p>
        <SignIn forceRedirectUrl="/account" />
      </div>
    </main>
  );
}

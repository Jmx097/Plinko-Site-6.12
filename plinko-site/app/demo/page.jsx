import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { getMemberRoleAccess } from '../../lib/pocket-roles.mjs';

export const dynamic = 'force-dynamic';

const lessons = [
  ['01 — Find', 'Start with the right work', 'Choose work that fits the strategy, the capacity, and the evidence available.'],
  ['02 — Propose', 'Make the promise clear', 'Define scope, price, exclusions, and the decision that moves work forward.'],
  ['03 — Onboard', 'Set up the bench', 'Translate the promise into owners, dependencies, and the first practical next steps.'],
  ['04 — Deliver', 'Check the fit', 'Compare each deliverable with the original pain and the agreed scope before it leaves the team.'],
  ['05 — Report', 'Keep the repair notes', 'Review value practiced versus intended, then make the next improvement visible.'],
];

export default async function DemoLibraryPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  let access;
  try { access = await getMemberRoleAccess({ userId }); } catch { redirect('/account'); }
  if (!access.capabilities.includes('demo.course')) redirect('/account');

  return <main className="member-page"><section className="member-panel" aria-labelledby="demo-title">
    <p className="member-kicker">Plinko Pocket · demo library</p>
    <h1 id="demo-title">The Five Stations</h1>
    <p className="member-email">A shared course library for learning the Plinko work model—separate from the live Sales workspace.</p>
    <ol className="course-lessons">{lessons.map(([number, title, copy]) => <li key={number}><span>{number}</span><div><h2>{title}</h2><p>{copy}</p></div></li>)}</ol>
    <section className="member-status"><strong>Run → Skill → Schedule</strong><span>First make a workflow useful by hand. Keep its decision criteria. Only then make it repeatable and observable.</span></section>
    <p className="member-copy">Demo access is educational. It does not grant CRM, customer-data, approval, or runtime-execution access.</p>
    <p className="member-admin-link"><a href="/account">Back to Pocket home →</a></p>
  </section></main>;
}

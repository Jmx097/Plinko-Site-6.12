import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { getAdminControlPlane } from '../../lib/member-dashboard.mjs';
import { requireAdminEmail } from '../../lib/plinko-pocket-admin.mjs';
import { getWaitlistEntries } from '../../lib/waitlist.mjs';
import { updateGrantForMember, updateSupportStatus, updateWaitlistStatus } from './actions';

export const dynamic = 'force-dynamic';

const modules = ['community', 'referrals', 'workspace'];

export default async function AdminPage() {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId) redirect('/sign-in');
  let staffEmail;
  try {
    staffEmail = requireAdminEmail(user);
  } catch {
    redirect('/account');
  }
  const [controlPlane, waitlist] = await Promise.all([getAdminControlPlane(), getWaitlistEntries()]);
  const members = new Set([
    ...controlPlane.memberProfiles.map((profile) => profile.user_id),
    ...controlPlane.supportRequests.map((request) => request.user_id),
    ...controlPlane.grants.map((grant) => grant.user_id),
  ]);
  const activeGrantKeys = new Set(controlPlane.grants.filter((grant) => grant.enabled && (!grant.expires_at || Date.parse(grant.expires_at) > Date.now())).map((grant) => `${grant.user_id}:${grant.module_key}`));

  return (
    <main className="admin-page">
      <section className="admin-panel" aria-labelledby="admin-title">
        <p className="member-kicker">Plinko Pocket · staff only</p>
        <h1 id="admin-title">Control plane</h1>
        <p className="member-email">Signed in as {staffEmail}</p>
        <p className="admin-intro">Grant only the modules a member needs and triage support requests. All writes are verified server-side against the staff allowlist.</p>

        <section aria-labelledby="waitlist-title">
          <h2 id="waitlist-title">Waitlist</h2>
          {waitlist.length === 200 ? <p className="admin-intro">Showing the newest 200 entries. Export/pagination is the next operating increment.</p> : null}
          {waitlist.length ? <div className="admin-list">{waitlist.map((entry) => (
            <article key={entry.id} className="admin-request waitlist-entry">
              <header><strong>{entry.first_name || entry.email}</strong><span>{entry.status} · {new Date(entry.created_at).toLocaleString('en-CA')}</span></header>
              <p>{entry.email}{entry.company ? ` · ${entry.company}` : ''}</p>
              <small>{entry.account_type} · wants {entry.desired_outcome} · source: {entry.source}{entry.referral_code ? ` · referral: ${entry.referral_code}` : ''} · consent: {entry.product_updates_consent ? 'active' : 'withdrawn'} ({entry.terms_version})</small>
              <form action={updateWaitlistStatus.bind(null, entry.id)}>
                <label>Status<select name="status" defaultValue={entry.status}>{entry.status === 'unsubscribed' ? <option value="unsubscribed">Unsubscribed</option> : <><option value="waiting">Waiting</option><option value="qualified">Qualified</option><option value="invited">Invited</option><option value="joined">Joined</option><option value="declined">Declined</option><option value="unsubscribed">Unsubscribed</option></>}</select></label>
                <button className="btn btn-ghost" type="submit">Update</button>
              </form>
            </article>
          ))}</div> : <p>No waitlist entries yet.</p>}
        </section>

        <section aria-labelledby="support-triage-title">
          <h2 id="support-triage-title">Support triage</h2>
          {controlPlane.supportRequests.length ? <div className="admin-list">{controlPlane.supportRequests.map((request) => (
            <article key={request.id} className="admin-request">
              <header><strong>{request.subject}</strong><span>{request.status.replace('_', ' ')} · {new Date(request.created_at).toLocaleString('en-CA')}</span></header>
              <p>{request.message}</p>
              <small>Member subject: {request.user_id}</small>
              <form action={updateSupportStatus.bind(null, request.id)}><label>Status<select name="status" defaultValue={request.status}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label><button className="btn btn-ghost" type="submit">Update</button></form>
            </article>
          ))}</div> : <p>No member support requests.</p>}
        </section>

        <section aria-labelledby="grant-title">
          <h2 id="grant-title">Member module grants</h2>
          {members.size ? <div className="admin-list">{[...members].sort().map((memberUserId) => <article key={memberUserId} className="admin-grants"><strong>Member subject: {memberUserId}</strong><div>{modules.map((moduleKey) => <form key={moduleKey} action={updateGrantForMember.bind(null, memberUserId, moduleKey)}><span>{moduleKey}</span><select name="enabled" defaultValue={activeGrantKeys.has(`${memberUserId}:${moduleKey}`) ? 'true' : 'false'}><option value="false">Disabled</option><option value="true">Enabled</option></select><button className="btn btn-ghost" type="submit">Save</button></form>)}</div></article>)}</div> : <p>Members appear here after a support request or existing grant.</p>}
        </section>
      </section>
    </main>
  );
}

import WaitlistForm from './WaitlistForm';

export const metadata = { title: 'Join the Plinko Pocket Waitlist', description: 'Get early access to one Plinko membership for learning, governed agent blueprints, and the Pocket mobile operating layer.' };

function cleanParam(value, pattern, fallback = '') { return typeof value === 'string' && pattern.test(value) ? value : fallback; }

export default async function WaitlistPage({ searchParams }) {
  const params = await searchParams;
  const source = cleanParam(params?.src, /^[a-z0-9_-]{1,40}$/i, 'portal_waitlist').toLowerCase();
  const referralCode = cleanParam(params?.ref, /^[a-z0-9-]{1,100}$/i).toLowerCase();
  const notice = params?.joined === '1' ? { ok: true, text: 'Your place is saved. We’ll send access updates to the email you provided.' }
    : params?.error === 'busy' ? { ok: false, text: 'The waitlist is busy. Please try again in a minute.' }
      : params?.error ? { ok: false, text: 'We could not save your place. Check the form and try again.' } : null;
  return (
    <main className="waitlist-page"><section className="waitlist-shell" aria-labelledby="waitlist-title">
      <div className="waitlist-copy"><a className="waitlist-brand" href="https://www.plinkosolutions.com">Plinko Solutions</a><p className="member-kicker">Plinko Pocket · early access</p><h1 id="waitlist-title">Join the Pocket waitlist.</h1><p className="waitlist-lede">One account for Plinko learning, reusable agent blueprints, and the mobile place where you review what moves next.</p><ul><li>A practical learning catalog—not a pile of prompts.</li><li>Versioned agent blueprints with clear permissions and approval stops.</li><li>The same membership and progress on web and Plinko Pocket.</li></ul><p className="waitlist-trust">Pocket asks before it sends, books, buys, changes, or shares anything important.</p></div>
      <div className="waitlist-card"><h2>Save your place</h2><p>Tell us what you want first. Joining the list does not create an account or start a subscription.</p>{notice ? <p className={`waitlist-message ${notice.ok ? 'is-success' : 'is-error'}`} role="status">{notice.text}</p> : null}<WaitlistForm source={source} referralCode={referralCode} /></div>
    </section></main>
  );
}

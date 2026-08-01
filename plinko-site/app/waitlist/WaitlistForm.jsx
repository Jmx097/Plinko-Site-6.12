import { submitWaitlist } from './actions';

export default function WaitlistForm({ source = 'portal_waitlist', referralCode = '' }) {
  return (
    <form action={submitWaitlist} className="waitlist-form">
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="ref" value={referralCode} />
      <label className="waitlist-honeypot" aria-hidden="true">Website<input name="website" tabIndex="-1" autoComplete="off" /></label>
      <div className="waitlist-fields">
        <label>First name<input name="firstName" maxLength="80" autoComplete="given-name" /></label>
        <label>Email address<input name="email" type="email" required maxLength="320" autoComplete="email" /></label>
        <label>Joining as<select name="accountType" required defaultValue=""><option value="" disabled>Choose one</option><option value="individual">An individual</option><option value="business">A business</option></select></label>
        <label>Company <span>(optional)</span><input name="company" maxLength="160" autoComplete="organization" /></label>
      </div>
      <fieldset><legend>What should Plinko help you access first?</legend>
        <label><input type="radio" name="desiredOutcome" value="learn" required /> Learning and playbooks</label>
        <label><input type="radio" name="desiredOutcome" value="blueprints" /> Agent blueprints</label>
        <label><input type="radio" name="desiredOutcome" value="both" /> Both in one membership</label>
      </fieldset>
      <label className="waitlist-consent"><input type="checkbox" name="productUpdatesConsent" value="yes" required /> Email me about Pocket access and membership updates.</label>
      <button className="btn btn-red btn-xl" type="submit">Join the waitlist</button>
      <p className="waitlist-privacy">No account is created yet. Plinko will invite approved members when access opens. <a href="https://www.plinkosolutions.com/privacy.html">Privacy</a></p>
    </form>
  );
}

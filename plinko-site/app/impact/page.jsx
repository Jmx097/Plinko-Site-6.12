import { redirect } from 'next/navigation';

// The impact funnel was reframed as The Open Campus (value-first, impact in the background).
// Original sponsorship-led version preserved in git history / preview-impact.html.
export default function ImpactRedirect() {
  redirect('/campus');
}

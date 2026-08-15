import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import CrmContributor from './CrmContributor.jsx';
import { getCrmStationOverview } from '../../lib/crm-api.mjs';
import { contributorOverviewAccounts } from '../../lib/crm-contributor-intake.mjs';
import { requireContributorEmail } from '../../lib/plinko-crm-contributor.mjs';

export const dynamic = 'force-dynamic';

export default async function CrmContributorPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await currentUser();
  let email;
  try {
    email = requireContributorEmail(user);
  } catch {
    redirect('/account');
  }

  const { stations } = await getCrmStationOverview();
  const records = contributorOverviewAccounts(stations.reviewQueue, email);
  return <CrmContributor records={records} />;
}

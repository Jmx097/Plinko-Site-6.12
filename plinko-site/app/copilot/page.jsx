import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { requireCopilotWorkspaceAccess } from '../../lib/copilot-access.mjs';
import CopilotWorkspace from './CopilotWorkspace.jsx';

export const dynamic = 'force-dynamic';

export default async function CopilotPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  try {
    await requireCopilotWorkspaceAccess(await currentUser(), userId);
  } catch {
    redirect('/account');
  }
  return <CopilotWorkspace />;
}
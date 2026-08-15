import { auth, currentUser } from '@clerk/nextjs/server';

import {
  CrmConfigurationError,
  createSourceIntakeAccount,
} from '../../../../lib/crm-api.mjs';
import {
  ContributorValidationError,
  contributorSource,
  contributorSubmissionAcknowledgement,
  contributorSubmissionFailure,
  normalizeContributorIntake,
} from '../../../../lib/crm-contributor-intake.mjs';
import { requireContributorEmail } from '../../../../lib/plinko-crm-contributor.mjs';

const validationError = () => {
  const failure = contributorSubmissionFailure('validation');
  return Response.json({ error: failure.error }, { status: failure.status });
};

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Authentication required' }, { status: 401 });

  const user = await currentUser();
  let email;
  try {
    email = requireContributorEmail(user);
  } catch {
    return Response.json({ error: 'CRM contributor access required' }, { status: 403 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return validationError();
  }

  let intake;
  try {
    intake = normalizeContributorIntake(payload);
  } catch (error) {
    if (error instanceof ContributorValidationError) return validationError();
    const failure = contributorSubmissionFailure();
    return Response.json({ error: failure.error }, { status: failure.status });
  }

  try {
    const account = await createSourceIntakeAccount({
      source: contributorSource(email),
      displayName: intake.displayName,
      externalReference: intake.externalReference,
    });
    return Response.json(contributorSubmissionAcknowledgement(account, intake.displayName), {
      status: 201,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof CrmConfigurationError) {
      const failure = contributorSubmissionFailure('configuration');
      return Response.json({ error: failure.error }, { status: failure.status });
    }
    const failure = contributorSubmissionFailure();
    return Response.json({ error: failure.error }, { status: failure.status });
  }
}

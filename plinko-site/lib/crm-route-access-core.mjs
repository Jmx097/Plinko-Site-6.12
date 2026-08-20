export async function crmPageAuthorization({ user, userId, requireAccess }) {
  if (!userId) return { allowed: false, redirectTo: '/sign-in' };
  try {
    await requireAccess(user, userId);
    return { allowed: true };
  } catch {
    return { allowed: false, redirectTo: '/account' };
  }
}

export async function crmApiActor({ user, userId, requireAccess }) {
  if (!userId) return null;
  try {
    return await requireAccess(user, userId);
  } catch {
    return null;
  }
}

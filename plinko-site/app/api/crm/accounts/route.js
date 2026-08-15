// Retired contributor intake endpoint. CRM writes are only brokered by /api/crm/workspace.
export async function POST() {
  return Response.json({ error: 'Use the shared admin CRM workspace' }, { status: 410 });
}

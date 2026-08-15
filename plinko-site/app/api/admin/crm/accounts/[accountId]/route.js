// Retired legacy admin endpoint. The shared /api/crm/workspace route performs
// Clerk + PLINKO_POCKET_ADMIN_EMAILS verification and adds the server-derived actor.
export async function GET() { return Response.json({ error: 'Use /api/crm/workspace' }, { status: 410 }); }
export async function POST() { return Response.json({ error: 'Use /api/crm/workspace' }, { status: 410 }); }

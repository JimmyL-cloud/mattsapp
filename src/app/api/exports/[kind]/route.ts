import { getOwnerSessionFromHeaders } from '@/lib/auth/config';

export async function GET(request: Request) {
  const owner = await getOwnerSessionFromHeaders(request.headers);
  if (!owner) return Response.json({ error: 'Owner authentication required' }, { status: 401 });
  return Response.json({ error: 'Legacy demo exports were removed. Export a real persisted analysis from History.' }, { status: 410 });
}

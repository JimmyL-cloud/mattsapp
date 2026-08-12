import { z } from 'zod';
import { authenticateOwner } from '@/lib/auth/config';

const credentials = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const parsed = credentials.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid owner credentials' }, { status: 401 });
  return authenticateOwner(parsed.data, request.headers);
}

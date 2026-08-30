import { signOutOwner } from '@/lib/auth/config';

export async function POST(request: Request) {
  return signOutOwner(request.headers);
}

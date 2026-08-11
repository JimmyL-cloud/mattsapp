import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getOwnerSessionFromHeaders } from './config';

export async function requireOwner(): Promise<{ id: string; email: string }> {
  const owner = await getOwnerSessionFromHeaders(await headers());
  if (!owner) redirect('/login');
  return owner;
}
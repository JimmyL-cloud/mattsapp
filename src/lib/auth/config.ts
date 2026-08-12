import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { isAPIError } from 'better-auth/api';
import { getDatabase } from '@/lib/db/client';
import { authAccounts, authSessions, authVerifications, users } from '@/lib/db/schema';

export type OwnerIdentity = Readonly<{ id: string; email: string }>;
export type OwnerCredentials = Readonly<{ email: string; password: string }>;

export function configuredOwnerEmail(value: string | undefined = process.env.MATTSAPP_OWNER_EMAIL): string {
  const email = value?.trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('MATTSAPP_OWNER_EMAIL is required');
  return email;
}

export function ownerMatches(email: string, configured: string | undefined = process.env.MATTSAPP_OWNER_EMAIL): boolean {
  return email.trim().toLowerCase() === configuredOwnerEmail(configured);
}

function authOptions(): BetterAuthOptions {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
  return {
    appName: 'mattsapp',
    secret,
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(getDatabase(), {
      provider: 'pg',
      schema: { user: users, session: authSessions, account: authAccounts, verification: authVerifications },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    advanced: { trustedProxyHeaders: true, useSecureCookies: process.env.NODE_ENV === 'production' },
  };
}

let ownerAuth: ReturnType<typeof betterAuth> | undefined;
const e2eCookie = 'mattsapp-e2e-owner';

function e2eMode(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.MATTSAPP_E2E === '1';
}

function hasE2eCookie(headers: Headers): boolean {
  return (headers.get('cookie') ?? '').split(';').some((part) => part.trim() === `${e2eCookie}=authenticated`);
}

function getOwnerAuth(): ReturnType<typeof betterAuth> {
  ownerAuth ??= betterAuth(authOptions());
  return ownerAuth;
}

export async function authenticateOwner(credentials: OwnerCredentials, headers: Headers): Promise<Response> {
  try {
    if (e2eMode()) {
      const expected = process.env.MATTSAPP_E2E_OWNER_PASSWORD;
      if (!expected || credentials.password !== expected || !ownerMatches(credentials.email)) return Response.json({ error: 'Invalid owner credentials' }, { status: 401 });
      return new Response(null, { status: 204, headers: { 'set-cookie': `${e2eCookie}=authenticated; Path=/; HttpOnly; SameSite=Lax` } });
    }
    if (!ownerMatches(credentials.email)) return Response.json({ error: 'Invalid owner credentials' }, { status: 401 });
    return await getOwnerAuth().api.signInEmail({
      body: { email: configuredOwnerEmail(), password: credentials.password },
      headers,
      asResponse: true,
    });
  }
  catch (error) {
    if (isAPIError(error)) return Response.json({ error: 'Invalid owner credentials' }, { status: 401 });
    console.error('Owner authentication is unavailable', error);
    return Response.json({ error: 'Authentication service unavailable' }, { status: 503 });
  }
}

export async function getOwnerSessionFromHeaders(headers: Headers): Promise<OwnerIdentity | null> {
  try {
    if (e2eMode()) return hasE2eCookie(headers) ? Object.freeze({ id: 'e2e-owner', email: configuredOwnerEmail() }) : null;
    const session = await getOwnerAuth().api.getSession({ headers });
    if (!session?.user || !ownerMatches(session.user.email)) return null;
    return Object.freeze({ id: session.user.id, email: session.user.email });
  }
  catch (error) {
    console.error('Owner session lookup failed', error);
    return null;
  }
}

export async function signOutOwner(headers: Headers): Promise<Response> {
  try {
    if (e2eMode()) return new Response(null, { status: 204, headers: { 'set-cookie': `${e2eCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` } });
    return await getOwnerAuth().api.signOut({ headers, asResponse: true });
  }
  catch (error) {
    console.error('Owner sign-out failed', error);
    return Response.json({ error: 'Sign-out failed' }, { status: 503 });
  }
}

import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export function requireDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error('DATABASE_URL is required');
  }
  if (!value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must use postgres:// or postgresql://');
  }
  return value;
}

export function databaseIsConfigured(value: string | undefined = process.env.DATABASE_URL): boolean {
  if (!value) return false;
  requireDatabaseUrl(value);
  return true;
}

export function createLazyDatabase<T>(factory: () => T): Readonly<{ get(): T }> {
  let value: T | undefined;
  return Object.freeze({
    get() {
      value ??= factory();
      return value;
    },
  });
}

export type MattsappDatabase = NeonHttpDatabase<typeof schema>;

export function createDatabase(url: string): MattsappDatabase {
  return drizzle(neon(requireDatabaseUrl(url)), { schema });
}

const database = createLazyDatabase(() => createDatabase(requireDatabaseUrl(process.env.DATABASE_URL)));

export function getDatabase(): MattsappDatabase {
  return database.get();
}
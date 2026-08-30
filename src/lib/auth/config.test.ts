import { describe, expect, it } from 'vitest';
import { configuredOwnerEmail, ownerMatches } from './config';

describe('owner configuration', () => {
  it('normalizes the configured owner email', () => {
    expect(configuredOwnerEmail('  MATT@EXAMPLE.COM ')).toBe('matt@example.com');
    expect(ownerMatches('Matt@Example.com', 'matt@example.com')).toBe(true);
  });

  it('rejects missing or malformed owner configuration', () => {
    expect(() => configuredOwnerEmail(undefined)).toThrow('MATTSAPP_OWNER_EMAIL is required');
    expect(() => configuredOwnerEmail('not-an-email')).toThrow('MATTSAPP_OWNER_EMAIL is required');
  });
});

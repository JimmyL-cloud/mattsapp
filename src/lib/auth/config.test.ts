import { describe, expect, it, vi } from 'vitest';
import { configuredOwnerEmail, ownerMatches, resolveConfiguredOwner } from './config';

describe('owner configuration', () => {
  it('normalizes the configured owner email', () => {
    expect(configuredOwnerEmail('  MATT@EXAMPLE.COM ')).toBe('matt@example.com');
    expect(ownerMatches('Matt@Example.com', 'matt@example.com')).toBe(true);
  });

  it('rejects missing or malformed owner configuration', () => {
    expect(() => configuredOwnerEmail(undefined)).toThrow('MATTSAPP_OWNER_EMAIL is required');
    expect(() => configuredOwnerEmail('not-an-email')).toThrow('MATTSAPP_OWNER_EMAIL is required');
  });

  it('resolves the configured owner without requiring a session', async () => {
    const lookup = vi.fn().mockResolvedValue({ id: 'owner-1', email: 'matt@example.com' });

    await expect(resolveConfiguredOwner(lookup, ' MATT@EXAMPLE.COM ')).resolves.toEqual({
      id: 'owner-1',
      email: 'matt@example.com',
    });
    expect(lookup).toHaveBeenCalledWith('matt@example.com');
  });
});

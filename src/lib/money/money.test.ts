import { describe, expect, it } from 'vitest';
import { addMoney, formatMoney, multiplyMoney, subtractMoney } from './money';

const usd = (minor: bigint) => ({ minor, currency: 'USD' });

describe('integer-safe money', () => {
  it('adds, subtracts, multiplies, and formats minor units', () => {
    expect(addMoney(usd(125n), usd(75n))).toEqual(usd(200n));
    expect(subtractMoney(usd(125n), usd(75n))).toEqual(usd(50n));
    expect(multiplyMoney(usd(105n), 1.5)).toEqual(usd(158n));
    expect(formatMoney(usd(12345n))).toBe('$123.45');
  });

  it('refuses to mix currencies', () => {
    expect(() => addMoney(usd(100n), { minor: 100n, currency: 'CAD' })).toThrow('Currency mismatch');
  });
});

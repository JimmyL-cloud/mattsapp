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

  describe('addMoney', () => {
    it('adds positive amounts in the same currency', () => {
      expect(addMoney(usd(100n), usd(250n))).toEqual(usd(350n));
    });

    it('handles adding zero amounts correctly', () => {
      expect(addMoney(usd(500n), usd(0n))).toEqual(usd(500n));
      expect(addMoney(usd(0n), usd(0n))).toEqual(usd(0n));
    });

    it('handles negative amounts (debt/adjustments)', () => {
      expect(addMoney(usd(500n), usd(-200n))).toEqual(usd(300n));
      expect(addMoney(usd(-100n), usd(-200n))).toEqual(usd(-300n));
    });

    it('handles large BigInt values', () => {
      const a = { minor: 9_007_199_254_740_991_000n, currency: 'USD' };
      const b = { minor: 1_000_000_000_000_000_000n, currency: 'USD' };
      expect(addMoney(a, b)).toEqual({ minor: 10_007_199_254_740_991_000n, currency: 'USD' });
    });

    it('throws error when adding money with mismatched currencies', () => {
      const eur = { minor: 100n, currency: 'EUR' };
      expect(() => addMoney(usd(100n), eur)).toThrow('Currency mismatch: USD != EUR');
    });
  });
});

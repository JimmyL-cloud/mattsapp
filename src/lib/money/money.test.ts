import { describe, expect, it } from 'vitest';
import { addMoney, subtractMoney, multiplyMoney, formatMoney, Money } from './money';

describe('money', () => {
  describe('addMoney', () => {
    it('adds two Money values with the same currency', () => {
      const a: Money = { minor: 1000n, currency: 'USD' };
      const b: Money = { minor: 500n, currency: 'USD' };
      const result = addMoney(a, b);
      expect(result).toEqual({ minor: 1500n, currency: 'USD' });
    });

    it('throws error when adding Money values with different currencies', () => {
      const a: Money = { minor: 1000n, currency: 'USD' };
      const b: Money = { minor: 500n, currency: 'EUR' };
      expect(() => addMoney(a, b)).toThrow('Currency mismatch: USD != EUR');
    });
  });

  describe('subtractMoney', () => {
    it('subtracts two Money values with the same currency', () => {
      const a: Money = { minor: 1000n, currency: 'USD' };
      const b: Money = { minor: 400n, currency: 'USD' };
      const result = subtractMoney(a, b);
      expect(result).toEqual({ minor: 600n, currency: 'USD' });
    });

    it('throws error when subtracting Money values with different currencies', () => {
      const a: Money = { minor: 1000n, currency: 'USD' };
      const b: Money = { minor: 500n, currency: 'GBP' };
      expect(() => subtractMoney(a, b)).toThrow('Currency mismatch: USD != GBP');
    });
  });

  describe('multiplyMoney', () => {
    it('multiplies Money by a factor', () => {
      const value: Money = { minor: 1000n, currency: 'USD' };
      const result = multiplyMoney(value, 1.5);
      expect(result).toEqual({ minor: 1500n, currency: 'USD' });
    });
  });

  describe('formatMoney', () => {
    it('formats Money value into currency string', () => {
      const value: Money = { minor: 1234n, currency: 'USD' };
      const formatted = formatMoney(value);
      expect(formatted).toBe('$12.34');
    });
  });
});

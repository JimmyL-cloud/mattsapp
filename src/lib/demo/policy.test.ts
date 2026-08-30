import { describe, expect, it } from 'vitest';
import { assertSingleDemoScope, recordIsInScope } from './policy';

describe('demo isolation', () => {
  it('never treats demo and real records as one scope', () => {
    expect(assertSingleDemoScope([true, true])).toBe('DEMO_ONLY');
    expect(assertSingleDemoScope([false, false])).toBe('REAL_ONLY');
    expect(() => assertSingleDemoScope([true, false])).toThrow('cannot be mixed');
  });

  it('filters records by explicit scope', () => {
    expect(recordIsInScope(true, 'DEMO_ONLY')).toBe(true);
    expect(recordIsInScope(true, 'REAL_ONLY')).toBe(false);
  });
});

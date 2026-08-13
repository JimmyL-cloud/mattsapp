import { describe, expect, it } from 'vitest';
import { financialOccurredAtForDate, isFinancialTimestampInFuture, localDateInputValue } from './financial-write-validation';

describe('financial calendar timestamps', () => {
  it.each(['2026-08-12T08:00:00.000Z', '2026-08-13T01:30:00.000Z'])('uses the current instant for the current local date at %s', (instant) => {
    const now = new Date(instant);
    const occurredAt = financialOccurredAtForDate(localDateInputValue(now), now);
    expect(occurredAt).toBe(instant);
    expect(isFinancialTimestampInFuture(occurredAt, now)).toBe(false);
  });

  it('constructs a valid non-future local-noon instant for a prior date', () => {
    const now = new Date('2026-08-13T01:30:00.000Z');
    expect(isFinancialTimestampInFuture(financialOccurredAtForDate('2026-08-11', now), now)).toBe(false);
  });
});

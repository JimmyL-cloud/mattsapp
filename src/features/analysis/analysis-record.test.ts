import { describe, expect, it } from 'vitest';
import { cardLabel, money, number, object, type AnalysisRecord } from './analysis-record';

const record = {
  id: 'analysis:1', snapshotId: 'snapshot:1', decisionId: 'decision:1', userId: 'owner', cardId: 'card:1',
  cutoff: '2026-08-12T12:00:00Z', currency: 'USD', purchaseStatus: 'UNDECIDED', createdAt: '2026-08-12T12:00:00Z',
  input: {}, result: { target: { year: 2024, brand: 'Prizm', playerName: 'Caleb Williams', cardNumber: '101', parallel: 'Silver', raw: false, gradingCompanyKey: 'psa', grade: 10 } },
} satisfies AnalysisRecord;

describe('analysis UI record formatting', () => {
  it('builds a decision-focused card label from the immutable result snapshot', () => {
    expect(cardLabel(record)).toBe('2024 Prizm Caleb Williams #101 Silver · PSA 10');
  });

  it('formats JSON-safe minor-unit strings without losing the currency unit', () => {
    expect(money('12345', 'USD')).toBe('$123.45');
    expect(number('15.5')).toBe(15.5);
    expect(object(null)).toEqual({});
  });
});

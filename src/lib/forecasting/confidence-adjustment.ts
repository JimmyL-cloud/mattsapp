import Decimal from 'decimal.js';
import { addMoney, multiplyMoney, subtractMoney, type Money } from '@/lib/money/money';

export function confidenceAdjustedValue(
  current: Money,
  rawFuture: Money,
  confidence: number,
): Money {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error('Forecast confidence must be between 0 and 1');
  }
  const difference = subtractMoney(rawFuture, current);
  return addMoney(current, multiplyMoney(difference, new Decimal(confidence)));
}
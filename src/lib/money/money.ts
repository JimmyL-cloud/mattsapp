import Decimal from 'decimal.js';

export type Money = Readonly<{ minor: bigint; currency: string }>;

function sameCurrency(a: Money, b: Money) {
  if (a.currency !== b.currency) throw new Error(`Currency mismatch: ${a.currency} != ${b.currency}`);
}

export function addMoney(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return { minor: a.minor + b.minor, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return { minor: a.minor - b.minor, currency: a.currency };
}

export function multiplyMoney(value: Money, factor: Decimal.Value): Money {
  const minor = new Decimal(value.minor.toString()).mul(factor).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return { minor: BigInt(minor.toFixed(0)), currency: value.currency };
}

export function formatMoney(value: Money): string {
  return new Intl.NumberFormat('en-US', { style:'currency', currency:value.currency }).format(Number(value.minor) / 100);
}
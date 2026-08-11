import { addMoney, multiplyMoney, type Money } from '@/lib/money/money';

export type FeeRule = Readonly<{
  key: string;
  label: string;
  basis: 'GROSS_SALE';
  bps: number;
  flatMinor: bigint;
}>;

export type FeeSchedule = Readonly<{
  id: string;
  sourceKey: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  rules: readonly FeeRule[];
}>;

export type FeeLineItem = Readonly<{
  key: string;
  label: string;
  bps: number;
  percentageAmount: Money;
  flatAmount: Money;
  total: Money;
}>;

export function selectFeeSchedule(
  schedules: readonly FeeSchedule[],
  sourceKey: string,
  at: string,
): FeeSchedule {
  const instant = Date.parse(at);
  if (Number.isNaN(instant)) throw new Error(`Invalid fee effective date: ${at}`);
  const matching = schedules
    .filter((schedule) => {
      if (schedule.sourceKey !== sourceKey) return false;
      const from = Date.parse(schedule.effectiveFrom);
      const to = schedule.effectiveTo ? Date.parse(schedule.effectiveTo) : Number.POSITIVE_INFINITY;
      return from <= instant && instant < to;
    })
    .sort((left, right) => Date.parse(right.effectiveFrom) - Date.parse(left.effectiveFrom));
  if (!matching[0]) throw new Error(`No effective fee schedule for ${sourceKey} at ${at}`);
  return matching[0];
}

export function calculateMarketplaceFees(
  grossSale: Money,
  schedule: FeeSchedule,
): { lineItems: readonly FeeLineItem[]; total: Money; percentageBps: number; flatMinor: bigint } {
  const lineItems = schedule.rules.map((rule) => {
    if (!Number.isInteger(rule.bps) || rule.bps < 0) throw new Error(`Invalid fee bps: ${rule.key}`);
    if (rule.flatMinor < 0n) throw new Error(`Invalid flat fee: ${rule.key}`);
    const percentageAmount = multiplyMoney(grossSale, rule.bps / 10_000);
    const flatAmount: Money = { minor: rule.flatMinor, currency: grossSale.currency };
    return Object.freeze({
      key: rule.key,
      label: rule.label,
      bps: rule.bps,
      percentageAmount,
      flatAmount,
      total: addMoney(percentageAmount, flatAmount),
    });
  });
  const total = lineItems.reduce((sum, item) => addMoney(sum, item.total), { minor: 0n, currency: grossSale.currency });
  return {
    lineItems,
    total,
    percentageBps: schedule.rules.reduce((sum, rule) => sum + rule.bps, 0),
    flatMinor: schedule.rules.reduce((sum, rule) => sum + rule.flatMinor, 0n),
  };
}
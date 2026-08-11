import Decimal from 'decimal.js';
import { CalculationTape } from '@/lib/audit/calculation-tape';
import { addMoney, subtractMoney, multiplyMoney, type Money } from '@/lib/money/money';
import { calculateMarketplaceFees, type FeeSchedule } from './fees';

export type CostLine = Readonly<{ key: string; label: string; amount: Money }>;

type ScenarioInput = Readonly<{
  purchasePrice: Money;
  acquisitionCosts: readonly CostLine[];
  expectedGrossSalePrice: Money;
  fixedSellingCosts: readonly CostLine[];
  returnAllowanceBps: number;
  feeSchedule: FeeSchedule;
  targetRoiBps: number;
  holdingDays: number;
}>;

function sum(currency: string, lines: readonly CostLine[]): Money {
  return lines.reduce((total, line) => addMoney(total, line.amount), { minor: 0n, currency });
}

function divideCeil(numerator: bigint, denominator: Decimal.Value): bigint {
  return BigInt(new Decimal(numerator.toString()).div(denominator).toDecimalPlaces(0, Decimal.ROUND_CEIL).toFixed(0));
}

function divideFloor(numerator: bigint, denominator: Decimal.Value): bigint {
  return BigInt(new Decimal(numerator.toString()).div(denominator).toDecimalPlaces(0, Decimal.ROUND_FLOOR).toFixed(0));
}

export function calculateScenario(input: ScenarioInput) {
  const currency = input.purchasePrice.currency;
  addMoney(input.purchasePrice, { minor: 0n, currency: input.expectedGrossSalePrice.currency });
  const otherAcquisitionCosts = sum(currency, input.acquisitionCosts);
  const totalAcquisitionCost = addMoney(input.purchasePrice, otherAcquisitionCosts);
  const fixedSellingCosts = sum(currency, input.fixedSellingCosts);
  const fees = calculateMarketplaceFees(input.expectedGrossSalePrice, input.feeSchedule);
  const returnAllowance = multiplyMoney(input.expectedGrossSalePrice, input.returnAllowanceBps / 10_000);
  const totalSellingCosts = addMoney(addMoney(fees.total, returnAllowance), fixedSellingCosts);
  const expectedNetProceeds = subtractMoney(input.expectedGrossSalePrice, totalSellingCosts);
  const expectedProfit = subtractMoney(expectedNetProceeds, totalAcquisitionCost);
  if (totalAcquisitionCost.minor <= 0n) throw new Error('Total acquisition cost must be positive');

  const roi = new Decimal(expectedProfit.minor.toString()).div(totalAcquisitionCost.minor.toString());
  const roiBps = roi.mul(10_000).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  const annualizedRoiBps = input.holdingDays > 0 && roi.greaterThan(-1)
    ? new Decimal(1).plus(roi).pow(new Decimal(365).div(input.holdingDays)).minus(1).mul(10_000).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber()
    : null;

  const percentageSellingBps = fees.percentageBps + input.returnAllowanceBps;
  if (percentageSellingBps >= 10_000) throw new Error('Percentage selling costs must be below 100%');
  if (percentageSellingBps < 0) throw new Error('Percentage selling costs cannot be negative');
  const retainedRate = new Decimal(1).minus(new Decimal(percentageSellingBps).div(10_000));
  const fixedFeeAndSellingMinor = fees.flatMinor + fixedSellingCosts.minor;
  const breakEvenSalePrice: Money = {
    minor: divideCeil(totalAcquisitionCost.minor + fixedFeeAndSellingMinor, retainedRate),
    currency,
  };
  const targetMultiplier = new Decimal(1).plus(new Decimal(input.targetRoiBps).div(10_000));
  const minimumSalePriceForTargetRoi: Money = {
    minor: divideCeil(
      BigInt(new Decimal(totalAcquisitionCost.minor.toString()).mul(targetMultiplier).toDecimalPlaces(0, Decimal.ROUND_CEIL).toFixed(0)) + fixedFeeAndSellingMinor,
      retainedRate,
    ),
    currency,
  };
  const maximumTotalAcquisition = divideFloor(expectedNetProceeds.minor, targetMultiplier);
  const maximumPurchasePriceForTargetRoi: Money = {
    minor: maximumTotalAcquisition > otherAcquisitionCosts.minor
      ? maximumTotalAcquisition - otherAcquisitionCosts.minor
      : 0n,
    currency,
  };

  let tape = new CalculationTape();
  tape = tape.append({ key: 'acquisition', label: 'Total acquisition cost', formula: 'purchase_price + itemized_acquisition_costs', inputs: { purchasePrice: input.purchasePrice.minor, costs: input.acquisitionCosts.map((line) => ({ key: line.key, minor: line.amount.minor })) }, output: totalAcquisitionCost.minor, unit: 'minor currency units' });
  tape = tape.append({ key: 'marketplace_fees', label: 'Effective-dated marketplace fees', formula: 'sum(gross_sale × fee_bps + flat_fee)', inputs: { scheduleId: input.feeSchedule.id, gross: input.expectedGrossSalePrice.minor, rules: input.feeSchedule.rules.map((rule) => ({ key: rule.key, bps: rule.bps, flatMinor: rule.flatMinor })) }, output: fees.total.minor, unit: 'minor currency units' });
  tape = tape.append({ key: 'selling_costs', label: 'Total selling costs', formula: 'marketplace_fees + return_allowance + fixed_selling_costs', inputs: { marketplaceFees: fees.total.minor, returnAllowance: returnAllowance.minor, fixedSellingCosts: fixedSellingCosts.minor }, output: totalSellingCosts.minor, unit: 'minor currency units' });
  tape = tape.append({ key: 'net', label: 'Expected net proceeds', formula: 'gross_sale - total_selling_costs', inputs: { gross: input.expectedGrossSalePrice.minor, sellingCosts: totalSellingCosts.minor }, output: expectedNetProceeds.minor, unit: 'minor currency units' });
  tape = tape.append({ key: 'profit', label: 'Expected profit', formula: 'expected_net - total_acquisition', inputs: { net: expectedNetProceeds.minor, acquisition: totalAcquisitionCost.minor }, output: expectedProfit.minor, unit: 'minor currency units' });
  tape = tape.append({ key: 'roi', label: 'Return on investment', formula: 'expected_profit / total_acquisition', inputs: { profit: expectedProfit.minor, acquisition: totalAcquisitionCost.minor }, output: roiBps, unit: 'basis points' });
  tape = tape.append({ key: 'break_even', label: 'Break-even gross sale price', formula: '(acquisition + fixed_selling_costs) / (1 - percentage_selling_rate)', inputs: { acquisition: totalAcquisitionCost.minor, fixed: fixedFeeAndSellingMinor, percentageBps: percentageSellingBps }, output: breakEvenSalePrice.minor, unit: 'minor currency units' });

  return Object.freeze({
    totalAcquisitionCost,
    marketplaceFees: fees.total,
    marketplaceFeeLines: fees.lineItems,
    returnAllowance,
    totalSellingCosts,
    expectedNetProceeds,
    expectedProfit,
    roiBps,
    annualizedRoiBps,
    breakEvenSalePrice,
    minimumSalePriceForTargetRoi,
    maximumPurchasePriceForTargetRoi,
    feeScheduleId: input.feeSchedule.id,
    steps: tape.steps,
  });
}
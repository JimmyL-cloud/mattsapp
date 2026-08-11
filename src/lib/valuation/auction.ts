import Decimal from 'decimal.js';
import { addMoney, multiplyMoney, type Money } from '@/lib/money/money';
import { calculateDealScore } from './valuation';

type AuctionProjectionInput = Readonly<{
  currentBid: Money;
  shipping: Money;
  buyerPremiumBps: number;
  bidIncrement: Money;
  fairCenter: Money;
  historicalCloseMultipliers: readonly number[];
}>;

function snapToIncrement(minor: bigint, increment: bigint): bigint {
  if (increment <= 0n) throw new Error('Bid increment must be positive');
  return ((minor + increment - 1n) / increment) * increment;
}

function quantile(sorted: readonly number[], position: number): number {
  const index = (sorted.length - 1) * position;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function hammer(currentBid: Money, multiplier: number, increment: Money): Money {
  const raw = BigInt(new Decimal(currentBid.minor.toString()).mul(multiplier).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0));
  return { minor: snapToIncrement(raw, increment.minor), currency: currentBid.currency };
}

function allIn(hammerPrice: Money, shipping: Money, premiumBps: number): Money {
  return addMoney(addMoney(hammerPrice, shipping), multiplyMoney(hammerPrice, premiumBps / 10_000));
}

export function projectAuctionClose(input: AuctionProjectionInput) {
  addMoney(input.currentBid, input.shipping);
  addMoney(input.currentBid, input.bidIncrement);
  addMoney(input.currentBid, input.fairCenter);
  const currentAllIn = allIn(input.currentBid, input.shipping, input.buyerPremiumBps);
  const currentDealScore = calculateDealScore(currentAllIn.minor, input.fairCenter.minor);
  const evidenceWarnings: string[] = [];
  if (input.historicalCloseMultipliers.length < 3) {
    evidenceWarnings.push('INSUFFICIENT_AUCTION_EVIDENCE');
    return Object.freeze({
      warning: 'AUCTION NOT FINAL' as const,
      currentBid: input.currentBid,
      currentAllIn,
      currentDealScore,
      projectedClose: null,
      projectedDealScore: null,
      bidIncrement: input.bidIncrement,
      evidenceWarnings: Object.freeze(evidenceWarnings),
    });
  }

  const sorted = [...input.historicalCloseMultipliers].sort((left, right) => left - right);
  const lowHammer = hammer(input.currentBid, quantile(sorted, 0.25), input.bidIncrement);
  const centerHammer = hammer(input.currentBid, quantile(sorted, 0.5), input.bidIncrement);
  const highHammer = hammer(input.currentBid, quantile(sorted, 0.75), input.bidIncrement);
  const projectedClose = Object.freeze({
    lowHammer,
    centerHammer,
    highHammer,
    lowAllIn: allIn(lowHammer, input.shipping, input.buyerPremiumBps),
    centerAllIn: allIn(centerHammer, input.shipping, input.buyerPremiumBps),
    highAllIn: allIn(highHammer, input.shipping, input.buyerPremiumBps),
  });
  const projectedDealScore = calculateDealScore(projectedClose.centerAllIn.minor, input.fairCenter.minor);
  return Object.freeze({
    warning: 'AUCTION NOT FINAL' as const,
    currentBid: input.currentBid,
    currentAllIn,
    currentDealScore,
    projectedClose,
    projectedDealScore,
    bidIncrement: input.bidIncrement,
    evidenceWarnings: Object.freeze(evidenceWarnings),
  });
}
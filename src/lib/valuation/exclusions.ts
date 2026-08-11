import type { MarketRecordStatus, MarketSaleType } from '@/features/market/types';

export type CompExclusionCode =
  | 'SUSPECTED_LOT'
  | 'REPRINT_OR_FACSIMILE'
  | 'SEALED_PRODUCT'
  | 'BREAK_OR_SPOT'
  | 'CANCELLED_TRANSACTION'
  | 'DUPLICATE_RECORD'
  | 'UNKNOWN_ACCEPTED_OFFER'
  | 'WRONG_PLAYER'
  | 'WRONG_YEAR'
  | 'WRONG_SET'
  | 'WRONG_CARD_NUMBER'
  | 'WRONG_PARALLEL'
  | 'WRONG_AUTOGRAPH_TYPE'
  | 'WRONG_SERIAL_DENOMINATOR'
  | 'CROSS_GRADER_NO_CONVERSION'
  | 'CROSS_GRADER_ADJUSTMENT_REQUIRED'
  | 'DIFFERENT_GRADE_REQUIRES_ADJUSTMENT'
  | 'INCOMPLETE_GRADING_EVIDENCE';

export type ListingEvidence = Readonly<{
  title: string;
  status: MarketRecordStatus;
  saleType: MarketSaleType;
  acceptedPriceKnown: boolean;
  duplicate: boolean;
}>;

export function detectListingExclusions(listing: ListingEvidence): readonly CompExclusionCode[] {
  const title = listing.title.toLocaleLowerCase('en-US');
  const codes = new Set<CompExclusionCode>();
  if (/\b(?:\d+\s+cards?\s+lot|lot\s+of\s+\d+|card\s+lot)\b/.test(title)) codes.add('SUSPECTED_LOT');
  if (/\b(?:reprint|facsimile|replica|custom\s+card)\b/.test(title)) codes.add('REPRINT_OR_FACSIMILE');
  if (/\b(?:hobby\s+box|blaster\s+box|sealed\s+box|factory\s+set|booster\s+pack)\b/.test(title)) codes.add('SEALED_PRODUCT');
  if (/\b(?:team\s+break|break\s+spot|player\s+break|box\s+break)\b/.test(title)) codes.add('BREAK_OR_SPOT');
  if (listing.status === 'CANCELLED') codes.add('CANCELLED_TRANSACTION');
  if (listing.duplicate) codes.add('DUPLICATE_RECORD');
  if (listing.saleType === 'ACCEPTED_OFFER' && !listing.acceptedPriceKnown) codes.add('UNKNOWN_ACCEPTED_OFFER');
  return [...codes];
}
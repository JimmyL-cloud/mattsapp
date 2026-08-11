import type { CardIdentity } from '@/features/cards/card-identity';
import { identityTextEqual, normalizeIdentityText } from '@/features/cards/aliases';
import {
  detectListingExclusions,
  type CompExclusionCode,
  type ListingEvidence,
} from './exclusions';

export type CompCandidate = Readonly<{
  identity: CardIdentity;
  listing: ListingEvidence;
}>;

export type MatchEligibility = 'ELIGIBLE' | 'MANUAL_REVIEW' | 'EXCLUDED';
export type MatchComponent = Readonly<{
  target: string | number | boolean | null;
  candidate: string | number | boolean | null;
  score: number;
  weight: number;
  contribution: number;
}>;

export type CompMatchResult = Readonly<{
  total: number;
  components: Readonly<Record<string, MatchComponent>>;
  eligibility: MatchEligibility;
  exclusionCodes: readonly CompExclusionCode[];
  evidenceIds: readonly string[];
  formulaVersion: string;
  thresholds: Readonly<{ eligible: number; manualReview: number }>;
}>;

type MatchOptions = Readonly<{
  version: string;
  crossGraderConversionEvidenceId?: string;
}>;

const weights = {
  player: 0.14,
  year: 0.06,
  brand: 0.04,
  set: 0.08,
  cardNumber: 0.08,
  parallel: 0.12,
  autograph: 0.08,
  serialDenominator: 0.09,
  memorabilia: 0.03,
  teamShown: 0.03,
  gradingCompany: 0.12,
  grade: 0.1,
  rawOrGraded: 0.01,
  rookie: 0.02,
} as const;

function comparableScore(
  left: string | number | boolean | null,
  right: string | number | boolean | null,
): number {
  if (left === null && right === null) return 1;
  if (left === null || right === null) return 0.5;
  if (typeof left === 'string' && typeof right === 'string') return identityTextEqual(left, right) ? 1 : 0;
  return left === right ? 1 : 0;
}

function component(
  target: string | number | boolean | null,
  candidate: string | number | boolean | null,
  weight: number,
): MatchComponent {
  const score = comparableScore(target, candidate);
  return { target, candidate, score, weight, contribution: Number((score * weight).toFixed(4)) };
}

function playerValue(identity: CardIdentity): string {
  return identity.canonicalPlayerId ?? normalizeIdentityText(identity.playerName) ?? identity.playerName;
}

function brandValue(identity: CardIdentity): string | null {
  return normalizeIdentityText([identity.manufacturer, identity.brand].filter(Boolean).join(' '));
}

function mismatch(
  left: string | number | boolean | null,
  right: string | number | boolean | null,
): boolean {
  return left !== null && right !== null && comparableScore(left, right) === 0;
}

const hardExclusions = new Set<CompExclusionCode>([
  'SUSPECTED_LOT',
  'REPRINT_OR_FACSIMILE',
  'SEALED_PRODUCT',
  'BREAK_OR_SPOT',
  'CANCELLED_TRANSACTION',
  'DUPLICATE_RECORD',
  'UNKNOWN_ACCEPTED_OFFER',
  'WRONG_PLAYER',
  'WRONG_YEAR',
  'WRONG_SET',
  'WRONG_CARD_NUMBER',
  'WRONG_PARALLEL',
  'WRONG_AUTOGRAPH_TYPE',
  'WRONG_SERIAL_DENOMINATOR',
  'CROSS_GRADER_NO_CONVERSION',
]);

export function matchComp(
  target: CardIdentity,
  candidate: CompCandidate,
  options: MatchOptions,
): CompMatchResult {
  const compared = candidate.identity;
  const components: Record<string, MatchComponent> = {
    player: component(playerValue(target), playerValue(compared), weights.player),
    year: component(target.year, compared.year, weights.year),
    brand: component(brandValue(target), brandValue(compared), weights.brand),
    set: component(target.setName, compared.setName, weights.set),
    cardNumber: component(target.cardNumber, compared.cardNumber, weights.cardNumber),
    parallel: component(target.parallel, compared.parallel, weights.parallel),
    autograph: component(target.autographType, compared.autographType, weights.autograph),
    serialDenominator: component(target.serialDenominator, compared.serialDenominator, weights.serialDenominator),
    memorabilia: component(target.memorabiliaType, compared.memorabiliaType, weights.memorabilia),
    teamShown: component(target.teamShown, compared.teamShown, weights.teamShown),
    gradingCompany: component(target.gradingCompanyKey, compared.gradingCompanyKey, weights.gradingCompany),
    grade: component(target.grade, compared.grade, weights.grade),
    rawOrGraded: component(target.raw, compared.raw, weights.rawOrGraded),
    rookie: component(target.rookie, compared.rookie, weights.rookie),
  };

  const codes = new Set<CompExclusionCode>(detectListingExclusions(candidate.listing));
  if (mismatch(playerValue(target), playerValue(compared))) codes.add('WRONG_PLAYER');
  if (mismatch(target.year, compared.year)) codes.add('WRONG_YEAR');
  if (mismatch(target.setName, compared.setName)) codes.add('WRONG_SET');
  if (mismatch(target.cardNumber, compared.cardNumber)) codes.add('WRONG_CARD_NUMBER');
  if (mismatch(target.parallel, compared.parallel)) codes.add('WRONG_PARALLEL');
  if (mismatch(target.autographType, compared.autographType)) codes.add('WRONG_AUTOGRAPH_TYPE');
  if (target.serialDenominator !== compared.serialDenominator) codes.add('WRONG_SERIAL_DENOMINATOR');

  const targetGrader = target.gradingCompanyKey;
  const candidateGrader = compared.gradingCompanyKey;
  const crossGrader = targetGrader !== null && candidateGrader !== null && !identityTextEqual(targetGrader, candidateGrader);
  const evidenceIds: string[] = [];
  if (crossGrader) {
    if (options.crossGraderConversionEvidenceId) {
      codes.add('CROSS_GRADER_ADJUSTMENT_REQUIRED');
      evidenceIds.push(options.crossGraderConversionEvidenceId);
    } else {
      codes.add('CROSS_GRADER_NO_CONVERSION');
    }
  } else if (target.grade !== null && compared.grade !== null && target.grade !== compared.grade) {
    codes.add('DIFFERENT_GRADE_REQUIRES_ADJUSTMENT');
  }
  if (target.raw === false && (candidateGrader === null || compared.grade === null || compared.raw === null)) {
    codes.add('INCOMPLETE_GRADING_EVIDENCE');
  }

  const total = Number(
    Object.values(components).reduce((sum, item) => sum + item.contribution, 0).toFixed(2),
  );
  const exclusions = [...codes];
  const hardExcluded = exclusions.some((code) => hardExclusions.has(code));
  const requiresManual = exclusions.some((code) =>
    code === 'CROSS_GRADER_ADJUSTMENT_REQUIRED'
    || code === 'DIFFERENT_GRADE_REQUIRES_ADJUSTMENT'
    || code === 'INCOMPLETE_GRADING_EVIDENCE',
  );
  const eligibility: MatchEligibility = hardExcluded
    ? 'EXCLUDED'
    : requiresManual
      ? 'MANUAL_REVIEW'
      : total >= 0.9
        ? 'ELIGIBLE'
        : total >= 0.75
          ? 'MANUAL_REVIEW'
          : 'EXCLUDED';

  return Object.freeze({
    total,
    components: Object.freeze(components),
    eligibility,
    exclusionCodes: Object.freeze(exclusions),
    evidenceIds: Object.freeze(evidenceIds),
    formulaVersion: options.version,
    thresholds: Object.freeze({ eligible: 0.9, manualReview: 0.75 }),
  });
}
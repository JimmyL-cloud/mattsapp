export type ConfidenceEvidence = Readonly<{
  effectiveSampleSize: number;
  weightedMeanMatch: number;
  recentEvidenceShare: number;
  normalizedMedianAbsoluteDeviation: number;
  matchedSalesPer90Days: number;
  distinctReliableSources: number;
  exactOrNearExactCount: number;
  includedCount: number;
  allEvidenceManualUnverified: boolean;
  newestIncludedAgeDays: number;
}>;

const weights = Object.freeze({
  sampleStrength: 0.3,
  identityStrength: 0.25,
  recencyStrength: 0.15,
  agreementStrength: 0.15,
  liquidityStrength: 0.1,
  sourceDiversityStrength: 0.05,
});

function validEvidence(evidence: ConfidenceEvidence): boolean {
  const nonnegative = [
    evidence.effectiveSampleSize,
    evidence.normalizedMedianAbsoluteDeviation,
    evidence.matchedSalesPer90Days,
    evidence.distinctReliableSources,
    evidence.exactOrNearExactCount,
    evidence.includedCount,
    evidence.newestIncludedAgeDays,
  ].every((value) => Number.isFinite(value) && value >= 0);
  return nonnegative
    && evidence.weightedMeanMatch >= 0
    && evidence.weightedMeanMatch <= 1
    && evidence.recentEvidenceShare >= 0
    && evidence.recentEvidenceShare <= 1
    && evidence.exactOrNearExactCount <= evidence.includedCount;
}

function rounded(value: number): number {
  return Number(value.toFixed(6));
}

export function calculateConfidence(evidence: ConfidenceEvidence) {
  if (!validEvidence(evidence)) throw new Error('Invalid confidence evidence');
  const components = Object.freeze({
    sampleStrength: Math.min(1, evidence.effectiveSampleSize / 20),
    identityStrength: evidence.weightedMeanMatch,
    recencyStrength: evidence.recentEvidenceShare,
    agreementStrength: Math.max(0, 1 - evidence.normalizedMedianAbsoluteDeviation / 0.35),
    liquidityStrength: Math.min(1, evidence.matchedSalesPer90Days / 10),
    sourceDiversityStrength: Math.min(1, evidence.distinctReliableSources / 3),
  });
  const contributionPoints = Object.freeze(Object.fromEntries(
    Object.entries(weights).map(([key, weight]) => [
      key,
      rounded(components[key as keyof typeof components] * weight * 100),
    ]),
  ) as Record<keyof typeof weights, number>);
  const rawPercent = Math.round(Object.values(contributionPoints).reduce((sum, value) => sum + value, 0));
  const caps: string[] = [];
  let percent = rawPercent;
  if (evidence.exactOrNearExactCount === 0) {
    percent = Math.min(percent, 40);
    caps.push('NO_EXACT_OR_NEAR_EXACT_COMP');
  }
  if (evidence.includedCount < 3) {
    percent = Math.min(percent, 55);
    caps.push('FEWER_THAN_THREE_COMPS');
  }
  if (evidence.allEvidenceManualUnverified) {
    percent = Math.min(percent, 65);
    caps.push('ONE_UNVERIFIED_MANUAL_SOURCE');
  }
  if (evidence.newestIncludedAgeDays > 365) {
    percent = Math.min(percent, 70);
    caps.push('STALE_EVIDENCE_OVER_ONE_YEAR');
  }

  return Object.freeze({
    percent,
    rawPercent,
    components,
    weights,
    contributionPoints,
    caps: Object.freeze(caps),
    formulaVersion: 'confidence-v1',
    formula: 'round(100 × (0.30×sample + 0.25×identity + 0.15×recency + 0.15×agreement + 0.10×liquidity + 0.05×source_diversity)), then evidence caps',
  });
}
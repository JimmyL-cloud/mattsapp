import type { MatchEligibility } from '@/lib/valuation/match-comp';
import type { CompExclusionCode } from '@/lib/valuation/exclusions';

export type CompOverride = Readonly<{
  oldIncluded: boolean;
  newIncluded: boolean;
  reason: string;
  userId: string;
  at: string;
}>;

export type CompReview = Readonly<{
  analysisId: string;
  compId: string;
  automatedEligibility: MatchEligibility;
  automatedIncluded: boolean;
  currentIncluded: boolean;
  exclusionCodes: readonly CompExclusionCode[];
  history: readonly CompOverride[];
}>;

type RegisterComp = Omit<CompReview, 'currentIncluded' | 'history'>;
type OverrideInput = Readonly<{
  analysisId: string;
  compId: string;
  included: boolean;
  reason: string;
  userId: string;
  at: string;
}>;

function key(analysisId: string, compId: string): string {
  return `${analysisId}\u0000${compId}`;
}

export class CompReviewService {
  readonly #reviews = new Map<string, CompReview>();

  register(input: RegisterComp): CompReview {
    const reviewKey = key(input.analysisId, input.compId);
    if (this.#reviews.has(reviewKey)) throw new Error('Comp review already exists');
    const review = Object.freeze({
      ...input,
      exclusionCodes: Object.freeze([...input.exclusionCodes]),
      currentIncluded: input.automatedIncluded,
      history: Object.freeze([]) as readonly CompOverride[],
    });
    this.#reviews.set(reviewKey, review);
    return review;
  }

  overrideComp(input: OverrideInput): CompReview {
    const reason = input.reason.trim();
    if (!reason) throw new Error('Override reason is required');
    const reviewKey = key(input.analysisId, input.compId);
    const existing = this.#reviews.get(reviewKey);
    if (!existing) throw new Error('Comp review not found');

    const override = Object.freeze({
      oldIncluded: existing.currentIncluded,
      newIncluded: input.included,
      reason,
      userId: input.userId,
      at: input.at,
    });
    const updated = Object.freeze({
      ...existing,
      currentIncluded: input.included,
      history: Object.freeze([...existing.history, override]),
    });
    this.#reviews.set(reviewKey, updated);
    return updated;
  }
}
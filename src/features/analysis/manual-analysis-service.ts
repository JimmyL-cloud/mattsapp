import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createCardIdentity, type CardIdentity, type CardIdentityInput } from '@/features/cards/card-identity';
import { runAnalysis } from '@/features/analysis/run-analysis';
import type { Money } from '@/lib/money/money';
import { AnalysisWorkflowValidationError, type AnalysisWorkflowRepository, type JsonRecord, type StoredAnalysis } from '@/lib/db/repositories/analysis-workflow';
import type { MarketRecordRepository } from '@/lib/db/repositories/market-records';
import { isFinancialTimestampInFuture } from '@/lib/api/financial-write-validation';

const nullableText = z.string().trim().max(200).nullable().optional().default(null);
const cardSchema = z.object({
  sport: z.string().trim().min(1).max(40).default('football'),
  playerName: z.string().trim().min(1).max(160),
  canonicalPlayerId: nullableText,
  teamShown: nullableText,
  year: z.number().int().min(1800).max(2200).nullable().optional().default(null),
  manufacturer: nullableText,
  brand: nullableText,
  setName: nullableText,
  subset: nullableText,
  cardNumber: nullableText,
  rookie: z.boolean().nullable().optional().default(null),
  parallel: nullableText,
  color: nullableText,
  serialNumber: z.number().int().positive().nullable().optional().default(null),
  serialDenominator: z.number().int().positive().nullable().optional().default(null),
  autographType: z.enum(['NONE', 'ON_CARD', 'STICKER', 'UNKNOWN']).default('NONE'),
  memorabiliaType: z.enum(['NONE', 'GAME_USED', 'PLAYER_WORN', 'MANUFACTURED', 'UNKNOWN']).default('NONE'),
  raw: z.boolean().nullable().optional().default(null),
  gradingCompanyKey: nullableText,
  grade: z.number().min(0).max(100).nullable().optional().default(null),
  qualifiers: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
});

const costSchema = z.object({
  key: z.string().trim().min(1).max(64).regex(/^[a-z0-9_-]+$/i),
  label: z.string().trim().min(1).max(160),
  amountMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});

export const manualAnalysisRequestSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
  card: cardSchema,
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()).default('USD'),
  cutoff: z.string().datetime({ offset: true }).optional(),
  offer: z.object({
    kind: z.enum(['FIXED_PRICE', 'LOCAL_OFFER', 'AUCTION']).default('FIXED_PRICE'),
    priceMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    shippingMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
    buyerPremiumBps: z.number().int().min(0).max(9_999).default(0),
    bidIncrementMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  }),
  comps: z.array(z.object({
    sourceLabel: z.string().trim().min(1).max(200),
    listingTitle: z.string().trim().min(1).max(500),
    occurredAt: z.string().datetime({ offset: true }),
    salePriceMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    shippingMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
    buyerPremiumMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
    card: cardSchema.optional(),
    included: z.boolean().optional(),
    overrideReason: z.string().trim().min(1).max(500).optional(),
  })).min(1).max(100),
  importedComps: z.array(z.object({
    marketRecordId: z.string().trim().min(1).max(500),
    identityReviewed: z.boolean().default(false),
    included: z.boolean().optional(),
    overrideReason: z.string().trim().min(1).max(500).optional(),
  })).max(100).default([]).superRefine((comps, context) => {
    const seen = new Set<string>();
    comps.forEach((comp, index) => {
      if (seen.has(comp.marketRecordId)) context.addIssue({ code: 'custom', path: [index, 'marketRecordId'], message: 'Imported evidence may be selected only once' });
      seen.add(comp.marketRecordId);
    });
  }),
  acquisitionCosts: z.array(costSchema).max(30).default([]),
  fixedSellingCosts: z.array(costSchema).max(30).default([]),
  sellingFeeBps: z.number().int().min(0).max(9_999).default(0),
  sellingFlatFeeMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
  returnAllowanceBps: z.number().int().min(0).max(9_999).default(0),
  targetRoiBps: z.number().int().min(0).max(100_000).optional(),
  holdingDays: z.number().int().min(0).max(3650).default(90),
});

export type ManualAnalysisRequest = z.infer<typeof manualAnalysisRequestSchema>;

function money(minor: number, currency: string): Money { return { minor: BigInt(minor), currency }; }
function snapshot(value: unknown): JsonRecord { return JSON.parse(JSON.stringify(value, (_key, child) => typeof child === 'bigint' ? child.toString() : child)) as JsonRecord; }
function identity(value: z.infer<typeof cardSchema>): CardIdentity { return createCardIdentity(value as CardIdentityInput); }

export class ManualAnalysisService {
  constructor(
    private readonly repository: AnalysisWorkflowRepository,
    private readonly marketRepository?: MarketRecordRepository,
  ) {}

  async create(userId: string, request: ManualAnalysisRequest, now = new Date()): Promise<StoredAnalysis> {
    const { idempotencyKey, ...requestBody } = request;
    const requestHash = createHash('sha256').update(JSON.stringify(requestBody)).digest('hex');
    const replay = await this.repository.findAnalysisReplay(userId, idempotencyKey, requestHash);
    if (replay) return replay;
    const settings = await this.repository.getSettings(userId);
    const cutoff = request.cutoff ?? now.toISOString();
    if (isFinancialTimestampInFuture(cutoff, now)) throw new AnalysisWorkflowValidationError('Analysis cutoff cannot be in the future');
    if (request.comps.some((comp) => isFinancialTimestampInFuture(comp.occurredAt, now))) throw new AnalysisWorkflowValidationError('Manual evidence date cannot be in the future');
    const target = identity(request.card);
    const currency = request.currency;
    const analysisId = `analysis:${randomUUID()}`;
    const reviewedAt = now.toISOString();
    const importedRecords = request.importedComps.length
      ? await this.loadImportedRecords(userId, request.importedComps.map((comp) => comp.marketRecordId))
      : [];
    const importedById = new Map(importedRecords.map((record) => [record.id, record]));
    const provenance = new Map<string, {
      sourceKind: 'MANUAL' | 'CSV';
      identitySource: 'STRUCTURED_MANUAL' | 'STRUCTURED_CSV' | 'OWNER_REVIEWED_TITLE' | 'TARGET_IDENTITY';
      reviewAttestation: JsonRecord | null;
    }>();
    request.comps.forEach((comp, index) => provenance.set(`manual-comp:${analysisId}:${index + 1}`, {
      sourceKind: 'MANUAL',
      identitySource: comp.card ? 'STRUCTURED_MANUAL' : 'TARGET_IDENTITY',
      reviewAttestation: null,
    }));
    request.importedComps.forEach((comp) => {
      const record = importedById.get(comp.marketRecordId);
      provenance.set(comp.marketRecordId, {
        sourceKind: 'CSV',
        identitySource: record?.cardIdentity ? 'STRUCTURED_CSV' : 'OWNER_REVIEWED_TITLE',
        reviewAttestation: record?.cardIdentity ? null : snapshot({
          reviewerUserId: userId,
          reviewedAt,
          statement: 'Owner confirmed the listing title identifies the target card',
        }),
      });
    });
    const input = {
      analysisId,
      userId,
      target,
      cutoff,
      formulaVersion: 'manual-analysis-v1',
      isDemo: false,
      purchaseStatus: 'UNDECIDED' as const,
      currentOffer: {
        kind: request.offer.kind,
        priceOrBid: money(request.offer.priceMinor, currency),
        shipping: money(request.offer.shippingMinor, currency),
        buyerPremiumBps: request.offer.buyerPremiumBps,
        ...(request.offer.bidIncrementMinor ? { bidIncrement: money(request.offer.bidIncrementMinor, currency) } : {}),
      },
      comps: [
        ...request.comps.map((comp, index) => ({
        record: {
          id: `manual-comp:${analysisId}:${index + 1}`,
          userId,
          sourceKey: 'manual',
          sourceRecordId: null,
          sourceLabel: comp.sourceLabel,
          originalUrl: null,
          listingTitle: comp.listingTitle,
          status: 'SOLD' as const,
          saleType: 'FIXED_PRICE' as const,
          occurredAt: comp.occurredAt,
          importedAt: cutoff,
          freshnessAt: cutoff,
          timezone: 'UTC',
          salePriceMinor: BigInt(comp.salePriceMinor),
          shippingMinor: BigInt(comp.shippingMinor),
          buyerPremiumMinor: BigInt(comp.buyerPremiumMinor),
          taxMinor: null,
          currency,
          cardIdentity: comp.card ? identity(comp.card) : target,
          fingerprint: `manual:${analysisId}:${index + 1}`,
          raw: { source: 'manual', sourceLabel: comp.sourceLabel },
          isDemo: false,
        },
        candidate: {
          identity: comp.card ? identity(comp.card) : target,
          listing: { title: comp.listingTitle, status: 'SOLD' as const, saleType: 'FIXED_PRICE' as const, acceptedPriceKnown: true, duplicate: false },
        },
        ...(comp.included === undefined ? {} : { manualIncluded: comp.included, overrideReason: comp.overrideReason }),
        })),
        ...request.importedComps.map((comp) => {
          const record = importedById.get(comp.marketRecordId);
          if (!record) throw new AnalysisWorkflowValidationError(`Imported evidence is unavailable: ${comp.marketRecordId}`);
          if (record.status !== 'SOLD') throw new AnalysisWorkflowValidationError(`Imported evidence must be a completed sale: ${record.id}`);
          if (!record.cardIdentity && !comp.identityReviewed) {
            throw new AnalysisWorkflowValidationError(`Title-only imported evidence requires explicit identity review: ${record.id}`);
          }
          return {
            record,
            candidate: {
              identity: record.cardIdentity ?? target,
              listing: { title: record.listingTitle, status: record.status, saleType: record.saleType, acceptedPriceKnown: true, duplicate: false },
            },
            ...(comp.included === undefined ? {} : { manualIncluded: comp.included, overrideReason: comp.overrideReason }),
          };
        }),
      ],
      feeSchedule: {
        id: `manual-fees:${analysisId}`,
        sourceKey: 'manual',
        effectiveFrom: cutoff,
        effectiveTo: null,
        rules: [{ key: 'selling_fee', label: 'Seller fee entered by owner', basis: 'GROSS_SALE' as const, bps: request.sellingFeeBps, flatMinor: BigInt(request.sellingFlatFeeMinor) }],
      },
      acquisitionCosts: request.acquisitionCosts.map((cost) => ({ key: cost.key, label: cost.label, amount: money(cost.amountMinor, currency) })),
      fixedSellingCosts: request.fixedSellingCosts.map((cost) => ({ key: cost.key, label: cost.label, amount: money(cost.amountMinor, currency) })),
      returnAllowanceBps: request.returnAllowanceBps,
      targetRoiBps: request.targetRoiBps ?? settings.targetRoiBps ?? 1_500,
      holdingDays: request.holdingDays,
      sellHistory: [],
      forecastHorizons: [7, 30, 90],
      transactionCosts: money(0, currency),
      minimumTimingEdge: money(0, currency),
    };
    let result: ReturnType<typeof runAnalysis>;
    try { result = runAnalysis(input); }
    catch (error) { throw new AnalysisWorkflowValidationError(error instanceof Error ? error.message : 'Analysis inputs are invalid'); }
    const cardId = `card:${analysisId}`;
    return this.repository.createAnalysis({
      id: analysisId,
      snapshotId: `snapshot:${analysisId}`,
      decisionId: `decision:${analysisId}`,
      userId,
      cardId,
      cutoff,
      formulaVersion: input.formulaVersion,
      currentPriceMinor: result.currentAllIn.minor,
      currency,
      input: snapshot({ card: target, request, targetRoiBps: input.targetRoiBps }),
      result: snapshot(result),
      evidence: result.rawComps.map((comp) => ({
        id: `${analysisId}:evidence:${comp.record.id}`,
        ...(provenance.get(comp.record.id) ?? (() => { throw new Error(`Evidence provenance is missing: ${comp.record.id}`); })()),
        included: comp.included,
        snapshot: snapshot(comp),
      })),
      idempotencyKey,
      requestHash,
    });
  }

  private async loadImportedRecords(userId: string, ids: readonly string[]) {
    if (!this.marketRepository) throw new AnalysisWorkflowValidationError('Imported evidence repository is unavailable');
    const records = await this.marketRepository.getManyByIds({ scope: 'REAL_ONLY', userId, ids });
    const requested = new Set(ids);
    const selected = records.filter((record) => requested.has(record.id));
    if (selected.length !== requested.size) throw new AnalysisWorkflowValidationError('One or more imported evidence records are unavailable');
    return selected;
  }
}

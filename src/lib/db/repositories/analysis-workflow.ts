import { createHash } from 'node:crypto';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { PurchaseStatus } from '@/features/portfolio/purchase-status';
import type { PortfolioHolding } from '@/features/portfolio/portfolio-service';
import type { PortfolioDecisionRow } from '@/features/portfolio/demo-portfolio';
import { assertTransition, requireReason } from '@/features/portfolio/decision-service';
import { cardLabel, object } from '@/features/analysis/analysis-record';
import {
  analyses,
  analysisEvidence,
  cardCatalogItems,
  formulaVersions,
  predictionSnapshots,
  userDecisions,
  userSettings,
  watchlistItems,
  portfolioHoldings,
  transactions,
} from '@/lib/db/schema';
import type * as databaseSchema from '@/lib/db/schema';

export type JsonRecord = Record<string, unknown>;

export type AnalysisWrite = Readonly<{
  id: string;
  snapshotId: string;
  decisionId: string;
  userId: string;
  cardId: string;
  cutoff: string;
  formulaVersion: string;
  currentPriceMinor: bigint;
  currency: string;
  input: JsonRecord;
  result: JsonRecord;
  evidence: readonly Readonly<{
    id: string;
    sourceKind: 'MANUAL' | 'CSV';
    identitySource: 'STRUCTURED_MANUAL' | 'STRUCTURED_CSV' | 'OWNER_REVIEWED_TITLE' | 'TARGET_IDENTITY';
    reviewAttestation: JsonRecord | null;
    included: boolean;
    snapshot: JsonRecord;
  }>[];
}>;

export type StoredAnalysis = Readonly<{
  id: string;
  snapshotId: string;
  decisionId: string;
  userId: string;
  cardId: string;
  cutoff: string;
  currency: string;
  input: JsonRecord;
  result: JsonRecord;
  purchaseStatus: PurchaseStatus;
  createdAt: string;
}>;

export type WatchlistItem = Readonly<{
  id: string;
  userId: string;
  cardId: string | null;
  marketRecordId: string | null;
  notes: string | null;
  isStarred: boolean;
  createdAt: string;
}>;

export type PurchaseWrite = Readonly<{
  analysisId: string;
  idempotencyKey: string;
  amountMinor: bigint;
  currency: string;
  source: string;
  occurredAt: string;
}>;

export type ReversalWrite = Readonly<{
  analysisId: string;
  idempotencyKey: string;
  reason: string;
  source: string;
  occurredAt: string;
}>;

export type PurchaseResult = Readonly<{ analysis: StoredAnalysis; replayed: boolean }>;

export type PortfolioSummary = Readonly<{
  holdingCount: number;
  costBasisMinor: bigint;
  currentValueMinor: bigint | null;
  unrealizedProfitMinor: bigint | null;
  currency: string;
}>;

export type PersistedPortfolio = Readonly<{
  summaries: readonly PortfolioSummary[];
  holdings: readonly PortfolioHolding[];
  decisions: readonly PortfolioDecisionRow[];
}>;

export interface AnalysisWorkflowRepository {
  createAnalysis(input: AnalysisWrite): Promise<StoredAnalysis>;
  listAnalyses(userId: string): Promise<readonly StoredAnalysis[]>;
  getAnalysis(userId: string, analysisId: string): Promise<StoredAnalysis | null>;
  updateDecision(userId: string, analysisId: string, status: PurchaseStatus, reason: string | null): Promise<StoredAnalysis | null>;
  recordPurchase(userId: string, input: PurchaseWrite): Promise<PurchaseResult | null>;
  reversePurchase(userId: string, input: ReversalWrite): Promise<PurchaseResult | null>;
  loadPortfolio(userId: string): Promise<PersistedPortfolio>;
  getSettings(userId: string): Promise<{ targetRoiBps: number }>;
  updateSettings(userId: string, targetRoiBps: number): Promise<{ targetRoiBps: number }>;
  listWatchlist(userId: string): Promise<readonly WatchlistItem[]>;
  saveWatchlist(item: WatchlistItem): Promise<WatchlistItem>;
  updateWatchlist(userId: string, itemId: string, patch: Pick<WatchlistItem, 'notes' | 'isStarred'>): Promise<WatchlistItem | null>;
  deleteWatchlist(userId: string, itemId: string): Promise<boolean>;
}

function date(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid analysis timestamp');
  return parsed;
}

function stored(write: AnalysisWrite, createdAt = write.cutoff, purchaseStatus: PurchaseStatus = 'UNDECIDED'): StoredAnalysis {
  return Object.freeze({
    id: write.id, snapshotId: write.snapshotId, decisionId: write.decisionId, userId: write.userId,
    cardId: write.cardId, cutoff: write.cutoff, currency: write.currency, input: write.input,
    result: write.result, purchaseStatus, createdAt,
  });
}

function bigintValue(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'string' || typeof value === 'number') return BigInt(value);
  return 0n;
}

type HoldingRead = Readonly<{
  id: string;
  analysisId: string;
  snapshotId: string;
  cardId: string;
  acquiredAt: string;
  costBasisMinor: bigint;
  currency: string;
  closedAt: string | null;
}>;

function portfolioFrom(analyses: readonly StoredAnalysis[], persisted: readonly HoldingRead[]): PersistedPortfolio {
  const byAnalysis = new Map(analyses.map((analysis) => [analysis.id, analysis]));
  const decisions: PortfolioDecisionRow[] = [];
  const holdings: PortfolioHolding[] = [];
  for (const row of persisted) {
    const analysis = byAnalysis.get(row.analysisId);
    if (!analysis || analysis.purchaseStatus !== 'PURCHASED' || row.closedAt !== null) continue;
    const scenario = object(analysis.result.scenario);
    const modelMaximumMinor = bigintValue(object(scenario.maximumPurchasePriceForTargetRoi).minor);
    const label = cardLabel(analysis);
    decisions.push(Object.freeze({
      id: analysis.decisionId, cardLabel: label, purchaseStatus: 'PURCHASED', mattMaximumMinor: row.costBasisMinor,
      modelMaximumMinor, varianceMinor: row.costBasisMinor - modelMaximumMinor, currency: row.currency,
      reason: 'Purchase recorded', isDemo: false,
    }));
    holdings.push(Object.freeze({
      id: row.id, userId: analysis.userId, decisionId: analysis.decisionId,
      snapshotId: row.snapshotId, cardId: row.cardId, cardLabel: label, acquiredAt: row.acquiredAt,
      costBasisMinor: row.costBasisMinor, currentValueMinor: null, unrealizedProfitMinor: null,
      currency: row.currency, recommendedSellWindowDays: null, staleAt: null, isDemo: false, closedAt: row.closedAt,
    }));
  }
  const summaries = [...new Set(holdings.map((holding) => holding.currency))].sort().map((currency) => {
    const group = holdings.filter((holding) => holding.currency === currency);
    return Object.freeze({ holdingCount: group.length, costBasisMinor: group.reduce((sum, holding) => sum + holding.costBasisMinor, 0n), currentValueMinor: null, unrealizedProfitMinor: null, currency });
  });
  return Object.freeze({
    summaries: Object.freeze(summaries),
    holdings: Object.freeze(holdings), decisions: Object.freeze(decisions),
  });
}

function operationId(userId: string, kind: 'purchase' | 'reversal', idempotencyKey: string): string {
  return `${kind}:${createHash('sha256').update(`${userId}:${idempotencyKey}`).digest('hex')}`;
}

function sameTime(left: string, right: Date | string): boolean {
  return Date.parse(left) === (right instanceof Date ? right.getTime() : Date.parse(right));
}

export class InMemoryAnalysisWorkflowRepository implements AnalysisWorkflowRepository {
  readonly #analyses = new Map<string, StoredAnalysis>();
  readonly #settings = new Map<string, number>();
  readonly #watchlist = new Map<string, WatchlistItem>();
  readonly #purchases = new Map<string, PurchaseWrite & { holdingId: string; closedAt: string | null }>();
  readonly #purchaseOperations = new Map<string, PurchaseWrite>();
  readonly #reversalOperations = new Map<string, ReversalWrite>();

  async createAnalysis(input: AnalysisWrite): Promise<StoredAnalysis> {
    if (this.#analyses.has(input.id)) throw new Error('Analysis already exists');
    const value = stored(input);
    this.#analyses.set(value.id, value);
    return value;
  }

  async listAnalyses(userId: string): Promise<readonly StoredAnalysis[]> {
    return Object.freeze([...this.#analyses.values()].filter((value) => value.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  async getAnalysis(userId: string, analysisId: string): Promise<StoredAnalysis | null> {
    const value = this.#analyses.get(analysisId);
    return value?.userId === userId ? value : null;
  }

  async updateDecision(userId: string, analysisId: string, purchaseStatus: PurchaseStatus, reason: string | null): Promise<StoredAnalysis | null> {
    const current = await this.getAnalysis(userId, analysisId);
    if (!current) return null;
    assertTransition(current.purchaseStatus, purchaseStatus, false);
    const normalizedReason = requireReason(reason ?? '');
    const next = Object.freeze({ ...current, purchaseStatus, decisionReason: normalizedReason });
    this.#analyses.set(analysisId, next);
    return next;
  }

  async recordPurchase(userId: string, input: PurchaseWrite): Promise<PurchaseResult | null> {
    const key = `${userId}:${input.idempotencyKey}`;
    const replay = this.#purchaseOperations.get(key);
    if (replay) {
      this.assertExactPurchase(replay, input);
      const saved = await this.getAnalysis(userId, input.analysisId);
      if (!saved || saved.purchaseStatus !== 'PURCHASED') throw new Error('The idempotent purchase has already been reversed');
      return Object.freeze({ analysis: saved, replayed: true });
    }
    const current = await this.getAnalysis(userId, input.analysisId);
    if (!current) return null;
    const concurrentReplay = this.#purchaseOperations.get(key);
    if (concurrentReplay) {
      this.assertExactPurchase(concurrentReplay, input);
      const saved = await this.getAnalysis(userId, input.analysisId);
      if (!saved || saved.purchaseStatus !== 'PURCHASED') throw new Error('The idempotent purchase has already been reversed');
      return Object.freeze({ analysis: saved, replayed: true });
    }
    if (current.purchaseStatus !== 'UNDECIDED') throw new Error(`Only an undecided analysis can be recorded as purchased`);
    if (input.currency !== current.currency) throw new Error('Purchase currency does not match analysis currency');
    const next = Object.freeze({ ...current, purchaseStatus: 'PURCHASED' as const });
    this.#purchaseOperations.set(key, Object.freeze({ ...input }));
    this.#analyses.set(current.id, next);
    this.#purchases.set(current.id, Object.freeze({ ...input, holdingId: `holding:${current.id}`, closedAt: null }));
    return Object.freeze({ analysis: next, replayed: false });
  }

  async reversePurchase(userId: string, input: ReversalWrite): Promise<PurchaseResult | null> {
    const key = `${userId}:${input.idempotencyKey}`;
    const replay = this.#reversalOperations.get(key);
    if (replay) {
      this.assertExactReversal(replay, input);
      const saved = await this.getAnalysis(userId, input.analysisId);
      return saved ? Object.freeze({ analysis: saved, replayed: true }) : null;
    }
    const current = await this.getAnalysis(userId, input.analysisId);
    if (!current) return null;
    assertTransition(current.purchaseStatus, 'CANCELLED', true);
    const normalizedReason = requireReason(input.reason);
    const purchase = this.#purchases.get(current.id);
    if (!purchase || purchase.closedAt !== null) throw new Error('An open purchased holding is required for reversal');
    const next = Object.freeze({ ...current, purchaseStatus: 'CANCELLED' as const, decisionReason: normalizedReason });
    this.#reversalOperations.set(key, Object.freeze({ ...input, reason: normalizedReason }));
    this.#purchases.set(current.id, Object.freeze({ ...purchase, closedAt: input.occurredAt }));
    this.#analyses.set(current.id, next);
    return Object.freeze({ analysis: next, replayed: false });
  }

  async loadPortfolio(userId: string): Promise<PersistedPortfolio> {
    const ownerAnalyses = [...this.#analyses.values()].filter((analysis) => analysis.userId === userId);
    const rows: HoldingRead[] = [...this.#purchases.entries()].map(([analysisId, purchase]) => {
      const analysis = this.#analyses.get(analysisId)!;
      return { id: purchase.holdingId, analysisId, snapshotId: analysis.snapshotId, cardId: analysis.cardId, acquiredAt: purchase.occurredAt, costBasisMinor: purchase.amountMinor, currency: purchase.currency, closedAt: purchase.closedAt };
    });
    return portfolioFrom(ownerAnalyses, rows);
  }

  private assertExactPurchase(saved: PurchaseWrite, input: PurchaseWrite): void {
    if (saved.analysisId !== input.analysisId || saved.amountMinor !== input.amountMinor || saved.currency !== input.currency || saved.source !== input.source || !sameTime(saved.occurredAt, input.occurredAt)) throw new Error('Idempotency key was already used for a different purchase');
  }

  private assertExactReversal(saved: ReversalWrite, input: ReversalWrite): void {
    if (saved.analysisId !== input.analysisId || saved.reason !== input.reason || saved.source !== input.source || !sameTime(saved.occurredAt, input.occurredAt)) throw new Error('Idempotency key was already used for a different reversal');
  }

  async getSettings(userId: string): Promise<{ targetRoiBps: number }> { return { targetRoiBps: this.#settings.get(userId) ?? 1_500 }; }
  async updateSettings(userId: string, targetRoiBps: number): Promise<{ targetRoiBps: number }> { this.#settings.set(userId, targetRoiBps); return { targetRoiBps }; }
  async listWatchlist(userId: string): Promise<readonly WatchlistItem[]> { return Object.freeze([...this.#watchlist.values()].filter((item) => item.userId === userId).sort((a, b) => Number(b.isStarred) - Number(a.isStarred) || b.createdAt.localeCompare(a.createdAt))); }
  async saveWatchlist(item: WatchlistItem): Promise<WatchlistItem> { this.#watchlist.set(item.id, item); return item; }
  async updateWatchlist(userId: string, itemId: string, patch: Pick<WatchlistItem, 'notes' | 'isStarred'>): Promise<WatchlistItem | null> { const item = this.#watchlist.get(itemId); if (!item || item.userId !== userId) return null; const next = Object.freeze({ ...item, ...patch }); this.#watchlist.set(itemId, next); return next; }
  async deleteWatchlist(userId: string, itemId: string): Promise<boolean> { const item = this.#watchlist.get(itemId); if (!item || item.userId !== userId) return false; this.#watchlist.delete(itemId); return true; }
}

export class PostgresAnalysisWorkflowRepository implements AnalysisWorkflowRepository {
  constructor(private readonly database: NeonHttpDatabase<typeof databaseSchema>) {}

  async createAnalysis(input: AnalysisWrite): Promise<StoredAnalysis> {
    const createdAt = date(input.cutoff);
    const cardIdentity = input.input.card && typeof input.input.card === 'object'
      ? input.input.card as JsonRecord
      : {};
    const writes: [BatchItem<'pg'>, ...BatchItem<'pg'>[]] = [
      this.database.insert(formulaVersions).values({ id: input.formulaVersion, name: input.formulaVersion, definition: { immutable: true } }).onConflictDoNothing(),
      this.database.insert(cardCatalogItems).values({ id: input.cardId, sport: typeof cardIdentity.sport === 'string' ? cardIdentity.sport : 'unknown', identity: cardIdentity }).onConflictDoNothing(),
      this.database.insert(analyses).values({
        id: input.id, userId: input.userId, cardCatalogItemId: input.cardId, formulaVersionId: input.formulaVersion,
        cutoff: createdAt, currentPriceMinor: input.currentPriceMinor, currency: input.currency,
        inputSnapshot: input.input, result: input.result, isDemo: false, createdAt,
      }),
      this.database.insert(predictionSnapshots).values({
        id: input.snapshotId, userId: input.userId, analysisId: input.id, formulaVersionId: input.formulaVersion,
        predictionCutoff: createdAt, evidenceIds: input.evidence.map((evidence) => evidence.id), input: input.input,
        result: input.result, isDemo: false, createdAt,
      }),
      this.database.insert(userDecisions).values({ id: input.decisionId, userId: input.userId, predictionSnapshotId: input.snapshotId, purchaseStatus: 'UNDECIDED', isDemo: false, decidedAt: createdAt }),
    ];
    if (input.evidence.length) writes.push(this.database.insert(analysisEvidence).values(input.evidence.map((evidence) => ({
      id: evidence.id,
      analysisId: input.id,
      sourceKind: evidence.sourceKind,
      evidenceSnapshot: {
        ...evidence.snapshot,
        provenance: {
          origin: evidence.sourceKind,
          identitySource: evidence.identitySource,
          reviewAttestation: evidence.reviewAttestation,
        },
      },
      included: evidence.included,
    }))));
    // Neon HTTP rejects transaction(); batch is its supported server-side atomic
    // write mechanism and sends the complete dependent write bundle together.
    await this.database.batch(writes);
    return stored(input);
  }

  async listAnalyses(userId: string): Promise<readonly StoredAnalysis[]> {
    const rows = await this.database.select().from(analyses).where(and(eq(analyses.userId, userId), eq(analyses.isDemo, false))).orderBy(desc(analyses.createdAt));
    const records = await Promise.all(rows.map((row) => this.readStored(userId, row.id)));
    return Object.freeze(records.filter((record): record is StoredAnalysis => record !== null));
  }

  async getAnalysis(userId: string, analysisId: string): Promise<StoredAnalysis | null> { return this.readStored(userId, analysisId); }

  async updateDecision(userId: string, analysisId: string, purchaseStatus: PurchaseStatus, reason: string | null): Promise<StoredAnalysis | null> {
    const analysis = await this.readStored(userId, analysisId);
    if (!analysis) return null;
    assertTransition(analysis.purchaseStatus, purchaseStatus, false);
    const normalizedReason = requireReason(reason ?? '');
    const changed = await this.database.update(userDecisions).set({ purchaseStatus, reason: normalizedReason, decidedAt: new Date() }).where(and(eq(userDecisions.id, analysis.decisionId), eq(userDecisions.userId, userId), eq(userDecisions.purchaseStatus, analysis.purchaseStatus), eq(userDecisions.isDemo, false))).returning({ id: userDecisions.id });
    if (changed.length !== 1) throw new Error('Decision changed concurrently; reload before retrying');
    return Object.freeze({ ...analysis, purchaseStatus });
  }

  async recordPurchase(userId: string, input: PurchaseWrite): Promise<PurchaseResult | null> {
    const existing = await this.readOperation(userId, input.idempotencyKey);
    if (existing) return this.replayPurchase(userId, input, existing);
    const analysis = await this.readStored(userId, input.analysisId);
    if (!analysis) return null;
    if (analysis.purchaseStatus !== 'UNDECIDED') throw new Error('Only an undecided analysis can be recorded as purchased');
    if (analysis.currency !== input.currency) throw new Error('Purchase currency does not match analysis currency');
    const occurredAt = date(input.occurredAt);
    const holdingId = `holding:${analysis.id}`;
    const transactionId = operationId(userId, 'purchase', input.idempotencyKey);
    try {
      const inserted = await this.database.execute<{ id: string }>(sql`
        with transitioned as (
          update user_decisions
          set purchase_status = 'PURCHASED', reason = 'Purchase recorded', decided_at = ${occurredAt}
          where id = ${analysis.decisionId} and user_id = ${userId} and purchase_status = 'UNDECIDED' and is_demo = false
          returning id
        ), inserted_holding as (
          insert into portfolio_holdings (id, user_id, card_catalog_item_id, prediction_snapshot_id, acquired_at, cost_basis_minor, currency, quantity, is_demo)
          select ${holdingId}, ${userId}, ${analysis.cardId}, ${analysis.snapshotId}, ${occurredAt}, ${input.amountMinor}, ${input.currency}, 1, false
          from transitioned
          returning id
        )
        , inserted_transaction as (
          insert into transactions (id, user_id, holding_id, decision_id, transaction_type, amount_minor, currency, occurred_at, source, idempotency_key, is_demo)
          select ${transactionId}, ${userId}, id, ${analysis.decisionId}, 'PURCHASE', ${input.amountMinor}, ${input.currency}, ${occurredAt}, ${input.source}, ${input.idempotencyKey}, false
          from inserted_holding
          returning id
        )
        select id from inserted_transaction
      `);
      if (inserted.rows.length === 0) {
        const concurrent = await this.readOperation(userId, input.idempotencyKey);
        if (concurrent) return this.replayPurchase(userId, input, concurrent);
        throw new Error('Purchase state changed concurrently; reload before retrying');
      }
    } catch (error) {
      const committed = await this.readOperation(userId, input.idempotencyKey);
      if (committed) return this.replayPurchase(userId, input, committed);
      throw error;
    }
    const committed = await this.readOperation(userId, input.idempotencyKey);
    if (!committed) throw new Error('Purchase state changed concurrently; reload before retrying');
    return Object.freeze({ analysis: Object.freeze({ ...analysis, purchaseStatus: 'PURCHASED' }), replayed: false });
  }

  async reversePurchase(userId: string, input: ReversalWrite): Promise<PurchaseResult | null> {
    const existing = await this.readOperation(userId, input.idempotencyKey);
    if (existing) return this.replayReversal(userId, input, existing);
    const analysis = await this.readStored(userId, input.analysisId);
    if (!analysis) return null;
    assertTransition(analysis.purchaseStatus, 'CANCELLED', true);
    const reason = requireReason(input.reason);
    const holding = (await this.database.select().from(portfolioHoldings).where(and(eq(portfolioHoldings.userId, userId), eq(portfolioHoldings.predictionSnapshotId, analysis.snapshotId), eq(portfolioHoldings.isDemo, false), isNull(portfolioHoldings.closedAt)))).at(0);
    if (!holding) throw new Error('An open purchased holding is required for reversal');
    const purchase = (await this.database.select().from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.holdingId, holding.id), eq(transactions.transactionType, 'PURCHASE'), eq(transactions.isDemo, false)))).at(0);
    if (!purchase) throw new Error('The purchase transaction is missing');
    const occurredAt = date(input.occurredAt);
    const reversalId = `reversal:${purchase.id}`;
    try {
      const inserted = await this.database.execute<{ id: string }>(sql`
        with transitioned as (
          update user_decisions
          set purchase_status = 'CANCELLED', reason = ${reason}, decided_at = ${occurredAt}
          where id = ${analysis.decisionId} and user_id = ${userId} and purchase_status = 'PURCHASED' and is_demo = false
          returning id
        ), closed_holding as (
          update portfolio_holdings
          set closed_at = ${occurredAt}
          where id = ${holding.id} and user_id = ${userId} and is_demo = false and closed_at is null and exists (select 1 from transitioned)
          returning id
        )
        , inserted_transaction as (
          insert into transactions (id, user_id, holding_id, decision_id, transaction_type, amount_minor, currency, occurred_at, source, idempotency_key, notes, reverses_transaction_id, is_demo)
          select ${reversalId}, ${userId}, id, ${analysis.decisionId}, 'REVERSAL', ${-purchase.amountMinor}, ${purchase.currency}, ${occurredAt}, ${input.source}, ${input.idempotencyKey}, ${reason}, ${purchase.id}, false
          from closed_holding
          returning id
        )
        select id from inserted_transaction
      `);
      if (inserted.rows.length === 0) {
        const concurrent = await this.readOperation(userId, input.idempotencyKey);
        if (concurrent) return this.replayReversal(userId, input, concurrent);
        throw new Error('Purchase reversal state changed concurrently; reload before retrying');
      }
    } catch (error) {
      const committed = await this.readOperation(userId, input.idempotencyKey);
      if (committed) return this.replayReversal(userId, input, committed);
      throw error;
    }
    const committed = await this.readOperation(userId, input.idempotencyKey);
    if (!committed) throw new Error('Purchase reversal state changed concurrently; reload before retrying');
    return Object.freeze({ analysis: Object.freeze({ ...analysis, purchaseStatus: 'CANCELLED' }), replayed: false });
  }

  async loadPortfolio(userId: string): Promise<PersistedPortfolio> {
    const all = await this.listAnalyses(userId);
    const open = await this.database.select().from(portfolioHoldings).where(and(eq(portfolioHoldings.userId, userId), eq(portfolioHoldings.isDemo, false), isNull(portfolioHoldings.closedAt)));
    if (!open.length) return portfolioFrom(all, []);
    const purchaseRows = await this.database.select().from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.isDemo, false), eq(transactions.transactionType, 'PURCHASE'), inArray(transactions.holdingId, open.map((holding) => holding.id))));
    const purchaseByHolding = new Map(purchaseRows.map((row) => [row.holdingId, row]));
    const analysisBySnapshot = new Map(all.map((analysis) => [analysis.snapshotId, analysis]));
    const rows = open.map((holding): HoldingRead => {
      if (!holding.predictionSnapshotId) throw new Error(`Holding ${holding.id} is missing its prediction snapshot`);
      const analysis = analysisBySnapshot.get(holding.predictionSnapshotId);
      if (!analysis) throw new Error(`Holding ${holding.id} references an unavailable analysis snapshot`);
      const purchase = purchaseByHolding.get(holding.id);
      if (!purchase || purchase.amountMinor !== holding.costBasisMinor || purchase.currency !== holding.currency) throw new Error(`Holding ${holding.id} does not match its purchase transaction`);
      return { id: holding.id, analysisId: analysis.id, snapshotId: holding.predictionSnapshotId, cardId: holding.cardCatalogItemId, acquiredAt: holding.acquiredAt.toISOString(), costBasisMinor: holding.costBasisMinor, currency: holding.currency, closedAt: holding.closedAt?.toISOString() ?? null };
    });
    return portfolioFrom(all, rows);
  }

  async getSettings(userId: string): Promise<{ targetRoiBps: number }> {
    const row = (await this.database.select().from(userSettings).where(eq(userSettings.userId, userId))).at(0);
    return { targetRoiBps: row?.targetRoiBps ?? 1_500 };
  }

  async updateSettings(userId: string, targetRoiBps: number): Promise<{ targetRoiBps: number }> {
    await this.database.insert(userSettings).values({ userId, targetRoiBps, updatedAt: new Date() }).onConflictDoUpdate({ target: userSettings.userId, set: { targetRoiBps, updatedAt: new Date() } });
    return { targetRoiBps };
  }

  async listWatchlist(userId: string): Promise<readonly WatchlistItem[]> {
    const rows = await this.database.select().from(watchlistItems).where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.isDemo, false), isNull(watchlistItems.deletedAt))).orderBy(desc(watchlistItems.isStarred), desc(watchlistItems.createdAt));
    return Object.freeze(rows.map((row) => Object.freeze({ id: row.id, userId: row.userId, cardId: row.cardCatalogItemId, marketRecordId: row.marketRecordId, notes: row.notes, isStarred: row.isStarred, createdAt: row.createdAt.toISOString() })));
  }

  async saveWatchlist(item: WatchlistItem): Promise<WatchlistItem> {
    await this.database.insert(watchlistItems).values({ id: item.id, userId: item.userId, cardCatalogItemId: item.cardId, marketRecordId: item.marketRecordId, notes: item.notes, isStarred: item.isStarred, isDemo: false, createdAt: date(item.createdAt) });
    return item;
  }

  async updateWatchlist(userId: string, itemId: string, patch: Pick<WatchlistItem, 'notes' | 'isStarred'>): Promise<WatchlistItem | null> {
    const row = (await this.database.update(watchlistItems).set({ notes: patch.notes, isStarred: patch.isStarred }).where(and(eq(watchlistItems.id, itemId), eq(watchlistItems.userId, userId), eq(watchlistItems.isDemo, false), isNull(watchlistItems.deletedAt))).returning()).at(0);
    return row ? Object.freeze({ id: row.id, userId: row.userId, cardId: row.cardCatalogItemId, marketRecordId: row.marketRecordId, notes: row.notes, isStarred: row.isStarred, createdAt: row.createdAt.toISOString() }) : null;
  }

  async deleteWatchlist(userId: string, itemId: string): Promise<boolean> {
    const rows = await this.database.update(watchlistItems).set({ deletedAt: new Date() }).where(and(eq(watchlistItems.id, itemId), eq(watchlistItems.userId, userId), eq(watchlistItems.isDemo, false))).returning({ id: watchlistItems.id });
    return rows.length > 0;
  }

  private async readOperation(userId: string, idempotencyKey: string) {
    return (await this.database.select().from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.idempotencyKey, idempotencyKey), eq(transactions.isDemo, false)))).at(0) ?? null;
  }

  private async replayPurchase(userId: string, input: PurchaseWrite, row: typeof transactions.$inferSelect): Promise<PurchaseResult> {
    const analysis = await this.readStored(userId, input.analysisId);
    if (!analysis) throw new Error('Idempotency key belongs to an unavailable purchase');
    if (row.transactionType !== 'PURCHASE' || row.decisionId !== analysis.decisionId || row.amountMinor !== input.amountMinor || row.currency !== input.currency || row.source !== input.source || !sameTime(input.occurredAt, row.occurredAt)) throw new Error('Idempotency key was already used for a different purchase');
    if (analysis.purchaseStatus !== 'PURCHASED') throw new Error('The idempotent purchase has already been reversed');
    return Object.freeze({ analysis, replayed: true });
  }

  private async replayReversal(userId: string, input: ReversalWrite, row: typeof transactions.$inferSelect): Promise<PurchaseResult> {
    const analysis = await this.readStored(userId, input.analysisId);
    if (!analysis) throw new Error('Idempotency key belongs to an unavailable reversal');
    if (row.transactionType !== 'REVERSAL' || row.decisionId !== analysis.decisionId || row.source !== input.source || row.notes !== input.reason || !sameTime(input.occurredAt, row.occurredAt)) throw new Error('Idempotency key was already used for a different reversal');
    if (analysis.purchaseStatus !== 'CANCELLED') throw new Error('Reversal state is inconsistent');
    return Object.freeze({ analysis, replayed: true });
  }

  private async readStored(userId: string, analysisId: string): Promise<StoredAnalysis | null> {
    const row = (await this.database.select().from(analyses).where(and(eq(analyses.id, analysisId), eq(analyses.userId, userId), eq(analyses.isDemo, false)))).at(0);
    if (!row) return null;
    const snapshot = (await this.database.select().from(predictionSnapshots).where(and(eq(predictionSnapshots.analysisId, row.id), eq(predictionSnapshots.userId, userId), eq(predictionSnapshots.isDemo, false)))).at(0);
    if (!snapshot) throw new Error(`Analysis ${analysisId} is missing its immutable snapshot`);
    const decision = (await this.database.select().from(userDecisions).where(and(eq(userDecisions.userId, userId), eq(userDecisions.isDemo, false), eq(userDecisions.predictionSnapshotId, snapshot.id)))).at(0);
    if (!decision) throw new Error(`Analysis ${analysisId} is missing its decision`);
    return Object.freeze({ id: row.id, snapshotId: snapshot.id, decisionId: decision.id, userId: row.userId, cardId: row.cardCatalogItemId ?? '', cutoff: row.cutoff.toISOString(), currency: row.currency, input: row.inputSnapshot, result: row.result, purchaseStatus: decision.purchaseStatus as PurchaseStatus, createdAt: row.createdAt.toISOString() });
  }
}

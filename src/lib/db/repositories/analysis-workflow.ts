import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { PurchaseStatus } from '@/features/portfolio/purchase-status';
import type { PortfolioHolding } from '@/features/portfolio/portfolio-service';
import type { PortfolioDecisionRow } from '@/features/portfolio/demo-portfolio';
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
  evidence: readonly Readonly<{ id: string; sourceKind?: 'MANUAL' | 'CSV'; included: boolean; snapshot: JsonRecord }>[];
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
  amountMinor: bigint;
  currency: string;
  source: string;
  occurredAt: string;
}>;

export type PersistedPortfolio = Readonly<{
  summary: Readonly<{ holdingCount: number; costBasisMinor: bigint; currentValueMinor: bigint | null; unrealizedProfitMinor: bigint | null; currency: string }>;
  holdings: readonly PortfolioHolding[];
  decisions: readonly PortfolioDecisionRow[];
}>;

export interface AnalysisWorkflowRepository {
  createAnalysis(input: AnalysisWrite): Promise<StoredAnalysis>;
  listAnalyses(userId: string): Promise<readonly StoredAnalysis[]>;
  getAnalysis(userId: string, analysisId: string): Promise<StoredAnalysis | null>;
  updateDecision(userId: string, analysisId: string, status: PurchaseStatus, reason: string | null): Promise<StoredAnalysis | null>;
  recordPurchase(userId: string, input: PurchaseWrite): Promise<StoredAnalysis | null>;
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

function portfolioFrom(
  analyses: readonly StoredAnalysis[],
  purchaseFor: (analysis: StoredAnalysis) => PurchaseWrite | null,
): PersistedPortfolio {
  const decisions: PortfolioDecisionRow[] = [];
  const holdings: PortfolioHolding[] = [];
  for (const analysis of analyses) {
    if (analysis.purchaseStatus !== 'PURCHASED') continue;
    const purchase = purchaseFor(analysis);
    if (!purchase) continue;
    const scenario = object(analysis.result.scenario);
    const modelMaximumMinor = bigintValue(object(scenario.maximumPurchasePriceForTargetRoi).minor);
    const label = cardLabel(analysis);
    decisions.push(Object.freeze({
      id: analysis.decisionId, cardLabel: label, purchaseStatus: 'PURCHASED', mattMaximumMinor: purchase.amountMinor,
      modelMaximumMinor, varianceMinor: purchase.amountMinor - modelMaximumMinor, currency: purchase.currency,
      reason: 'Purchase recorded', isDemo: false,
    }));
    holdings.push(Object.freeze({
      id: `holding:${analysis.id}`, userId: analysis.userId, decisionId: analysis.decisionId,
      snapshotId: analysis.snapshotId, cardId: analysis.cardId, cardLabel: label, acquiredAt: purchase.occurredAt,
      costBasisMinor: purchase.amountMinor, currentValueMinor: null, unrealizedProfitMinor: null,
      currency: purchase.currency, recommendedSellWindowDays: null, staleAt: null, isDemo: false, closedAt: null,
    }));
  }
  const costBasisMinor = holdings.reduce((sum, holding) => sum + holding.costBasisMinor, 0n);
  return Object.freeze({
    summary: Object.freeze({ holdingCount: holdings.length, costBasisMinor, currentValueMinor: null, unrealizedProfitMinor: null, currency: holdings[0]?.currency ?? 'USD' }),
    holdings: Object.freeze(holdings), decisions: Object.freeze(decisions),
  });
}

export class InMemoryAnalysisWorkflowRepository implements AnalysisWorkflowRepository {
  readonly #analyses = new Map<string, StoredAnalysis>();
  readonly #settings = new Map<string, number>();
  readonly #watchlist = new Map<string, WatchlistItem>();
  readonly #purchases = new Map<string, PurchaseWrite>();

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
    const next = Object.freeze({ ...current, purchaseStatus, decisionReason: reason });
    this.#analyses.set(analysisId, next);
    return next;
  }

  async recordPurchase(userId: string, input: PurchaseWrite): Promise<StoredAnalysis | null> {
    const current = await this.getAnalysis(userId, input.analysisId);
    if (!current) return null;
    if (current.purchaseStatus !== 'UNDECIDED') throw new Error(`Only an undecided analysis can be recorded as purchased`);
    if (input.currency !== current.currency) throw new Error('Purchase currency does not match analysis currency');
    const next = Object.freeze({ ...current, purchaseStatus: 'PURCHASED' as const });
    this.#analyses.set(current.id, next);
    this.#purchases.set(current.id, Object.freeze({ ...input }));
    return next;
  }

  async loadPortfolio(userId: string): Promise<PersistedPortfolio> {
    const purchased = [...this.#analyses.values()].filter((analysis) => analysis.userId === userId && analysis.purchaseStatus === 'PURCHASED');
    return portfolioFrom(purchased, (analysis) => this.#purchases.get(analysis.id) ?? null);
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
    if (input.evidence.length) writes.push(this.database.insert(analysisEvidence).values(input.evidence.map((evidence) => ({ id: evidence.id, analysisId: input.id, sourceKind: evidence.sourceKind ?? 'MANUAL', evidenceSnapshot: evidence.snapshot, included: evidence.included }))));
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
    await this.database.update(userDecisions).set({ purchaseStatus, reason, decidedAt: new Date() }).where(and(eq(userDecisions.id, analysis.decisionId), eq(userDecisions.userId, userId), eq(userDecisions.isDemo, false)));
    return Object.freeze({ ...analysis, purchaseStatus });
  }

  async recordPurchase(userId: string, input: PurchaseWrite): Promise<StoredAnalysis | null> {
    const analysis = await this.readStored(userId, input.analysisId);
    if (!analysis) return null;
    if (analysis.purchaseStatus !== 'UNDECIDED') throw new Error('Only an undecided analysis can be recorded as purchased');
    if (analysis.currency !== input.currency) throw new Error('Purchase currency does not match analysis currency');
    const occurredAt = date(input.occurredAt);
    const holdingId = `holding:${analysis.id}`;
    const transactionId = `transaction:${randomUUID()}`;
    await this.database.batch([
      this.database.update(userDecisions).set({ purchaseStatus: 'PURCHASED', reason: 'Purchase recorded', decidedAt: occurredAt }).where(and(eq(userDecisions.id, analysis.decisionId), eq(userDecisions.userId, userId), eq(userDecisions.purchaseStatus, 'UNDECIDED'), eq(userDecisions.isDemo, false))),
      this.database.insert(portfolioHoldings).values({ id: holdingId, userId, cardCatalogItemId: analysis.cardId, predictionSnapshotId: analysis.snapshotId, acquiredAt: occurredAt, costBasisMinor: input.amountMinor, currency: input.currency, isDemo: false }),
      this.database.insert(transactions).values({ id: transactionId, userId, holdingId, decisionId: analysis.decisionId, transactionType: 'PURCHASE', amountMinor: input.amountMinor, currency: input.currency, occurredAt, source: input.source, isDemo: false }),
    ]);
    return Object.freeze({ ...analysis, purchaseStatus: 'PURCHASED' });
  }

  async loadPortfolio(userId: string): Promise<PersistedPortfolio> {
    const all = await this.listAnalyses(userId);
    const purchased = all.filter((analysis) => analysis.purchaseStatus === 'PURCHASED');
    if (!purchased.length) return portfolioFrom([], () => null);
    const rows = await this.database.select().from(transactions).where(and(
      eq(transactions.userId, userId), eq(transactions.isDemo, false), eq(transactions.transactionType, 'PURCHASE'),
    ));
    const byDecision = new Map(rows.map((row) => [row.decisionId, row]));
    return portfolioFrom(purchased, (analysis) => {
      const row = byDecision.get(analysis.decisionId);
      return row ? { analysisId: analysis.id, amountMinor: row.amountMinor, currency: row.currency, source: row.source, occurredAt: row.occurredAt.toISOString() } : null;
    });
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

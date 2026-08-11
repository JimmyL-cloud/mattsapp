import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { PgQueryResultHKT } from 'drizzle-orm/pg-core/session';
import type { OutcomeEvaluation } from '@/features/performance/evaluate-outcome';
import type { PortfolioDecisionRow } from '@/features/portfolio/demo-portfolio';
import type {
  PortfolioHolding,
} from '@/features/portfolio/portfolio-service';
import type {
  PredictionSnapshot,
  UserDecision,
} from '@/features/portfolio/decision-service';
import type { PortfolioTransaction } from '@/features/portfolio/transaction-service';
import type { DemoScope } from '@/lib/demo/policy';
import {
  analyses,
  auditLog,
  cardCatalogItems,
  formulaVersions,
  outcomeEvaluations,
  portfolioHoldings,
  predictionSnapshots,
  transactions,
  userDecisions,
} from '@/lib/db/schema';
import type * as databaseSchema from '@/lib/db/schema';

type PurchaseBundle = Readonly<{
  decision: UserDecision;
  transaction: PortfolioTransaction;
  holding: PortfolioHolding;
}>;

export type PersistedPortfolio = Readonly<{
  summary: Readonly<{
    holdingCount: number;
    costBasisMinor: bigint;
    currentValueMinor: bigint;
    unrealizedProfitMinor: bigint;
    currency: string;
  }>;
  holdings: readonly PortfolioHolding[];
  decisions: readonly PortfolioDecisionRow[];
}>;

type StoredSnapshot = Readonly<{
  cardId: string;
  cardLabel: string;
  modelMaximumMinor: string;
  fairValueMinor: string;
  recommendedSellWindowDays: number | null;
}>;

type AuditWrite = Readonly<{
  id: string;
  userId: string;
  entityId: string;
  eventType: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  occurredAt: string;
  isDemo: boolean;
}>;

type BatchExecutor = Readonly<{
  batch(queries: readonly [object, ...object[]]): Promise<unknown>;
}>;

const bigintMarker = '__mattsapp_bigint__';

function encodeJson(value: unknown): unknown {
  if (typeof value === 'bigint') return { [bigintMarker]: value.toString() };
  if (Array.isArray(value)) return value.map(encodeJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, encodeJson(child)]),
    );
  }
  return value;
}

function decodeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeJson);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Object.keys(record).length === 1 && typeof record[bigintMarker] === 'string') {
      return BigInt(record[bigintMarker]);
    }
    return Object.fromEntries(
      Object.entries(record).map(([key, child]) => [key, decodeJson(child)]),
    );
  }
  return value;
}

function asDate(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid ledger timestamp: ${value}`);
  return parsed;
}

function boolForScope(scope: DemoScope): boolean {
  return scope === 'DEMO_ONLY';
}

function supportsBatch(database: object): boolean {
  return 'batch' in database && typeof database.batch === 'function';
}

function storedSnapshot(row: typeof predictionSnapshots.$inferSelect): StoredSnapshot {
  const result = row.result as Partial<StoredSnapshot>;
  if (
    typeof result.cardId !== 'string'
    || typeof result.cardLabel !== 'string'
    || typeof result.modelMaximumMinor !== 'string'
    || typeof result.fairValueMinor !== 'string'
  ) {
    throw new Error(`Prediction snapshot ${row.id} is missing its persisted read model`);
  }
  return {
    cardId: result.cardId,
    cardLabel: result.cardLabel,
    modelMaximumMinor: result.modelMaximumMinor,
    fairValueMinor: result.fairValueMinor,
    recommendedSellWindowDays: result.recommendedSellWindowDays ?? null,
  };
}

export class PostgresTradingLedger<
  TQueryResult extends PgQueryResultHKT,
> {
  constructor(
    private readonly database: PgDatabase<TQueryResult, typeof databaseSchema>,
  ) {}

  async savePrediction(snapshot: PredictionSnapshot): Promise<void> {
    const analysisId = `analysis:${snapshot.id}`;
    await this.database.insert(formulaVersions).values({
      id: snapshot.formulaVersion,
      name: snapshot.formulaVersion,
      definition: { source: 'immutable prediction snapshot' },
    }).onConflictDoNothing();
    await this.database.insert(cardCatalogItems).values({
      id: snapshot.cardId,
      sport: 'football',
      identity: { label: snapshot.cardLabel },
    }).onConflictDoNothing();
    await this.database.insert(analyses).values({
      id: analysisId,
      userId: snapshot.userId,
      cardCatalogItemId: snapshot.cardId,
      formulaVersionId: snapshot.formulaVersion,
      cutoff: asDate(snapshot.capturedAt),
      currentPriceMinor: snapshot.modelMaximumMinor,
      currency: snapshot.currency,
      result: {
        cardLabel: snapshot.cardLabel,
        fairValueMinor: snapshot.fairValueMinor.toString(),
        recommendedSellWindowDays: snapshot.recommendedSellWindowDays,
      },
      isDemo: snapshot.isDemo,
      createdAt: asDate(snapshot.capturedAt),
    });
    await this.database.insert(predictionSnapshots).values({
      id: snapshot.id,
      userId: snapshot.userId,
      analysisId,
      formulaVersionId: snapshot.formulaVersion,
      predictionCutoff: asDate(snapshot.capturedAt),
      evidenceIds: [],
      input: { cardId: snapshot.cardId },
      result: {
        cardId: snapshot.cardId,
        cardLabel: snapshot.cardLabel,
        modelMaximumMinor: snapshot.modelMaximumMinor.toString(),
        fairValueMinor: snapshot.fairValueMinor.toString(),
        recommendedSellWindowDays: snapshot.recommendedSellWindowDays,
      },
      isDemo: snapshot.isDemo,
      createdAt: asDate(snapshot.capturedAt),
    });
  }

  async saveDecision(decision: UserDecision): Promise<void> {
    await this.database.insert(userDecisions).values({
      id: decision.id,
      userId: decision.userId,
      predictionSnapshotId: decision.snapshotId,
      purchaseStatus: decision.purchaseStatus,
      intendedMaximumMinor: decision.intendedMaximumMinor,
      currency: decision.currency,
      reason: decision.reason,
      decidedAt: asDate(decision.decidedAt),
      isDemo: decision.isDemo,
    });
    await this.appendAudit({
      id: `decision:${decision.id}:${decision.updatedAt}`,
      userId: decision.userId,
      entityId: decision.id,
      eventType: 'DECISION_RECORDED',
      oldValue: null,
      newValue: { purchaseStatus: decision.purchaseStatus },
      reason: decision.reason ?? 'Decision recorded',
      occurredAt: decision.updatedAt,
      isDemo: decision.isDemo,
    });
  }

  async savePurchase(bundle: PurchaseBundle): Promise<void> {
    const audit: AuditWrite = {
      id: `decision:${bundle.decision.id}:${bundle.decision.updatedAt}`,
      userId: bundle.decision.userId,
      entityId: bundle.decision.id,
      eventType: 'PURCHASE_RECORDED',
      oldValue: { purchaseStatus: 'UNDECIDED' },
      newValue: {
        purchaseStatus: bundle.decision.purchaseStatus,
        transactionId: bundle.transaction.id,
        holdingId: bundle.holding.id,
      },
      reason: bundle.decision.reason ?? 'Purchase recorded',
      occurredAt: bundle.decision.updatedAt,
      isDemo: bundle.decision.isDemo,
    };
    const decisionQuery = this.database.update(userDecisions).set({
      purchaseStatus: bundle.decision.purchaseStatus,
      reason: bundle.decision.reason,
    }).where(and(
      eq(userDecisions.id, bundle.decision.id),
      eq(userDecisions.userId, bundle.decision.userId),
    ));
    const holdingQuery = this.database.insert(portfolioHoldings).values({
      id: bundle.holding.id,
      userId: bundle.holding.userId,
      cardCatalogItemId: bundle.holding.cardId,
      predictionSnapshotId: bundle.holding.snapshotId,
      acquiredAt: asDate(bundle.holding.acquiredAt),
      costBasisMinor: bundle.holding.costBasisMinor,
      currency: bundle.holding.currency,
      isDemo: bundle.holding.isDemo,
      closedAt: bundle.holding.closedAt ? asDate(bundle.holding.closedAt) : null,
    });
    const transactionQuery = this.database.insert(transactions).values({
      id: bundle.transaction.id,
      userId: bundle.transaction.userId,
      holdingId: bundle.transaction.holdingId,
      decisionId: bundle.transaction.decisionId,
      transactionType: bundle.transaction.type,
      amountMinor: bundle.transaction.amountMinor,
      currency: bundle.transaction.currency,
      occurredAt: asDate(bundle.transaction.occurredAt),
      source: bundle.transaction.source,
      reversesTransactionId: bundle.transaction.reversesTransactionId,
      isDemo: bundle.transaction.isDemo,
    });
    const auditQuery = this.database.insert(auditLog).values(this.auditValues(audit));

    if (supportsBatch(this.database)) {
      await (this.database as unknown as BatchExecutor).batch([
        decisionQuery,
        holdingQuery,
        transactionQuery,
        auditQuery,
      ]);
      return;
    }

    await this.database.transaction(async (transaction) => {
      await transaction.update(userDecisions).set({
        purchaseStatus: bundle.decision.purchaseStatus,
        reason: bundle.decision.reason,
      }).where(and(
        eq(userDecisions.id, bundle.decision.id),
        eq(userDecisions.userId, bundle.decision.userId),
      ));
      await transaction.insert(portfolioHoldings).values({
        id: bundle.holding.id,
        userId: bundle.holding.userId,
        cardCatalogItemId: bundle.holding.cardId,
        predictionSnapshotId: bundle.holding.snapshotId,
        acquiredAt: asDate(bundle.holding.acquiredAt),
        costBasisMinor: bundle.holding.costBasisMinor,
        currency: bundle.holding.currency,
        isDemo: bundle.holding.isDemo,
        closedAt: bundle.holding.closedAt ? asDate(bundle.holding.closedAt) : null,
      });
      await transaction.insert(transactions).values({
        id: bundle.transaction.id,
        userId: bundle.transaction.userId,
        holdingId: bundle.transaction.holdingId,
        decisionId: bundle.transaction.decisionId,
        transactionType: bundle.transaction.type,
        amountMinor: bundle.transaction.amountMinor,
        currency: bundle.transaction.currency,
        occurredAt: asDate(bundle.transaction.occurredAt),
        source: bundle.transaction.source,
        reversesTransactionId: bundle.transaction.reversesTransactionId,
        isDemo: bundle.transaction.isDemo,
      });
      await transaction.insert(auditLog).values(this.auditValues(audit));
    });
  }

  async saveOutcome(evaluation: OutcomeEvaluation): Promise<void> {
    await this.database.insert(outcomeEvaluations).values({
      id: `${evaluation.snapshotId}:${evaluation.horizonDays}`,
      predictionSnapshotId: evaluation.snapshotId,
      decisionId: evaluation.decisionId,
      horizonDays: evaluation.horizonDays,
      status: evaluation.status,
      evaluatedAt: asDate(evaluation.evaluatedAt),
      actualMarketValueMinor: evaluation.actualValueMinor,
      realizedProfitMinor: evaluation.realizedProfitMinor,
      counterfactualProfitMinor: evaluation.counterfactualProfitMinor,
      currency: evaluation.currency,
      metrics: { evaluation: encodeJson(evaluation) } as Record<string, unknown>,
      isDemo: evaluation.isDemo,
    });
  }

  async loadPortfolio(userId: string, scope: DemoScope): Promise<PersistedPortfolio> {
    const isDemo = boolForScope(scope);
    const [snapshotRows, decisionRows, holdingRows] = await Promise.all([
      this.database.select().from(predictionSnapshots).where(and(
        eq(predictionSnapshots.userId, userId),
        eq(predictionSnapshots.isDemo, isDemo),
      )),
      this.database.select().from(userDecisions).where(and(
        eq(userDecisions.userId, userId),
        eq(userDecisions.isDemo, isDemo),
      )),
      this.database.select().from(portfolioHoldings).where(and(
        eq(portfolioHoldings.userId, userId),
        eq(portfolioHoldings.isDemo, isDemo),
        isNull(portfolioHoldings.closedAt),
      )),
    ]);
    const snapshots = new Map(snapshotRows.map((row) => [row.id, storedSnapshot(row)]));
    const decisionsBySnapshot = new Map(decisionRows.map((row) => [row.predictionSnapshotId, row]));
    const holdings: PortfolioHolding[] = holdingRows.map((row) => {
      if (!row.predictionSnapshotId) throw new Error(`Holding ${row.id} is missing its prediction snapshot`);
      const snapshot = snapshots.get(row.predictionSnapshotId);
      if (!snapshot) throw new Error(`Holding ${row.id} references an unavailable prediction snapshot`);
      const decision = decisionsBySnapshot.get(row.predictionSnapshotId);
      if (!decision) throw new Error(`Holding ${row.id} references an unavailable decision`);
      const currentValueMinor = BigInt(snapshot.fairValueMinor);
      return Object.freeze({
        id: row.id,
        userId: row.userId,
        decisionId: decision.id,
        snapshotId: row.predictionSnapshotId,
        cardId: row.cardCatalogItemId,
        cardLabel: snapshot.cardLabel,
        acquiredAt: row.acquiredAt.toISOString(),
        costBasisMinor: row.costBasisMinor,
        currentValueMinor,
        unrealizedProfitMinor: currentValueMinor - row.costBasisMinor,
        currency: row.currency,
        recommendedSellWindowDays: snapshot.recommendedSellWindowDays,
        staleAt: null,
        isDemo: row.isDemo,
        closedAt: row.closedAt?.toISOString() ?? null,
      });
    });
    const decisions: PortfolioDecisionRow[] = decisionRows.map((row) => {
      const snapshot = snapshots.get(row.predictionSnapshotId);
      if (!snapshot) throw new Error(`Decision ${row.id} references an unavailable prediction snapshot`);
      const modelMaximumMinor = BigInt(snapshot.modelMaximumMinor);
      return Object.freeze({
        id: row.id,
        cardLabel: snapshot.cardLabel,
        purchaseStatus: row.purchaseStatus as PortfolioDecisionRow['purchaseStatus'],
        mattMaximumMinor: row.intendedMaximumMinor,
        modelMaximumMinor,
        varianceMinor: row.intendedMaximumMinor === null ? null : row.intendedMaximumMinor - modelMaximumMinor,
        currency: row.currency ?? 'USD',
        reason: row.reason,
        isDemo: row.isDemo,
      });
    });
    const currencies = new Set(holdings.map((holding) => holding.currency));
    if (currencies.size > 1) throw new Error('Portfolio totals require one currency');
    const costBasisMinor = holdings.reduce((sum, holding) => sum + holding.costBasisMinor, 0n);
    const currentValueMinor = holdings.reduce((sum, holding) => sum + holding.currentValueMinor, 0n);
    return Object.freeze({
      summary: Object.freeze({
        holdingCount: holdings.length,
        costBasisMinor,
        currentValueMinor,
        unrealizedProfitMinor: currentValueMinor - costBasisMinor,
        currency: holdings[0]?.currency ?? 'USD',
      }),
      holdings: Object.freeze(holdings),
      decisions: Object.freeze(decisions),
    });
  }

  async loadOutcomes(userId: string, scope: DemoScope): Promise<readonly OutcomeEvaluation[]> {
    const snapshots = await this.database.select({ id: predictionSnapshots.id }).from(predictionSnapshots).where(and(
      eq(predictionSnapshots.userId, userId),
      eq(predictionSnapshots.isDemo, boolForScope(scope)),
    ));
    if (!snapshots.length) return Object.freeze([]);
    const rows = await this.database.select().from(outcomeEvaluations).where(and(
      inArray(outcomeEvaluations.predictionSnapshotId, snapshots.map((row) => row.id)),
      eq(outcomeEvaluations.isDemo, boolForScope(scope)),
    ));
    return Object.freeze(rows.map((row) => {
      const metrics = row.metrics as { evaluation?: unknown };
      if (!metrics.evaluation) throw new Error(`Outcome ${row.id} is missing its immutable evaluation payload`);
      return Object.freeze(decodeJson(metrics.evaluation) as OutcomeEvaluation);
    }));
  }

  private auditValues(input: AuditWrite) {
    return {
      ...input,
      entityType: 'user_decision',
      oldValue: encodeJson(input.oldValue),
      newValue: encodeJson(input.newValue),
      metadata: {},
      occurredAt: asDate(input.occurredAt),
    };
  }

  private async appendAudit(input: AuditWrite): Promise<void> {
    await this.database.insert(auditLog).values(this.auditValues(input));
  }
}
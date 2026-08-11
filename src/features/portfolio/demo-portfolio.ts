import type { PurchaseStatus } from './purchase-status';
import { PortfolioStore } from './portfolio-service';

export type PortfolioDecisionRow = Readonly<{
  id: string;
  cardLabel: string;
  purchaseStatus: PurchaseStatus;
  mattMaximumMinor: bigint | null;
  modelMaximumMinor: bigint;
  varianceMinor: bigint | null;
  currency: string;
  reason: string | null;
  isDemo: boolean;
}>;

export function createDemoPortfolio() {
  const store = new PortfolioStore();
  const snapshots = [
    { id: 'DEMO-SNAPSHOT-001', cardId: 'DEMO-CARD-001', cardLabel: 'DEMO / PLACEHOLDER — 2020 Prizm #2 Silver PSA 10', modelMaximumMinor: 82_500n, fairValueMinor: 92_500n, recommendedSellWindowDays: 14 },
    { id: 'DEMO-SNAPSHOT-002', cardId: 'DEMO-CARD-002', cardLabel: 'DEMO / PLACEHOLDER — 2021 Prizm #211 Gold /10 PSA 9', modelMaximumMinor: 10_200n, fairValueMinor: 11_600n, recommendedSellWindowDays: 30 },
    { id: 'DEMO-SNAPSHOT-003', cardId: 'DEMO-CARD-003', cardLabel: 'DEMO / PLACEHOLDER — 2024 Prizm #301 Rookie SGC 10', modelMaximumMinor: 44_000n, fairValueMinor: 51_000n, recommendedSellWindowDays: 180 },
    { id: 'DEMO-SNAPSHOT-004', cardId: 'DEMO-CARD-004', cardLabel: 'DEMO / PLACEHOLDER — 2022 Prizm #188 Blue PSA 9', modelMaximumMinor: 21_000n, fairValueMinor: 25_000n, recommendedSellWindowDays: 7 },
  ].map((item) => store.registerPrediction({
    ...item, userId: 'DEMO-OWNER', capturedAt: '2026-08-01T12:00:00Z', formulaVersion: 'valuation-v1', currency: 'USD', isDemo: true,
  }));
  const decisions = snapshots.map((item, index) => store.recordDecision({
    id: `DEMO-DECISION-00${index + 1}`,
    snapshotId: item.id,
    userId: item.userId,
    intendedMaximumMinor: [80_000n, 9_800n, 42_500n, 20_000n][index],
    reason: 'DEMO / PLACEHOLDER DECISION',
    decidedAt: '2026-08-01T12:05:00Z',
  }));
  store.recordPurchase({ transactionId: 'DEMO-TX-001', holdingId: 'DEMO-HOLDING-001', decisionId: decisions[0].id, amountMinor: 80_000n, currency: 'USD', source: 'DEMO / PLACEHOLDER — MANUAL', occurredAt: '2026-08-02T12:00:00Z', currentValueMinor: 92_500n, staleAt: '2026-08-10T12:00:00Z' });
  store.recordPurchase({ transactionId: 'DEMO-TX-002', holdingId: 'DEMO-HOLDING-002', decisionId: decisions[1].id, amountMinor: 9_500n, currency: 'USD', source: 'DEMO / PLACEHOLDER — PRIVATE SALE', occurredAt: '2026-08-03T12:00:00Z', currentValueMinor: 11_600n, staleAt: '2026-08-09T12:00:00Z' });
  store.setPurchaseStatus({ decisionId: decisions[2].id, status: 'MISSED', reason: 'Auction cleared above Matt maximum', occurredAt: '2026-08-04T12:00:00Z' });
  store.setPurchaseStatus({ decisionId: decisions[3].id, status: 'PASSED', reason: 'Evidence confidence below threshold', occurredAt: '2026-08-04T12:00:00Z' });

  const decisionRows: PortfolioDecisionRow[] = snapshots.map((item, index) => {
    const decision = store.getDecision(decisions[index].id);
    return Object.freeze({
      id: decision.id,
      cardLabel: item.cardLabel,
      purchaseStatus: decision.purchaseStatus,
      mattMaximumMinor: decision.intendedMaximumMinor,
      modelMaximumMinor: item.modelMaximumMinor,
      varianceMinor: decision.varianceFromModelMaximumMinor,
      currency: item.currency,
      reason: decision.reason,
      isDemo: item.isDemo,
    });
  });
  return Object.freeze({
    summary: store.getPortfolioSummary('DEMO-OWNER', 'DEMO_ONLY'),
    holdings: store.getHoldings('DEMO-OWNER', 'DEMO_ONLY'),
    decisions: Object.freeze(decisionRows),
  });
}
type AlertSnapshot = Readonly<{
  snapshotId: string;
  userId: string;
  capturedAt: string;
  dealScore: number;
  sellTimingScore: number;
  confidencePercent: number;
  currentAllInMinor: bigint;
  currency: string;
  isDemo: boolean;
}>;

export type AlertRule =
  | Readonly<{ id: string; type: 'DEAL_SCORE_AT_LEAST' | 'SELL_TIMING_AT_LEAST' | 'CONFIDENCE_AT_LEAST'; threshold: number }>
  | Readonly<{ id: string; type: 'PRICE_AT_OR_BELOW'; thresholdMinor: bigint; currency: string }>;

export type AlertEvent = Readonly<{
  id: string;
  ruleId: string;
  type: AlertRule['type'];
  snapshotId: string;
  userId: string;
  triggeredAt: string;
  observed: number | bigint;
  threshold: number | bigint;
  currency: string | null;
  isDemo: boolean;
}>;

export function evaluateAlerts(snapshot: AlertSnapshot, rules: readonly AlertRule[]): readonly AlertEvent[] {
  const seen = new Set<string>();
  const events: AlertEvent[] = [];
  for (const rule of rules) {
    if (seen.has(rule.id)) continue;
    seen.add(rule.id);
    let triggered = false;
    let observed: number | bigint;
    let threshold: number | bigint;
    let currency: string | null = null;
    if (rule.type === 'PRICE_AT_OR_BELOW') {
      if (rule.currency !== snapshot.currency) throw new Error('Alert currency does not match snapshot currency');
      observed = snapshot.currentAllInMinor;
      threshold = rule.thresholdMinor;
      currency = rule.currency;
      triggered = observed <= threshold;
    } else {
      observed = rule.type === 'DEAL_SCORE_AT_LEAST'
        ? snapshot.dealScore
        : rule.type === 'SELL_TIMING_AT_LEAST'
          ? snapshot.sellTimingScore
          : snapshot.confidencePercent;
      threshold = rule.threshold;
      triggered = observed >= threshold;
    }
    if (triggered) events.push(Object.freeze({
      id: `${snapshot.snapshotId}:${rule.id}`,
      ruleId: rule.id,
      type: rule.type,
      snapshotId: snapshot.snapshotId,
      userId: snapshot.userId,
      triggeredAt: snapshot.capturedAt,
      observed,
      threshold,
      currency,
      isDemo: snapshot.isDemo,
    }));
  }
  return Object.freeze(events);
}
function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function DealScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="muted">N/A · NO VALUE</span>;
  const label = score > 0 ? 'UNDERPRICED' : score < 0 ? 'OVERPRICED' : 'FAIR';
  return <span className={score > 0 ? 'positive' : score < 0 ? 'negative' : 'muted'}>{signed(score)} · {label}</span>;
}

export function SellTimingCell({ score }: { score: number | null }) {
  if (score === null) return <span className="muted">N/A · NO SIGNAL</span>;
  const label = score > 0 ? 'SELL NOW FAVORED' : score < 0 ? 'WAIT FAVORED' : 'NO EDGE';
  return <span className={score > 0 ? 'positive' : score < 0 ? 'negative' : 'muted'}>{signed(score)} · {label}</span>;
}
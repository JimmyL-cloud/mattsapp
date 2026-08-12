import { PurchaseStatusBadge } from '@/components/terminal/purchase-status';
import type { PortfolioHolding } from './portfolio-service';
import type { PortfolioDecisionRow } from './demo-portfolio';

export type PortfolioSummary = Readonly<{
  holdingCount: number;
  costBasisMinor: bigint;
  currentValueMinor: bigint | null;
  unrealizedProfitMinor: bigint | null;
  currency: string;
}>;

function money(minor: bigint, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(minor) / 100);
}

function signedMoney(minor: bigint, currency: string): string {
  return `${minor > 0n ? '+' : ''}${money(minor, currency)}`;
}

function resultClass(value: bigint | null): string {
  if (value === null) return 'muted';
  return value > 0n ? 'positive' : value < 0n ? 'negative' : 'muted';
}

export function PortfolioTerminal({
  summaries,
  holdings,
  decisions,
  demoMode = true,
}: {
  summaries: readonly PortfolioSummary[];
  holdings: readonly PortfolioHolding[];
  decisions: readonly PortfolioDecisionRow[];
  demoMode?: boolean;
}) {
  const holdingCount = summaries.reduce((sum, summary) => sum + summary.holdingCount, 0);
  if (holdings.length === 0 && decisions.length === 0) return <div className="portfolio-grid"><section className="panel portfolio-heading wide"><div><h1>Portfolio</h1><span className="muted">ACTUAL TRANSACTIONS ONLY · REAL DATA</span></div><strong>0 OPEN HOLDINGS</strong></section><section className="panel empty-state wide"><h2>No portfolio activity yet</h2><p>Mark an analysis as purchased, then record the real transaction when portfolio persistence is connected. Forecasts and watchlist intent are never shown as holdings.</p><a className="primary-button" href="/history">Review decisions</a></section></div>;
  return <div className="portfolio-grid">
    <section className="panel portfolio-heading wide">
      <div><h1>Portfolio</h1><span className="muted">ACTUAL TRANSACTIONS ONLY · {demoMode ? 'DEMO / PLACEHOLDER' : 'REAL DATA'}</span></div>
      <strong>{holdingCount} OPEN HOLDINGS</strong>
    </section>
    {summaries.map((summary) => {
      const returnBps = summary.costBasisMinor === 0n || summary.unrealizedProfitMinor === null ? null : Number(summary.unrealizedProfitMinor * 10_000n / summary.costBasisMinor);
      return <section className="portfolio-summary wide" aria-label={`Portfolio totals ${summary.currency}`} key={summary.currency}>
        <article className="signal"><h2>COST BASIS · {summary.currency}</h2><strong>{money(summary.costBasisMinor, summary.currency)}</strong><span>{summary.holdingCount} HOLDING{summary.holdingCount === 1 ? '' : 'S'} · RECORDED ALL-IN</span></article>
        <article className="signal"><h2>CURRENT VALUE · {summary.currency}</h2><strong>{summary.currentValueMinor === null ? 'NOT RECORDED' : money(summary.currentValueMinor, summary.currency)}</strong><span>LAST AUDITED MARK</span></article>
        <article className="signal"><h2>UNREALIZED P/L · {summary.currency}</h2><strong className={resultClass(summary.unrealizedProfitMinor)}>{summary.unrealizedProfitMinor === null ? 'N/A' : signedMoney(summary.unrealizedProfitMinor, summary.currency)}</strong><span>{returnBps === null ? 'AWAITING REAL MARK' : `${(returnBps / 100).toFixed(2)}% RETURN`}</span></article>
      </section>;
    })}
    <section className="panel wide table-scroll"><h2>OPEN HOLDINGS</h2><table><thead><tr>
      <th>CARD / SNAPSHOT</th><th>FOLLOW-THROUGH</th><th>ACQUIRED</th><th>COST BASIS</th><th>CURRENT VALUE</th><th>UNREALIZED</th><th>SELL WINDOW</th><th>FRESHNESS</th>
    </tr></thead><tbody>{holdings.map((holding) => <tr key={holding.id}>
      <td>{holding.cardLabel}<small>{holding.snapshotId}</small></td>
      <td><PurchaseStatusBadge status="PURCHASED" /></td>
      <td>{holding.acquiredAt.slice(0, 10)}</td>
      <td>{money(holding.costBasisMinor, holding.currency)}</td>
      <td>{holding.currentValueMinor === null ? 'NOT RECORDED' : money(holding.currentValueMinor, holding.currency)}</td>
      <td className={resultClass(holding.unrealizedProfitMinor)}>{holding.unrealizedProfitMinor === null ? 'N/A' : signedMoney(holding.unrealizedProfitMinor, holding.currency)}</td>
      <td>{holding.recommendedSellWindowDays ? `${holding.recommendedSellWindowDays} DAYS` : 'NO RELIABLE WINDOW'}</td>
      <td className={holding.staleAt ? 'amber' : 'muted'}>{holding.staleAt ? `MARKED ${holding.staleAt.slice(0, 10)}` : 'NO MARK'}</td>
    </tr>)}</tbody></table></section>
    <section className="panel wide table-scroll"><h2>WATCHLIST / DECISION FOLLOW-THROUGH</h2><table><thead><tr>
      <th>CARD</th><th>STATUS</th><th>MATT MAX</th><th>MODEL MAX</th><th>VARIANCE</th><th>REASON</th>
    </tr></thead><tbody>{decisions.map((decision) => <tr key={decision.id}>
      <td>{decision.cardLabel}<small>{decision.id}{demoMode ? ' · DEMO / PLACEHOLDER' : ''}</small></td>
      <td><PurchaseStatusBadge status={decision.purchaseStatus} /></td>
      <td>{decision.mattMaximumMinor === null ? 'NOT RECORDED' : money(decision.mattMaximumMinor, decision.currency)}</td>
      <td>{money(decision.modelMaximumMinor, decision.currency)}</td>
      <td className={decision.varianceMinor === null ? 'muted' : resultClass(decision.varianceMinor)}>{decision.varianceMinor === null ? 'N/A' : signedMoney(decision.varianceMinor, decision.currency)}</td>
      <td>{decision.reason ?? 'NO REASON RECORDED'}</td>
    </tr>)}</tbody></table></section>
  </div>;
}

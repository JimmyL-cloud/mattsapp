import { PurchaseStatusBadge } from '@/components/terminal/purchase-status';
import type { OutcomeEvaluation } from './evaluate-outcome';

function money(minor: bigint | null, currency: string): string {
  return minor === null ? 'N/A' : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(minor) / 100);
}

function signedMoney(minor: bigint | null, currency: string): string {
  return minor === null ? 'N/A' : `${minor > 0n ? '+' : ''}${money(minor, currency)}`;
}

function resultClass(value: bigint | null): string {
  return value === null ? 'muted' : value > 0n ? 'positive' : value < 0n ? 'negative' : 'muted';
}

export function PerformanceTable({ rows }: { rows: readonly OutcomeEvaluation[] }) {
  return <div className="table-scroll"><table className="performance-table"><thead><tr>
    <th>SNAPSHOT</th><th>HORIZON</th><th>MATURITY</th><th>STATUS</th><th>FOLLOW-THROUGH</th><th>MODEL</th><th>ACTUAL</th><th>ABS ERROR</th><th>MATT HYPOTHETICAL</th><th>MODEL HYPOTHETICAL</th><th>REALIZED</th>
  </tr></thead><tbody>{rows.map((row) => <tr key={`${row.snapshotId}-${row.horizonDays}`} data-testid="performance-row">
    <td>{row.snapshotId}<small>{row.isDemo ? 'DEMO / PLACEHOLDER · ' : ''}IMMUTABLE</small></td>
    <td>{row.horizonDays}D</td><td>{row.maturityAt.slice(0, 10)}</td>
    <td className={row.status === 'MATURED' ? 'positive' : row.status === 'INVALIDATED' ? 'negative' : 'amber'}>{row.status}<small>{row.reason ?? 'CUTOFF SAFE'}</small></td>
    <td><PurchaseStatusBadge status={row.purchaseStatus} /></td>
    <td>{money(row.predictedValueMinor, row.currency)}</td><td>{money(row.actualValueMinor, row.currency)}</td>
    <td>{money(row.modelAbsoluteErrorMinor, row.currency)}</td>
    <td className={resultClass(row.mattCounterfactualProfitMinor)}>{signedMoney(row.mattCounterfactualProfitMinor, row.currency)}<small>NOT REALIZED</small></td>
    <td className={resultClass(row.modelCounterfactualProfitMinor)}>{signedMoney(row.modelCounterfactualProfitMinor, row.currency)}<small>NOT REALIZED</small></td>
    <td className={resultClass(row.realizedProfitMinor)}>{signedMoney(row.realizedProfitMinor, row.currency)}<small>{row.realizedProfitMinor === null ? 'NO CLOSED PURCHASE' : 'PURCHASED ONLY'}</small></td>
  </tr>)}</tbody></table></div>;
}

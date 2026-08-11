import { createDemoAnalysis } from './demo-analysis';
import type { AnalysisResult } from './run-analysis';
import Link from 'next/link';

const money = (minor: bigint, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(minor) / 100);
const signed = (score: number) => score > 0 ? `+${score}` : String(score);

function signalClass(value: number): string {
  return value > 0 ? 'positive' : value < 0 ? 'negative' : 'muted';
}

function outputText(output: unknown, unit: string, currency: string): string {
  if (typeof output === 'bigint') return unit.includes('minor currency') ? money(output, currency) : output.toString();
  if (typeof output === 'string' || typeof output === 'number' || typeof output === 'boolean') return String(output);
  return JSON.stringify(output, (_key, value) => typeof value === 'bigint' ? value.toString() : value);
}

export function AnalysisTerminal({ result = createDemoAnalysis() }: { result?: AnalysisResult }) {
  const currency = result.currentAllIn.currency;
  return <div className="analysis-grid">
    <section className="panel title-panel wide">
      <div>
        <h1>{result.target.year} {result.target.brand} #{result.target.cardNumber} {result.target.parallel} — {result.target.gradingCompanyKey?.toUpperCase()} {result.target.grade}</h1>
        <span className="muted">{result.isDemo ? 'DEMO / PLACEHOLDER ANALYSIS' : 'REAL ANALYSIS'} · FORMULA {result.formulaVersion} · CUTOFF {result.cutoff}</span>
      </div>
      <strong className={`purchase ${result.purchaseStatus === 'PURCHASED' ? 'purchased' : ''}`}>{result.purchaseStatus}</strong>
    </section>

    <section className="signal-grid">
      <article className="signal"><h2>DEAL SCORE</h2><strong className={signalClass(result.dealScore.score)}>{signed(result.dealScore.score)}</strong><span>{result.dealScore.discountPercent.toFixed(1)}% VS FAIR CENTER</span></article>
      <article className="signal"><h2>SELL TIMING</h2><strong className={signalClass(result.sellTiming.score)}>{signed(result.sellTiming.score)}</strong><span>{result.sellTiming.recommendation}</span></article>
      <article className="signal"><h2>CONFIDENCE</h2><strong>{result.confidence.percent}%</strong><span>RAW {result.confidence.rawPercent}% · {result.confidence.caps.length ? result.confidence.caps.join(' · ') : 'NO CAPS'}</span></article>
    </section>

    <section className="panel"><h2>PRICE / RETURN TAPE</h2><table><tbody>
      <tr><td>Current {result.currentOffer.kind === 'AUCTION' ? 'auction bid' : 'asking price'}</td><td>{money(result.currentOffer.priceOrBid.minor, currency)}</td></tr>
      <tr><td>Current all-in acquisition</td><td>{money(result.currentAllIn.minor, currency)}</td></tr>
      <tr><td>Historical fair range</td><td>{money(result.fairValue.lowMinor, currency)} — {money(result.fairValue.highMinor, currency)}</td></tr>
      <tr><td>Weighted fair center</td><td>{money(result.fairValue.centerMinor, currency)}</td></tr>
      <tr><td>Maximum buy @ target ROI</td><td className="positive">{money(result.scenario.maximumPurchasePriceForTargetRoi.minor, currency)}</td></tr>
      <tr><td>Break-even gross sale</td><td>{money(result.scenario.breakEvenSalePrice.minor, currency)}</td></tr>
      <tr><td>Expected net proceeds</td><td>{money(result.scenario.expectedNetProceeds.minor, currency)}</td></tr>
      <tr><td>Expected profit</td><td className={signalClass(Number(result.scenario.expectedProfit.minor))}>{money(result.scenario.expectedProfit.minor, currency)}</td></tr>
      <tr><td>Buy Timing Outlook</td><td>{result.buyTiming.action}{result.buyTiming.bestWindowDays ? ` · ${result.buyTiming.bestWindowDays} DAYS` : ''}</td></tr>
    </tbody></table></section>

    <section className="panel"><h2>CONFIDENCE COMPONENTS</h2><table><thead><tr><th>COMPONENT</th><th>SCORE</th><th>WEIGHT</th><th>POINTS</th></tr></thead><tbody>
      {Object.entries(result.confidence.components).map(([key, value]) => <tr key={key}><td>{key}</td><td>{value.toFixed(4)}</td><td>{(result.confidence.weights[key as keyof typeof result.confidence.weights] * 100).toFixed(0)}%</td><td>{result.confidence.contributionPoints[key as keyof typeof result.confidence.contributionPoints].toFixed(2)}</td></tr>)}
    </tbody></table></section>

    {result.auction ? <section className="panel wide"><h2>AUCTION — NOT FINAL</h2><table><tbody>
      <tr><td>Current all-in / Deal Score</td><td>{money(result.auction.currentAllIn.minor, currency)} / {signed(result.auction.currentDealScore.score)}</td></tr>
      <tr><td>Projected close center / Deal Score</td><td>{result.auction.projectedClose ? `${money(result.auction.projectedClose.centerAllIn.minor, currency)} / ${signed(result.auction.projectedDealScore?.score ?? 0)}` : 'INSUFFICIENT EVIDENCE'}</td></tr>
    </tbody></table></section> : null}

    <section className="panel wide raw-comp-panel" id="raw-comps"><div className="panel-heading"><h2>RAW COMPARISON SALES</h2><span>INCLUDED {result.includedComps.length} · EXCLUDED {result.excludedComps.length} · TOTAL {result.rawComps.length}</span></div><div className="table-scroll"><table><thead><tr><th>ID / SOURCE</th><th>DATE</th><th>ALL-IN</th><th>MATCH</th><th>STATUS</th><th>REASONS / OVERRIDE</th></tr></thead><tbody>
      {result.rawComps.map((comp) => <tr key={comp.record.id}><td>{comp.record.id}<small>{comp.record.sourceLabel}</small></td><td>{comp.record.occurredAt}</td><td>{money(comp.observedAllIn.minor, currency)}</td><td>{comp.match.total.toFixed(2)}</td><td className={comp.included ? 'positive' : 'negative'}>{comp.included ? 'INCLUDED' : 'EXCLUDED'}</td><td>{comp.exclusionCodes.length ? comp.exclusionCodes.join(' · ') : 'EXACT / NEAR-EXACT'}{comp.overrideReason ? ` · OVERRIDE: ${comp.overrideReason}` : ''}</td></tr>)}
    </tbody></table></div></section>

    <section className="panel wide" id="calculation-tape"><div className="panel-heading"><h2>CALCULATION TAPE</h2><span>{result.calculationSteps.length} IMMUTABLE STEPS</span></div><div className="table-scroll"><table><thead><tr><th>SEQ</th><th>LABEL</th><th>FORMULA</th><th>OUTPUT</th></tr></thead><tbody>
      {result.calculationSteps.map((calculation) => <tr key={calculation.sequence}><td>{String(calculation.sequence).padStart(2, '0')}</td><td>{calculation.label}</td><td>{calculation.formula}</td><td>{outputText(calculation.output, calculation.unit, currency)}</td></tr>)}
    </tbody></table></div></section>

    <section className="panel wide terminal-actions" aria-label="Analysis actions"><a href="#calculation-tape">SHOW MATH</a><a href="#raw-comps">SHOW RAW DATA</a><Link href="/api/exports/analysis" prefetch={false}>EXPORT JSON</Link><Link href="/api/exports/analysis-raw" prefetch={false}>EXPORT RAW CSV</Link></section>
  </div>;
}
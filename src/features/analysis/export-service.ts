import type { DemoScope } from '@/lib/demo/policy';
import type { MarketSearchRow } from '@/features/search/query-compiler';
import type { AnalysisResult } from './run-analysis';

const demoWarning = 'DEMO / PLACEHOLDER DATA — NOT REAL MARKET DATA';

function authorize(ownerId: string, requestingUserId: string): void {
  if (ownerId !== requestingUserId) throw new Error('Not authorized to export this data');
}

function spreadsheetSafe(value: string): string {
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: unknown): string {
  let serialized: string;
  if (value === null || value === undefined) serialized = '';
  else if (typeof value === 'bigint') serialized = value.toString();
  else if (typeof value === 'object') serialized = JSON.stringify(value, bigintReplacer);
  else serialized = String(value);
  const safe = typeof value === 'string' ? spreadsheetSafe(serialized) : serialized;
  return `"${safe.replaceAll('"', '""')}"`;
}

function csv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return [headers.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n');
}

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function exportMarketRowsCsv({
  ownerId,
  requestingUserId,
  scope,
  rows,
}: {
  ownerId: string;
  requestingUserId: string;
  scope: DemoScope;
  rows: readonly MarketSearchRow[];
}): string {
  authorize(ownerId, requestingUserId);
  const scoped = rows.filter((row) => row.isDemo === (scope === 'DEMO_ONLY'));
  const headers = ['data_warning', 'id', 'player', 'year', 'card_number', 'parallel', 'grader', 'grade', 'all_in_minor', 'currency', 'deal_score', 'sell_timing_score', 'confidence', 'purchase_status', 'source', 'is_demo'];
  return csv(headers, scoped.map((row) => [
    row.isDemo ? demoWarning : '', row.id, row.playerName, row.year, row.cardNumber, row.parallel,
    row.gradingCompanyKey, row.grade, row.allInMinor, row.currency, row.dealScore, row.sellTimingScore,
    row.confidence, row.purchaseStatus, row.sourceKey, row.isDemo,
  ]));
}

function compCsv(analysis: AnalysisResult, status: 'RAW' | 'INCLUDED' | 'EXCLUDED'): string {
  const rows = status === 'RAW'
    ? analysis.rawComps
    : status === 'INCLUDED'
      ? analysis.includedComps
      : analysis.excludedComps;
  return csv(
    ['data_warning', 'analysis_id', 'formula_version', 'record_id', 'source_key', 'source_record_id', 'occurred_at', 'all_in_minor', 'currency', 'match_score', 'status', 'automated_included', 'manual_included', 'exclusion_codes', 'override_reason', 'is_demo'],
    rows.map((comp) => [
      analysis.isDemo ? demoWarning : '', analysis.analysisId, analysis.formulaVersion, comp.record.id,
      comp.record.sourceKey, comp.record.sourceRecordId, comp.record.occurredAt, comp.observedAllIn.minor,
      comp.observedAllIn.currency, comp.match.total, comp.included ? 'INCLUDED' : 'EXCLUDED',
      comp.automaticallyIncluded, comp.manuallyIncluded, comp.exclusionCodes.join('|'), comp.overrideReason,
      comp.record.isDemo,
    ]),
  );
}

export function exportAnalysisBundle({
  ownerId,
  requestingUserId,
  scope,
  analysis,
}: {
  ownerId: string;
  requestingUserId: string;
  scope: DemoScope;
  analysis: AnalysisResult;
}) {
  authorize(ownerId, requestingUserId);
  if (analysis.isDemo !== (scope === 'DEMO_ONLY')) throw new Error('Analysis scope does not match requested export scope');
  const json = JSON.stringify({
    dataWarning: analysis.isDemo ? demoWarning : null,
    exportedAt: analysis.cutoff,
    analysis,
  }, bigintReplacer, 2);
  return Object.freeze({
    manifest: Object.freeze({
      analysisId: analysis.analysisId,
      formulaVersion: analysis.formulaVersion,
      cutoff: analysis.cutoff,
      rawCount: analysis.rawComps.length,
      includedCount: analysis.includedComps.length,
      excludedCount: analysis.excludedComps.length,
      isDemo: analysis.isDemo,
    }),
    json,
    rawCompsCsv: compCsv(analysis, 'RAW'),
    includedCompsCsv: compCsv(analysis, 'INCLUDED'),
    excludedCompsCsv: compCsv(analysis, 'EXCLUDED'),
  });
}

export { demoWarning as exportDemoWarning };
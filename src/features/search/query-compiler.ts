import type { PurchaseStatus } from '@/features/portfolio/purchase-status';
import type { SearchFilters } from './filter-schema';

export type MarketSearchRow = Readonly<{
  id: string;
  isDemo: boolean;
  playerName: string;
  playerAliases: readonly string[];
  teamShown: string | null;
  currentTeam: string | null;
  position: string | null;
  conference: string | null;
  division: string | null;
  year: number | null;
  era: string | null;
  manufacturer: string | null;
  brand: string | null;
  setName: string | null;
  subset: string | null;
  cardNumber: string | null;
  rookie: boolean | null;
  playerStatus: string | null;
  parallel: string | null;
  serialDenominator: number | null;
  autograph: boolean | null;
  autographType: string | null;
  memorabilia: boolean | null;
  memorabiliaType: string | null;
  raw: boolean | null;
  gradingCompanyKey: string | null;
  grade: number | null;
  qualifier: string | null;
  population: number | null;
  certificationNumber: string | null;
  sourceKey: string;
  saleType: string;
  marketStatus: string;
  saleAt: string;
  allInMinor: bigint;
  currency: string;
  bidCount: number | null;
  daysOnMarket: number | null;
  matchScore: number | null;
  inclusionStatus: string;
  exclusionCodes: readonly string[];
  dealScore: number | null;
  sellTimingScore: number | null;
  confidence: number | null;
  liquidity: number | null;
  priceTrend: string | null;
  holdingDays: number | null;
  purchaseStatus: PurchaseStatus;
  owned: boolean;
  watched: boolean;
  profitMinor: bigint | null;
  roiBps: number | null;
  outcomeStatus: string | null;
}>;

function normalized(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function inList(value: string | null, allowed: readonly string[]): boolean {
  return allowed.length === 0 || (value !== null && allowed.some((candidate) => normalized(candidate) === normalized(value)));
}

function inNumberList(value: number | null, allowed: readonly number[]): boolean {
  return allowed.length === 0 || (value !== null && allowed.includes(value));
}

function inRange(value: number | bigint | null, range: { min?: number; max?: number } | undefined): boolean {
  if (!range) return true;
  if (value === null) return false;
  const comparable = typeof value === 'bigint' ? Number(value) : value;
  return (range.min === undefined || comparable >= range.min) && (range.max === undefined || comparable <= range.max);
}

function optionalBoolean(value: boolean | null, expected: boolean | undefined): boolean {
  return expected === undefined || value === expected;
}

function textSearchMatches(row: MarketSearchRow, query: string): boolean {
  const tokens = normalized(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = normalized([
    row.playerName,
    ...row.playerAliases,
    row.teamShown,
    row.currentTeam,
    row.position,
    row.year,
    row.manufacturer,
    row.brand,
    row.setName,
    row.subset,
    row.cardNumber,
    row.parallel,
    row.gradingCompanyKey,
    row.grade,
    row.certificationNumber,
    row.sourceKey,
    row.id,
  ].filter((value) => value !== null && value !== undefined).join(' '));
  return tokens.every((token) => haystack.includes(token));
}

function compareValues(left: unknown, right: unknown): number {
  if (left === right) return 0;
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;
  if (typeof left === 'bigint' && typeof right === 'bigint') return left < right ? -1 : 1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
}

export function compileSearch(filters: SearchFilters) {
  function matches(row: MarketSearchRow): boolean {
    const scopeMatches = filters.demoScope === 'DEMO_ONLY' ? row.isDemo : !row.isDemo;
    if (!scopeMatches || !textSearchMatches(row, filters.query)) return false;
    const rawStatus = row.raw === true ? 'RAW' : row.raw === false ? 'GRADED' : 'UNKNOWN';
    return inList(row.playerName, filters.players)
      && inList(row.teamShown, filters.teams)
      && inList(row.currentTeam, filters.currentTeams)
      && inList(row.position, filters.positions)
      && inList(row.conference, filters.conferences)
      && inList(row.division, filters.divisions)
      && inNumberList(row.year, filters.years)
      && inList(row.era, filters.eras)
      && inList(row.manufacturer, filters.manufacturers)
      && inList(row.brand, filters.brands)
      && inList(row.setName, filters.sets)
      && inList(row.subset, filters.subsets)
      && inList(row.cardNumber, filters.cardNumbers)
      && inList(row.playerStatus, filters.playerStatuses)
      && inList(row.parallel, filters.parallels)
      && inList(row.gradingCompanyKey, filters.graders)
      && inList(row.qualifier, filters.qualifiers)
      && inList(row.sourceKey, filters.sources)
      && inList(row.saleType, filters.saleTypes)
      && inList(row.marketStatus, filters.marketStatuses)
      && inList(row.currency, filters.currencies)
      && inList(row.inclusionStatus, filters.inclusionStatuses)
      && (filters.exclusionCodes.length === 0 || filters.exclusionCodes.some((code) => row.exclusionCodes.includes(code)))
      && (filters.purchaseStatuses.length === 0 || filters.purchaseStatuses.includes(row.purchaseStatus))
      && inList(row.priceTrend, filters.priceTrends)
      && inList(row.outcomeStatus, filters.outcomeStatuses)
      && inList(row.autographType, filters.autographTypes)
      && inList(row.memorabiliaType, filters.memorabiliaTypes)
      && (filters.rawOrGraded.length === 0 || filters.rawOrGraded.includes(rawStatus))
      && optionalBoolean(row.rookie, filters.rookie)
      && (filters.serialNumbered === undefined || (row.serialDenominator !== null) === filters.serialNumbered)
      && optionalBoolean(row.autograph, filters.autograph)
      && optionalBoolean(row.memorabilia, filters.memorabilia)
      && (filters.owned === undefined || row.owned === filters.owned)
      && (filters.watched === undefined || row.watched === filters.watched)
      && inRange(row.grade, filters.grades)
      && inRange(row.population, filters.population)
      && inRange(row.serialDenominator, filters.serialDenominator)
      && inRange(row.allInMinor, filters.allInMinor)
      && inRange(row.bidCount, filters.bidCount)
      && inRange(row.daysOnMarket, filters.daysOnMarket)
      && inRange(row.matchScore, filters.matchScore)
      && inRange(row.dealScore, filters.dealScore)
      && inRange(row.sellTimingScore, filters.sellTimingScore)
      && inRange(row.confidence, filters.confidence)
      && inRange(row.liquidity, filters.liquidity)
      && inRange(row.holdingDays, filters.holdingDays)
      && inRange(row.profitMinor, filters.profitMinor)
      && inRange(row.roiBps, filters.roiBps)
      && (!filters.saleDateFrom || Date.parse(row.saleAt) >= Date.parse(filters.saleDateFrom))
      && (!filters.saleDateTo || Date.parse(row.saleAt) <= Date.parse(filters.saleDateTo));
  }

  function sortRows(rows: readonly MarketSearchRow[]): MarketSearchRow[] {
    return [...rows].sort((left, right) => {
      for (const sort of filters.sort) {
        const compared = compareValues(left[sort.field as keyof MarketSearchRow], right[sort.field as keyof MarketSearchRow]);
        if (compared !== 0) return sort.direction === 'asc' ? compared : -compared;
      }
      return left.id.localeCompare(right.id);
    });
  }

  return Object.freeze({
    scope: filters.demoScope,
    matches,
    filter: (rows: readonly MarketSearchRow[]) => sortRows(rows.filter(matches)),
    sortRows,
  });
}
import { z } from 'zod';
import { purchaseStatuses } from '@/features/portfolio/purchase-status';

function rangeSchema(label: string) {
  return z.object({ min: z.number().finite().optional(), max: z.number().finite().optional() })
    .superRefine((range, context) => {
      if (range.min !== undefined && range.max !== undefined && range.min > range.max) {
        context.addIssue({ code: 'custom', message: `${label} minimum cannot exceed maximum` });
      }
    });
}

const stringList = z.array(z.string().trim().min(1)).default([]);
const numberList = z.array(z.number().finite()).default([]);
const sortItem = z.object({
  field: z.string().min(1),
  direction: z.enum(['asc', 'desc']),
});

export const searchFiltersSchema = z.object({
  query: z.string().trim().default(''),
  demoScope: z.enum(['REAL_ONLY', 'DEMO_ONLY']).default('DEMO_ONLY'),
  players: stringList,
  teams: stringList,
  currentTeams: stringList,
  positions: stringList,
  conferences: stringList,
  divisions: stringList,
  years: numberList,
  eras: stringList,
  manufacturers: stringList,
  brands: stringList,
  sets: stringList,
  subsets: stringList,
  cardNumbers: stringList,
  playerStatuses: stringList,
  parallels: stringList,
  graders: stringList,
  qualifiers: stringList,
  sources: stringList,
  saleTypes: stringList,
  marketStatuses: stringList,
  currencies: stringList,
  locations: stringList,
  inclusionStatuses: stringList,
  exclusionCodes: stringList,
  purchaseStatuses: z.array(z.enum(purchaseStatuses)).default([]),
  priceTrends: stringList,
  outcomeStatuses: stringList,
  autographTypes: stringList,
  memorabiliaTypes: stringList,
  rawOrGraded: z.array(z.enum(['RAW', 'GRADED', 'UNKNOWN'])).default([]),
  rookie: z.boolean().optional(),
  serialNumbered: z.boolean().optional(),
  autograph: z.boolean().optional(),
  memorabilia: z.boolean().optional(),
  owned: z.boolean().optional(),
  watched: z.boolean().optional(),
  grades: rangeSchema('grades').optional(),
  population: rangeSchema('population').optional(),
  serialDenominator: rangeSchema('serialDenominator').optional(),
  allInMinor: rangeSchema('allInMinor').optional(),
  bidCount: rangeSchema('bidCount').optional(),
  daysOnMarket: rangeSchema('daysOnMarket').optional(),
  matchScore: rangeSchema('matchScore').optional(),
  dealScore: rangeSchema('dealScore').optional(),
  sellTimingScore: rangeSchema('sellTimingScore').optional(),
  confidence: rangeSchema('confidence').optional(),
  liquidity: rangeSchema('liquidity').optional(),
  holdingDays: rangeSchema('holdingDays').optional(),
  profitMinor: rangeSchema('profitMinor').optional(),
  roiBps: rangeSchema('roiBps').optional(),
  saleDateFrom: z.string().datetime({ offset: true }).optional(),
  saleDateTo: z.string().datetime({ offset: true }).optional(),
  sort: z.array(sortItem).default([]),
  visibleColumns: stringList,
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

export function parseSearchFilters(input: unknown): SearchFilters {
  return searchFiltersSchema.parse(input);
}

export function serializeSearchFilters(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set('filters', JSON.stringify(filters));
  return params;
}

export function parseSearchParams(params: URLSearchParams): SearchFilters {
  const encoded = params.get('filters');
  if (!encoded) return parseSearchFilters({});
  try {
    return parseSearchFilters(JSON.parse(encoded));
  } catch (error) {
    if (error instanceof z.ZodError) throw error;
    throw new Error('Invalid serialized search filters');
  }
}
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default(''),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  displayName: text('display_name').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('auth_sessions_user_idx').on(table.userId), index('auth_sessions_expires_idx').on(table.expiresAt)],
);

export const authAccounts = pgTable(
  'auth_accounts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('auth_accounts_provider_account_idx').on(table.providerId, table.accountId),
    index('auth_accounts_user_idx').on(table.userId),
  ],
);

export const authVerifications = pgTable(
  'auth_verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('auth_verifications_identifier_idx').on(table.identifier)],
);

export const players = pgTable(
  'players',
  {
    id: text('id').primaryKey(),
    canonicalName: text('canonical_name').notNull(),
    aliases: jsonb('aliases').$type<string[]>().notNull().default([]),
    position: text('position'),
    status: text('status'),
    hallOfFame: boolean('hall_of_fame').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('players_name_idx').on(table.canonicalName), index('players_position_idx').on(table.position)],
);

export const teams = pgTable(
  'teams',
  {
    id: text('id').primaryKey(),
    canonicalName: text('canonical_name').notNull(),
    abbreviation: text('abbreviation'),
    conference: text('conference'),
    division: text('division'),
    active: boolean('active').notNull().default(true),
  },
  (table) => [uniqueIndex('teams_name_idx').on(table.canonicalName), index('teams_abbreviation_idx').on(table.abbreviation)],
);

export const playerTeamHistory = pgTable(
  'player_team_history',
  {
    id: text('id').primaryKey(),
    playerId: text('player_id').notNull().references(() => players.id),
    teamId: text('team_id').notNull().references(() => teams.id),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => [index('player_team_history_player_time_idx').on(table.playerId, table.startedAt)],
);

export const gradingCompanies = pgTable('grading_companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  aliases: jsonb('aliases').$type<string[]>().notNull().default([]),
  active: boolean('active').notNull().default(true),
  scaleMax: numeric('scale_max', { precision: 6, scale: 3 }),
  supportsHalfGrades: boolean('supports_half_grades').notNull().default(false),
  certificationUrlPattern: text('certification_url_pattern'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const gradesAndScales = pgTable(
  'grades_and_scales',
  {
    id: text('id').primaryKey(),
    gradingCompanyId: text('grading_company_id').notNull().references(() => gradingCompanies.id),
    label: text('label').notNull(),
    numericValue: numeric('numeric_value', { precision: 6, scale: 3 }),
    qualifier: text('qualifier'),
    active: boolean('active').notNull().default(true),
  },
  (table) => [uniqueIndex('grades_company_label_idx').on(table.gradingCompanyId, table.label)],
);

export const cardCatalogItems = pgTable(
  'card_catalog_items',
  {
    id: text('id').primaryKey(),
    sport: text('sport').notNull().default('football'),
    playerId: text('player_id').references(() => players.id),
    teamShownId: text('team_shown_id').references(() => teams.id),
    year: integer('year'),
    manufacturer: text('manufacturer'),
    brand: text('brand'),
    setName: text('set_name'),
    subset: text('subset'),
    cardNumber: text('card_number'),
    parallel: text('parallel'),
    serialDenominator: integer('serial_denominator'),
    rookie: boolean('rookie').notNull().default(false),
    autograph: boolean('autograph').notNull().default(false),
    memorabilia: boolean('memorabilia').notNull().default(false),
    identity: jsonb('identity').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('card_catalog_player_year_idx').on(table.playerId, table.year),
    index('card_catalog_set_number_idx').on(table.setName, table.cardNumber),
    index('card_catalog_team_idx').on(table.teamShownId),
  ],
);

export const cardAliases = pgTable(
  'card_aliases',
  {
    id: text('id').primaryKey(),
    cardCatalogItemId: text('card_catalog_item_id').notNull().references(() => cardCatalogItems.id),
    alias: text('alias').notNull(),
    aliasType: text('alias_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('card_aliases_alias_idx').on(table.alias)],
);

export const marketSources = pgTable('market_sources', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  connectionStatus: text('connection_status').notNull(),
  adapterVersion: text('adapter_version'),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  lastSuccessfulRefreshAt: timestamp('last_successful_refresh_at', { withTimezone: true }),
  statusMessage: text('status_message').notNull().default(''),
  active: boolean('active').notNull().default(true),
});

export const sourceCredentialsMetadata = pgTable(
  'source_credentials_metadata',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    sourceKey: text('source_key').notNull().references(() => marketSources.key),
    credentialReference: text('credential_reference').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('source_credentials_user_source_idx').on(table.userId, table.sourceKey)],
);

export const rawImportBatches = pgTable(
  'raw_import_batches',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    sourceKey: text('source_key').notNull().references(() => marketSources.key),
    fileName: text('file_name'),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedCount: integer('accepted_count').notNull().default(0),
    rejectedCount: integer('rejected_count').notNull().default(0),
    duplicateCount: integer('duplicate_count').notNull().default(0),
    isDemo: boolean('is_demo').notNull().default(false),
  },
  (table) => [index('raw_import_batches_user_demo_idx').on(table.userId, table.isDemo)],
);

export const rawMarketRecords = pgTable(
  'raw_market_records',
  {
    id: text('id').primaryKey(),
    batchId: text('batch_id').notNull().references(() => rawImportBatches.id),
    userId: text('user_id').notNull().references(() => users.id),
    sourceKey: text('source_key').notNull().references(() => marketSources.key),
    sourceRecordId: text('source_record_id'),
    rowNumber: integer('row_number').notNull(),
    raw: jsonb('raw').$type<Record<string, unknown>>().notNull(),
    contentFingerprint: text('content_fingerprint').notNull(),
    accepted: boolean('accepted').notNull().default(false),
    errorCodes: jsonb('error_codes').$type<string[]>().notNull().default([]),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
    isDemo: boolean('is_demo').notNull().default(false),
  },
  (table) => [
    index('raw_market_batch_row_idx').on(table.batchId, table.rowNumber),
    index('raw_market_source_record_idx').on(table.sourceKey, table.sourceRecordId),
    index('raw_market_fingerprint_idx').on(table.contentFingerprint),
    index('raw_market_user_demo_idx').on(table.userId, table.isDemo),
  ],
);

export const duplicateGroups = pgTable('duplicate_groups', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  reason: text('reason').notNull(),
  canonicalRecordId: text('canonical_record_id').references(() => rawMarketRecords.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  isDemo: boolean('is_demo').notNull().default(false),
});

export const normalizedMarketRecords = pgTable(
  'normalized_market_records',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    rawMarketRecordId: text('raw_market_record_id').references(() => rawMarketRecords.id),
    cardCatalogItemId: text('card_catalog_item_id').references(() => cardCatalogItems.id),
    duplicateGroupId: text('duplicate_group_id').references(() => duplicateGroups.id),
    sourceKey: text('source_key').notNull().references(() => marketSources.key),
    sourceRecordId: text('source_record_id'),
    sourceLabel: text('source_label').notNull(),
    originalUrl: text('original_url'),
    listingTitle: text('listing_title').notNull(),
    status: text('status').notNull(),
    saleType: text('sale_type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
    freshnessAt: timestamp('freshness_at', { withTimezone: true }).notNull(),
    timezone: text('timezone').notNull(),
    salePriceMinor: bigint('sale_price_minor', { mode: 'bigint' }).notNull(),
    shippingMinor: bigint('shipping_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    buyerPremiumMinor: bigint('buyer_premium_minor', { mode: 'bigint' }).notNull().default(sql`0`),
    taxMinor: bigint('tax_minor', { mode: 'bigint' }),
    currency: text('currency').notNull(),
    gradingCompanyId: text('grading_company_id').references(() => gradingCompanies.id),
    grade: numeric('grade', { precision: 6, scale: 3 }),
    fingerprint: text('fingerprint').notNull(),
    raw: jsonb('raw').$type<Record<string, unknown>>().notNull(),
    isDemo: boolean('is_demo').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('normalized_market_user_demo_idx').on(table.userId, table.isDemo),
    index('normalized_market_source_time_idx').on(table.sourceKey, table.occurredAt),
    index('normalized_market_card_idx').on(table.cardCatalogItemId),
    index('normalized_market_grader_grade_idx').on(table.gradingCompanyId, table.grade),
    index('normalized_market_fingerprint_idx').on(table.fingerprint),
    uniqueIndex('normalized_market_owner_source_record_idx').on(table.userId, table.isDemo, table.sourceKey, table.sourceRecordId).where(sql`${table.sourceRecordId} is not null and ${table.deletedAt} is null`),
    uniqueIndex('normalized_market_owner_fingerprint_idx').on(table.userId, table.isDemo, table.fingerprint).where(sql`${table.deletedAt} is null`),
  ],
);

export const formulaVersions = pgTable('formula_versions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  definition: jsonb('definition').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const analyses = pgTable(
  'analyses',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    cardCatalogItemId: text('card_catalog_item_id').references(() => cardCatalogItems.id),
    formulaVersionId: text('formula_version_id').notNull().references(() => formulaVersions.id),
    cutoff: timestamp('cutoff', { withTimezone: true }).notNull(),
    currentPriceMinor: bigint('current_price_minor', { mode: 'bigint' }).notNull(),
    currency: text('currency').notNull(),
    inputSnapshot: jsonb('input_snapshot').$type<Record<string, unknown>>().notNull().default({}),
    result: jsonb('result').$type<Record<string, unknown>>().notNull(),
    idempotencyKey: text('idempotency_key'),
    requestHash: text('request_hash'),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('analyses_user_cutoff_idx').on(table.userId, table.cutoff), index('analyses_demo_idx').on(table.isDemo), uniqueIndex('analyses_user_idempotency_idx').on(table.userId, table.idempotencyKey)],
);

export const compMatchResults = pgTable(
  'comp_match_results',
  {
    id: text('id').primaryKey(),
    analysisId: text('analysis_id').notNull().references(() => analyses.id),
    marketRecordId: text('market_record_id').notNull().references(() => normalizedMarketRecords.id),
    formulaVersionId: text('formula_version_id').notNull().references(() => formulaVersions.id),
    totalScore: numeric('total_score', { precision: 6, scale: 4 }).notNull(),
    components: jsonb('components').$type<Record<string, number>>().notNull(),
    eligibility: text('eligibility').notNull(),
    exclusionCodes: jsonb('exclusion_codes').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('comp_match_analysis_record_idx').on(table.analysisId, table.marketRecordId)],
);

export const compExclusions = pgTable(
  'comp_exclusions',
  {
    id: text('id').primaryKey(),
    analysisId: text('analysis_id').notNull().references(() => analyses.id),
    marketRecordId: text('market_record_id').notNull().references(() => normalizedMarketRecords.id),
    automatedIncluded: boolean('automated_included').notNull(),
    currentIncluded: boolean('current_included').notNull(),
    exclusionCode: text('exclusion_code'),
    explanation: text('explanation').notNull(),
    overriddenByUserId: text('overridden_by_user_id').references(() => users.id),
    overrideReason: text('override_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('comp_exclusions_analysis_included_idx').on(table.analysisId, table.currentIncluded)],
);

export const adjustmentRules = pgTable('adjustment_rules', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  factor: numeric('factor', { precision: 12, scale: 6 }).notNull(),
  evidence: jsonb('evidence').$type<Record<string, unknown>>().notNull(),
  activeFrom: timestamp('active_from', { withTimezone: true }).notNull(),
  activeTo: timestamp('active_to', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const feeSchedules = pgTable(
  'fee_schedules',
  {
    id: text('id').primaryKey(),
    sourceKey: text('source_key').notNull().references(() => marketSources.key),
    name: text('name').notNull(),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
    effectiveTo: timestamp('effective_to', { withTimezone: true }),
    rules: jsonb('rules').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('fee_schedules_source_effective_idx').on(table.sourceKey, table.effectiveFrom)],
);

export const currencyRates = pgTable(
  'currency_rates',
  {
    id: text('id').primaryKey(),
    baseCurrency: text('base_currency').notNull(),
    quoteCurrency: text('quote_currency').notNull(),
    rate: numeric('rate', { precision: 24, scale: 12 }).notNull(),
    effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull(),
    source: text('source').notNull(),
  },
  (table) => [uniqueIndex('currency_rates_pair_time_idx').on(table.baseCurrency, table.quoteCurrency, table.effectiveAt)],
);

export const marketEvents = pgTable(
  'market_events',
  {
    id: text('id').primaryKey(),
    playerId: text('player_id').references(() => players.id),
    teamId: text('team_id').references(() => teams.id),
    eventType: text('event_type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    knownAt: timestamp('known_at', { withTimezone: true }).notNull(),
    evidence: jsonb('evidence').$type<Record<string, unknown>>().notNull(),
    speculative: boolean('speculative').notNull().default(false),
    isDemo: boolean('is_demo').notNull().default(false),
  },
  (table) => [index('market_events_player_known_idx').on(table.playerId, table.knownAt)],
);

export const analysisComps = pgTable(
  'analysis_comps',
  {
    id: text('id').primaryKey(),
    analysisId: text('analysis_id').notNull().references(() => analyses.id),
    marketRecordId: text('market_record_id').notNull().references(() => normalizedMarketRecords.id),
    matchResultId: text('match_result_id').references(() => compMatchResults.id),
    included: boolean('included').notNull(),
    normalizedPriceMinor: bigint('normalized_price_minor', { mode: 'bigint' }),
    weight: numeric('weight', { precision: 18, scale: 8 }),
    adjustmentFactors: jsonb('adjustment_factors').$type<Record<string, number>>().notNull().default({}),
  },
  (table) => [uniqueIndex('analysis_comps_analysis_record_idx').on(table.analysisId, table.marketRecordId)],
);

/** Immutable manual/CSV evidence snapshot used for a particular analysis. */
export const analysisEvidence = pgTable(
  'analysis_evidence',
  {
    id: text('id').primaryKey(),
    analysisId: text('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
    sourceKind: text('source_kind').notNull(),
    evidenceSnapshot: jsonb('evidence_snapshot').$type<Record<string, unknown>>().notNull(),
    included: boolean('included').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('analysis_evidence_analysis_idx').on(table.analysisId)],
);

export const calculationSteps = pgTable(
  'calculation_steps',
  {
    id: text('id').primaryKey(),
    analysisId: text('analysis_id').notNull().references(() => analyses.id),
    sequence: integer('sequence').notNull(),
    key: text('key').notNull(),
    label: text('label').notNull(),
    formula: text('formula').notNull(),
    inputs: jsonb('inputs').$type<Record<string, unknown>>().notNull(),
    output: jsonb('output').$type<unknown>().notNull(),
    unit: text('unit').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('calculation_steps_analysis_sequence_idx').on(table.analysisId, table.sequence)],
);

export const forecasts = pgTable(
  'forecasts',
  {
    id: text('id').primaryKey(),
    analysisId: text('analysis_id').notNull().references(() => analyses.id),
    horizonDays: integer('horizon_days').notNull(),
    lowMinor: bigint('low_minor', { mode: 'bigint' }),
    centerMinor: bigint('center_minor', { mode: 'bigint' }),
    highMinor: bigint('high_minor', { mode: 'bigint' }),
    currency: text('currency').notNull(),
    sellTimingScore: integer('sell_timing_score'),
    confidencePercent: integer('confidence_percent').notNull(),
    evidenceIds: jsonb('evidence_ids').$type<string[]>().notNull(),
    cutoff: timestamp('cutoff', { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex('forecasts_analysis_horizon_idx').on(table.analysisId, table.horizonDays)],
);

export const predictionSnapshots = pgTable(
  'prediction_snapshots',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    analysisId: text('analysis_id').notNull().references(() => analyses.id),
    formulaVersionId: text('formula_version_id').notNull().references(() => formulaVersions.id),
    predictionCutoff: timestamp('prediction_cutoff', { withTimezone: true }).notNull(),
    evidenceIds: jsonb('evidence_ids').$type<string[]>().notNull(),
    input: jsonb('input').$type<Record<string, unknown>>().notNull(),
    result: jsonb('result').$type<Record<string, unknown>>().notNull(),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('prediction_snapshot_user_cutoff_idx').on(table.userId, table.predictionCutoff),
    index('prediction_snapshot_demo_idx').on(table.isDemo),
  ],
);

export const userDecisions = pgTable(
  'user_decisions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    predictionSnapshotId: text('prediction_snapshot_id').notNull().references(() => predictionSnapshots.id),
    purchaseStatus: text('purchase_status').notNull().default('UNDECIDED'),
    intendedMaximumMinor: bigint('intended_maximum_minor', { mode: 'bigint' }),
    currency: text('currency'),
    reason: text('reason'),
    decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
    isDemo: boolean('is_demo').notNull().default(false),
  },
  (table) => [
    check(
      'user_decisions_purchase_status_check',
      sql`${table.purchaseStatus} in ('UNDECIDED', 'PURCHASED', 'PASSED', 'MISSED', 'CANCELLED')`,
    ),
    index('user_decisions_user_status_idx').on(table.userId, table.purchaseStatus),
    index('user_decisions_demo_idx').on(table.isDemo),
    index('user_decisions_owner_snapshot_idx').on(table.userId, table.isDemo, table.predictionSnapshotId),
  ],
);

export const watchlistItems = pgTable(
  'watchlist_items',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    cardCatalogItemId: text('card_catalog_item_id').references(() => cardCatalogItems.id),
    marketRecordId: text('market_record_id').references(() => normalizedMarketRecords.id),
    notes: text('notes'),
    isStarred: boolean('is_starred').notNull().default(false),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('watchlist_user_demo_idx').on(table.userId, table.isDemo)],
);

export const userSettings = pgTable('user_settings', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  targetRoiBps: integer('target_roi_bps').notNull().default(1_500),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const portfolioHoldings = pgTable(
  'portfolio_holdings',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    cardCatalogItemId: text('card_catalog_item_id').notNull().references(() => cardCatalogItems.id),
    predictionSnapshotId: text('prediction_snapshot_id').references(() => predictionSnapshots.id),
    acquiredAt: timestamp('acquired_at', { withTimezone: true }).notNull(),
    costBasisMinor: bigint('cost_basis_minor', { mode: 'bigint' }).notNull(),
    currency: text('currency').notNull(),
    quantity: integer('quantity').notNull().default(1),
    isDemo: boolean('is_demo').notNull().default(false),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (table) => [index('portfolio_holdings_user_demo_idx').on(table.userId, table.isDemo), index('portfolio_holdings_open_owner_idx').on(table.userId, table.isDemo, table.closedAt)],
);

export const transactions = pgTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    holdingId: text('holding_id').references(() => portfolioHoldings.id),
    decisionId: text('decision_id').references(() => userDecisions.id),
    transactionType: text('transaction_type').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: text('currency').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    source: text('source').notNull(),
    idempotencyKey: text('idempotency_key'),
    notes: text('notes'),
    reversesTransactionId: text('reverses_transaction_id'),
    isDemo: boolean('is_demo').notNull().default(false),
  },
  (table) => [
    index('transactions_user_time_idx').on(table.userId, table.occurredAt),
    index('transactions_demo_idx').on(table.isDemo),
    index('transactions_owner_holding_type_idx').on(table.userId, table.isDemo, table.holdingId, table.transactionType),
    uniqueIndex('transactions_user_idempotency_idx').on(table.userId, table.idempotencyKey),
    uniqueIndex('transactions_reversal_once_idx').on(table.reversesTransactionId),
  ],
);

export const expenses = pgTable(
  'expenses',
  {
    id: text('id').primaryKey(),
    transactionId: text('transaction_id').notNull().references(() => transactions.id),
    expenseType: text('expense_type').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: text('currency').notNull(),
    notes: text('notes'),
  },
  (table) => [index('expenses_transaction_idx').on(table.transactionId)],
);

export const outcomeEvaluations = pgTable(
  'outcome_evaluations',
  {
    id: text('id').primaryKey(),
    predictionSnapshotId: text('prediction_snapshot_id').notNull().references(() => predictionSnapshots.id),
    decisionId: text('decision_id').references(() => userDecisions.id),
    horizonDays: integer('horizon_days').notNull(),
    status: text('status').notNull(),
    evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).notNull(),
    actualMarketValueMinor: bigint('actual_market_value_minor', { mode: 'bigint' }),
    realizedProfitMinor: bigint('realized_profit_minor', { mode: 'bigint' }),
    counterfactualProfitMinor: bigint('counterfactual_profit_minor', { mode: 'bigint' }),
    currency: text('currency'),
    metrics: jsonb('metrics').$type<Record<string, unknown>>().notNull(),
    isDemo: boolean('is_demo').notNull().default(false),
  },
  (table) => [uniqueIndex('outcomes_snapshot_horizon_idx').on(table.predictionSnapshotId, table.horizonDays)],
);

export const alerts = pgTable(
  'alerts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    predictionSnapshotId: text('prediction_snapshot_id').references(() => predictionSnapshots.id),
    alertType: text('alert_type').notNull(),
    threshold: jsonb('threshold').$type<Record<string, unknown>>().notNull(),
    triggeredAt: timestamp('triggered_at', { withTimezone: true }),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    isDemo: boolean('is_demo').notNull().default(false),
  },
  (table) => [index('alerts_user_triggered_idx').on(table.userId, table.triggeredAt)],
);

export const savedSearches = pgTable(
  'saved_searches',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    name: text('name').notNull(),
    query: text('query').notNull().default(''),
    filters: jsonb('filters').$type<Record<string, unknown>>().notNull(),
    demoScope: text('demo_scope').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('saved_searches_user_name_idx').on(table.userId, table.name)],
);

export const filterPresets = pgTable(
  'filter_presets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    name: text('name').notNull(),
    filters: jsonb('filters').$type<Record<string, unknown>>().notNull(),
    sort: jsonb('sort').$type<unknown[]>().notNull().default([]),
    visibleColumns: jsonb('visible_columns').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('filter_presets_user_name_idx').on(table.userId, table.name)],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    eventType: text('event_type').notNull(),
    oldValue: jsonb('old_value').$type<unknown>(),
    newValue: jsonb('new_value').$type<unknown>(),
    reason: text('reason'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    isDemo: boolean('is_demo').notNull().default(false),
  },
  (table) => [index('audit_log_entity_time_idx').on(table.entityType, table.entityId, table.occurredAt)],
);

export const schemaEntities = {
  users,
  authSessions,
  authAccounts,
  authVerifications,
  players,
  teams,
  playerTeamHistory,
  cardCatalogItems,
  cardAliases,
  gradingCompanies,
  gradesAndScales,
  marketSources,
  sourceCredentialsMetadata,
  rawImportBatches,
  rawMarketRecords,
  normalizedMarketRecords,
  duplicateGroups,
  compMatchResults,
  compExclusions,
  adjustmentRules,
  feeSchedules,
  currencyRates,
  marketEvents,
  analyses,
  analysisComps,
  analysisEvidence,
  calculationSteps,
  forecasts,
  predictionSnapshots,
  userDecisions,
  watchlistItems,
  userSettings,
  portfolioHoldings,
  transactions,
  expenses,
  outcomeEvaluations,
  alerts,
  savedSearches,
  filterPresets,
  auditLog,
  formulaVersions,
} as const;

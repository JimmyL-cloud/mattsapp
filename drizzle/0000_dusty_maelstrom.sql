CREATE TABLE "adjustment_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"factor" numeric(12, 6) NOT NULL,
	"evidence" jsonb NOT NULL,
	"active_from" timestamp with time zone NOT NULL,
	"active_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"prediction_snapshot_id" text,
	"alert_type" text NOT NULL,
	"threshold" jsonb NOT NULL,
	"triggered_at" timestamp with time zone,
	"acknowledged_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"card_catalog_item_id" text,
	"formula_version_id" text NOT NULL,
	"cutoff" timestamp with time zone NOT NULL,
	"current_price_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"result" jsonb NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis_comps" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"market_record_id" text NOT NULL,
	"match_result_id" text,
	"included" boolean NOT NULL,
	"normalized_price_minor" bigint,
	"weight" numeric(18, 8),
	"adjustment_factors" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"event_type" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calculation_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"formula" text NOT NULL,
	"inputs" jsonb NOT NULL,
	"output" jsonb NOT NULL,
	"unit" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_aliases" (
	"id" text PRIMARY KEY NOT NULL,
	"card_catalog_item_id" text NOT NULL,
	"alias" text NOT NULL,
	"alias_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_catalog_items" (
	"id" text PRIMARY KEY NOT NULL,
	"sport" text DEFAULT 'football' NOT NULL,
	"player_id" text,
	"team_shown_id" text,
	"year" integer,
	"manufacturer" text,
	"brand" text,
	"set_name" text,
	"subset" text,
	"card_number" text,
	"parallel" text,
	"serial_denominator" integer,
	"rookie" boolean DEFAULT false NOT NULL,
	"autograph" boolean DEFAULT false NOT NULL,
	"memorabilia" boolean DEFAULT false NOT NULL,
	"identity" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "comp_exclusions" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"market_record_id" text NOT NULL,
	"automated_included" boolean NOT NULL,
	"current_included" boolean NOT NULL,
	"exclusion_code" text,
	"explanation" text NOT NULL,
	"overridden_by_user_id" text,
	"override_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comp_match_results" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"market_record_id" text NOT NULL,
	"formula_version_id" text NOT NULL,
	"total_score" numeric(6, 4) NOT NULL,
	"components" jsonb NOT NULL,
	"eligibility" text NOT NULL,
	"exclusion_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currency_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"base_currency" text NOT NULL,
	"quote_currency" text NOT NULL,
	"rate" numeric(24, 12) NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duplicate_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"reason" text NOT NULL,
	"canonical_record_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"expense_type" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "fee_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"source_key" text NOT NULL,
	"name" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"rules" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filter_presets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"sort" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visible_columns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forecasts" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"horizon_days" integer NOT NULL,
	"low_minor" bigint,
	"center_minor" bigint,
	"high_minor" bigint,
	"currency" text NOT NULL,
	"sell_timing_score" integer,
	"confidence_percent" integer NOT NULL,
	"evidence_ids" jsonb NOT NULL,
	"cutoff" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formula_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"definition" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grades_and_scales" (
	"id" text PRIMARY KEY NOT NULL,
	"grading_company_id" text NOT NULL,
	"label" text NOT NULL,
	"numeric_value" numeric(6, 3),
	"qualifier" text,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grading_companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"scale_max" numeric(6, 3),
	"supports_half_grades" boolean DEFAULT false NOT NULL,
	"certification_url_pattern" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_events" (
	"id" text PRIMARY KEY NOT NULL,
	"player_id" text,
	"team_id" text,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"known_at" timestamp with time zone NOT NULL,
	"evidence" jsonb NOT NULL,
	"speculative" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_sources" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"connection_status" text NOT NULL,
	"adapter_version" text,
	"last_attempt_at" timestamp with time zone,
	"last_successful_refresh_at" timestamp with time zone,
	"status_message" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "normalized_market_records" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"raw_market_record_id" text,
	"card_catalog_item_id" text,
	"duplicate_group_id" text,
	"source_key" text NOT NULL,
	"source_record_id" text,
	"source_label" text NOT NULL,
	"original_url" text,
	"listing_title" text NOT NULL,
	"status" text NOT NULL,
	"sale_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"freshness_at" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"sale_price_minor" bigint NOT NULL,
	"shipping_minor" bigint DEFAULT 0 NOT NULL,
	"buyer_premium_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint,
	"currency" text NOT NULL,
	"grading_company_id" text,
	"grade" numeric(6, 3),
	"fingerprint" text NOT NULL,
	"raw" jsonb NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outcome_evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"prediction_snapshot_id" text NOT NULL,
	"decision_id" text,
	"horizon_days" integer NOT NULL,
	"status" text NOT NULL,
	"evaluated_at" timestamp with time zone NOT NULL,
	"actual_market_value_minor" bigint,
	"realized_profit_minor" bigint,
	"counterfactual_profit_minor" bigint,
	"currency" text,
	"metrics" jsonb NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_team_history" (
	"id" text PRIMARY KEY NOT NULL,
	"player_id" text NOT NULL,
	"team_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"canonical_name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" text,
	"status" text,
	"hall_of_fame" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_holdings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"card_catalog_item_id" text NOT NULL,
	"prediction_snapshot_id" text,
	"acquired_at" timestamp with time zone NOT NULL,
	"cost_basis_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "prediction_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"analysis_id" text NOT NULL,
	"formula_version_id" text NOT NULL,
	"prediction_cutoff" timestamp with time zone NOT NULL,
	"evidence_ids" jsonb NOT NULL,
	"input" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_import_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_key" text NOT NULL,
	"file_name" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_market_records" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"user_id" text NOT NULL,
	"source_key" text NOT NULL,
	"source_record_id" text,
	"row_number" integer NOT NULL,
	"raw" jsonb NOT NULL,
	"content_fingerprint" text NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	"error_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"query" text DEFAULT '' NOT NULL,
	"filters" jsonb NOT NULL,
	"demo_scope" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_credentials_metadata" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_key" text NOT NULL,
	"credential_reference" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"canonical_name" text NOT NULL,
	"abbreviation" text,
	"conference" text,
	"division" text,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"holding_id" text,
	"decision_id" text,
	"transaction_type" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"notes" text,
	"reverses_transaction_id" text,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"prediction_snapshot_id" text NOT NULL,
	"purchase_status" text DEFAULT 'UNDECIDED' NOT NULL,
	"intended_maximum_minor" bigint,
	"currency" text,
	"reason" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_decisions_purchase_status_check" CHECK ("user_decisions"."purchase_status" in ('UNDECIDED', 'PURCHASED', 'PASSED', 'MISSED', 'CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"display_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"card_catalog_item_id" text,
	"market_record_id" text,
	"notes" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "adjustment_rules" ADD CONSTRAINT "adjustment_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_prediction_snapshot_id_prediction_snapshots_id_fk" FOREIGN KEY ("prediction_snapshot_id") REFERENCES "public"."prediction_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_card_catalog_item_id_card_catalog_items_id_fk" FOREIGN KEY ("card_catalog_item_id") REFERENCES "public"."card_catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_formula_version_id_formula_versions_id_fk" FOREIGN KEY ("formula_version_id") REFERENCES "public"."formula_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_comps" ADD CONSTRAINT "analysis_comps_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_comps" ADD CONSTRAINT "analysis_comps_market_record_id_normalized_market_records_id_fk" FOREIGN KEY ("market_record_id") REFERENCES "public"."normalized_market_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_comps" ADD CONSTRAINT "analysis_comps_match_result_id_comp_match_results_id_fk" FOREIGN KEY ("match_result_id") REFERENCES "public"."comp_match_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculation_steps" ADD CONSTRAINT "calculation_steps_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_aliases" ADD CONSTRAINT "card_aliases_card_catalog_item_id_card_catalog_items_id_fk" FOREIGN KEY ("card_catalog_item_id") REFERENCES "public"."card_catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_catalog_items" ADD CONSTRAINT "card_catalog_items_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_catalog_items" ADD CONSTRAINT "card_catalog_items_team_shown_id_teams_id_fk" FOREIGN KEY ("team_shown_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comp_exclusions" ADD CONSTRAINT "comp_exclusions_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comp_exclusions" ADD CONSTRAINT "comp_exclusions_market_record_id_normalized_market_records_id_fk" FOREIGN KEY ("market_record_id") REFERENCES "public"."normalized_market_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comp_exclusions" ADD CONSTRAINT "comp_exclusions_overridden_by_user_id_users_id_fk" FOREIGN KEY ("overridden_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comp_match_results" ADD CONSTRAINT "comp_match_results_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comp_match_results" ADD CONSTRAINT "comp_match_results_market_record_id_normalized_market_records_id_fk" FOREIGN KEY ("market_record_id") REFERENCES "public"."normalized_market_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comp_match_results" ADD CONSTRAINT "comp_match_results_formula_version_id_formula_versions_id_fk" FOREIGN KEY ("formula_version_id") REFERENCES "public"."formula_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_groups" ADD CONSTRAINT "duplicate_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_groups" ADD CONSTRAINT "duplicate_groups_canonical_record_id_raw_market_records_id_fk" FOREIGN KEY ("canonical_record_id") REFERENCES "public"."raw_market_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_source_key_market_sources_key_fk" FOREIGN KEY ("source_key") REFERENCES "public"."market_sources"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filter_presets" ADD CONSTRAINT "filter_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades_and_scales" ADD CONSTRAINT "grades_and_scales_grading_company_id_grading_companies_id_fk" FOREIGN KEY ("grading_company_id") REFERENCES "public"."grading_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_events" ADD CONSTRAINT "market_events_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_events" ADD CONSTRAINT "market_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_market_records" ADD CONSTRAINT "normalized_market_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_market_records" ADD CONSTRAINT "normalized_market_records_raw_market_record_id_raw_market_records_id_fk" FOREIGN KEY ("raw_market_record_id") REFERENCES "public"."raw_market_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_market_records" ADD CONSTRAINT "normalized_market_records_card_catalog_item_id_card_catalog_items_id_fk" FOREIGN KEY ("card_catalog_item_id") REFERENCES "public"."card_catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_market_records" ADD CONSTRAINT "normalized_market_records_duplicate_group_id_duplicate_groups_id_fk" FOREIGN KEY ("duplicate_group_id") REFERENCES "public"."duplicate_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_market_records" ADD CONSTRAINT "normalized_market_records_source_key_market_sources_key_fk" FOREIGN KEY ("source_key") REFERENCES "public"."market_sources"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_market_records" ADD CONSTRAINT "normalized_market_records_grading_company_id_grading_companies_id_fk" FOREIGN KEY ("grading_company_id") REFERENCES "public"."grading_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_evaluations" ADD CONSTRAINT "outcome_evaluations_prediction_snapshot_id_prediction_snapshots_id_fk" FOREIGN KEY ("prediction_snapshot_id") REFERENCES "public"."prediction_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_evaluations" ADD CONSTRAINT "outcome_evaluations_decision_id_user_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."user_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_team_history" ADD CONSTRAINT "player_team_history_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_team_history" ADD CONSTRAINT "player_team_history_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_card_catalog_item_id_card_catalog_items_id_fk" FOREIGN KEY ("card_catalog_item_id") REFERENCES "public"."card_catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_prediction_snapshot_id_prediction_snapshots_id_fk" FOREIGN KEY ("prediction_snapshot_id") REFERENCES "public"."prediction_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_snapshots" ADD CONSTRAINT "prediction_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_snapshots" ADD CONSTRAINT "prediction_snapshots_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_snapshots" ADD CONSTRAINT "prediction_snapshots_formula_version_id_formula_versions_id_fk" FOREIGN KEY ("formula_version_id") REFERENCES "public"."formula_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_import_batches" ADD CONSTRAINT "raw_import_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_import_batches" ADD CONSTRAINT "raw_import_batches_source_key_market_sources_key_fk" FOREIGN KEY ("source_key") REFERENCES "public"."market_sources"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_market_records" ADD CONSTRAINT "raw_market_records_batch_id_raw_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."raw_import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_market_records" ADD CONSTRAINT "raw_market_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_market_records" ADD CONSTRAINT "raw_market_records_source_key_market_sources_key_fk" FOREIGN KEY ("source_key") REFERENCES "public"."market_sources"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_credentials_metadata" ADD CONSTRAINT "source_credentials_metadata_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_credentials_metadata" ADD CONSTRAINT "source_credentials_metadata_source_key_market_sources_key_fk" FOREIGN KEY ("source_key") REFERENCES "public"."market_sources"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_holding_id_portfolio_holdings_id_fk" FOREIGN KEY ("holding_id") REFERENCES "public"."portfolio_holdings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_decision_id_user_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."user_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_decisions" ADD CONSTRAINT "user_decisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_decisions" ADD CONSTRAINT "user_decisions_prediction_snapshot_id_prediction_snapshots_id_fk" FOREIGN KEY ("prediction_snapshot_id") REFERENCES "public"."prediction_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_card_catalog_item_id_card_catalog_items_id_fk" FOREIGN KEY ("card_catalog_item_id") REFERENCES "public"."card_catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_market_record_id_normalized_market_records_id_fk" FOREIGN KEY ("market_record_id") REFERENCES "public"."normalized_market_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_user_triggered_idx" ON "alerts" USING btree ("user_id","triggered_at");--> statement-breakpoint
CREATE INDEX "analyses_user_cutoff_idx" ON "analyses" USING btree ("user_id","cutoff");--> statement-breakpoint
CREATE INDEX "analyses_demo_idx" ON "analyses" USING btree ("is_demo");--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_comps_analysis_record_idx" ON "analysis_comps" USING btree ("analysis_id","market_record_id");--> statement-breakpoint
CREATE INDEX "audit_log_entity_time_idx" ON "audit_log" USING btree ("entity_type","entity_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_accounts_provider_account_idx" ON "auth_accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "auth_accounts_user_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "auth_verifications_identifier_idx" ON "auth_verifications" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "calculation_steps_analysis_sequence_idx" ON "calculation_steps" USING btree ("analysis_id","sequence");--> statement-breakpoint
CREATE INDEX "card_aliases_alias_idx" ON "card_aliases" USING btree ("alias");--> statement-breakpoint
CREATE INDEX "card_catalog_player_year_idx" ON "card_catalog_items" USING btree ("player_id","year");--> statement-breakpoint
CREATE INDEX "card_catalog_set_number_idx" ON "card_catalog_items" USING btree ("set_name","card_number");--> statement-breakpoint
CREATE INDEX "card_catalog_team_idx" ON "card_catalog_items" USING btree ("team_shown_id");--> statement-breakpoint
CREATE INDEX "comp_exclusions_analysis_included_idx" ON "comp_exclusions" USING btree ("analysis_id","current_included");--> statement-breakpoint
CREATE UNIQUE INDEX "comp_match_analysis_record_idx" ON "comp_match_results" USING btree ("analysis_id","market_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "currency_rates_pair_time_idx" ON "currency_rates" USING btree ("base_currency","quote_currency","effective_at");--> statement-breakpoint
CREATE INDEX "expenses_transaction_idx" ON "expenses" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "fee_schedules_source_effective_idx" ON "fee_schedules" USING btree ("source_key","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "filter_presets_user_name_idx" ON "filter_presets" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "forecasts_analysis_horizon_idx" ON "forecasts" USING btree ("analysis_id","horizon_days");--> statement-breakpoint
CREATE UNIQUE INDEX "grades_company_label_idx" ON "grades_and_scales" USING btree ("grading_company_id","label");--> statement-breakpoint
CREATE INDEX "market_events_player_known_idx" ON "market_events" USING btree ("player_id","known_at");--> statement-breakpoint
CREATE INDEX "normalized_market_user_demo_idx" ON "normalized_market_records" USING btree ("user_id","is_demo");--> statement-breakpoint
CREATE INDEX "normalized_market_source_time_idx" ON "normalized_market_records" USING btree ("source_key","occurred_at");--> statement-breakpoint
CREATE INDEX "normalized_market_card_idx" ON "normalized_market_records" USING btree ("card_catalog_item_id");--> statement-breakpoint
CREATE INDEX "normalized_market_grader_grade_idx" ON "normalized_market_records" USING btree ("grading_company_id","grade");--> statement-breakpoint
CREATE INDEX "normalized_market_fingerprint_idx" ON "normalized_market_records" USING btree ("fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "outcomes_snapshot_horizon_idx" ON "outcome_evaluations" USING btree ("prediction_snapshot_id","horizon_days");--> statement-breakpoint
CREATE INDEX "player_team_history_player_time_idx" ON "player_team_history" USING btree ("player_id","started_at");--> statement-breakpoint
CREATE INDEX "players_name_idx" ON "players" USING btree ("canonical_name");--> statement-breakpoint
CREATE INDEX "players_position_idx" ON "players" USING btree ("position");--> statement-breakpoint
CREATE INDEX "portfolio_holdings_user_demo_idx" ON "portfolio_holdings" USING btree ("user_id","is_demo");--> statement-breakpoint
CREATE INDEX "prediction_snapshot_user_cutoff_idx" ON "prediction_snapshots" USING btree ("user_id","prediction_cutoff");--> statement-breakpoint
CREATE INDEX "prediction_snapshot_demo_idx" ON "prediction_snapshots" USING btree ("is_demo");--> statement-breakpoint
CREATE INDEX "raw_import_batches_user_demo_idx" ON "raw_import_batches" USING btree ("user_id","is_demo");--> statement-breakpoint
CREATE INDEX "raw_market_batch_row_idx" ON "raw_market_records" USING btree ("batch_id","row_number");--> statement-breakpoint
CREATE INDEX "raw_market_source_record_idx" ON "raw_market_records" USING btree ("source_key","source_record_id");--> statement-breakpoint
CREATE INDEX "raw_market_fingerprint_idx" ON "raw_market_records" USING btree ("content_fingerprint");--> statement-breakpoint
CREATE INDEX "raw_market_user_demo_idx" ON "raw_market_records" USING btree ("user_id","is_demo");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_searches_user_name_idx" ON "saved_searches" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "source_credentials_user_source_idx" ON "source_credentials_metadata" USING btree ("user_id","source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_name_idx" ON "teams" USING btree ("canonical_name");--> statement-breakpoint
CREATE INDEX "teams_abbreviation_idx" ON "teams" USING btree ("abbreviation");--> statement-breakpoint
CREATE INDEX "transactions_user_time_idx" ON "transactions" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "transactions_demo_idx" ON "transactions" USING btree ("is_demo");--> statement-breakpoint
CREATE INDEX "user_decisions_user_status_idx" ON "user_decisions" USING btree ("user_id","purchase_status");--> statement-breakpoint
CREATE INDEX "user_decisions_demo_idx" ON "user_decisions" USING btree ("is_demo");--> statement-breakpoint
CREATE INDEX "watchlist_user_demo_idx" ON "watchlist_items" USING btree ("user_id","is_demo");
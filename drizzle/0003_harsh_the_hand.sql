ALTER TABLE "analyses" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "request_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX "analyses_user_idempotency_idx" ON "analyses" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "normalized_market_owner_source_record_idx" ON "normalized_market_records" USING btree ("user_id","is_demo","source_key","source_record_id") WHERE "normalized_market_records"."source_record_id" is not null and "normalized_market_records"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "normalized_market_owner_fingerprint_idx" ON "normalized_market_records" USING btree ("user_id","is_demo","fingerprint") WHERE "normalized_market_records"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "portfolio_holdings_open_owner_idx" ON "portfolio_holdings" USING btree ("user_id","is_demo","closed_at");--> statement-breakpoint
CREATE INDEX "transactions_owner_holding_type_idx" ON "transactions" USING btree ("user_id","is_demo","holding_id","transaction_type");--> statement-breakpoint
CREATE INDEX "user_decisions_owner_snapshot_idx" ON "user_decisions" USING btree ("user_id","is_demo","prediction_snapshot_id");
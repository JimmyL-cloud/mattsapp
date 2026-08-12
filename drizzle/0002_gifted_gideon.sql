ALTER TABLE "transactions" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_user_idempotency_idx" ON "transactions" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_reversal_once_idx" ON "transactions" USING btree ("reverses_transaction_id");
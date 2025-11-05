CREATE TABLE "all_trades_admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"osrs_account_id" uuid,
	"item_id" integer NOT NULL,
	"item_name" text NOT NULL,
	"offer_type" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"filled_quantity" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"osrs_account_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"buy_event_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"average_buy_price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "osrs_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"osrs_username" text,
	"runelite_client_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "osrs_accounts_runelite_client_id_unique" UNIQUE("runelite_client_id")
);
--> statement-breakpoint
CREATE TABLE "trade_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"osrs_account_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"item_name" text NOT NULL,
	"offer_type" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"filled_quantity" integer DEFAULT 0 NOT NULL,
	"remaining_quantity" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"runelite_event_id" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trade_events_runelite_event_id_unique" UNIQUE("runelite_event_id")
);
--> statement-breakpoint
CREATE TABLE "trade_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"osrs_account_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"buy_event_id" uuid NOT NULL,
	"sell_event_id" uuid NOT NULL,
	"buy_price" integer NOT NULL,
	"sell_price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"profit" integer NOT NULL,
	"profit_after_tax" integer NOT NULL,
	"roi_percentage" integer,
	"matched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "all_trades_admin" ADD CONSTRAINT "all_trades_admin_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "all_trades_admin" ADD CONSTRAINT "all_trades_admin_osrs_account_id_osrs_accounts_id_fk" FOREIGN KEY ("osrs_account_id") REFERENCES "public"."osrs_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_positions" ADD CONSTRAINT "open_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_positions" ADD CONSTRAINT "open_positions_osrs_account_id_osrs_accounts_id_fk" FOREIGN KEY ("osrs_account_id") REFERENCES "public"."osrs_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_positions" ADD CONSTRAINT "open_positions_buy_event_id_trade_events_id_fk" FOREIGN KEY ("buy_event_id") REFERENCES "public"."trade_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "osrs_accounts" ADD CONSTRAINT "osrs_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_events" ADD CONSTRAINT "trade_events_osrs_account_id_osrs_accounts_id_fk" FOREIGN KEY ("osrs_account_id") REFERENCES "public"."osrs_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_events" ADD CONSTRAINT "trade_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_matches" ADD CONSTRAINT "trade_matches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_matches" ADD CONSTRAINT "trade_matches_osrs_account_id_osrs_accounts_id_fk" FOREIGN KEY ("osrs_account_id") REFERENCES "public"."osrs_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_matches" ADD CONSTRAINT "trade_matches_buy_event_id_trade_events_id_fk" FOREIGN KEY ("buy_event_id") REFERENCES "public"."trade_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_matches" ADD CONSTRAINT "trade_matches_sell_event_id_trade_events_id_fk" FOREIGN KEY ("sell_event_id") REFERENCES "public"."trade_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "all_trades_admin_item_timestamp_idx" ON "all_trades_admin" USING btree ("item_id","timestamp");--> statement-breakpoint
CREATE INDEX "all_trades_admin_user_timestamp_idx" ON "all_trades_admin" USING btree ("user_id","timestamp");--> statement-breakpoint
CREATE INDEX "all_trades_admin_item_id_idx" ON "all_trades_admin" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "open_positions_user_item_idx" ON "open_positions" USING btree ("user_id","item_id");--> statement-breakpoint
CREATE INDEX "open_positions_osrs_account_idx" ON "open_positions" USING btree ("osrs_account_id");--> statement-breakpoint
CREATE INDEX "open_positions_item_id_idx" ON "open_positions" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "osrs_accounts_user_id_idx" ON "osrs_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "osrs_accounts_runelite_client_id_idx" ON "osrs_accounts" USING btree ("runelite_client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "osrs_accounts_user_client_unique" ON "osrs_accounts" USING btree ("user_id","runelite_client_id");--> statement-breakpoint
CREATE INDEX "trade_events_user_item_timestamp_idx" ON "trade_events" USING btree ("user_id","item_id","timestamp");--> statement-breakpoint
CREATE INDEX "trade_events_osrs_account_item_status_idx" ON "trade_events" USING btree ("osrs_account_id","item_id","status");--> statement-breakpoint
CREATE INDEX "trade_events_user_timestamp_idx" ON "trade_events" USING btree ("user_id","timestamp");--> statement-breakpoint
CREATE INDEX "trade_events_osrs_account_timestamp_idx" ON "trade_events" USING btree ("osrs_account_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_events_runelite_event_id_idx" ON "trade_events" USING btree ("runelite_event_id");--> statement-breakpoint
CREATE INDEX "trade_events_status_idx" ON "trade_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trade_events_archived_at_idx" ON "trade_events" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "trade_matches_user_item_matched_at_idx" ON "trade_matches" USING btree ("user_id","item_id","matched_at");--> statement-breakpoint
CREATE INDEX "trade_matches_osrs_account_matched_at_idx" ON "trade_matches" USING btree ("osrs_account_id","matched_at");--> statement-breakpoint
CREATE INDEX "trade_matches_item_id_idx" ON "trade_matches" USING btree ("item_id");
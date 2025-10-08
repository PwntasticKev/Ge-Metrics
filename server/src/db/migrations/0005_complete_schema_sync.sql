-- Complete schema synchronization - create all missing tables to match local exactly

-- Create clan tables
CREATE TABLE IF NOT EXISTS "clans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "clan_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clan_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "clan_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clan_id" uuid NOT NULL,
	"invited_by" integer NOT NULL,
	"invited_user" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"response_message" text
);

-- Create game and item tables
CREATE TABLE IF NOT EXISTS "game_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"update_type" text NOT NULL,
	"published_date" timestamp NOT NULL,
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "item_mapping" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"examine" text,
	"category" text,
	"type" text,
	"typeIcon" text,
	"icon" text,
	"current" text,
	"today" text,
	"members" boolean DEFAULT true,
	"day30" text,
	"day90" text,
	"day180" text
);

CREATE TABLE IF NOT EXISTS "item_volumes" (
	"id" integer NOT NULL,
	"name" text NOT NULL,
	"high_volume" integer,
	"high_volume_date" timestamp,
	"low_volume" integer,
	"low_volume_date" timestamp,
	"average_volume" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create OTPs table (rename from otp_tokens if needed)
CREATE TABLE IF NOT EXISTS "otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"otp_code" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"status" text DEFAULT 'inactive' NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"trial_days" integer DEFAULT 14,
	"is_trialing" boolean DEFAULT false,
	"trial_extended_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create user tables
CREATE TABLE IF NOT EXISTS "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"achievement_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"points" integer DEFAULT 0,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);

CREATE TABLE IF NOT EXISTS "user_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_type" text NOT NULL,
	"target_value" integer NOT NULL,
	"current_value" integer DEFAULT 0,
	"status" text DEFAULT 'active' NOT NULL,
	"deadline" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);

CREATE TABLE IF NOT EXISTS "user_profits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"item_name" text NOT NULL,
	"buy_price" integer NOT NULL,
	"sell_price" integer,
	"quantity" integer NOT NULL,
	"profit" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sold_at" timestamp
);

CREATE TABLE IF NOT EXISTS "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"mailchimp_api_key" text,
	"email_notifications" boolean DEFAULT true,
	"volume_alerts" boolean DEFAULT true,
	"price_drop_alerts" boolean DEFAULT true,
	"cooldown_period" integer DEFAULT 5,
	"otp_enabled" boolean DEFAULT false,
	"otp_secret" text,
	"otp_verified" boolean DEFAULT false,
	"role" text DEFAULT 'user' NOT NULL,
	"permissions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"item_name" text NOT NULL,
	"transaction_type" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"total_value" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);

CREATE TABLE IF NOT EXISTS "user_watchlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"item_name" text NOT NULL,
	"target_price" integer,
	"alert_when_below" boolean DEFAULT false,
	"alert_when_above" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "clans" ADD CONSTRAINT "clans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "clan_members" ADD CONSTRAINT "clan_members_clan_id_clans_id_fk" FOREIGN KEY ("clan_id") REFERENCES "public"."clans"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "clan_members" ADD CONSTRAINT "clan_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "clan_invites" ADD CONSTRAINT "clan_invites_clan_id_clans_id_fk" FOREIGN KEY ("clan_id") REFERENCES "public"."clans"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "clan_invites" ADD CONSTRAINT "clan_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "clan_invites" ADD CONSTRAINT "clan_invites_invited_user_users_id_fk" FOREIGN KEY ("invited_user") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "otps" ADD CONSTRAINT "otps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_goals" ADD CONSTRAINT "user_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_profits" ADD CONSTRAINT "user_profits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_transactions" ADD CONSTRAINT "user_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_watchlists" ADD CONSTRAINT "user_watchlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes
CREATE INDEX IF NOT EXISTS "clans_created_by_idx" ON "clans" ("created_by");
CREATE INDEX IF NOT EXISTS "clan_members_clan_id_idx" ON "clan_members" ("clan_id");
CREATE INDEX IF NOT EXISTS "clan_members_user_id_idx" ON "clan_members" ("user_id");
CREATE INDEX IF NOT EXISTS "clan_invites_clan_id_idx" ON "clan_invites" ("clan_id");
CREATE INDEX IF NOT EXISTS "clan_invites_invited_user_idx" ON "clan_invites" ("invited_user");
CREATE INDEX IF NOT EXISTS "clan_invites_status_idx" ON "clan_invites" ("status");
CREATE INDEX IF NOT EXISTS "item_price_history_user_id_idx" ON "item_price_history" ("user_id");
CREATE INDEX IF NOT EXISTS "otps_user_id_idx" ON "otps" ("user_id");
CREATE INDEX IF NOT EXISTS "otps_expires_at_idx" ON "otps" ("expires_at");
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" ("status");
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_customer_id_idx" ON "subscriptions" ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "subscriptions_trial_end_idx" ON "subscriptions" ("trial_end");
CREATE INDEX IF NOT EXISTS "user_achievements_user_id_idx" ON "user_achievements" ("user_id");
CREATE INDEX IF NOT EXISTS "user_achievements_achievement_type_idx" ON "user_achievements" ("achievement_type");
CREATE INDEX IF NOT EXISTS "user_goals_user_id_idx" ON "user_goals" ("user_id");
CREATE INDEX IF NOT EXISTS "user_goals_status_idx" ON "user_goals" ("status");
CREATE INDEX IF NOT EXISTS "user_profits_user_id_idx" ON "user_profits" ("user_id");
CREATE INDEX IF NOT EXISTS "user_transactions_user_id_idx" ON "user_transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "user_transactions_item_id_idx" ON "user_transactions" ("item_id");
CREATE INDEX IF NOT EXISTS "user_transactions_created_at_idx" ON "user_transactions" ("created_at");
CREATE INDEX IF NOT EXISTS "user_watchlists_user_id_idx" ON "user_watchlists" ("user_id");
CREATE INDEX IF NOT EXISTS "user_watchlists_item_id_idx" ON "user_watchlists" ("item_id");
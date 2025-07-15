CREATE TABLE "clan_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clan_id" uuid NOT NULL,
	"inviter_id" uuid NOT NULL,
	"invited_email" text NOT NULL,
	"invited_user_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clan_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"favorite_type" text NOT NULL,
	"favorite_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friend_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inviter_id" uuid NOT NULL,
	"invited_email" text NOT NULL,
	"invited_user_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"update_date" timestamp NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"color" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_mapping" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"examine" text,
	"members" boolean DEFAULT false,
	"lowalch" integer,
	"highalch" integer,
	"limit" integer,
	"value" integer,
	"icon" text,
	"wiki_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"high_price" integer,
	"low_price" integer,
	"volume" integer,
	"timeframe" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profit_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_type" text NOT NULL,
	"achievement_key" text NOT NULL,
	"achievement_name" text NOT NULL,
	"achievement_description" text,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	"progress_value" integer
);
--> statement-breakpoint
CREATE TABLE "user_friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user1_id" uuid NOT NULL,
	"user2_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_type" text NOT NULL,
	"goal_name" text NOT NULL,
	"target_value" integer NOT NULL,
	"current_progress" integer DEFAULT 0 NOT NULL,
	"deadline" timestamp,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_profit" integer DEFAULT 0 NOT NULL,
	"weekly_profit" integer DEFAULT 0 NOT NULL,
	"monthly_profit" integer DEFAULT 0 NOT NULL,
	"total_trades" integer DEFAULT 0 NOT NULL,
	"best_single_flip" integer DEFAULT 0 NOT NULL,
	"current_rank" integer,
	"last_rank_update" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"item_name" text NOT NULL,
	"buy_price" integer NOT NULL,
	"sell_price" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"profit" integer NOT NULL,
	"trade_date" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "clan_invites" ADD CONSTRAINT "clan_invites_clan_id_clans_id_fk" FOREIGN KEY ("clan_id") REFERENCES "public"."clans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clan_invites" ADD CONSTRAINT "clan_invites_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clan_invites" ADD CONSTRAINT "clan_invites_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clan_members" ADD CONSTRAINT "clan_members_clan_id_clans_id_fk" FOREIGN KEY ("clan_id") REFERENCES "public"."clans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clan_members" ADD CONSTRAINT "clan_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clans" ADD CONSTRAINT "clans_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_invites" ADD CONSTRAINT "friend_invites_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_invites" ADD CONSTRAINT "friend_invites_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_price_history" ADD CONSTRAINT "item_price_history_item_id_item_mapping_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_mapping"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_audit_log" ADD CONSTRAINT "profit_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_friendships" ADD CONSTRAINT "user_friendships_user1_id_users_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_friendships" ADD CONSTRAINT "user_friendships_user2_id_users_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_goals" ADD CONSTRAINT "user_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profits" ADD CONSTRAINT "user_profits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_trades" ADD CONSTRAINT "user_trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_trades" ADD CONSTRAINT "user_trades_item_id_item_mapping_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_mapping"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clan_invites_clan_id_idx" ON "clan_invites" USING btree ("clan_id");--> statement-breakpoint
CREATE INDEX "clan_invites_inviter_id_idx" ON "clan_invites" USING btree ("inviter_id");--> statement-breakpoint
CREATE INDEX "clan_invites_invited_email_idx" ON "clan_invites" USING btree ("invited_email");--> statement-breakpoint
CREATE INDEX "clan_members_clan_id_idx" ON "clan_members" USING btree ("clan_id");--> statement-breakpoint
CREATE INDEX "clan_members_user_id_idx" ON "clan_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "favorites_user_id_idx" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "favorites_type_idx" ON "favorites" USING btree ("favorite_type");--> statement-breakpoint
CREATE INDEX "favorites_unique_idx" ON "favorites" USING btree ("user_id","favorite_type","favorite_id");--> statement-breakpoint
CREATE INDEX "friend_invites_inviter_id_idx" ON "friend_invites" USING btree ("inviter_id");--> statement-breakpoint
CREATE INDEX "friend_invites_invited_email_idx" ON "friend_invites" USING btree ("invited_email");--> statement-breakpoint
CREATE INDEX "item_price_history_item_time_idx" ON "item_price_history" USING btree ("item_id","timestamp");--> statement-breakpoint
CREATE INDEX "profit_audit_log_user_id_idx" ON "profit_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_achievements_user_id_idx" ON "user_achievements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_friendships_user1_idx" ON "user_friendships" USING btree ("user1_id");--> statement-breakpoint
CREATE INDEX "user_friendships_user2_idx" ON "user_friendships" USING btree ("user2_id");--> statement-breakpoint
CREATE INDEX "user_goals_user_id_idx" ON "user_goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_profits_user_id_idx" ON "user_profits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_trades_user_id_idx" ON "user_trades" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_trades_item_id_idx" ON "user_trades" USING btree ("item_id");
-- Add username field to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text NOT NULL UNIQUE;
CREATE INDEX IF NOT EXISTS "username_idx" ON "users" ("username");
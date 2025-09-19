CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text,
	"details" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'support' NOT NULL,
	"department" text,
	"is_active" boolean DEFAULT true,
	"permissions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otps" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"otp_code" text NOT NULL,
	"type" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "potion_volumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"item_name" text NOT NULL,
	"dose" integer NOT NULL,
	"base_name" text NOT NULL,
	"volume" integer DEFAULT 0,
	"high_price_volume" integer,
	"low_price_volume" integer,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"rank" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "friend_invites" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profit_audit_log" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_friendships" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_trades" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "friend_invites" CASCADE;--> statement-breakpoint
DROP TABLE "profit_audit_log" CASCADE;--> statement-breakpoint
DROP TABLE "user_friendships" CASCADE;--> statement-breakpoint
DROP TABLE "user_trades" CASCADE;--> statement-breakpoint
ALTER TABLE "clan_invites" DROP CONSTRAINT "clan_invites_inviter_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "clan_invites" DROP CONSTRAINT "clan_invites_invited_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "clans" DROP CONSTRAINT "clans_owner_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "clan_invites_clan_id_idx";--> statement-breakpoint
DROP INDEX "clan_invites_inviter_id_idx";--> statement-breakpoint
DROP INDEX "clan_invites_invited_email_idx";--> statement-breakpoint
DROP INDEX "clan_members_clan_id_idx";--> statement-breakpoint
DROP INDEX "clan_members_user_id_idx";--> statement-breakpoint
ALTER TABLE "clan_invites" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "clan_invites" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "clan_invites" ALTER COLUMN "clan_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "clan_invites" ALTER COLUMN "inviter_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "clan_invites" ALTER COLUMN "invited_user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "clan_members" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "clan_members" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "clan_members" ALTER COLUMN "clan_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "clan_members" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "clans" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "clans" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "clans" ALTER COLUMN "owner_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "favorites" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "favorites" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "favorites" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "game_updates" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "game_updates" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "item_price_history" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "item_price_history" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "user_achievements" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "user_achievements" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_achievements" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "user_goals" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "user_goals" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_goals" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "user_goals" ALTER COLUMN "is_completed" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profits" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "user_profits" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_profits" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "user_transactions" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "user_transactions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_transactions" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "user_watchlists" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "user_watchlists" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_watchlists" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD COLUMN "achievement_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_goals" ADD COLUMN "current_value" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_goals" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_goals" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" text NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otps" ADD CONSTRAINT "otps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_user_id_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "employees_user_id_idx" ON "employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employees_role_idx" ON "employees" USING btree ("role");--> statement-breakpoint
CREATE INDEX "employees_department_idx" ON "employees" USING btree ("department");--> statement-breakpoint
CREATE INDEX "otps_user_id_idx" ON "otps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "otps_type_idx" ON "otps" USING btree ("type");--> statement-breakpoint
CREATE INDEX "potion_volumes_item_id_idx" ON "potion_volumes" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "potion_volumes_base_name_idx" ON "potion_volumes" USING btree ("base_name");--> statement-breakpoint
CREATE INDEX "potion_volumes_rank_idx" ON "potion_volumes" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "potion_volumes_last_updated_idx" ON "potion_volumes" USING btree ("last_updated");--> statement-breakpoint
CREATE INDEX "potion_volumes_is_active_idx" ON "potion_volumes" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "clan_invites" ADD CONSTRAINT "clan_invites_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clan_invites" ADD CONSTRAINT "clan_invites_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clans" ADD CONSTRAINT "clans_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clan_invites_clan_idx" ON "clan_invites" USING btree ("clan_id");--> statement-breakpoint
CREATE INDEX "clan_invites_inviter_idx" ON "clan_invites" USING btree ("inviter_id");--> statement-breakpoint
CREATE INDEX "clan_invites_email_idx" ON "clan_invites" USING btree ("invited_email");--> statement-breakpoint
CREATE INDEX "clan_members_clan_user_idx" ON "clan_members" USING btree ("clan_id","user_id");--> statement-breakpoint
CREATE INDEX "clan_members_role_idx" ON "clan_members" USING btree ("role");--> statement-breakpoint
CREATE INDEX "clans_owner_idx" ON "clans" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "clans_name_idx" ON "clans" USING btree ("name");--> statement-breakpoint
CREATE INDEX "user_achievements_achievement_idx" ON "user_achievements" USING btree ("achievement_id");--> statement-breakpoint
CREATE INDEX "user_goals_type_idx" ON "user_goals" USING btree ("goal_type");--> statement-breakpoint
CREATE INDEX "username_idx" ON "users" USING btree ("username");--> statement-breakpoint
ALTER TABLE "user_achievements" DROP COLUMN "achievement_type";--> statement-breakpoint
ALTER TABLE "user_achievements" DROP COLUMN "achievement_key";--> statement-breakpoint
ALTER TABLE "user_achievements" DROP COLUMN "achievement_description";--> statement-breakpoint
ALTER TABLE "user_achievements" DROP COLUMN "progress_value";--> statement-breakpoint
ALTER TABLE "user_goals" DROP COLUMN "goal_name";--> statement-breakpoint
ALTER TABLE "user_goals" DROP COLUMN "current_progress";--> statement-breakpoint
ALTER TABLE "user_goals" DROP COLUMN "completed_at";--> statement-breakpoint
ALTER TABLE "clans" ADD CONSTRAINT "clans_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");
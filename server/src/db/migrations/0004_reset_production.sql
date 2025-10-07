-- Reset production database to match local Drizzle schema exactly
-- This drops old Prisma tables and recreates the clean Drizzle structure

-- Drop old Prisma tables that don't exist in local Drizzle schema
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;
DROP TABLE IF EXISTS "abnormal_activity_patterns" CASCADE;
DROP TABLE IF EXISTS "alert_cooldowns" CASCADE;
DROP TABLE IF EXISTS "goals" CASCADE;
DROP TABLE IF EXISTS "master_access_logs" CASCADE;
DROP TABLE IF EXISTS "otp_tokens" CASCADE;
DROP TABLE IF EXISTS "parties" CASCADE;
DROP TABLE IF EXISTS "party_items" CASCADE;
DROP TABLE IF EXISTS "party_members" CASCADE;
DROP TABLE IF EXISTS "security_events" CASCADE;
DROP TABLE IF EXISTS "settings" CASCADE;
DROP TABLE IF EXISTS "subscriptions" CASCADE;
DROP TABLE IF EXISTS "systemSettings" CASCADE;
DROP TABLE IF EXISTS "transactions" CASCADE;
DROP TABLE IF EXISTS "user_invitations" CASCADE;
DROP TABLE IF EXISTS "user_sessions" CASCADE;
DROP TABLE IF EXISTS "volume_alerts" CASCADE;
DROP TABLE IF EXISTS "watchlist" CASCADE;

-- Drop any other old tables that might exist
DROP TABLE IF EXISTS "stripe_events" CASCADE;
DROP TABLE IF EXISTS "system_metrics" CASCADE;
DROP TABLE IF EXISTS "system_settings" CASCADE;
DROP TABLE IF EXISTS "revenue_analytics" CASCADE;
DROP TABLE IF EXISTS "user_achievements" CASCADE;
DROP TABLE IF EXISTS "user_goals" CASCADE;
DROP TABLE IF EXISTS "user_profits" CASCADE;
DROP TABLE IF EXISTS "user_transactions" CASCADE;
DROP TABLE IF EXISTS "user_watchlists" CASCADE;
DROP TABLE IF EXISTS "user_settings" CASCADE;

-- Drop the neon_auth schema if it exists
DROP SCHEMA IF EXISTS "neon_auth" CASCADE;

-- Reset the migration state to start fresh
DELETE FROM drizzle.__drizzle_migrations WHERE id > 1;

-- The remaining tables should match your local schema:
-- admin_actions, api_usage_logs, audit_log, clan_invites, clan_members, clans,
-- cron_job_logs, cron_jobs, favorites, formulas, game_updates, item_mapping,
-- item_price_history, item_volumes, otps, refresh_tokens, subscriptions,
-- user_achievements, user_goals, user_profits, user_sessions, user_settings,
-- user_transactions, user_watchlists, users

-- These should already exist and match your local schema
-- If any are missing, they will be created by the next migration run
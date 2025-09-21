-- This script will drop all tables in the database to allow for a clean schema push.
-- This is a destructive action and will result in data loss.

DROP TABLE IF EXISTS "audit_log" CASCADE;
DROP TABLE IF EXISTS "clan_invites" CASCADE;
DROP TABLE IF EXISTS "clan_members" CASCADE;
DROP TABLE IF EXISTS "employees" CASCADE;
DROP TABLE IF EXISTS "favorites" CASCADE;
DROP TABLE IF EXISTS "item_price_history" CASCADE;
DROP TABLE IF EXISTS "otps" CASCADE;
DROP TABLE IF EXISTS "refresh_tokens" CASCADE;
DROP TABLE IF EXISTS "subscriptions" CASCADE;
DROP TABLE IF EXISTS "user_achievements" CASCADE;
DROP TABLE IF EXISTS "user_goals" CASCADE;
DROP TABLE IF EXISTS "user_profits" CASCADE;
DROP TABLE IF EXISTS "user_transactions" CASCADE;
DROP TABLE IF EXISTS "user_watchlists" CASCADE;
DROP TABLE IF EXISTS "clans" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "game_updates" CASCADE;
DROP TABLE IF EXISTS "item_mapping" CASCADE;
DROP TABLE IF EXISTS "potion_volumes" CASCADE;
DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE;

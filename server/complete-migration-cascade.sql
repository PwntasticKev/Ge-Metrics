-- Complete the migration with CASCADE to handle all dependent tables

BEGIN;

-- Drop all dependent tables first
DROP TABLE IF EXISTS clan_invites CASCADE;
DROP TABLE IF EXISTS clan_members CASCADE;
DROP TABLE IF EXISTS clans CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS friend_invites CASCADE;
DROP TABLE IF EXISTS profit_audit_log CASCADE;
DROP TABLE IF EXISTS user_friendships CASCADE;
DROP TABLE IF EXISTS user_profits CASCADE;
DROP TABLE IF EXISTS user_trades CASCADE;

-- Drop old tables (they have UUID primary keys)
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS user_transactions CASCADE;
DROP TABLE IF EXISTS user_watchlists CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS user_goals CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Rename new tables to their final names
ALTER TABLE users_new RENAME TO users;
ALTER TABLE subscriptions_new RENAME TO subscriptions;
ALTER TABLE user_goals_new RENAME TO user_goals;
ALTER TABLE user_achievements_new RENAME TO user_achievements;
ALTER TABLE user_watchlists_new RENAME TO user_watchlists;
ALTER TABLE user_transactions_new RENAME TO user_transactions;
ALTER TABLE refresh_tokens_new RENAME TO refresh_tokens;

-- Recreate dependent tables with integer foreign keys
CREATE TABLE IF NOT EXISTS clans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS clans_owner_idx ON clans(owner_id);
CREATE INDEX IF NOT EXISTS clans_name_idx ON clans(name);

CREATE TABLE IF NOT EXISTS clan_members (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS clan_members_clan_user_idx ON clan_members(clan_id, user_id);
CREATE INDEX IF NOT EXISTS clan_members_role_idx ON clan_members(role);

CREATE TABLE IF NOT EXISTS clan_invites (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    inviter_id INTEGER NOT NULL REFERENCES users(id),
    invited_email TEXT NOT NULL,
    invited_user_id INTEGER REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    message TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS clan_invites_clan_idx ON clan_invites(clan_id);
CREATE INDEX IF NOT EXISTS clan_invites_inviter_idx ON clan_invites(inviter_id);
CREATE INDEX IF NOT EXISTS clan_invites_email_idx ON clan_invites(invited_email);

CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    favorite_type TEXT NOT NULL,
    favorite_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites(user_id);
CREATE INDEX IF NOT EXISTS favorites_type_idx ON favorites(favorite_type);
CREATE UNIQUE INDEX IF NOT EXISTS favorites_unique_idx ON favorites(user_id, favorite_type, favorite_id);

CREATE TABLE IF NOT EXISTS user_profits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_profit INTEGER DEFAULT 0 NOT NULL,
    weekly_profit INTEGER DEFAULT 0 NOT NULL,
    monthly_profit INTEGER DEFAULT 0 NOT NULL,
    total_trades INTEGER DEFAULT 0 NOT NULL,
    best_single_flip INTEGER DEFAULT 0 NOT NULL,
    current_rank INTEGER,
    last_rank_update TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS user_profits_user_id_idx ON user_profits(user_id);

-- Verify the final schema
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'subscriptions', 'audit_log', 'employees', 'user_goals', 'user_achievements')
ORDER BY table_name, ordinal_position;

-- Show the new auto-incrementing IDs
SELECT 'users' as table_name, COUNT(*) as count, MIN(id) as min_id, MAX(id) as max_id FROM users
UNION ALL
SELECT 'subscriptions' as table_name, COUNT(*) as count, MIN(id) as min_id, MAX(id) as max_id FROM subscriptions
UNION ALL
SELECT 'audit_log' as table_name, COUNT(*) as count, MIN(id) as min_id, MAX(id) as max_id FROM audit_log
UNION ALL
SELECT 'employees' as table_name, COUNT(*) as count, MIN(id) as min_id, MAX(id) as max_id FROM employees;

COMMIT; 
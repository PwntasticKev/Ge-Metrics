-- Migrate Ge-Metrics Database from UUIDs to Auto-incrementing Integers
-- This script will convert all primary keys to SERIAL and update foreign keys

BEGIN;

-- Step 1: Create new tables with integer IDs
CREATE TABLE IF NOT EXISTS users_new (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    salt TEXT,
    google_id TEXT,
    name TEXT,
    avatar TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for users_new
CREATE INDEX IF NOT EXISTS users_new_email_idx ON users_new(email);
CREATE INDEX IF NOT EXISTS users_new_username_idx ON users_new(username);
CREATE INDEX IF NOT EXISTS users_new_google_id_idx ON users_new(google_id);

-- Step 2: Create new subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions_new (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users_new(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    status TEXT NOT NULL DEFAULT 'inactive',
    plan TEXT NOT NULL DEFAULT 'free',
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for subscriptions_new
CREATE INDEX IF NOT EXISTS subscriptions_new_user_id_idx ON subscriptions_new(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_new_stripe_customer_idx ON subscriptions_new(stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_new_stripe_subscription_idx ON subscriptions_new(stripe_subscription_id);

-- Step 3: Create new audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users_new(id),
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for audit_log
CREATE INDEX IF NOT EXISTS audit_log_user_id_idx ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log(action);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at);

-- Step 4: Create new employees table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users_new(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'support',
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for employees
CREATE INDEX IF NOT EXISTS employees_user_id_idx ON employees(user_id);
CREATE INDEX IF NOT EXISTS employees_role_idx ON employees(role);
CREATE INDEX IF NOT EXISTS employees_department_idx ON employees(department);

-- Step 5: Create new user_goals table
CREATE TABLE IF NOT EXISTS user_goals_new (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users_new(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0 NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT false,
    deadline TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for user_goals_new
CREATE INDEX IF NOT EXISTS user_goals_new_user_id_idx ON user_goals_new(user_id);
CREATE INDEX IF NOT EXISTS user_goals_new_type_idx ON user_goals_new(goal_type);

-- Step 6: Create new user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements_new (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users_new(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    unlocked_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for user_achievements_new
CREATE INDEX IF NOT EXISTS user_achievements_new_user_id_idx ON user_achievements_new(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_new_achievement_idx ON user_achievements_new(achievement_id);

-- Step 7: Create new user_watchlists table
CREATE TABLE IF NOT EXISTS user_watchlists_new (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users_new(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    target_price INTEGER,
    alert_type TEXT NOT NULL DEFAULT 'price',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for user_watchlists_new
CREATE INDEX IF NOT EXISTS user_watchlists_new_user_id_idx ON user_watchlists_new(user_id);
CREATE INDEX IF NOT EXISTS user_watchlists_new_item_id_idx ON user_watchlists_new(item_id);

-- Step 8: Create new user_transactions table
CREATE TABLE IF NOT EXISTS user_transactions_new (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users_new(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price INTEGER NOT NULL,
    profit INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for user_transactions_new
CREATE INDEX IF NOT EXISTS user_transactions_new_user_id_idx ON user_transactions_new(user_id);
CREATE INDEX IF NOT EXISTS user_transactions_new_item_id_idx ON user_transactions_new(item_id);
CREATE INDEX IF NOT EXISTS user_transactions_new_created_at_idx ON user_transactions_new(created_at);

-- Step 9: Create new refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens_new (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users_new(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for refresh_tokens_new
CREATE INDEX IF NOT EXISTS refresh_tokens_new_user_id_idx ON refresh_tokens_new(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_new_token_idx ON refresh_tokens_new(token);

-- Step 10: Copy data from old tables to new tables (if they exist)
-- Note: This will need to be done carefully to preserve relationships

-- Copy users data
INSERT INTO users_new (email, username, password_hash, salt, google_id, name, avatar, created_at, updated_at)
SELECT email, username, password_hash, salt, google_id, name, avatar, created_at, updated_at
FROM users
ON CONFLICT (email) DO NOTHING;

-- Copy subscriptions data (will need to map user IDs)
INSERT INTO subscriptions_new (user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, status, plan, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
SELECT 
    un.id as user_id,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    s.stripe_price_id,
    s.status,
    s.plan,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.created_at,
    s.updated_at
FROM subscriptions s
JOIN users u ON s.user_id = u.id
JOIN users_new un ON u.email = un.email
ON CONFLICT DO NOTHING;

-- Step 11: Drop old tables and rename new ones
-- (This step should be done carefully and may need to be commented out initially)

-- DROP TABLE IF EXISTS refresh_tokens;
-- DROP TABLE IF EXISTS user_transactions;
-- DROP TABLE IF EXISTS user_watchlists;
-- DROP TABLE IF EXISTS user_achievements;
-- DROP TABLE IF EXISTS user_goals;
-- DROP TABLE IF EXISTS subscriptions;
-- DROP TABLE IF EXISTS users;

-- ALTER TABLE users_new RENAME TO users;
-- ALTER TABLE subscriptions_new RENAME TO subscriptions;
-- ALTER TABLE user_goals_new RENAME TO user_goals;
-- ALTER TABLE user_achievements_new RENAME TO user_achievements;
-- ALTER TABLE user_watchlists_new RENAME TO user_watchlists;
-- ALTER TABLE user_transactions_new RENAME TO user_transactions;
-- ALTER TABLE refresh_tokens_new RENAME TO refresh_tokens;

-- Step 12: Verify the new schema
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users_new', 'subscriptions_new', 'audit_log', 'employees', 'user_goals_new', 'user_achievements_new')
ORDER BY table_name, ordinal_position;

COMMIT; 
-- Complete the migration by dropping old tables and renaming new ones

BEGIN;

-- Drop old tables (they have UUID primary keys)
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS user_transactions;
DROP TABLE IF EXISTS user_watchlists;
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS user_goals;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS users;

-- Rename new tables to their final names
ALTER TABLE users_new RENAME TO users;
ALTER TABLE subscriptions_new RENAME TO subscriptions;
ALTER TABLE user_goals_new RENAME TO user_goals;
ALTER TABLE user_achievements_new RENAME TO user_achievements;
ALTER TABLE user_watchlists_new RENAME TO user_watchlists;
ALTER TABLE user_transactions_new RENAME TO user_transactions;
ALTER TABLE refresh_tokens_new RENAME TO refresh_tokens;

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
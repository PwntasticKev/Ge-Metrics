-- Performance Indexes Migration
-- This migration adds critical indexes for high-traffic production workloads
-- All indexes use CONCURRENTLY to avoid blocking production traffic

-- Index for item price history timestamp queries (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS item_price_history_timestamp_idx 
ON item_price_history(timestamp DESC);

-- Composite index for user transactions with profit (flip tracking queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_transactions_user_profit_idx 
ON user_transactions(user_id, profit DESC) 
WHERE profit IS NOT NULL;

-- Index for active subscriptions (billing and access control)
CREATE INDEX CONCURRENTLY IF NOT EXISTS subscriptions_active_idx 
ON subscriptions(status) 
WHERE status = 'active';

-- Composite index for active user watchlists (alerts and monitoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_watchlists_active_user_idx 
ON user_watchlists(user_id, is_active) 
WHERE is_active = true;

-- Index for item mapping name searches (autocomplete and search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS item_mapping_name_idx 
ON item_mapping(name);

-- Index for user transactions by creation date (performance tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_transactions_created_at_idx 
ON user_transactions(created_at DESC);

-- Index for item volumes by item_id (pricing and volume queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS item_volumes_item_id_idx 
ON item_volumes(item_id);

-- Composite index for user sessions (authentication and security)
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_sessions_user_active_idx 
ON user_sessions(user_id, is_active) 
WHERE is_active = true;

-- Index for refresh tokens by user_id (authentication performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS refresh_tokens_user_expires_idx 
ON refresh_tokens(user_id, expires_at DESC);

-- Index for favorites by user and type (user preferences)
CREATE INDEX CONCURRENTLY IF NOT EXISTS favorites_user_type_idx 
ON favorites(user_id, item_type);

-- Performance notes:
-- 1. CONCURRENTLY prevents blocking existing queries during index creation
-- 2. Partial indexes (WHERE clauses) save space and improve performance
-- 3. DESC ordering on timestamps for latest-first queries
-- 4. Composite indexes match common query patterns
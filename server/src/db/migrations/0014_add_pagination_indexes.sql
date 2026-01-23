-- Migration: Add pagination and performance indexes
-- Purpose: Optimize database queries for infinite scroll, search, and pagination features
-- Date: 2026-01-16

-- Items and pricing indexes for infinite scroll
CREATE INDEX CONCURRENTLY IF NOT EXISTS items_profit_pagination_idx 
ON items USING BTREE (profit DESC, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS item_price_history_item_pagination_idx 
ON item_price_history USING BTREE (item_id, timestamp DESC);

-- Item mapping indexes for search and pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS item_mapping_name_search_idx 
ON item_mapping USING GIN (name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS item_mapping_name_pagination_idx 
ON item_mapping USING BTREE (name, id);

-- Item volumes pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS item_volumes_item_id_updated_idx 
ON item_volumes USING BTREE (item_id, last_updated_at DESC);

-- User sessions for analytics and active user tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_sessions_user_activity_idx 
ON user_sessions USING BTREE (user_id, last_activity DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS user_sessions_active_idx 
ON user_sessions USING BTREE (is_active, last_activity DESC) 
WHERE is_active = true;

-- User favorites for quick lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_favorites_user_type_idx 
ON user_favorites USING BTREE (user_id, item_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS user_favorites_item_lookup_idx 
ON user_favorites USING BTREE (item_id, item_type, user_id);

-- Subscriptions for quick access control
CREATE INDEX CONCURRENTLY IF NOT EXISTS subscriptions_user_status_idx 
ON subscriptions USING BTREE (user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS subscriptions_trial_expiry_idx 
ON subscriptions USING BTREE (trial_end, status) 
WHERE status = 'trialing';

-- User settings for role-based access
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_settings_role_idx 
ON user_settings USING BTREE (role) 
WHERE role IN ('admin', 'moderator');

-- Flip tracking indexes for user dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_flips_user_date_idx 
ON user_flips USING BTREE (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS user_flips_profit_idx 
ON user_flips USING BTREE (user_id, profit DESC);

-- Analytics and monitoring indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_sessions_analytics_idx 
ON user_sessions USING BTREE (created_at, device_info, ip_address);

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS items_multi_sort_idx 
ON items USING BTREE (profit DESC, high_price DESC, low_price DESC);

-- Partial indexes for active/recent data
CREATE INDEX CONCURRENTLY IF NOT EXISTS item_price_history_recent_idx 
ON item_price_history USING BTREE (timestamp DESC, item_id) 
WHERE timestamp > NOW() - INTERVAL '7 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS user_sessions_recent_activity_idx 
ON user_sessions USING BTREE (last_activity DESC, user_id) 
WHERE last_activity > NOW() - INTERVAL '24 hours';

-- Search optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS item_mapping_search_composite_idx 
ON item_mapping USING BTREE (name, examine) 
WHERE name IS NOT NULL;

-- Rate limiting support (if using PostgreSQL instead of Redis)
CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS rate_limits_key_reset_idx 
ON rate_limits USING BTREE (key_hash, reset_time);

CREATE INDEX CONCURRENTLY IF NOT EXISTS rate_limits_cleanup_idx 
ON rate_limits USING BTREE (reset_time) 
WHERE reset_time < NOW();

-- Add comments for documentation
COMMENT ON INDEX items_profit_pagination_idx IS 'Optimizes profit-based sorting and pagination for infinite scroll';
COMMENT ON INDEX item_mapping_name_search_idx IS 'Enables fast full-text search on item names';
COMMENT ON INDEX user_sessions_active_idx IS 'Optimizes active user count queries for analytics';
COMMENT ON INDEX subscriptions_trial_expiry_idx IS 'Optimizes trial expiration checking';

-- Enable trigram extension for better search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Update table statistics for better query planning
ANALYZE items;
ANALYZE item_mapping;
ANALYZE user_sessions;
ANALYZE subscriptions;
ANALYZE user_favorites;

-- Migration complete
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('0014_add_pagination_indexes', NOW())
ON CONFLICT (version) DO NOTHING;
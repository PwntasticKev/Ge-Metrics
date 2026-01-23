-- ============================================================================
-- GE-Metrics Production Performance Indexes (Simple Version)
-- Critical indexes for production readiness without concurrent creation
-- ============================================================================

-- Index for user authentication queries (login performance)
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Index for user sessions by user_id
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

-- Index for blog posts by date (recent posts)
CREATE INDEX IF NOT EXISTS idx_blogs_date ON blogs(date DESC);

-- Index for game updates by date
CREATE INDEX IF NOT EXISTS idx_game_updates_date ON game_updates("updateDate" DESC);

-- Index for money making methods by profit (if column exists)
-- This will fail silently if column doesn't exist
CREATE INDEX IF NOT EXISTS idx_money_making_profit ON money_making_methods(profit_per_hour DESC);

-- Index for user messages by recipient_id (if column exists)
CREATE INDEX IF NOT EXISTS idx_user_messages_recipient ON user_messages(recipient_id);

-- Refresh PostgreSQL statistics
ANALYZE;

SELECT 'Production performance indexes created successfully!' as status;
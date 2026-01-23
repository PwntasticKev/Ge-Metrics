-- ============================================================================
-- GE-Metrics Production Performance Indexes
-- Created for production readiness - critical indexes for existing tables only
-- ============================================================================

-- Performance indexes for existing tables based on current schema

-- ============================================================================
-- Users table indexes (authentication performance)
-- ============================================================================

-- Index for user authentication queries (login performance)
-- Speeds up user lookup during authentication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower 
        ON users(LOWER(email));
        
        RAISE NOTICE 'Created index on users.email for authentication';
    END IF;
END $$;

-- ============================================================================
-- User Sessions table indexes (session management)
-- ============================================================================

-- Index for session management (authentication & security)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
        -- Check if expires_at column exists before creating index
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'user_sessions' AND column_name = 'expires_at') THEN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_expires 
            ON user_sessions(expires_at);
            
            RAISE NOTICE 'Created index on user_sessions.expires_at';
        END IF;
        
        -- Index for user-specific session queries
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'user_sessions' AND column_name = 'user_id') THEN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user 
            ON user_sessions(user_id);
            
            RAISE NOTICE 'Created index on user_sessions.user_id';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- Blog posts indexes (content performance)
-- ============================================================================

-- Index for blog posts by date (for recent posts queries)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blogs') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blogs_date 
        ON blogs(date DESC);
        
        RAISE NOTICE 'Created index on blogs.date';
    END IF;
END $$;

-- ============================================================================
-- Game updates indexes (content performance)
-- ============================================================================

-- Index for game updates by date
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_updates') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_updates_date 
        ON game_updates("updateDate" DESC);
        
        RAISE NOTICE 'Created index on game_updates.updateDate';
    END IF;
END $$;

-- ============================================================================
-- User messages indexes (messaging performance)
-- ============================================================================

-- Index for user messages by recipient and timestamp
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_messages') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'user_messages' AND column_name = 'recipient_id') THEN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_messages_recipient 
            ON user_messages(recipient_id);
            
            RAISE NOTICE 'Created index on user_messages.recipient_id';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- Money making methods indexes (performance for trading queries)
-- ============================================================================

-- Index for money making methods by profitability
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'money_making_methods') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'money_making_methods' AND column_name = 'profit_per_hour') THEN
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_money_making_profit 
            ON money_making_methods(profit_per_hour DESC);
            
            RAISE NOTICE 'Created index on money_making_methods.profit_per_hour';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- Refresh database statistics
-- ============================================================================

-- Refresh PostgreSQL statistics after creating indexes
-- This ensures the query planner uses the new indexes optimally
ANALYZE;

-- Final completion message
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Production performance indexes created successfully for existing tables. Database ready for increased traffic.';
END $$;
-- Migration 005: Community System Tables
-- This migration adds all tables needed for the community leaderboard, clan system, and social features

-- User profits and statistics tracking
CREATE TABLE user_profits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_profit BIGINT DEFAULT 0 NOT NULL,
    weekly_profit BIGINT DEFAULT 0 NOT NULL,
    monthly_profit BIGINT DEFAULT 0 NOT NULL,
    total_trades INTEGER DEFAULT 0 NOT NULL,
    best_single_flip BIGINT DEFAULT 0 NOT NULL,
    current_rank INTEGER,
    last_rank_update TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Indexes for performance
    INDEX idx_user_profits_user_id (user_id),
    INDEX idx_user_profits_total_profit (total_profit DESC),
    INDEX idx_user_profits_weekly_profit (weekly_profit DESC),
    INDEX idx_user_profits_rank (current_rank)
);

-- Individual trade tracking for profit calculations
CREATE TABLE user_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    buy_price BIGINT NOT NULL,
    sell_price BIGINT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    profit BIGINT NOT NULL, -- (sell_price - buy_price) * quantity
    trade_date TIMESTAMP DEFAULT NOW() NOT NULL,
    notes TEXT,
    
    -- Indexes for performance
    INDEX idx_user_trades_user_id (user_id),
    INDEX idx_user_trades_item_id (item_id),
    INDEX idx_user_trades_trade_date (trade_date DESC),
    INDEX idx_user_trades_profit (profit DESC)
);

-- Clans/Groups system
CREATE TABLE clans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_private BOOLEAN DEFAULT FALSE NOT NULL,
    max_members INTEGER DEFAULT 50 NOT NULL,
    total_profit BIGINT DEFAULT 0 NOT NULL,
    weekly_profit BIGINT DEFAULT 0 NOT NULL,
    monthly_profit BIGINT DEFAULT 0 NOT NULL,
    current_rank INTEGER,
    last_rank_update TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Indexes
    INDEX idx_clans_name (name),
    INDEX idx_clans_leader_id (leader_id),
    INDEX idx_clans_total_profit (total_profit DESC),
    INDEX idx_clans_rank (current_rank)
);

-- Clan membership
CREATE TABLE clan_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' NOT NULL, -- 'leader', 'admin', 'member'
    joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
    contribution_profit BIGINT DEFAULT 0 NOT NULL,
    
    -- Unique constraint to prevent duplicate memberships
    UNIQUE (clan_id, user_id),
    
    -- Indexes
    INDEX idx_clan_members_clan_id (clan_id),
    INDEX idx_clan_members_user_id (user_id),
    INDEX idx_clan_members_role (role)
);

-- Clan invitations
CREATE TABLE clan_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL if user doesn't exist yet
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- 'pending', 'accepted', 'rejected', 'expired'
    message TEXT,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days') NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Prevent duplicate invites
    UNIQUE (clan_id, invited_email, status),
    
    -- Indexes
    INDEX idx_clan_invites_clan_id (clan_id),
    INDEX idx_clan_invites_inviter_id (inviter_id),
    INDEX idx_clan_invites_invited_email (invited_email),
    INDEX idx_clan_invites_status (status),
    INDEX idx_clan_invites_expires_at (expires_at)
);

-- User achievements/badges
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL, -- 'rank_tier', 'trade_milestone', 'profit_milestone', etc.
    achievement_key VARCHAR(100) NOT NULL, -- 'bronze_rank', 'first_million', 'hundred_trades', etc.
    achievement_name VARCHAR(255) NOT NULL,
    achievement_description TEXT,
    unlocked_at TIMESTAMP DEFAULT NOW() NOT NULL,
    progress_value BIGINT, -- For tracking progress toward achievements
    
    -- Prevent duplicate achievements
    UNIQUE (user_id, achievement_key),
    
    -- Indexes
    INDEX idx_user_achievements_user_id (user_id),
    INDEX idx_user_achievements_type (achievement_type),
    INDEX idx_user_achievements_unlocked_at (unlocked_at DESC)
);

-- Friend invitations (general friend system)
CREATE TABLE friend_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- 'pending', 'accepted', 'rejected', 'expired'
    message TEXT,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days') NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Prevent duplicate invites
    UNIQUE (inviter_id, invited_email, status),
    
    -- Indexes
    INDEX idx_friend_invites_inviter_id (inviter_id),
    INDEX idx_friend_invites_invited_email (invited_email),
    INDEX idx_friend_invites_status (status)
);

-- User friendships (after invitation accepted)
CREATE TABLE user_friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Ensure friendship is bidirectional and unique
    UNIQUE (user1_id, user2_id),
    CHECK (user1_id < user2_id), -- Enforce ordering to prevent duplicates
    
    -- Indexes
    INDEX idx_user_friendships_user1 (user1_id),
    INDEX idx_user_friendships_user2 (user2_id)
);

-- User watchlists (enhanced from existing)
CREATE TABLE user_watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    target_buy_price BIGINT,
    target_sell_price BIGINT,
    alert_price_drop BOOLEAN DEFAULT FALSE,
    alert_price_rise BOOLEAN DEFAULT FALSE,
    alert_volume_spike BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Prevent duplicate watchlist items
    UNIQUE (user_id, item_id),
    
    -- Indexes
    INDEX idx_user_watchlists_user_id (user_id),
    INDEX idx_user_watchlists_item_id (item_id)
);

-- User trading goals/targets
CREATE TABLE user_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL, -- 'daily_profit', 'weekly_profit', 'rank_target', 'item_goal'
    goal_name VARCHAR(255) NOT NULL,
    target_value BIGINT NOT NULL,
    current_progress BIGINT DEFAULT 0 NOT NULL,
    deadline TIMESTAMP,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Indexes
    INDEX idx_user_goals_user_id (user_id),
    INDEX idx_user_goals_type (goal_type),
    INDEX idx_user_goals_deadline (deadline),
    INDEX idx_user_goals_completed (is_completed)
);

-- Audit log for profit tracking (to prevent gaming the system)
CREATE TABLE profit_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'trade_added', 'trade_edited', 'trade_deleted', 'profit_adjusted'
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Indexes
    INDEX idx_profit_audit_log_user_id (user_id),
    INDEX idx_profit_audit_log_action (action),
    INDEX idx_profit_audit_log_created_at (created_at DESC)
);

-- Create triggers for automatic profit calculation updates
CREATE OR REPLACE FUNCTION update_user_profits()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user_profits table when trades are added/modified/deleted
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO user_profits (user_id, total_profit, weekly_profit, monthly_profit)
        VALUES (NEW.user_id, NEW.profit, 
                CASE WHEN NEW.trade_date >= NOW() - INTERVAL '7 days' THEN NEW.profit ELSE 0 END,
                CASE WHEN NEW.trade_date >= NOW() - INTERVAL '30 days' THEN NEW.profit ELSE 0 END)
        ON CONFLICT (user_id) DO UPDATE SET
            total_profit = user_profits.total_profit + NEW.profit - COALESCE(OLD.profit, 0),
            weekly_profit = (
                SELECT COALESCE(SUM(profit), 0) 
                FROM user_trades 
                WHERE user_id = NEW.user_id 
                AND trade_date >= NOW() - INTERVAL '7 days'
            ),
            monthly_profit = (
                SELECT COALESCE(SUM(profit), 0) 
                FROM user_trades 
                WHERE user_id = NEW.user_id 
                AND trade_date >= NOW() - INTERVAL '30 days'
            ),
            total_trades = user_profits.total_trades + 1,
            best_single_flip = GREATEST(user_profits.best_single_flip, NEW.profit),
            updated_at = NOW();
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE user_profits 
        SET total_profit = total_profit - OLD.profit,
            total_trades = total_trades - 1,
            weekly_profit = (
                SELECT COALESCE(SUM(profit), 0) 
                FROM user_trades 
                WHERE user_id = OLD.user_id 
                AND trade_date >= NOW() - INTERVAL '7 days'
            ),
            monthly_profit = (
                SELECT COALESCE(SUM(profit), 0) 
                FROM user_trades 
                WHERE user_id = OLD.user_id 
                AND trade_date >= NOW() - INTERVAL '30 days'
            ),
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_user_profits
    AFTER INSERT OR UPDATE OR DELETE ON user_trades
    FOR EACH ROW EXECUTE FUNCTION update_user_profits();

-- Function to update clan profits when member profits change
CREATE OR REPLACE FUNCTION update_clan_profits()
RETURNS TRIGGER AS $$
BEGIN
    -- Update clan total profits based on member contributions
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE clans 
        SET total_profit = (
                SELECT COALESCE(SUM(up.total_profit), 0)
                FROM clan_members cm
                JOIN user_profits up ON cm.user_id = up.user_id
                WHERE cm.clan_id = (
                    SELECT clan_id FROM clan_members WHERE user_id = NEW.user_id LIMIT 1
                )
            ),
            weekly_profit = (
                SELECT COALESCE(SUM(up.weekly_profit), 0)
                FROM clan_members cm
                JOIN user_profits up ON cm.user_id = up.user_id
                WHERE cm.clan_id = (
                    SELECT clan_id FROM clan_members WHERE user_id = NEW.user_id LIMIT 1
                )
            ),
            updated_at = NOW()
        WHERE id = (
            SELECT clan_id FROM clan_members WHERE user_id = NEW.user_id LIMIT 1
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_clan_profits
    AFTER INSERT OR UPDATE ON user_profits
    FOR EACH ROW EXECUTE FUNCTION update_clan_profits();

-- Create indexes for performance optimization
CREATE INDEX CONCURRENTLY idx_user_trades_user_profit ON user_trades(user_id, profit DESC);
CREATE INDEX CONCURRENTLY idx_user_trades_recent ON user_trades(user_id, trade_date DESC) 
    WHERE trade_date >= NOW() - INTERVAL '30 days';

-- Insert some initial achievement definitions
INSERT INTO user_achievements (user_id, achievement_type, achievement_key, achievement_name, achievement_description, unlocked_at)
SELECT 
    u.id,
    'welcome',
    'account_created',
    'Welcome to GE Metrics!',
    'Created your account and joined the community',
    u.created_at
FROM users u
ON CONFLICT (user_id, achievement_key) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE user_profits IS 'Tracks user profit statistics and leaderboard rankings';
COMMENT ON TABLE user_trades IS 'Individual trade records for profit calculation and audit trail';
COMMENT ON TABLE clans IS 'Clan/group system for community features';
COMMENT ON TABLE clan_members IS 'Clan membership relationships';
COMMENT ON TABLE clan_invites IS 'Pending clan invitations';
COMMENT ON TABLE user_achievements IS 'User achievements and badge system';
COMMENT ON TABLE friend_invites IS 'Friend invitation system';
COMMENT ON TABLE user_friendships IS 'Established friendships between users';
COMMENT ON TABLE user_goals IS 'User-defined trading goals and targets';
COMMENT ON TABLE profit_audit_log IS 'Audit trail for profit-related actions to prevent gaming';

-- Grant appropriate permissions (adjust based on your user roles)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user; 
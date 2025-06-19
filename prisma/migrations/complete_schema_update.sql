-- Complete Schema Migration for GE Metrics
-- This file contains all database schema updates for the new features

-- Update users table with new OTP and security fields
ALTER TABLE users 
ADD COLUMN phone_number VARCHAR(20),
ADD COLUMN otp_enabled BOOLEAN DEFAULT false,
ADD COLUMN otp_secret VARCHAR(255),
ADD COLUMN backup_codes TEXT,
ADD COLUMN master_password_hash VARCHAR(255);

-- Create OTP tokens table
CREATE TABLE otp_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(10) NOT NULL,
    token_type VARCHAR(20) NOT NULL DEFAULT 'login', -- 'login', 'setup', 'master_access'
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for OTP tokens
CREATE INDEX idx_otp_tokens_user_id ON otp_tokens(user_id);
CREATE INDEX idx_otp_tokens_token ON otp_tokens(token);
CREATE INDEX idx_otp_tokens_expires_at ON otp_tokens(expires_at);
CREATE INDEX idx_otp_tokens_token_type ON otp_tokens(token_type);

-- Create master access logs table
CREATE TABLE master_access_logs (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER NOT NULL,
    target_user_id INTEGER NOT NULL,
    access_reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_duration INTEGER, -- Duration in minutes
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for master access logs
CREATE INDEX idx_master_access_logs_admin_user_id ON master_access_logs(admin_user_id);
CREATE INDEX idx_master_access_logs_target_user_id ON master_access_logs(target_user_id);
CREATE INDEX idx_master_access_logs_created_at ON master_access_logs(created_at);

-- Create item price history table (if not exists)
CREATE TABLE IF NOT EXISTS item_price_history (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    high_price BIGINT,
    low_price BIGINT,
    volume BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for item price history
CREATE INDEX IF NOT EXISTS idx_item_price_history_item_id ON item_price_history(item_id);
CREATE INDEX IF NOT EXISTS idx_item_price_history_timestamp ON item_price_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_item_price_history_volume ON item_price_history(volume);
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_price_history_unique ON item_price_history(item_id, timestamp);

-- Create watchlist table (if not exists)
CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    volume_threshold BIGINT DEFAULT 10000,
    price_spike_threshold DECIMAL(5,2) DEFAULT 10.0,
    abnormal_activity BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for watchlist
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_item_id ON watchlist(item_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_abnormal_activity ON watchlist(abnormal_activity);
CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_user_item ON watchlist(user_id, item_id);

-- Create volume alerts table (if not exists)
CREATE TABLE IF NOT EXISTS volume_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- 'volume_dump', 'price_spike', 'abnormal_activity'
    message TEXT NOT NULL,
    email_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for volume alerts
CREATE INDEX IF NOT EXISTS idx_volume_alerts_user_id ON volume_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_volume_alerts_item_id ON volume_alerts(item_id);
CREATE INDEX IF NOT EXISTS idx_volume_alerts_alert_type ON volume_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_volume_alerts_created_at ON volume_alerts(created_at);

-- Create alert cooldowns table (if not exists)
CREATE TABLE IF NOT EXISTS alert_cooldowns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    last_alert_at TIMESTAMPTZ NOT NULL,
    cooldown_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for alert cooldowns
CREATE INDEX IF NOT EXISTS idx_alert_cooldowns_user_id ON alert_cooldowns(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_cooldowns_item_id ON alert_cooldowns(item_id);
CREATE INDEX IF NOT EXISTS idx_alert_cooldowns_alert_type ON alert_cooldowns(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_cooldowns_cooldown_until ON alert_cooldowns(cooldown_until);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_cooldowns_unique ON alert_cooldowns(user_id, item_id, alert_type);

-- Create abnormal activity patterns table (if not exists)
CREATE TABLE IF NOT EXISTS abnormal_activity_patterns (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL,
    avg_volume_24h BIGINT,
    avg_volume_7d BIGINT,
    avg_price_change_24h DECIMAL(10,4),
    price_volatility DECIMAL(10,4),
    volume_spike_threshold BIGINT,
    last_calculated TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for abnormal activity patterns
CREATE INDEX IF NOT EXISTS idx_abnormal_activity_patterns_item_id ON abnormal_activity_patterns(item_id);
CREATE INDEX IF NOT EXISTS idx_abnormal_activity_patterns_last_calculated ON abnormal_activity_patterns(last_calculated);
CREATE UNIQUE INDEX IF NOT EXISTS idx_abnormal_activity_patterns_unique ON abnormal_activity_patterns(item_id);

-- Add foreign key constraints (if they don't exist)
DO $$
BEGIN
    -- OTP tokens foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_otp_tokens_user_id'
    ) THEN
        ALTER TABLE otp_tokens 
        ADD CONSTRAINT fk_otp_tokens_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Master access logs foreign keys
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_master_access_logs_admin_user_id'
    ) THEN
        ALTER TABLE master_access_logs 
        ADD CONSTRAINT fk_master_access_logs_admin_user_id 
        FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_master_access_logs_target_user_id'
    ) THEN
        ALTER TABLE master_access_logs 
        ADD CONSTRAINT fk_master_access_logs_target_user_id 
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Watchlist foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_watchlist_user_id'
    ) THEN
        ALTER TABLE watchlist 
        ADD CONSTRAINT fk_watchlist_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Volume alerts foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_volume_alerts_user_id'
    ) THEN
        ALTER TABLE volume_alerts 
        ADD CONSTRAINT fk_volume_alerts_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Alert cooldowns foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_alert_cooldowns_user_id'
    ) THEN
        ALTER TABLE alert_cooldowns 
        ADD CONSTRAINT fk_alert_cooldowns_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create trigger to update updated_at timestamp on watchlist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_watchlist_updated_at ON watchlist;
CREATE TRIGGER update_watchlist_updated_at 
    BEFORE UPDATE ON watchlist 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired OTP tokens
CREATE OR REPLACE FUNCTION cleanup_expired_otp_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM otp_tokens WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up expired alert cooldowns
CREATE OR REPLACE FUNCTION cleanup_expired_alert_cooldowns()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM alert_cooldowns WHERE cooldown_until < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert sample master password hash (change this in production!)
-- This is SHA256 hash of "masterpassword123" - CHANGE THIS!
INSERT INTO users (master_password_hash) 
VALUES ('a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3')
ON CONFLICT DO NOTHING;

-- Create admin user if not exists
INSERT INTO users (
    name, 
    email, 
    role, 
    access, 
    created_at
) VALUES (
    'Super Admin',
    'admin@ge-metrics.com',
    'admin',
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE otp_tokens IS 'Stores temporary OTP tokens for two-factor authentication';
COMMENT ON TABLE master_access_logs IS 'Audit log for master password access attempts';
COMMENT ON TABLE item_price_history IS 'Historical price and volume data for items';
COMMENT ON TABLE watchlist IS 'User watchlists for volume and price monitoring';
COMMENT ON TABLE volume_alerts IS 'Alert history for volume dumps and price spikes';
COMMENT ON TABLE alert_cooldowns IS 'Cooldown periods to prevent spam alerts';
COMMENT ON TABLE abnormal_activity_patterns IS 'Statistical patterns for abnormal activity detection';

COMMENT ON COLUMN users.otp_enabled IS 'Whether two-factor authentication is enabled';
COMMENT ON COLUMN users.otp_secret IS 'TOTP secret for Google Authenticator';
COMMENT ON COLUMN users.backup_codes IS 'JSON array of backup codes for 2FA recovery';
COMMENT ON COLUMN users.master_password_hash IS 'SHA256 hash of master password for admin access';
COMMENT ON COLUMN users.phone_number IS 'Phone number for SMS OTP verification';

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Schema migration completed successfully!';
    RAISE NOTICE 'Tables created/updated:';
    RAISE NOTICE '- users (updated with OTP fields)';
    RAISE NOTICE '- otp_tokens (new)';
    RAISE NOTICE '- master_access_logs (new)';
    RAISE NOTICE '- item_price_history (created if not exists)';
    RAISE NOTICE '- watchlist (created if not exists)';
    RAISE NOTICE '- volume_alerts (created if not exists)';
    RAISE NOTICE '- alert_cooldowns (created if not exists)';
    RAISE NOTICE '- abnormal_activity_patterns (created if not exists)';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Change the master password hash in production!';
    RAISE NOTICE 'Current hash is for "masterpassword123"';
END $$; 
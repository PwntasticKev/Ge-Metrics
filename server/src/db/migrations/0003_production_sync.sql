-- Migration to sync production database with Drizzle schema
-- This updates the old Prisma tables to match the new Drizzle structure

-- Update users table to match Drizzle schema
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS salt TEXT,
ADD COLUMN IF NOT EXISTS google_id TEXT,
ADD COLUMN IF NOT EXISTS avatar TEXT,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS email_verification_token_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS password_reset_otp TEXT,
ADD COLUMN IF NOT EXISTS password_reset_otp_expires_at TIMESTAMP;

-- Update password_hash from existing password column if needed
UPDATE users SET password_hash = password WHERE password IS NOT NULL AND password_hash IS NULL;

-- Make old password column nullable since we're using password_hash now
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Add unique constraint on username if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_unique') THEN
        ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
    END IF;
END
$$;

-- Create indexes for users table if they don't exist
CREATE INDEX IF NOT EXISTS email_idx ON users (email);
CREATE INDEX IF NOT EXISTS username_idx ON users (username);
CREATE INDEX IF NOT EXISTS google_id_idx ON users (google_id);

-- Create auth_tokens table if it doesn't exist (for new auth system)
CREATE TABLE IF NOT EXISTS auth_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create settings table if it doesn't exist 
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    mailchimp_api_key TEXT,
    email_notifications BOOLEAN DEFAULT true,
    volume_alerts BOOLEAN DEFAULT true,
    price_drop_alerts BOOLEAN DEFAULT true,
    cooldown_period INTEGER DEFAULT 5,
    otp_enabled BOOLEAN DEFAULT false,
    otp_secret TEXT,
    otp_verified BOOLEAN DEFAULT false,
    role TEXT DEFAULT 'user',
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrate existing user data to settings table if needed
INSERT INTO settings (user_id, role, email_notifications, volume_alerts, price_drop_alerts, cooldown_period, otp_enabled, otp_verified, permissions)
SELECT 
    u.id,
    COALESCE(u.role, 'user'),
    true,
    true,
    true,
    5,
    COALESCE(u.otp_enabled, false),
    false,
    CASE 
        WHEN COALESCE(u.role, 'user') = 'admin' THEN 
            '{"admin": ["full_access"], "users": ["read", "write", "delete"], "system": ["read", "write"], "billing": ["read", "write"], "security": ["read", "write"]}'::jsonb
        ELSE 
            '{"users": ["read"], "system": ["read"]}'::jsonb
    END
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM settings s WHERE s.user_id = u.id)
ON CONFLICT DO NOTHING;

-- Update refresh_tokens table structure if it exists
DO $$
BEGIN
    -- Check if refresh_tokens table exists and update it
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refresh_tokens') THEN
        -- Add columns if they don't exist
        ALTER TABLE refresh_tokens 
        ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
        
        -- Update any missing data
        UPDATE refresh_tokens SET expires_at = created_at + INTERVAL '30 days' WHERE expires_at IS NULL;
    ELSE
        -- Create refresh_tokens table
        CREATE TABLE refresh_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            token TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        
        CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
        CREATE INDEX refresh_tokens_token_idx ON refresh_tokens (token);
    END IF;
END
$$;
-- Add optional columns to user_sessions table for enhanced session tracking
-- These columns are optional and the application will work without them

-- Add sessionToken column (alias for token, but kept separate if needed)
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS session_token TEXT;

-- Add location column for IP-based geolocation
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS location JSONB;

-- Add loginMethod column to track authentication method (email, google, etc.)
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS login_method TEXT DEFAULT 'email';

-- Add expiresAt column for session expiration tracking
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Create index on expires_at for efficient cleanup queries
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions(expires_at);

-- Create index on location for analytics queries
CREATE INDEX IF NOT EXISTS user_sessions_location_idx ON user_sessions USING GIN(location);

-- Create index on login_method for analytics
CREATE INDEX IF NOT EXISTS user_sessions_login_method_idx ON user_sessions(login_method);


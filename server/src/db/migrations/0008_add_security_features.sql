-- Add backup codes column to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS backup_codes JSONB;

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  last_activity TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Create indexes for user_sessions
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_token_idx ON user_sessions(token);
CREATE INDEX IF NOT EXISTS user_sessions_is_active_idx ON user_sessions(is_active);

-- Create login_history table
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  two_factor_used BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for login_history
CREATE INDEX IF NOT EXISTS login_history_user_id_idx ON login_history(user_id);
CREATE INDEX IF NOT EXISTS login_history_email_idx ON login_history(email);
CREATE INDEX IF NOT EXISTS login_history_success_idx ON login_history(success);
CREATE INDEX IF NOT EXISTS login_history_created_at_idx ON login_history(created_at);

-- Add email change fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_change_token TEXT,
ADD COLUMN IF NOT EXISTS email_change_token_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS pending_email TEXT;


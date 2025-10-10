-- URGENT FIX: Add missing columns to user_settings table
-- Copy and paste this ENTIRE block into your Neon console

-- First, let's see the current user_settings structure
\d user_settings;

-- Add the missing columns
ALTER TABLE user_settings ADD COLUMN role text DEFAULT 'user' NOT NULL;
ALTER TABLE user_settings ADD COLUMN permissions jsonb;

-- Set user ID 1 as admin (this will create the record if it doesn't exist)
INSERT INTO user_settings (
    user_id, 
    role, 
    email_notifications, 
    volume_alerts, 
    price_drop_alerts, 
    cooldown_period, 
    otp_enabled, 
    otp_verified,
    permissions
) VALUES (
    1, 
    'admin', 
    true, 
    true, 
    true, 
    5, 
    false, 
    false,
    '{"admin": ["full_access"]}'::jsonb
) ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    permissions = '{"admin": ["full_access"]}'::jsonb;

-- Verify the fix
SELECT * FROM user_settings WHERE user_id = 1;

-- Check the table structure now
\d user_settings;
-- Quick admin setup SQL script
-- Add role and permissions columns to user_settings if they don't exist

-- Check and add role column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='role') THEN
        ALTER TABLE user_settings ADD COLUMN role text DEFAULT 'user' NOT NULL;
    END IF;
END $$;

-- Check and add permissions column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='permissions') THEN
        ALTER TABLE user_settings ADD COLUMN permissions jsonb;
    END IF;
END $$;

-- Set user ID 1 as admin (create settings if not exists, update if exists)
INSERT INTO user_settings (
    user_id, 
    role, 
    email_notifications, 
    volume_alerts, 
    price_drop_alerts, 
    cooldown_period, 
    otp_enabled, 
    otp_verified,
    permissions,
    created_at,
    updated_at
) VALUES (
    1, 
    'admin', 
    true, 
    true, 
    true, 
    5, 
    false, 
    false,
    '{"users": ["read", "write", "delete"], "system": ["read", "write"], "billing": ["read", "write"], "logs": ["read"], "admin": ["full_access"]}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    permissions = '{"users": ["read", "write", "delete"], "system": ["read", "write"], "billing": ["read", "write"], "logs": ["read"], "admin": ["full_access"]}'::jsonb,
    updated_at = NOW();

-- Verify the setup
SELECT u.id, u.name, u.email, us.role, us.permissions 
FROM users u 
LEFT JOIN user_settings us ON u.id = us.user_id 
WHERE u.id = 1;
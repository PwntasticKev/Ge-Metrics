-- Manual Admin Setup SQL
-- Run these commands directly in your database to set up admin functionality

-- Step 1: Add role and permissions columns to user_settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' NOT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS permissions jsonb;

-- Step 2: Drop employees table if it exists (we don't need it anymore)
DROP TABLE IF EXISTS employees CASCADE;

-- Step 3: Set user ID 1 as admin (create or update user_settings record)
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

-- Step 4: Verify the setup
SELECT 
    u.id, 
    u.name, 
    u.email, 
    us.role, 
    us.permissions 
FROM users u 
LEFT JOIN user_settings us ON u.id = us.user_id 
WHERE u.id = 1;

-- Expected result:
-- id | name  | email                    | role  | permissions
-- 1  | Kevin | user@ge-metrics-test.com | admin | {"users": ["read",...]}
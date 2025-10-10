# 🚨 EMERGENCY DATABASE FIX

## The Problem
You still can't login because:
1. ❌ Database missing `role` and `permissions` columns in `user_settings`  
2. ❌ Code still had employee references (now fixed)

## 🛠️ IMMEDIATE SOLUTION

### Step 1: Open Your Neon Database Console
1. Go to https://console.neon.tech/
2. Select your Ge-Metrics project
3. Click "SQL Editor"

### Step 2: Run This SQL (Copy/Paste Exactly)
```sql
-- Check if columns exist first
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
  AND column_name IN ('role', 'permissions');

-- Add missing columns (if they don't exist)
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' NOT NULL;

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS permissions jsonb;

-- Drop employees table completely (we don't need it)
DROP TABLE IF EXISTS employees CASCADE;

-- Set user ID 1 as admin
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

-- Verify it worked
SELECT u.id, u.name, u.email, us.role, us.permissions
FROM users u
JOIN user_settings us ON u.id = us.user_id
WHERE u.id = 1;
```

### Step 3: Expected Output
After running the SQL, you should see:
```
id | name  | email                    | role  | permissions
1  | Kevin | user@ge-metrics-test.com | admin | {"admin": ["full_access"]}
```

### Step 4: Restart Your Server
```bash
# Stop your dev server (Ctrl+C)
# Then restart:
npm run dev
```

## ✅ What This Fixes
- ✅ Adds missing database columns
- ✅ Removes employees table dependency  
- ✅ Sets you as admin in user_settings
- ✅ Fixes login authentication
- ✅ Enables admin menu in navigation

## 🧪 Test After Fix
1. **Login** as Kevin (user@ge-metrics-test.com)
2. **Check console** - should see `user.role: 'admin'`
3. **Check navigation** - should see Admin menu
4. **Visit `/admin`** - should work without redirect

## ⚠️ If Still Doesn't Work
1. **Check browser console** for errors
2. **Verify SQL ran** - check Neon console for success message
3. **Clear browser cache** - hard refresh (Cmd+Shift+R)
4. **Check server logs** - look for any remaining employee references

**This should fix your login issue completely!** 🚀
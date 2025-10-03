# 🔐 Admin Setup Instructions

## The Problem
Your login is failing because the `user_settings` table doesn't have the `role` and `permissions` columns yet.

**Error**: `column "role" does not exist`

## ✅ What We've Fixed
- ✅ **Removed employees table** from schema (no longer needed)
- ✅ **Updated TRPC context** to use `user_settings.role`
- ✅ **Added admin routes** to navigation menu
- ✅ **Created manual setup SQL** script

## 🛠️ Manual Database Setup Required

### Step 1: Run This SQL In Your Database

Copy and paste this SQL into your database console (Neon, PgAdmin, etc.):

```sql
-- Add role and permissions columns to user_settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' NOT NULL;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS permissions jsonb;

-- Drop employees table (we don't need it anymore)
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
SELECT 
    u.id, 
    u.name, 
    u.email, 
    us.role, 
    us.permissions 
FROM users u 
LEFT JOIN user_settings us ON u.id = us.user_id 
WHERE u.id = 1;
```

### Step 2: Verify Setup

Run this to verify your admin is set up correctly:

```bash
cd server
npx tsx --env-file ../.env setup-admin.js
```

**Expected Output:**
```
✅ Found user: Kevin (user@ge-metrics-test.com)
✅ User is correctly set as admin!
Role: admin
Permissions: {"users": ["read", "write", "delete"], ...}
```

### Step 3: Test Login

1. **Login** as Kevin (user@ge-metrics-test.com)
2. **Check navigation** - You should see an "Admin" section in the left menu
3. **Visit `/admin`** - Should work without redirect
4. **Browser console** - `user.role` should show `"admin"`

## 🎯 Why This Approach?

**Before (Complex):**
```
Users Table → Employees Table (role) → Admin Check
```

**After (Simple):**
```
Users Table → User Settings (role) → Admin Check
```

**Benefits:**
- ✅ One less table to manage
- ✅ All user preferences in one place
- ✅ Simpler queries and relationships
- ✅ Easier role management

## 🚨 Troubleshooting

### If Login Still Fails:
1. **Check database** - Verify columns were added
2. **Check user_settings** - Ensure your user has role='admin'
3. **Restart server** - Schema changes might need server restart
4. **Clear browser cache** - Refresh auth tokens

### If Admin Menu Doesn't Appear:
1. **Check browser console** for user object
2. **Verify `user.role === 'admin'`**
3. **Check TRPC context** is reading from user_settings

Once you run the SQL script, everything should work perfectly! 🚀
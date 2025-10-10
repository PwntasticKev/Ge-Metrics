#!/usr/bin/env node

// Quick database fix script
import postgres from 'postgres'

// Neon connection string - replace with your actual connection string
const DATABASE_URL = process.env.DATABASE_URL || 'your-neon-connection-string-here'

console.log('🔧 Fixing database columns...')

async function fixDatabase() {
  try {
    const sql = postgres(DATABASE_URL)
    
    console.log('Step 1: Checking current table structure...')
    
    // Check if columns exist
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
      AND column_name IN ('role', 'permissions')
    `
    
    console.log('Existing columns:', columns.map(c => c.column_name))
    
    // Add role column if it doesn't exist
    if (!columns.some(c => c.column_name === 'role')) {
      console.log('Step 2: Adding role column...')
      await sql`ALTER TABLE user_settings ADD COLUMN role text DEFAULT 'user' NOT NULL`
      console.log('✅ Role column added')
    } else {
      console.log('✅ Role column already exists')
    }
    
    // Add permissions column if it doesn't exist
    if (!columns.some(c => c.column_name === 'permissions')) {
      console.log('Step 3: Adding permissions column...')
      await sql`ALTER TABLE user_settings ADD COLUMN permissions jsonb`
      console.log('✅ Permissions column added')
    } else {
      console.log('✅ Permissions column already exists')
    }
    
    console.log('Step 4: Setting user ID 1 as admin...')
    
    // Set user as admin
    await sql`
      INSERT INTO user_settings (
          user_id, role, email_notifications, volume_alerts, 
          price_drop_alerts, cooldown_period, otp_enabled, otp_verified, permissions
      ) VALUES (
          1, 'admin', true, true, true, 5, false, false, '{"admin": ["full_access"]}'::jsonb
      ) ON CONFLICT (user_id) DO UPDATE SET
          role = 'admin',
          permissions = '{"admin": ["full_access"]}'::jsonb
    `
    
    console.log('Step 5: Verifying setup...')
    const result = await sql`
      SELECT us.user_id, us.role, us.permissions, u.name, u.email
      FROM user_settings us
      JOIN users u ON u.id = us.user_id
      WHERE us.user_id = 1
    `
    
    console.log('🎉 Database fix complete!')
    console.log('Admin user:', result[0])
    console.log('')
    console.log('✅ You should now be able to login!')
    console.log('✅ Admin menu will appear in navigation')
    console.log('✅ All admin routes will work')
    
    await sql.end()
  } catch (error) {
    console.error('❌ Error fixing database:', error)
    console.log('')
    console.log('💡 If this fails, please run the SQL manually in your Neon console:')
    console.log('   1. Go to https://console.neon.tech/')
    console.log('   2. Open SQL Editor')
    console.log('   3. Run the commands in URGENT_FIX.sql')
  }
}

fixDatabase()
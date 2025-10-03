#!/usr/bin/env node

// Direct database fix - adds missing columns
import { Client } from 'pg'
import { config } from './src/config/index.js'

console.log('🔧 Fixing database columns directly...')

async function fixDatabaseColumns() {
  const client = new Client({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    // Check current table structure
    console.log('📋 Checking current user_settings table structure...')
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
      ORDER BY ordinal_position
    `)
    
    console.log('Current columns:')
    tableInfo.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`)
    })

    // Check if role column exists
    const roleExists = tableInfo.rows.some(row => row.column_name === 'role')
    const permissionsExists = tableInfo.rows.some(row => row.column_name === 'permissions')

    // Add role column if missing
    if (!roleExists) {
      console.log('➕ Adding role column...')
      await client.query(`
        ALTER TABLE user_settings 
        ADD COLUMN role text DEFAULT 'user' NOT NULL
      `)
      console.log('✅ Role column added')
    } else {
      console.log('✅ Role column already exists')
    }

    // Add permissions column if missing
    if (!permissionsExists) {
      console.log('➕ Adding permissions column...')
      await client.query(`
        ALTER TABLE user_settings 
        ADD COLUMN permissions jsonb
      `)
      console.log('✅ Permissions column added')
    } else {
      console.log('✅ Permissions column already exists')
    }

    // Set user ID 1 as admin
    console.log('👑 Setting user ID 1 as admin...')
    const upsertResult = await client.query(`
      INSERT INTO user_settings (
        user_id, role, email_notifications, volume_alerts, 
        price_drop_alerts, cooldown_period, otp_enabled, otp_verified, permissions
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) ON CONFLICT (user_id) DO UPDATE SET
        role = $2,
        permissions = $9,
        updated_at = NOW()
      RETURNING *
    `, [
      1, // user_id
      'admin', // role
      true, // email_notifications
      true, // volume_alerts
      true, // price_drop_alerts
      5, // cooldown_period
      false, // otp_enabled
      false, // otp_verified
      JSON.stringify({ admin: ['full_access'] }) // permissions
    ])

    console.log('✅ Admin user settings created/updated:')
    console.log(upsertResult.rows[0])

    // Verify the setup
    console.log('🔍 Verifying admin setup...')
    const verification = await client.query(`
      SELECT u.id, u.name, u.email, us.role, us.permissions
      FROM users u
      JOIN user_settings us ON u.id = us.user_id
      WHERE u.id = 1
    `)

    if (verification.rows.length > 0) {
      console.log('🎉 Admin setup verified:')
      console.log(verification.rows[0])
    } else {
      console.log('❌ Admin setup verification failed')
    }

    console.log('✅ Database fix completed!')
    console.log('🔄 Please restart your server and try logging in again')

  } catch (error) {
    console.error('❌ Error fixing database:', error)
  } finally {
    await client.end()
  }
}

fixDatabaseColumns()
#!/usr/bin/env node

/**
 * FINAL DATABASE MIGRATION - BOTH LOCAL AND PRODUCTION
 * 
 * This script fixes the authentication issues by:
 * 1. Adding missing role and permissions columns to user_settings
 * 2. Removing employees table dependency completely
 * 3. Setting up proper admin user (ID 1) with full permissions
 * 4. Verifying the migration worked correctly
 */

import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

console.log('🚀 Starting FINAL database migration for BOTH environments...')
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`🔗 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Missing URL'}`)

async function runFinalMigration() {
  // Use the correct database URL if available (for Vercel)
  const databaseUrl = process.env.CORRECT_DATABASE_URL || process.env.DATABASE_URL
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    // STEP 1: Check current table structure
    console.log('\n📋 STEP 1: Analyzing current database structure...')
    
    const userSettingsInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
      ORDER BY ordinal_position
    `)
    
    console.log('Current user_settings columns:')
    userSettingsInfo.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`)
    })

    // Check if employees table exists
    const employeesExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'employees'
      )
    `)
    
    if (employeesExists.rows[0].exists) {
      console.log('⚠️  Employees table still exists - will be removed')
    } else {
      console.log('✅ Employees table already removed')
    }

    // STEP 2: Add missing columns to user_settings
    console.log('\n📋 STEP 2: Adding missing columns to user_settings...')
    
    const roleExists = userSettingsInfo.rows.some(row => row.column_name === 'role')
    const permissionsExists = userSettingsInfo.rows.some(row => row.column_name === 'permissions')

    if (!roleExists) {
      console.log('➕ Adding role column...')
      await client.query(`
        ALTER TABLE user_settings 
        ADD COLUMN role text DEFAULT 'user' NOT NULL
      `)
      console.log('✅ Role column added successfully')
    } else {
      console.log('✅ Role column already exists')
    }

    if (!permissionsExists) {
      console.log('➕ Adding permissions column...')
      await client.query(`
        ALTER TABLE user_settings 
        ADD COLUMN permissions jsonb
      `)
      console.log('✅ Permissions column added successfully')
    } else {
      console.log('✅ Permissions column already exists')
    }

    // STEP 3: Remove employees table completely
    console.log('\n📋 STEP 3: Removing employees table dependency...')
    
    if (employeesExists.rows[0].exists) {
      await client.query(`DROP TABLE IF EXISTS employees CASCADE`)
      console.log('✅ Employees table removed successfully')
    }

    // STEP 4: Create/update admin user settings
    console.log('\n📋 STEP 4: Setting up admin user (ID 1)...')
    
    // First check if user ID 1 exists
    const user1Exists = await client.query(`
      SELECT id, email, name FROM users WHERE id = 1
    `)
    
    if (user1Exists.rows.length === 0) {
      console.log('❌ User ID 1 does not exist. Creating admin user...')
      
      // Create admin user if doesn't exist
      await client.query(`
        INSERT INTO users (email, username, name, password_hash, salt) 
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
      `, [
        'admin@ge-metrics-test.com',
        'admin',
        'System Administrator', 
        '$2a$10$dummy.hash.for.admin.user.placeholder',
        'dummy_salt'
      ])
      
      console.log('✅ Admin user created')
    } else {
      console.log(`✅ User ID 1 exists: ${user1Exists.rows[0].email}`)
    }

    // Create/update admin user settings
    const adminSettings = await client.query(`
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
      JSON.stringify({
        admin: ['full_access'],
        users: ['read', 'write', 'delete'],
        billing: ['read', 'write'],
        system: ['read', 'write'],
        security: ['read', 'write']
      })
    ])

    console.log('✅ Admin user settings created/updated:')
    console.log(`   User ID: ${adminSettings.rows[0].user_id}`)
    console.log(`   Role: ${adminSettings.rows[0].role}`)
    console.log(`   Permissions:`, adminSettings.rows[0].permissions)

    // STEP 5: Verify the complete setup
    console.log('\n📋 STEP 5: Verifying complete admin setup...')
    
    const finalVerification = await client.query(`
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        us.role, 
        us.permissions,
        us.created_at,
        us.updated_at
      FROM users u
      JOIN user_settings us ON u.id = us.user_id
      WHERE u.id = 1
    `)

    if (finalVerification.rows.length > 0) {
      const admin = finalVerification.rows[0]
      console.log('🎉 ADMIN SETUP VERIFIED SUCCESSFULLY:')
      console.log(`   ID: ${admin.id}`)
      console.log(`   Email: ${admin.email}`)
      console.log(`   Name: ${admin.name}`)
      console.log(`   Role: ${admin.role}`)
      console.log(`   Permissions: ${JSON.stringify(admin.permissions, null, 2)}`)
      console.log(`   Created: ${admin.created_at}`)
      console.log(`   Updated: ${admin.updated_at}`)
    } else {
      throw new Error('❌ Admin setup verification failed - no admin user found')
    }

    // STEP 6: Verify table structure is correct
    console.log('\n📋 STEP 6: Final table structure verification...')
    
    const finalStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
      ORDER BY ordinal_position
    `)
    
    console.log('✅ Final user_settings table structure:')
    finalStructure.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${row.column_default ? `default: ${row.column_default}` : ''}`)
    })

    // Check for any remaining employees references
    const employeesTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'employees'
      )
    `)
    
    if (employeesTableCheck.rows[0].exists) {
      console.log('❌ WARNING: Employees table still exists!')
    } else {
      console.log('✅ Employees table successfully removed')
    }

    console.log('\n🎉 FINAL DATABASE MIGRATION COMPLETED SUCCESSFULLY!')
    console.log('🔄 Next steps:')
    console.log('   1. Restart your server: npm run dev')
    console.log('   2. Try logging in with admin credentials')
    console.log('   3. Code will now use proper database authentication')
    console.log('\n✅ Database is ready for production!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('Stack trace:', error.stack)
    throw error
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

// Run the migration
runFinalMigration()
  .then(() => {
    console.log('\n🚀 Migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error.message)
    process.exit(1)
  })
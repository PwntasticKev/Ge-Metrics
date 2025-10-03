#!/usr/bin/env node

import postgres from 'postgres'
import { readFileSync } from 'fs'
import { config } from './src/config/index.js'

console.log('🔧 Running admin setup SQL...')

async function runSQL() {
  try {
    // Create a postgres connection
    const sql = postgres(config.DATABASE_URL)
    
    console.log('Adding role column...')
    await sql`
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='role') THEN
              ALTER TABLE user_settings ADD COLUMN role text DEFAULT 'user' NOT NULL;
          END IF;
      END $$;
    `
    
    console.log('Adding permissions column...')
    await sql`
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='permissions') THEN
              ALTER TABLE user_settings ADD COLUMN permissions jsonb;
          END IF;
      END $$;
    `
    
    console.log('Setting user ID 1 as admin...')
    await sql`
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
          ${'{"users": ["read", "write", "delete"], "system": ["read", "write"], "billing": ["read", "write"], "logs": ["read"], "admin": ["full_access"]}'},
          NOW(),
          NOW()
      ) ON CONFLICT (user_id) DO UPDATE SET
          role = 'admin',
          permissions = ${'{"users": ["read", "write", "delete"], "system": ["read", "write"], "billing": ["read", "write"], "logs": ["read"], "admin": ["full_access"]}'},
          updated_at = NOW();
    `
    
    console.log('Verifying setup...')
    const result = await sql`
      SELECT u.id, u.name, u.email, us.role, us.permissions 
      FROM users u 
      LEFT JOIN user_settings us ON u.id = us.user_id 
      WHERE u.id = 1;
    `
    
    console.log('✅ Admin setup completed successfully!')
    console.log('Admin user:', result[0])
    
    await sql.end()
  } catch (error) {
    console.error('❌ Error running SQL:', error)
  }
}

runSQL()
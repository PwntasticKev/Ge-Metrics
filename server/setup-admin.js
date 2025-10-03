#!/usr/bin/env node

// Simple script to verify admin setup
import { db, userSettings, users } from './src/db/index.ts'
import { eq } from 'drizzle-orm'

console.log('🔧 Checking admin user setup...')

async function checkAdmin() {
  try {
    // Check if user ID 1 exists
    const [user] = await db.select().from(users).where(eq(users.id, 1)).limit(1)
    
    if (!user) {
      console.log('❌ User ID 1 does not exist.')
      return
    }
    
    console.log(`✅ Found user: ${user.name} (${user.email})`)
    
    // Check user settings
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, 1)).limit(1)
    
    if (!settings) {
      console.log('❌ No user settings found. Run the manual SQL script first.')
      return
    }
    
    console.log('🎉 Admin check complete!')
    console.log(`   User: ${user.name} (${user.email})`)
    console.log(`   Role: ${settings.role}`)
    console.log(`   Permissions: ${JSON.stringify(settings.permissions, null, 2)}`)
    
    if (settings.role === 'admin') {
      console.log('✅ User is correctly set as admin!')
    } else {
      console.log('❌ User is not admin. Run the manual SQL script.')
    }
    
  } catch (error) {
    console.error('❌ Error checking admin:', error)
    console.log('💡 This likely means the role/permissions columns don\'t exist yet.')
    console.log('   Please run the MANUAL_ADMIN_SETUP.sql script in your database.')
  }
}

checkAdmin()
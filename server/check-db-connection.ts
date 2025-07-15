#!/usr/bin/env node

import { db } from './src/db/index.js'
import { config } from './src/config/index.js'

console.log('🔍 Checking Ge-Metrics Database Connection...\n')

// Parse database URL to extract connection details
const dbUrl = config.DATABASE_URL
const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)

if (urlMatch) {
  const [, username, password, host, port, database] = urlMatch

  console.log('📊 Database Connection Details for Postico:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Host:     ${host}`)
  console.log(`Port:     ${port}`)
  console.log(`Database: ${database}`)
  console.log(`Username: ${username}`)
  console.log(`Password: ${password}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
} else {
  console.log('⚠️  Could not parse database URL format')
  console.log(`URL: ${dbUrl}\n`)
}

// Test connection
try {
  const result = await db.execute('SELECT version() as version, current_database() as database, current_user as user')
  console.log('✅ Database connection successful!')
  console.log(`📋 Database: ${result[0].database}`)
  console.log(`👤 User: ${result[0].user}`)
  console.log(`🔧 Version: ${result[0].version.split(' ')[0]} ${result[0].version.split(' ')[1]}`)

  // Check if tables exist
  console.log('\n📋 Checking table schemas...')
  const tables = [
    'users', 'refresh_tokens', 'subscriptions', 'user_watchlists',
    'user_transactions', 'favorites', 'item_mapping', 'item_price_history',
    'game_updates', 'user_profits', 'user_trades', 'user_achievements',
    'user_goals', 'friend_invites', 'user_friendships', 'clans',
    'clan_members', 'clan_invites', 'profit_audit_log'
  ]

  for (const table of tables) {
    try {
      await db.execute(`SELECT 1 FROM ${table} LIMIT 1`)
      console.log(`  ✅ ${table}`)
    } catch (error) {
      console.log(`  ❌ ${table} - ${error.message}`)
    }
  }

  console.log('\n🎉 Database is ready for Postico connection!')
  console.log('\n📝 Instructions:')
  console.log('1. Open Postico 2')
  console.log('2. Click "New Connection"')
  console.log('3. Use the connection details above')
  console.log('4. Test the connection')
  console.log('5. Run the full CRUD test suite with: npm run test:db')
} catch (error) {
  console.log('❌ Database connection failed!')
  console.log(`Error: ${error.message}`)
  console.log('\n🔧 Troubleshooting:')
  console.log('1. Make sure PostgreSQL is running')
  console.log('2. Check your .env file has correct DATABASE_URL')
  console.log('3. Verify database exists: createdb auth_db')
  console.log('4. Run database setup: ./setup-database.sh')
}

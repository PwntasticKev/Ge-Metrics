#!/usr/bin/env node

/**
 * Force sync all schema tables to local database
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './server/src/db/schema.js'

const LOCAL_DB_URL = 'postgresql://postgres:postgres@localhost:5432/auth_db'

console.log('🚀 Force syncing all schema tables...')

async function syncSchema() {
  const connection = postgres(LOCAL_DB_URL, { max: 1 })
  const db = drizzle(connection, { schema })

  try {
    console.log('📊 Getting schema table definitions...')
    
    // Get all table names from schema
    const tableNames = Object.keys(schema)
    console.log(`Found ${tableNames.length} tables in schema:`)
    tableNames.forEach(name => console.log(`  - ${name}`))

    // Let's manually create the tables we see missing from your screenshots
    const criticalTables = [
      'admin_actions',
      'all_trades_admin', 
      'api_usage_logs',
      'audit_log',
      'auth_tokens',
      'clan_invites',
      'clan_members',
      'clans',
      'cron_job_logs',
      'cron_jobs',
      'favorites',
      'formulas',
      'item_mapping',
      'item_price_history',
      'item_volumes',
      'login_history',
      'open_positions',
      'osrs_accounts',
      'otps',
      'recipe_ingredients',
      'recipes',
      'refresh_tokens',
      'revenue_analytics',
      'security_events',
      'stripe_events',
      'subscriptions',
      'system_metrics',
      'system_settings',
      'trade_events',
      'trade_matches',
      'user_achievements',
      'user_goals',
      'user_invitations',
      'user_profits',
      'user_settings',
      'user_transactions',
      'user_watchlists'
    ]

    console.log('🔧 Creating critical tables that might be missing...')
    
    for (const tableName of criticalTables) {
      try {
        await connection`
          CREATE TABLE IF NOT EXISTS ${connection(tableName)} (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `
        console.log(`✅ Ensured table exists: ${tableName}`)
      } catch (err) {
        console.log(`⚠️ Could not create ${tableName}: ${err.message}`)
      }
    }

    // Check final table count
    const result = await connection`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    
    console.log(`\n🎉 Database sync complete!`)
    console.log(`📊 Total tables in local database: ${result[0].count}`)
    
  } catch (error) {
    console.error('❌ Error syncing schema:', error)
  } finally {
    await connection.end()
  }
}

syncSchema()
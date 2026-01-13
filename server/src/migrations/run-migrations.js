#!/usr/bin/env node

/**
 * Database Migration Runner
 * Purpose: Apply database migrations for notifications and messaging system
 * Usage: node run-migrations.js [--rollback]
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL || process.env.CORRECT_DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or CORRECT_DATABASE_URL environment variable is required')
  process.exit(1)
}

console.log('🔗 Connecting to database...')

const sql = postgres(DATABASE_URL, {
  max: 1, // Single connection for migrations
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false
})

async function runMigrations() {
  try {
    console.log('📋 Starting database migrations...')
    
    // Check if migrations table exists
    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    // Check which migrations have been applied
    const appliedMigrations = await sql`
      SELECT name FROM _migrations ORDER BY applied_at ASC
    `
    const appliedNames = new Set(appliedMigrations.map(row => row.name))
    
    // Migration files in order
    const migrations = [
      '001_create_notifications_table.sql',
      '002_create_user_messages_table.sql'
    ]
    
    for (const migrationFile of migrations) {
      if (appliedNames.has(migrationFile)) {
        console.log(`⏭️  Skipping ${migrationFile} (already applied)`)
        continue
      }
      
      console.log(`🔄 Applying migration: ${migrationFile}`)
      
      const migrationSQL = readFileSync(join(__dirname, migrationFile), 'utf8')
      
      await sql.begin(async sql => {
        // Execute the migration
        await sql.unsafe(migrationSQL)
        
        // Record that this migration was applied
        await sql`
          INSERT INTO _migrations (name) VALUES (${migrationFile})
        `
        
        console.log(`✅ Successfully applied: ${migrationFile}`)
      })
    }
    
    console.log('🎉 All migrations completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

async function runRollback() {
  try {
    console.log('🔄 Starting rollback...')
    
    const rollbackSQL = readFileSync(join(__dirname, 'rollback_notifications_and_messages.sql'), 'utf8')
    
    await sql.begin(async sql => {
      // Execute rollback
      await sql.unsafe(rollbackSQL)
      
      // Remove migration records
      await sql`
        DELETE FROM _migrations 
        WHERE name IN ('001_create_notifications_table.sql', '002_create_user_messages_table.sql')
      `
      
      console.log('✅ Rollback completed successfully!')
    })
    
  } catch (error) {
    console.error('❌ Rollback failed:', error)
    process.exit(1)
  }
}

// Main execution
const args = process.argv.slice(2)
const isRollback = args.includes('--rollback')

if (isRollback) {
  await runRollback()
} else {
  await runMigrations()
}

await sql.end()
process.exit(0)
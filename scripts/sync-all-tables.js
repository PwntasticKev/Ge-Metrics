#!/usr/bin/env node

/**
 * Complete Database Migration Script
 * Copies ALL missing tables from production to local with full schema
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

const execAsync = promisify(exec)

const LOCAL_DB_URL = 'postgresql://postgres:postgres@localhost:5432/auth_db'
const PROD_DB_URL = 'postgres://neondb_owner:npg_iQY84EglFCPR@ep-summer-term-afp8o014-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require'

console.log('🚀 Complete Database Schema Sync Tool\n')

/**
 * Get complete schema dump from production
 */
async function dumpProductionSchema() {
  try {
    console.log('📥 Dumping production schema...')
    const { stdout } = await execAsync(`pg_dump "${PROD_DB_URL}" --schema-only --no-owner --no-privileges`)
    return stdout
  } catch (error) {
    console.error('❌ Failed to dump production schema:', error.message)
    throw error
  }
}

/**
 * Get list of tables from database
 */
async function getTables(dbUrl) {
  try {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `
    const { stdout } = await execAsync(`DATABASE_URL="${dbUrl}" psql -t -c "${query}"`)
    return stdout.split('\n').filter(line => line.trim()).map(line => line.trim())
  } catch (error) {
    console.error('❌ Failed to get tables:', error.message)
    return []
  }
}

/**
 * Apply schema to local database
 */
async function applySchemaToLocal(schemaSQL) {
  try {
    console.log('📝 Applying schema to local database...')
    
    // Save schema to file for inspection
    const fs = await import('fs')
    fs.writeFileSync('./production-schema.sql', schemaSQL)
    console.log('💾 Production schema saved to: production-schema.sql')
    
    // Apply schema (this will skip existing tables/columns)
    const { stdout, stderr } = await execAsync(`DATABASE_URL="${LOCAL_DB_URL}" psql -f production-schema.sql`)
    
    if (stderr && !stderr.includes('already exists')) {
      console.error('⚠️ Schema application warnings:', stderr)
    }
    
    console.log('✅ Schema applied successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to apply schema:', error.message)
    return false
  }
}

/**
 * Run all database migrations
 */
async function runMigrations() {
  try {
    console.log('🔄 Running drizzle migrations...')
    const { stdout, stderr } = await execAsync(`cd server && DATABASE_URL="${LOCAL_DB_URL}" npx drizzle-kit push`)
    console.log('Drizzle output:', stdout)
    if (stderr) console.log('Drizzle stderr:', stderr)
  } catch (error) {
    console.log('⚠️ Drizzle migrations completed with notes:', error.message)
  }
}

/**
 * Insert test data if tables are empty
 */
async function seedTestData() {
  try {
    console.log('🌱 Checking if test data needed...')
    
    // Check if user_trash_votes has any data
    const countQuery = `SELECT COUNT(*) as count FROM user_trash_votes;`
    const { stdout } = await execAsync(`DATABASE_URL="${LOCAL_DB_URL}" psql -t -c "${countQuery}"`)
    const count = parseInt(stdout.trim())
    
    if (count === 0) {
      console.log('🌱 Adding test trash vote data...')
      const insertQuery = `
        INSERT INTO user_trash_votes (user_id, item_id, item_name) 
        VALUES 
          (1, 1234, 'Test Item 1'),
          (1, 5678, 'Test Item 2')
        ON CONFLICT (user_id, item_id) DO NOTHING;
      `
      await execAsync(`DATABASE_URL="${LOCAL_DB_URL}" psql -c "${insertQuery}"`)
      console.log('✅ Test data added')
    } else {
      console.log(`ℹ️ user_trash_votes already has ${count} records`)
    }
  } catch (error) {
    console.log('⚠️ Test data seeding skipped:', error.message)
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Get current table counts
    const localTables = await getTables(LOCAL_DB_URL)
    const prodTables = await getTables(PROD_DB_URL)
    
    console.log(`📊 Current state:`)
    console.log(`  Local tables: ${localTables.length}`)
    console.log(`  Production tables: ${prodTables.length}`)
    
    // Find missing tables
    const missingTables = prodTables.filter(table => !localTables.includes(table))
    
    if (missingTables.length > 0) {
      console.log(`\n❌ Missing tables in local:`)
      missingTables.forEach(table => console.log(`  - ${table}`))
    }
    
    // Get and apply production schema
    const schemaSQL = await dumpProductionSchema()
    await applySchemaToLocal(schemaSQL)
    
    // Run migrations to ensure everything is up to date
    await runMigrations()
    
    // Add test data
    await seedTestData()
    
    // Final verification
    const newLocalTables = await getTables(LOCAL_DB_URL)
    console.log(`\n✅ Final state:`)
    console.log(`  Local tables: ${newLocalTables.length}`)
    console.log(`  Production tables: ${prodTables.length}`)
    
    if (newLocalTables.length === prodTables.length) {
      console.log('🎉 Database sync completed successfully!')
    } else {
      console.log('⚠️ Some tables may still be missing. Check logs above.')
    }
    
    console.log('\n🔧 Next steps:')
    console.log('1. Restart your server: pkill -f "npm run dev" && npm run dev')
    console.log('2. Test trash button functionality in browser')
    console.log('3. Check admin panel at /admin/trash-management')
    
  } catch (error) {
    console.error('❌ Main execution error:', error)
    process.exit(1)
  }
}

main()
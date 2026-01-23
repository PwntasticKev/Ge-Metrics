#!/usr/bin/env node

/**
 * Database Schema Synchronization Script
 * Compares local database schema with production and provides migration commands
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

const execAsync = promisify(exec)

const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/auth_db'
const PROD_DB_URL = process.env.CORRECT_DATABASE_URL

if (!PROD_DB_URL) {
  console.error('❌ CORRECT_DATABASE_URL not found in .env file')
  process.exit(1)
}

console.log('🔍 Database Schema Synchronization Tool\n')

/**
 * Get table schema information from a database
 */
async function getTableSchemas(dbUrl, dbName) {
  try {
    const query = `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position;
    `
    
    const { stdout } = await execAsync(`DATABASE_URL="${dbUrl}" psql -t -c "${query}"`)
    return parseSchemaOutput(stdout)
  } catch (error) {
    console.error(`❌ Failed to get schema for ${dbName}:`, error.message)
    return {}
  }
}

/**
 * Parse schema output into structured format
 */
function parseSchemaOutput(output) {
  const tables = {}
  const lines = output.split('\n').filter(line => line.trim())
  
  lines.forEach(line => {
    const parts = line.split('|').map(part => part.trim())
    if (parts.length >= 6) {
      const [tableName, columnName, dataType, isNullable, columnDefault] = parts
      
      if (!tables[tableName]) {
        tables[tableName] = []
      }
      
      tables[tableName].push({
        column: columnName,
        type: dataType,
        nullable: isNullable,
        default: columnDefault
      })
    }
  })
  
  return tables
}

/**
 * Get list of tables
 */
async function getTables(dbUrl, dbName) {
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
    console.error(`❌ Failed to get tables for ${dbName}:`, error.message)
    return []
  }
}

/**
 * Compare schemas and generate sync commands
 */
function compareSchemas(localSchema, prodSchema) {
  const differences = []
  const missingTables = []
  const extraTables = []
  
  // Find missing tables in local
  Object.keys(prodSchema).forEach(table => {
    if (!localSchema[table]) {
      missingTables.push(table)
    }
  })
  
  // Find extra tables in local
  Object.keys(localSchema).forEach(table => {
    if (!prodSchema[table]) {
      extraTables.push(table)
    }
  })
  
  // Compare column differences for existing tables
  Object.keys(prodSchema).forEach(table => {
    if (localSchema[table]) {
      const localCols = new Set(localSchema[table].map(col => col.column))
      const prodCols = new Set(prodSchema[table].map(col => col.column))
      
      // Missing columns in local
      prodSchema[table].forEach(col => {
        if (!localCols.has(col.column)) {
          differences.push({
            table,
            type: 'missing_column',
            column: col.column,
            details: col
          })
        }
      })
      
      // Extra columns in local
      localSchema[table].forEach(col => {
        if (!prodCols.has(col.column)) {
          differences.push({
            table,
            type: 'extra_column',
            column: col.column,
            details: col
          })
        }
      })
    }
  })
  
  return { missingTables, extraTables, differences }
}

/**
 * Generate SQL commands to sync local with production
 */
function generateSyncCommands(localSchema, prodSchema, comparison) {
  const commands = []
  
  // Commands for missing tables - these need manual migration files
  comparison.missingTables.forEach(table => {
    commands.push(`-- MISSING TABLE: ${table}`)
    commands.push(`-- Run: DATABASE_URL="${LOCAL_DB_URL}" npx drizzle-kit generate`)
    commands.push(`-- Then: DATABASE_URL="${LOCAL_DB_URL}" npx drizzle-kit push\n`)
  })
  
  // Commands for missing columns
  comparison.differences.forEach(diff => {
    if (diff.type === 'missing_column') {
      const col = diff.details
      let alterCommand = `ALTER TABLE ${diff.table} ADD COLUMN ${col.column} ${col.type}`
      
      if (col.nullable === 'NO') {
        alterCommand += ' NOT NULL'
      }
      
      if (col.default && col.default !== 'null') {
        alterCommand += ` DEFAULT ${col.default}`
      }
      
      commands.push(`-- Missing column in local`)
      commands.push(`DATABASE_URL="${LOCAL_DB_URL}" psql -c "${alterCommand};"`)
      commands.push('')
    }
  })
  
  return commands
}

/**
 * Main execution
 */
async function main() {
  console.log('📊 Fetching local database schema...')
  const localTables = await getTables(LOCAL_DB_URL, 'local')
  const localSchema = await getTableSchemas(LOCAL_DB_URL, 'local')
  
  console.log('☁️ Fetching production database schema...')
  const prodTables = await getTables(PROD_DB_URL, 'production')
  const prodSchema = await getTableSchemas(PROD_DB_URL, 'production')
  
  console.log('\n📋 Schema Comparison Results:')
  console.log(`Local tables: ${localTables.length}`)
  console.log(`Production tables: ${prodTables.length}`)
  
  const comparison = compareSchemas(localSchema, prodSchema)
  
  if (comparison.missingTables.length > 0) {
    console.log('\n❌ Tables missing in LOCAL:')
    comparison.missingTables.forEach(table => {
      console.log(`  - ${table}`)
    })
  }
  
  if (comparison.extraTables.length > 0) {
    console.log('\n⚠️ Extra tables in LOCAL (not in production):')
    comparison.extraTables.forEach(table => {
      console.log(`  - ${table}`)
    })
  }
  
  if (comparison.differences.length > 0) {
    console.log('\n🔧 Column differences:')
    comparison.differences.forEach(diff => {
      if (diff.type === 'missing_column') {
        console.log(`  - ${diff.table}.${diff.column} missing in LOCAL`)
      } else if (diff.type === 'extra_column') {
        console.log(`  - ${diff.table}.${diff.column} extra in LOCAL`)
      }
    })
  }
  
  // Generate sync commands
  const syncCommands = generateSyncCommands(localSchema, prodSchema, comparison)
  
  if (syncCommands.length > 0) {
    console.log('\n🔧 Sync Commands to run:')
    console.log('=' + '='.repeat(50))
    syncCommands.forEach(cmd => console.log(cmd))
    console.log('=' + '='.repeat(50))
    
    // Write commands to file
    const fs = await import('fs')
    fs.writeFileSync('./sync-commands.sql', syncCommands.join('\n'))
    console.log('\n💾 Sync commands saved to: ./sync-commands.sql')
  } else {
    console.log('\n✅ Local and production schemas are in sync!')
  }
  
  console.log('\n🎯 Next Steps:')
  console.log('1. Review the sync commands above')
  console.log('2. Run the commands to sync your local database')
  console.log('3. Test your application functionality')
  console.log('4. Consider adding this script to your pre-commit hooks')
}

main().catch(console.error)
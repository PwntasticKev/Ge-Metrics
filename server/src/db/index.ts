import { drizzle } from 'drizzle-orm/postgres-js'
import postgres, { Options } from 'postgres'
import { config } from '../config/index.js'
import * as schema from './schema.js'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Base options for all environments
const baseOptions: Options<{}> = {
  // Add any other base options here if needed
}

// Production-specific options
const prodOptions: Options<{}> = {
  ...baseOptions,
  ssl: 'require',
  max: 1
}

const connectionOptions = config.NODE_ENV === 'production' ? prodOptions : baseOptions

// Determine the correct database URL
const databaseUrl = config.NODE_ENV === 'development' && config.LOCAL_DATABASE_URL
  ? config.LOCAL_DATABASE_URL
  : config.CORRECT_DATABASE_URL

if (!databaseUrl) {
  throw new Error('Database URL is not defined. Please check your environment variables for LOCAL_DATABASE_URL or CORRECT_DATABASE_URL.')
}

// Pooled connection for the serverless app
export const connection = postgres(databaseUrl, connectionOptions)
export const db = drizzle(connection, { schema })

// Unpooled connection for migrations
const migrationConnectionUrl = config.NODE_ENV === 'production'
  ? config.CORRECT_DATABASE_URL_UNPOOLED
  : (config.LOCAL_DATABASE_URL || config.CORRECT_DATABASE_URL)

if (!migrationConnectionUrl) {
  throw new Error('Migration database URL is not defined. Please check your environment variables for CORRECT_DATABASE_URL_UNPOOLED.')
}

console.log(`[GE-METRICS_MIGRATE_LOG] NODE_ENV: ${config.NODE_ENV}`)
console.log('[GE-METRICS_MIGRATE_LOG] Using migration connection URL:', migrationConnectionUrl)
export const migrationConnection = postgres(migrationConnectionUrl, { ...connectionOptions, max: 1 })
export const migrationDb = drizzle(migrationConnection, { schema })

export const migrationsTable = pgTable('__drizzle_migrations', {
  id: text('id').primaryKey(),
  hash: text('hash').notNull(),
  createdAt: timestamp('created_at').notNull()
})

export * from './schema.js'

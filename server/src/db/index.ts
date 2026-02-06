import { drizzle } from 'drizzle-orm/postgres-js'
import postgres, { Options } from 'postgres'
import { config } from '../config/index.js'
import * as schema from './schema.js'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Base options for all environments
const baseOptions: Options<{}> = {
  max: 10,                    // Maximum connections in pool
  idle_timeout: 20,          // Close idle connections after 20s
  connect_timeout: 10,       // Connection timeout
  transform: {
    undefined: null         // Convert undefined to null for PostgreSQL
  }
}

// Development-specific options
const devOptions: Options<{}> = {
  ...baseOptions,
  max: 5,                    // Lower connection pool for local development
  debug: false               // Set to true for query debugging
}

// Production-specific options
const prodOptions: Options<{}> = {
  ...baseOptions,
  ssl: 'require',
  max: 25,                   // Increased pool for WebSocket connections and analytics (was 10)
  idle_timeout: 30,         // Keep connections alive longer in production
  connect_timeout: 10,      // Faster timeout in production
  prepare: false,           // Disable prepared statements for serverless compatibility
  onnotice: () => {},       // Suppress PostgreSQL notices in production logs
  debug: false              // Disable query debugging in production
} as Options<{}> & { statement_timeout?: number }

// Add statement_timeout via runtime assignment (not in typed Options)
;(prodOptions as any).statement_timeout = 10000 // 10 second query timeout to prevent hung queries

const connectionOptions = config.NODE_ENV === 'production' ? prodOptions : 
                         config.NODE_ENV === 'development' ? devOptions : baseOptions

// Determine the correct database URL
console.log('[DB_CONNECTION] Environment check:', {
  NODE_ENV: config.NODE_ENV,
  hasLocalUrl: !!config.LOCAL_DATABASE_URL,
  hasCorrectUrl: !!config.CORRECT_DATABASE_URL
})

const databaseUrl = config.NODE_ENV === 'development' && config.LOCAL_DATABASE_URL
  ? config.LOCAL_DATABASE_URL
  : config.CORRECT_DATABASE_URL

console.log('[DB_CONNECTION] Selected database URL:', databaseUrl?.replace(/:[^:@]*@/, ':***@'))

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

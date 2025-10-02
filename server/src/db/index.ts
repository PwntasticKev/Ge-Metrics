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
  : config.DATABASE_URL

// Pooled connection for the serverless app
export const connection = postgres(databaseUrl, connectionOptions)
export const db = drizzle(connection, { schema })

// Unpooled connection for migrations
const migrationConnectionUrl = config.DATABASE_URL_UNPOOLED || databaseUrl
console.log('[GE-METRICS_MIGRATE_LOG] Using migration connection URL:', migrationConnectionUrl)
export const migrationConnection = postgres(migrationConnectionUrl, connectionOptions)
export const migrationDb = drizzle(migrationConnection, { schema })

export const migrationsTable = pgTable('__drizzle_migrations', {
  id: text('id').primaryKey(),
  hash: text('hash').notNull(),
  createdAt: timestamp('created_at').notNull()
})

export * from './schema.js'

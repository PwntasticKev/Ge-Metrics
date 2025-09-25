import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { config } from '../config/index.js'
import * as schema from './schema.js'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const connection = postgres(config.DATABASE_URL, { ssl: 'require', max: 1 })
export const db = drizzle(connection, { schema })

export const migrationsTable = pgTable('__drizzle_migrations', {
  id: text('id').primaryKey(),
  hash: text('hash').notNull(),
  createdAt: timestamp('created_at').notNull()
})

export * from './schema.js'

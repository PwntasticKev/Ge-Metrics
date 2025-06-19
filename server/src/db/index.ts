import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { config } from '../config/index.js'
import * as schema from './schema.js'

// Create the connection
const queryClient = postgres(config.DATABASE_URL)
export const db = drizzle(queryClient, { schema })

// Export schema for use in other files
export * from './schema.js'

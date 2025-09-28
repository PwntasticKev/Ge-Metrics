import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

dotenv.config({ path: '../.env' })

// Unify the database URL to use DATABASE_URL, same as the application
const dbUrl = process.env.DATABASE_URL

if (!dbUrl) {
  throw new Error('DATABASE_URL is not set in your .env file.')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: dbUrl
  },
  verbose: true,
  strict: true
})

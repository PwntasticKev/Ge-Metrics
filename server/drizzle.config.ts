import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

dotenv.config({ path: '../.env' })

// This environment variable is set by Vercel and is the unpooled connection string
const dbUrl = process.env.CORRECT_DATABASE_URL_UNPOOLED || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL

if (!dbUrl) {
  throw new Error('Database URL is not set. Please set CORRECT_DATABASE_URL_UNPOOLED, DATABASE_URL_UNPOOLED, or POSTGRES_URL.')
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

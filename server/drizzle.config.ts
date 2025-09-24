import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

dotenv.config({ path: '../.env' })

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL is not set in .env file')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.POSTGRES_URL
  },
  verbose: true,
  strict: true
})

import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { migrationDb, migrationConnection } from './index.js'
import path from 'path'
import { fileURLToPath } from 'url'

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function runMigrations () {
  console.log('🔄 Checking and running database migrations...')
  try {
    // This robust path will work in both dev (src) and prod (dist)
    const migrationsFolder = path.resolve(__dirname, 'migrations')
    console.log(`📂 Looking for migrations in: ${migrationsFolder}`)

    await migrate(migrationDb, { migrationsFolder })
    console.log('✅ Migrations checked successfully.')
  } catch (error) {
    console.error('❌ Migration check failed:', error)
    // We do not exit the process here, to allow the server to continue running if desired.
    // The error will be logged in the Vercel Function Logs.
    throw error
  } finally {
    // It's crucial to end the migration connection, as it's not serverless.
    await migrationConnection.end()
  }
}

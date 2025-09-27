import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { migrationDb, migrationConnection } from './index.js'

export async function runMigrations () {
  console.log('🔄 Checking and running database migrations...')
  try {
    await migrate(migrationDb, { migrationsFolder: 'src/db/migrations' })
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

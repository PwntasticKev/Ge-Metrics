import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db } from './index.js'
import postgres from 'postgres'
import { config } from '../config/index.js'

async function runMigrations () {
  console.log('🔄 Running database migrations...')

  try {
    const migrationClient = postgres(config.DATABASE_URL, { max: 1 })

    await migrate(db, {
      migrationsFolder: './src/db/migrations'
    })

    console.log('✅ Migrations completed successfully!')
    await migrationClient.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigrations()

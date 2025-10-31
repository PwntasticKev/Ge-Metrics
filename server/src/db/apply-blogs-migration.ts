import postgres from 'postgres'
import { config } from '../config/index.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function applyBlogsMigration() {
  console.log('🔧 Manually applying blogs table migration...')
  
  const migrationConnectionUrl = config.NODE_ENV === 'production'
    ? config.CORRECT_DATABASE_URL_UNPOOLED
    : (config.LOCAL_DATABASE_URL || config.CORRECT_DATABASE_URL)

  if (!migrationConnectionUrl) {
    throw new Error('Migration database URL is not defined')
  }

  const sql = postgres(migrationConnectionUrl, { max: 1 })
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '0003_tough_thundra.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Reading migration file:', migrationPath)
    
    // Split by statement-breakpoint and execute each statement
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (statement.length === 0) continue
      
      try {
        console.log(`  Executing statement ${i + 1}/${statements.length}...`)
        await sql.unsafe(statement)
        console.log(`  ✅ Statement ${i + 1} executed successfully`)
      } catch (error) {
        // If table already exists, that's okay
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`  ⚠️  Statement ${i + 1} - table/index already exists (skipping)`)
        } else {
          console.error(`  ❌ Statement ${i + 1} failed:`, error)
          throw error
        }
      }
    }
    
    // Also register it in the migrations table
    try {
      await sql`
        INSERT INTO __drizzle_migrations (id, hash, created_at)
        VALUES ('0003_tough_thundra', 'manual', NOW())
        ON CONFLICT (id) DO NOTHING
      `
      console.log('✅ Migration registered in __drizzle_migrations')
    } catch (error) {
      console.log('⚠️  Could not register migration (table might not exist yet):', error)
    }
    
    console.log('✅ Blogs table migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await sql.end()
  }
}

applyBlogsMigration()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })


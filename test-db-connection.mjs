import postgres from 'postgres'

const sql = postgres('postgresql://postgres:postgres@localhost:5432/auth_db', {
  max: 1,
  debug: true
})

async function testConnection() {
  try {
    console.log('Testing basic connection...')
    const result = await sql`SELECT current_database(), current_schema()`
    console.log('Connection successful:', result)
    
    console.log('Testing users table...')
    const users = await sql`SELECT COUNT(*) FROM users`
    console.log('Users table query:', users)
    
    console.log('Testing user_trash_votes table...')
    const trashVotes = await sql`SELECT COUNT(*) FROM user_trash_votes`
    console.log('Trash votes table query:', trashVotes)
    
    console.log('Testing table existence...')
    const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'user_%'`
    console.log('User tables found:', tables.map(t => t.tablename))
    
  } catch (error) {
    console.error('Database error:', error)
  } finally {
    await sql.end()
  }
}

testConnection()
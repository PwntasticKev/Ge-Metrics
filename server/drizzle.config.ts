import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'localhost',
    user: 'kevinlee',
    database: 'auth_db',
    // password: '', // Add if needed
    port: 5432
  }
} satisfies Config

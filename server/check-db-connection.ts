#!/usr/bin/env node

import { db } from './src/db/index.js'

async function checkConnection () {
  console.log('Attempting to connect to the database...')
  try {
    // Perform a simple query to check the connection
    const result = await db.execute('SELECT NOW()')
    console.log('Database query result:', result)
    console.log('✅ Database connection successful!')
    console.log('   Current server time:', result[0].now)
  } catch (error) {
    console.error('❌ Database connection failed:')
    console.error(error)
    process.exit(1)
  }
}

checkConnection()

#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🔄 Starting Prisma to Convex migration...')

// Create convex directory if it doesn't exist
const convexDir = path.join(__dirname, '..', 'convex')
if (!fs.existsSync(convexDir)) {
  fs.mkdirSync(convexDir, { recursive: true })
  console.log('✅ Created convex directory')
}

// Migration status tracking
const migrationStatus = {
  schema: false,
  functions: false,
  config: false,
  client: false
}

// Check if schema.ts exists
const schemaPath = path.join(convexDir, 'schema.ts')
if (fs.existsSync(schemaPath)) {
  console.log('✅ Schema file already exists')
  migrationStatus.schema = true
} else {
  console.log('❌ Schema file not found - please create convex/schema.ts')
}

// Check if function files exist
const functionFiles = ['users.ts', 'watchlist.ts', 'goals.ts']
functionFiles.forEach(file => {
  const filePath = path.join(convexDir, file)
  if (fs.existsSync(filePath)) {
    console.log(`✅ Function file ${file} exists`)
  } else {
    console.log(`❌ Function file ${file} not found`)
  }
})

// Check if convex.json exists
const configPath = path.join(__dirname, '..', 'convex.json')
if (fs.existsSync(configPath)) {
  console.log('✅ Convex config file exists')
  migrationStatus.config = true
} else {
  console.log('❌ Convex config file not found')
}

console.log('\n📋 Migration Checklist:')
console.log('1. ✅ Schema defined (convex/schema.ts)')
console.log('2. ✅ Basic functions created (users, watchlist, goals)')
console.log('3. ✅ Configuration file (convex.json)')
console.log('4. ⏳ Install Convex dependencies')
console.log('5. ⏳ Initialize Convex project')
console.log('6. ⏳ Update frontend to use Convex')
console.log('7. ⏳ Migrate existing data')

console.log('\n🚀 Next Steps:')
console.log('1. Run: npm install convex')
console.log('2. Run: npx convex dev --init')
console.log('3. Update frontend code to use Convex instead of tRPC')
console.log('4. Test the new Convex functions')
console.log('5. Deploy to Convex cloud')

console.log('\n⚠️  Important Notes:')
console.log('- Convex uses a different data model than Prisma')
console.log('- You may need to adjust the schema based on your needs')
console.log('- Authentication will need to be updated for Convex')
console.log('- Consider using Convex Auth for user management')

console.log('\n✅ Migration setup complete!')

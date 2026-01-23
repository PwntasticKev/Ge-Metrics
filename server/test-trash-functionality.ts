import { eq } from 'drizzle-orm'
import { db, userTrashVotes, itemAdminClean, users } from './src/db/index.js'
import { config } from './src/config/index.js'

console.log(`[CONFIG_DEBUG] Final DATABASE_URL: ${config.DATABASE_URL}`)

interface TestResults {
  passed: number
  failed: number
  tests: Array<{
    name: string
    status: 'PASS' | 'FAIL'
    message: string
    error?: string
  }>
}

const results: TestResults = {
  passed: 0,
  failed: 0,
  tests: []
}

function logTest(name: string, status: 'PASS' | 'FAIL', message: string, error?: any) {
  const statusColor = status === 'PASS' ? '\x1b[32m✅ PASS\x1b[0m' : '\x1b[31m❌ FAIL\x1b[0m'
  console.log(`${statusColor} ${name}: ${message}`)
  
  if (error) {
    console.error(`   Error: ${error.message || error}`)
  }
  
  results.tests.push({ name, status, message, error: error?.message || error })
  if (status === 'PASS') {
    results.passed++
  } else {
    results.failed++
  }
}

async function testTrashFunctionality() {
  console.log('\x1b[1m\x1b[34m============================================================\x1b[0m')
  console.log('\x1b[1m\x1b[34mGe-Metrics Trash Voting System Test Suite\x1b[0m')
  console.log('\x1b[1m\x1b[34m============================================================\x1b[0m')
  
  let testUserId: number | null = null
  
  try {
    // Test 1: Check if trash tables exist
    console.log('\n\x1b[1m\x1b[34mTesting Database Schema\x1b[0m')
    
    try {
      await db.select().from(userTrashVotes).limit(1)
      logTest('Schema Check', 'PASS', 'user_trash_votes table exists and is accessible')
    } catch (error) {
      logTest('Schema Check', 'FAIL', 'user_trash_votes table missing or inaccessible', error)
      return // Can't continue without the table
    }
    
    try {
      await db.select().from(itemAdminClean).limit(1)
      logTest('Schema Check', 'PASS', 'item_admin_clean table exists and is accessible')
    } catch (error) {
      logTest('Schema Check', 'FAIL', 'item_admin_clean table missing or inaccessible', error)
    }
    
    // Test 2: Create or find a test user
    console.log('\n\x1b[1m\x1b[34mTesting User Setup\x1b[0m')
    
    try {
      // Try to find an existing user first
      const existingUsers = await db.select().from(users).limit(1)
      if (existingUsers.length > 0) {
        testUserId = existingUsers[0].id
        logTest('User Setup', 'PASS', `Using existing user ID: ${testUserId}`)
      } else {
        // Create a test user
        const newUser = await db.insert(users).values({
          email: `test-trash-${Date.now()}@example.com`,
          username: `test-user-${Date.now()}`,
          passwordHash: 'test-hash',
          passwordSalt: 'test-salt'
        }).returning()
        testUserId = newUser[0].id
        logTest('User Setup', 'PASS', `Created test user ID: ${testUserId}`)
      }
    } catch (error) {
      logTest('User Setup', 'FAIL', 'Could not create or find test user', error)
      return
    }
    
    // Test 3: Add trash vote
    console.log('\n\x1b[1m\x1b[34mTesting Trash Voting\x1b[0m')
    
    try {
      const testItemId = 24472
      const testItemName = 'Twisted relic hunter (t2) armour set'
      
      // Clean up any existing vote first
      await db.delete(userTrashVotes).where(
        eq(userTrashVotes.userId, testUserId!) && eq(userTrashVotes.itemId, testItemId)
      )
      
      const trashVote = await db.insert(userTrashVotes).values({
        userId: testUserId!,
        itemId: testItemId,
        itemName: testItemName
      }).returning()
      
      logTest('Add Trash Vote', 'PASS', `Successfully added trash vote: ${trashVote[0].id}`)
      
      // Test 4: Retrieve trash vote
      const retrievedVotes = await db.select().from(userTrashVotes).where(
        eq(userTrashVotes.userId, testUserId!)
      )
      
      if (retrievedVotes.length > 0) {
        logTest('Retrieve Trash Vote', 'PASS', `Retrieved ${retrievedVotes.length} trash vote(s)`)
      } else {
        logTest('Retrieve Trash Vote', 'FAIL', 'No trash votes found after insertion')
      }
      
    } catch (error) {
      logTest('Add Trash Vote', 'FAIL', 'Could not add trash vote', error)
    }
    
    // Test 5: Test admin clean functionality
    console.log('\n\x1b[1m\x1b[34mTesting Admin Clean\x1b[0m')
    
    try {
      const adminUserId = testUserId! // Using same user as admin for testing
      const testItemId = 12345
      
      const adminClean = await db.insert(itemAdminClean).values({
        itemId: testItemId,
        cleanedBy: adminUserId
      }).returning()
      
      logTest('Admin Clean', 'PASS', `Successfully marked item ${testItemId} as admin cleaned`)
      
      // Test retrieval
      const cleanedItems = await db.select().from(itemAdminClean).where(
        eq(itemAdminClean.itemId, testItemId)
      )
      
      if (cleanedItems.length > 0) {
        logTest('Admin Clean Retrieval', 'PASS', `Retrieved admin cleaned item: ${cleanedItems[0].itemId}`)
      } else {
        logTest('Admin Clean Retrieval', 'FAIL', 'Could not retrieve admin cleaned item')
      }
      
    } catch (error) {
      logTest('Admin Clean', 'FAIL', 'Could not mark item as admin cleaned', error)
    }
    
    // Test 6: Test constraint enforcement
    console.log('\n\x1b[1m\x1b[34mTesting Constraints\x1b[0m')
    
    try {
      // Try to add duplicate vote (should be prevented by unique constraint)
      const testItemId = 24472
      const testItemName = 'Twisted relic hunter (t2) armour set'
      
      await db.insert(userTrashVotes).values({
        userId: testUserId!,
        itemId: testItemId,
        itemName: testItemName
      })
      
      logTest('Duplicate Vote Prevention', 'FAIL', 'Should have prevented duplicate vote')
    } catch (error) {
      // This should fail due to unique constraint
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        logTest('Duplicate Vote Prevention', 'PASS', 'Correctly prevented duplicate vote')
      } else {
        logTest('Duplicate Vote Prevention', 'FAIL', 'Unexpected error when testing duplicates', error)
      }
    }
    
  } catch (error) {
    logTest('Overall Test Suite', 'FAIL', 'Unexpected error in test suite', error)
  } finally {
    // Cleanup
    console.log('\n\x1b[1m\x1b[34mCleaning Up Test Data\x1b[0m')
    
    try {
      if (testUserId) {
        // Clean up test votes
        await db.delete(userTrashVotes).where(eq(userTrashVotes.userId, testUserId))
        
        // Clean up admin clean entries
        await db.delete(itemAdminClean).where(eq(itemAdminClean.cleanedBy, testUserId))
        
        logTest('Cleanup', 'PASS', 'Successfully cleaned up test data')
      }
    } catch (error) {
      logTest('Cleanup', 'FAIL', 'Error during cleanup', error)
    }
  }
  
  // Print summary
  console.log('\n\x1b[1m\x1b[34m============================================================\x1b[0m')
  console.log('\x1b[1m\x1b[34mTrash Voting Test Summary\x1b[0m')
  console.log('\x1b[1m\x1b[34m============================================================\x1b[0m')
  console.log(`\x1b[34mTotal Tests: ${results.passed + results.failed}\x1b[0m`)
  console.log(`\x1b[32mPassed: ${results.passed}\x1b[0m`)
  console.log(`\x1b[31mFailed: ${results.failed}\x1b[0m`)
  
  if (results.failed === 0) {
    console.log('\x1b[32m\n🎉 All trash voting tests passed! The system is working correctly.\x1b[0m')
  } else {
    console.log('\x1b[31m\n❌ Some tests failed. Please check the errors above.\x1b[0m')
    
    console.log('\n\x1b[1m\x1b[34mFailed Tests:\x1b[0m')
    results.tests.filter(t => t.status === 'FAIL').forEach(test => {
      console.log(`\x1b[31m• ${test.name}: ${test.message}\x1b[0m`)
      if (test.error) {
        console.log(`  Error: ${test.error}`)
      }
    })
  }
  
  console.log('\n\x1b[1m\x1b[34mDatabase Features Tested:\x1b[0m')
  console.log('\x1b[33m• Trash voting table schema\x1b[0m')
  console.log('\x1b[33m• Admin clean table schema\x1b[0m')
  console.log('\x1b[33m• Adding trash votes\x1b[0m')
  console.log('\x1b[33m• Retrieving trash votes\x1b[0m')
  console.log('\x1b[33m• Admin cleaning items\x1b[0m')
  console.log('\x1b[33m• Duplicate vote prevention\x1b[0m')
  
  process.exit(results.failed > 0 ? 1 : 0)
}

testTrashFunctionality().catch((error) => {
  console.error('Fatal error in test suite:', error)
  process.exit(1)
})
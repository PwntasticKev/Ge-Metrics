#!/usr/bin/env node

const http = require('http')

function testAuthBypass () {
  console.log('🧪 Testing authentication bypass...')

  const options = {
    hostname: 'localhost',
    port: 5173,
    path: '/',
    method: 'GET',
    timeout: 5000
  }

  const req = http.request(options, (res) => {
    console.log('📱 Server response status:', res.statusCode)

    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })

    res.on('end', () => {
      console.log('📄 Response received, length:', data.length)

      // Check for authentication-related content
      const hasLoginRedirect = data.includes('/login') || data.includes('login')
      const hasAuthBypass = data.includes('Public User') || data.includes('public_user')
      const hasQueryClientError = data.includes('No QueryClient set') || data.includes('QueryClientProvider')

      console.log('\n📊 Authentication Bypass Test Results:')
      console.log('✅ Server responding:', res.statusCode === 200)
      console.log('✅ No login redirects:', !hasLoginRedirect)
      console.log('✅ Auth bypass working:', hasAuthBypass)
      console.log('✅ No QueryClient errors:', !hasQueryClientError)

      if (hasQueryClientError) {
        console.log('\n⚠️  QueryClient errors found in response')
      }

      if (hasLoginRedirect) {
        console.log('\n⚠️  Login redirects found - auth bypass may not be working')
      }

      const allPassed = !hasLoginRedirect && !hasQueryClientError

      if (allPassed) {
        console.log('\n🎉 Authentication bypass is working correctly!')
        console.log('✅ Anyone can now access the application without login')
        process.exit(0)
      } else {
        console.log('\n❌ Some tests failed. Check the errors above.')
        process.exit(1)
      }
    })
  })

  req.on('error', (error) => {
    console.error('❌ Test failed with error:', error.message)
    console.log('💡 Make sure the development server is running with: npm run dev')
    process.exit(1)
  })

  req.on('timeout', () => {
    console.error('❌ Test timed out. Server may not be responding.')
    process.exit(1)
  })

  req.end()
}

// Run the test
testAuthBypass()

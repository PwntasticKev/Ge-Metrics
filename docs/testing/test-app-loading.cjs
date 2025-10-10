#!/usr/bin/env node

const http = require('http')

function testAppLoading () {
  console.log('🧪 Testing application loading...')

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

      // Check for error messages in the HTML
      const hasEnvironmentError = data.includes('Missing required environment variables')
      const hasStripeError = data.includes('REACT_APP_STRIPE_PUBLISHABLE_KEY_PROD')
      const hasGeneralError = data.includes('Error') || data.includes('Failed to load')

      console.log('\n📊 Test Results:')
      console.log('✅ Server responding:', res.statusCode === 200)
      console.log('✅ No environment variable errors:', !hasEnvironmentError)
      console.log('✅ No Stripe-related errors:', !hasStripeError)
      console.log('✅ No general errors:', !hasGeneralError)

      if (hasEnvironmentError || hasStripeError || hasGeneralError) {
        console.log('\n⚠️  Errors found in response:')
        if (hasEnvironmentError) console.log('   - Environment variable errors detected')
        if (hasStripeError) console.log('   - Stripe-related errors detected')
        if (hasGeneralError) console.log('   - General errors detected')
      }

      const allPassed = !hasEnvironmentError && !hasStripeError && !hasGeneralError

      if (allPassed) {
        console.log('\n🎉 All tests passed! Application loads correctly without environment variable errors.')
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
testAppLoading()

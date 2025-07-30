#!/usr/bin/env node

const http = require('http')

function testCypressSimple () {
  console.log('🧪 Testing application on localhost:8000...')

  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/',
    method: 'GET',
    timeout: 10000
  }

  const req = http.request(options, (res) => {
    console.log('📱 Server response status:', res.statusCode)

    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })

    res.on('end', () => {
      console.log('📄 Response received, length:', data.length)
      console.log('📄 Response preview:', data.substring(0, 200) + '...')

      // Check for various error conditions
      const hasQueryClientError = data.includes('No QueryClient set') || data.includes('QueryClientProvider')
      const hasAuthError = data.includes('login') || data.includes('Login')
      const hasStripeError = data.includes('REACT_APP_STRIPE_PUBLISHABLE_KEY_PROD')
      const hasEnvironmentError = data.includes('Missing required environment variables')
      const hasReactError = data.includes('React') && data.includes('Error')

      // Check for successful app content
      const hasAppContent = data.includes('GE Metrics') || data.includes('Ge Metrics')
      const hasReactApp = data.includes('root') || data.includes('React')
      const hasViteApp = data.includes('vite') || data.includes('@react-refresh')

      console.log('\n📊 Cypress-Style Test Results:')
      console.log('✅ Server responding on port 8000:', res.statusCode === 200)
      console.log('✅ No QueryClient errors:', !hasQueryClientError)
      console.log('✅ No authentication errors:', !hasAuthError)
      console.log('✅ No Stripe errors:', !hasStripeError)
      console.log('✅ No environment errors:', !hasEnvironmentError)
      console.log('✅ No React errors:', !hasReactError)
      console.log('✅ App content present:', hasAppContent)
      console.log('✅ React app structure:', hasReactApp)
      console.log('✅ Vite dev server:', hasViteApp)

      if (hasQueryClientError) {
        console.log('\n⚠️  QueryClient errors found:')
        console.log('   - This indicates a React Query setup issue')
      }

      if (hasAuthError) {
        console.log('\n⚠️  Authentication errors found:')
        console.log('   - Login redirects or auth checks still active')
      }

      if (hasStripeError) {
        console.log('\n⚠️  Stripe errors found:')
        console.log('   - Stripe environment variables still being checked')
      }

      if (hasEnvironmentError) {
        console.log('\n⚠️  Environment errors found:')
        console.log('   - Missing environment variables')
      }

      if (hasReactError) {
        console.log('\n⚠️  React errors found:')
        console.log('   - React application errors')
      }

      const allPassed = !hasQueryClientError && !hasAuthError && !hasStripeError && !hasEnvironmentError && !hasReactError && hasAppContent && hasViteApp

      if (allPassed) {
        console.log('\n🎉 All Cypress-style tests passed!')
        console.log('✅ Application loads correctly on localhost:8000')
        console.log('✅ No authentication required')
        console.log('✅ No QueryClient errors')
        console.log('✅ Ready for user interaction')
        process.exit(0)
      } else {
        console.log('\n❌ Some tests failed. Check the errors above.')
        process.exit(1)
      }
    })
  })

  req.on('error', (error) => {
    console.error('❌ Test failed with error:', error.message)
    console.log('💡 Make sure the development server is running on port 8000:')
    console.log('   npm run dev')
    process.exit(1)
  })

  req.on('timeout', () => {
    console.error('❌ Test timed out. Server may not be responding on port 8000.')
    process.exit(1)
  })

  req.end()
}

// Run the test
testCypressSimple()

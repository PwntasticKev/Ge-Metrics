#!/usr/bin/env node

const http = require('http')

function testQueryClient () {
  console.log('🧪 Testing QueryClient setup...')

  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/',
    method: 'GET'
  }

  const req = http.request(options, (res) => {
    console.log('📱 Status:', res.statusCode)

    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })

    res.on('end', () => {
      console.log('📄 Length:', data.length)

      // Check for QueryClient errors
      const hasQueryClientError = data.includes('No QueryClient set') ||
                                 data.includes('QueryClientProvider') ||
                                 data.includes('react-query')

      // Check for React errors
      const hasReactError = data.includes('Error:') && data.includes('React')

      // Check for console errors
      const hasConsoleError = data.includes('console.error') || data.includes('Error:')

      console.log('\n📊 QueryClient Test Results:')
      console.log('✅ Status 200:', res.statusCode === 200)
      console.log('✅ No QueryClient errors:', !hasQueryClientError)
      console.log('✅ No React errors:', !hasReactError)
      console.log('✅ No console errors:', !hasConsoleError)

      if (hasQueryClientError) {
        console.log('\n⚠️  QueryClient errors found:')
        console.log('   - This indicates QueryClient setup issues')
      }

      if (hasReactError) {
        console.log('\n⚠️  React errors found:')
        console.log('   - Check browser console for details')
      }

      if (hasConsoleError) {
        console.log('\n⚠️  Console errors found:')
        console.log('   - Check browser console for details')
      }

      const allPassed = !hasQueryClientError && !hasReactError && !hasConsoleError

      if (allPassed) {
        console.log('\n🎉 SUCCESS! No QueryClient errors detected')
        console.log('✅ QueryClient is properly set up')
        console.log('✅ Application should work without React Query errors')
        process.exit(0)
      } else {
        console.log('\n❌ FAILED! Check the errors above')
        process.exit(1)
      }
    })
  })

  req.on('error', (error) => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })

  req.end()
}

testQueryClient()

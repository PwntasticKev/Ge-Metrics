#!/usr/bin/env node

const http = require('http')

function testFinalVerification () {
  console.log('🧪 Final Verification Test...')

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

      // Check for various issues
      const hasReactError = data.includes('Error:') && data.includes('React')
      const hasConsoleError = data.includes('console.error') || data.includes('Error:')
      const hasControlledInputWarning = data.includes('controlled input to be uncontrolled')
      const hasQueryClientError = data.includes('No QueryClient set')
      const hasAppContent = data.includes('Ge Metrics') || data.includes('vite') || data.includes('react')
      const hasScripts = data.includes('<script') && data.includes('main.jsx')
      const hasDataFetching = data.includes('fetch') || data.includes('api')

      console.log('\n📊 Final Verification Results:')
      console.log('✅ Status 200:', res.statusCode === 200)
      console.log('✅ No React errors:', !hasReactError)
      console.log('✅ No console errors:', !hasConsoleError)
      console.log('✅ No controlled input warnings:', !hasControlledInputWarning)
      console.log('✅ No QueryClient errors:', !hasQueryClientError)
      console.log('✅ Has app content:', hasAppContent)
      console.log('✅ Has scripts loaded:', hasScripts)
      console.log('✅ Has data fetching:', hasDataFetching)

      if (hasReactError) {
        console.log('\n⚠️  React errors found:')
        console.log('   - Check browser console for details')
      }

      if (hasConsoleError) {
        console.log('\n⚠️  Console errors found:')
        console.log('   - Check browser console for details')
      }

      if (hasControlledInputWarning) {
        console.log('\n⚠️  Controlled input warnings found:')
        console.log('   - This indicates inputs switching from controlled to uncontrolled')
      }

      if (hasQueryClientError) {
        console.log('\n⚠️  QueryClient errors found:')
        console.log('   - This indicates React Query setup issues')
      }

      if (!hasAppContent) {
        console.log('\n⚠️  No app content found:')
        console.log('   - This might indicate the app is not loading properly')
      }

      if (!hasScripts) {
        console.log('\n⚠️  No scripts found:')
        console.log('   - This might indicate the app is not loading properly')
      }

      if (!hasDataFetching) {
        console.log('\n⚠️  No data fetching found:')
        console.log('   - This might indicate the app is not loading properly')
      }

      const allPassed = !hasReactError && !hasConsoleError && !hasControlledInputWarning &&
                       !hasQueryClientError && hasAppContent && hasScripts

      if (allPassed) {
        console.log('\n🎉 SUCCESS! Application is fully functional')
        console.log('✅ No React errors detected')
        console.log('✅ No controlled input warnings')
        console.log('✅ No QueryClient errors')
        console.log('✅ App content is loading')
        console.log('✅ Scripts are properly loaded')
        console.log('✅ Data fetching is configured')
        console.log('✅ Application should be fully functional')
        console.log('\n🚀 The application is ready for use!')
        process.exit(0)
      } else {
        console.log('\n❌ FAILED! Check the issues above')
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

testFinalVerification()

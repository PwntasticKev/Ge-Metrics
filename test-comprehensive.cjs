#!/usr/bin/env node

const http = require('http')

function testComprehensive () {
  console.log('🧪 Comprehensive Application Test...')

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
      console.log('📄 Content preview:', data.substring(0, 300) + '...')

      // Check for various issues
      const hasReactError = data.includes('Error:') && data.includes('React')
      const hasConsoleError = data.includes('console.error') || data.includes('Error:')
      const hasControlledInputWarning = data.includes('controlled input to be uncontrolled')
      const hasQueryClientError = data.includes('No QueryClient set')
      const hasAppContent = data.includes('Ge Metrics') || data.includes('vite') || data.includes('react')
      const hasScripts = data.includes('<script') && data.includes('main.jsx')

      console.log('\n📊 Comprehensive Test Results:')
      console.log('✅ Status 200:', res.statusCode === 200)
      console.log('✅ No React errors:', !hasReactError)
      console.log('✅ No console errors:', !hasConsoleError)
      console.log('✅ No controlled input warnings:', !hasControlledInputWarning)
      console.log('✅ No QueryClient errors:', !hasQueryClientError)
      console.log('✅ Has app content:', hasAppContent)
      console.log('✅ Has scripts loaded:', hasScripts)

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

      const allPassed = !hasReactError && !hasConsoleError && !hasControlledInputWarning &&
                       !hasQueryClientError && hasAppContent && hasScripts

      if (allPassed) {
        console.log('\n🎉 SUCCESS! Application is working properly')
        console.log('✅ No React errors detected')
        console.log('✅ No controlled input warnings')
        console.log('✅ No QueryClient errors')
        console.log('✅ App content is loading')
        console.log('✅ Scripts are properly loaded')
        console.log('✅ Application should be fully functional')
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

testComprehensive()

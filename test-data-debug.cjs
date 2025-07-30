#!/usr/bin/env node

const http = require('http')

function testDataDebug () {
  console.log('🔍 Debugging data loading issues...')

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

      // Check for specific issues
      const hasReactError = data.includes('Error:') && data.includes('React')
      const hasConsoleError = data.includes('console.error') || data.includes('Error:')
      const hasControlledInputWarning = data.includes('controlled input to be uncontrolled')
      const hasQueryClientError = data.includes('No QueryClient set')
      const hasAuthError = data.includes('auth') || data.includes('Auth') || data.includes('login')
      const hasDataFetching = data.includes('fetch') || data.includes('api') || data.includes('data')
      const hasLoadingState = data.includes('loading') || data.includes('Loading')
      const hasItemData = data.includes('item') || data.includes('Item')

      console.log('\n🔍 Debug Analysis:')
      console.log('✅ Status 200:', res.statusCode === 200)
      console.log('✅ No React errors:', !hasReactError)
      console.log('✅ No console errors:', !hasConsoleError)
      console.log('✅ No controlled input warnings:', !hasControlledInputWarning)
      console.log('✅ No QueryClient errors:', !hasQueryClientError)
      console.log('✅ No auth errors:', !hasAuthError)
      console.log('✅ Has data fetching:', hasDataFetching)
      console.log('✅ Has loading states:', hasLoadingState)
      console.log('✅ Has item data:', hasItemData)

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

      if (hasAuthError) {
        console.log('\n⚠️  Auth errors found:')
        console.log('   - This might indicate authentication issues')
      }

      if (!hasDataFetching) {
        console.log('\n⚠️  No data fetching found:')
        console.log('   - This might indicate the app is not loading properly')
      }

      if (!hasLoadingState) {
        console.log('\n⚠️  No loading states found:')
        console.log('   - This might indicate the app is not loading properly')
      }

      if (!hasItemData) {
        console.log('\n⚠️  No item data found:')
        console.log('   - This might indicate the app is not loading properly')
      }

      console.log('\n💡 Recommendations:')
      console.log('1. Check browser console for JavaScript errors')
      console.log('2. Verify authentication bypass is working')
      console.log('3. Check if data is being fetched from APIs')
      console.log('4. Ensure components are rendering properly')
      console.log('5. Check network tab for failed requests')

      const allPassed = !hasReactError && !hasConsoleError && !hasControlledInputWarning &&
                       !hasQueryClientError && !hasAuthError

      if (allPassed) {
        console.log('\n🎉 SUCCESS! No obvious errors detected')
        console.log('✅ Application should be working')
        console.log('✅ Check browser console for more details')
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

testDataDebug()

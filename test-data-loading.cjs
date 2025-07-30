#!/usr/bin/env node

const http = require('http')

function testDataLoading () {
  console.log('🧪 Testing data loading...')

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
      console.log('📄 Content preview:', data.substring(0, 200) + '...')

      // Check if the page loads without errors
      const hasReactError = data.includes('Error:') && data.includes('React')
      const hasConsoleError = data.includes('console.error') || data.includes('Error:')
      const hasLoadingState = data.includes('loading') || data.includes('Loading')
      const hasItemsContent = data.includes('items') || data.includes('data')

      console.log('\n📊 Data Loading Test Results:')
      console.log('✅ Status 200:', res.statusCode === 200)
      console.log('✅ No React errors:', !hasReactError)
      console.log('✅ No console errors:', !hasConsoleError)
      console.log('✅ Has loading states:', hasLoadingState)
      console.log('✅ Has items content:', hasItemsContent)

      if (hasReactError) {
        console.log('\n⚠️  React errors found:')
        console.log('   - Check browser console for details')
      }

      if (hasConsoleError) {
        console.log('\n⚠️  Console errors found:')
        console.log('   - Check browser console for details')
      }

      if (!hasLoadingState) {
        console.log('\n⚠️  No loading states found:')
        console.log('   - This might indicate data is not loading')
      }

      if (!hasItemsContent) {
        console.log('\n⚠️  No items content found:')
        console.log('   - This might indicate data is not loading')
      }

      const allPassed = !hasReactError && !hasConsoleError && hasLoadingState

      if (allPassed) {
        console.log('\n🎉 SUCCESS! Data loading appears to be working')
        console.log('✅ No React errors detected')
        console.log('✅ Loading states are present')
        console.log('✅ Application should be functional')
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

testDataLoading()

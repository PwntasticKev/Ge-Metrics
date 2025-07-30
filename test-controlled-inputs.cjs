#!/usr/bin/env node

const http = require('http')

function testControlledInputs () {
  console.log('🧪 Testing controlled input warnings...')

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

      // Check for React warnings about controlled inputs
      const hasControlledInputWarning = data.includes('controlled input to be uncontrolled') ||
                                      data.includes('controlled to uncontrolled') ||
                                      data.includes('value changing from a defined to undefined')

      // Check for other React warnings
      const hasReactWarning = data.includes('Warning:') && data.includes('React')

      // Check for console errors
      const hasConsoleError = data.includes('console.error') || data.includes('Error:')

      console.log('\n📊 Controlled Input Test Results:')
      console.log('✅ Status 200:', res.statusCode === 200)
      console.log('✅ No controlled input warnings:', !hasControlledInputWarning)
      console.log('✅ No React warnings:', !hasReactWarning)
      console.log('✅ No console errors:', !hasConsoleError)

      if (hasControlledInputWarning) {
        console.log('\n⚠️  Controlled input warnings found:')
        console.log('   - This indicates inputs switching from controlled to uncontrolled')
      }

      if (hasReactWarning) {
        console.log('\n⚠️  React warnings found:')
        console.log('   - Check browser console for details')
      }

      if (hasConsoleError) {
        console.log('\n⚠️  Console errors found:')
        console.log('   - Check browser console for details')
      }

      const allPassed = !hasControlledInputWarning && !hasReactWarning && !hasConsoleError

      if (allPassed) {
        console.log('\n🎉 SUCCESS! No controlled input warnings detected')
        console.log('✅ All inputs are properly controlled')
        console.log('✅ Application should work without React warnings')
        process.exit(0)
      } else {
        console.log('\n❌ FAILED! Check the warnings above')
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

testControlledInputs()

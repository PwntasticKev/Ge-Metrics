#!/usr/bin/env node

const http = require('http')

function testSimple () {
  console.log('🧪 Simple test for localhost:8000...')

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

      // Simple checks
      const hasGeMetrics = data.includes('Ge Metrics')
      const hasVite = data.includes('vite')
      const hasReact = data.includes('react')
      const hasRoot = data.includes('root')

      console.log('\n📊 Results:')
      console.log('✅ Status 200:', res.statusCode === 200)
      console.log('✅ Has Ge Metrics:', hasGeMetrics)
      console.log('✅ Has Vite:', hasVite)
      console.log('✅ Has React:', hasReact)
      console.log('✅ Has root div:', hasRoot)

      if (res.statusCode === 200 && hasGeMetrics && hasVite && hasReact && hasRoot) {
        console.log('\n🎉 SUCCESS! Application is working on localhost:8000')
        console.log('✅ Ready for Cypress testing')
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

testSimple()

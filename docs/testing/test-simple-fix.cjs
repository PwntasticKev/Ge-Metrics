#!/usr/bin/env node

const http = require('http')

function testSimple () {
  console.log('🧪 Simple test...')

  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/',
    method: 'GET',
    headers: {
      'User-Agent': 'curl/7.68.0'
    }
  }

  const req = http.request(options, (res) => {
    console.log('📱 Status:', res.statusCode)

    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })

    res.on('end', () => {
      console.log('📄 Length:', data.length)
      console.log('📄 First 200 chars:', data.substring(0, 200))

      const hasAppContent = data.includes('Ge Metrics') || data.includes('vite') || data.includes('react')
      console.log('✅ Has app content:', hasAppContent)

      if (hasAppContent) {
        console.log('🎉 SUCCESS! Server is working')
        process.exit(0)
      } else {
        console.log('❌ FAILED! No app content found')
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

#!/usr/bin/env node

const http = require('http')

function testCurlStyle () {
  console.log('🧪 Testing with curl-style request...')

  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/',
    method: 'GET',
    headers: {
      Accept: '*/*',
      'User-Agent': 'curl/7.68.0'
    }
  }

  const req = http.request(options, (res) => {
    console.log('📱 Status:', res.statusCode)
    console.log('📱 Headers:', res.headers)

    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })

    res.on('end', () => {
      console.log('📄 Length:', data.length)
      console.log('📄 First 500 chars:', data.substring(0, 500))

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

testCurlStyle()

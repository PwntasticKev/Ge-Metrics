#!/usr/bin/env node

const https = require('https')

function testApiEndpoints () {
  console.log('🧪 Testing API endpoints...')

  const endpoints = [
    'https://prices.runescape.wiki/api/v1/osrs/latest',
    'https://prices.runescape.wiki/api/v1/osrs/mapping',
    'https://prices.runescape.wiki/api/v1/osrs/volumes'
  ]

  let completed = 0
  let success = 0

  endpoints.forEach((url, index) => {
    const urlObj = new URL(url)

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Ge-Metrics/1.0'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        completed++
        const isSuccess = res.statusCode === 200 && data.length > 0
        if (isSuccess) success++

        console.log(`📡 ${urlObj.pathname}: ${isSuccess ? '✅' : '❌'} (${res.statusCode}, ${data.length} bytes)`)

        if (completed === endpoints.length) {
          console.log('\n📊 API Test Results:')
          console.log(`✅ Success: ${success}/${completed}`)

          if (success === completed) {
            console.log('🎉 SUCCESS! All API endpoints are working')
            console.log('✅ RuneScape Wiki APIs are accessible')
            console.log('✅ Data should be able to load')
            process.exit(0)
          } else {
            console.log('❌ FAILED! Some API endpoints are not working')
            process.exit(1)
          }
        }
      })
    })

    req.on('error', (error) => {
      completed++
      console.log(`📡 ${urlObj.pathname}: ❌ Error - ${error.message}`)

      if (completed === endpoints.length) {
        console.log('\n📊 API Test Results:')
        console.log(`✅ Success: ${success}/${completed}`)
        console.log('❌ FAILED! Some API endpoints are not working')
        process.exit(1)
      }
    })

    req.end()
  })
}

testApiEndpoints()

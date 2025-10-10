// Simple test to verify tRPC connection
const testTrpcConnection = async () => {
  try {
    console.log('Testing tRPC connection...')

    // Test health endpoint
    const healthResponse = await fetch('http://localhost:4000/health')
    const healthData = await healthResponse.json()
    console.log('✅ Health check:', healthData)

    // Test tRPC endpoint
    const trpcResponse = await fetch('http://localhost:4000/trpc/auth.requestPasswordChangeOtp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@tesla.com'
      })
    })

    if (trpcResponse.ok) {
      const trpcData = await trpcResponse.json()
      console.log('✅ tRPC response:', trpcData)
    } else {
      console.log('❌ tRPC error:', trpcResponse.status, trpcResponse.statusText)
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testTrpcConnection()

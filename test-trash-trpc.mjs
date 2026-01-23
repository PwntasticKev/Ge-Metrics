import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'

const client = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:4000/trpc',
      headers() {
        return {
          // Use a valid token
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJ1c2VyQGdlLW1ldHJpY3MtdGVzdC5jb20iLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzY5MDQzMzc4LCJleHAiOjE3NjkxMjk3NzgsImF1ZCI6ImNsaWVudC1hcHAiLCJpc3MiOiJhdXRoLXNlcnZlciJ9.RkJVIDZpbQQ81kQo5vXvH1IkGzN5W8P8mKSFBOwKRfQ',
          'x-csrf-token': 'test',
          'Origin': 'http://localhost:8000',
        }
      }
    })
  ]
})

async function testTrash() {
  try {
    console.log('Testing trash.markItem...')
    const result = await client.trash.markItem.mutate({
      itemId: 29628,
      itemName: 'Armageddon cape fabric'
    })
    console.log('Success:', result)
  } catch (error) {
    console.error('Error:', error.message)
    if (error.data) {
      console.error('Error data:', error.data)
    }
  }
}

testTrash()
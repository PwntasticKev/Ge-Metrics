import { createTRPCReact } from '@trpc/react-query'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'

// Create the tRPC React client
export const trpc = createTRPCReact()

// Create a proxy client for direct calls
export const trpcClient = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:4000/trpc',

      // Add auth headers
      headers: () => {
        const accessToken = localStorage.getItem('accessToken')
        return {
          authorization: accessToken ? `Bearer ${accessToken}` : '',
          'x-csrf-token': 'frontend-token' // Simple CSRF token for now
        }
      }
    })
  ]
})

// Token refresh utility
export const refreshTokens = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await trpcClient.auth.refresh.mutate({ refreshToken })

    localStorage.setItem('accessToken', response.accessToken)
    localStorage.setItem('refreshToken', response.refreshToken)

    return response
  } catch (error) {
    // Clear invalid tokens
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    throw error
  }
}

// HTTP client with automatic token refresh
export const createTRPCClient = () => {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:4000/trpc',

        // Add auth headers and handle token refresh
        headers: async () => {
          const accessToken = localStorage.getItem('accessToken')
          return {
            authorization: accessToken ? `Bearer ${accessToken}` : '',
            'x-csrf-token': 'frontend-token' // Simple CSRF token for now
          }
        },

        // Handle 401 errors by refreshing tokens
        fetch: async (url, options) => {
          const response = await fetch(url, options)

          if (response.status === 401) {
            try {
              await refreshTokens()

              // Retry the request with new token
              const accessToken = localStorage.getItem('accessToken')
              const newOptions = {
                ...options,
                headers: {
                  ...options.headers,
                  authorization: accessToken ? `Bearer ${accessToken}` : ''
                }
              }

              return fetch(url, newOptions)
            } catch (refreshError) {
              // Refresh failed, redirect to login or handle accordingly
              console.error('Token refresh failed:', refreshError)
              window.location.href = '/login'
              return response
            }
          }

          return response
        }
      })
    ]
  })
}

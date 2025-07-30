import { createTRPCReact } from '@trpc/react-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { useState } from 'react'

// Create tRPC React hooks
export const trpc = createTRPCReact()

// tRPC Client Provider Component
export function TRPCProvider ({ children }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: 'http://localhost:4000/trpc',
          // Include credentials for authentication
          fetch: (url, options) => {
            return fetch(url, {
              ...options,
              credentials: 'include'
            })
          }
        })
      ]
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}

// Export the tRPC hooks
export { trpc as default }

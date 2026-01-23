import { createTRPCReact } from '@trpc/react-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { useState } from 'react'

// Create tRPC React hooks
export const trpc = createTRPCReact()

// tRPC Client Provider Component
export function TRPCProvider ({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed queries
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false
      }
    }
  }))

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: import.meta.env.PROD 
            ? 'https://www.ge-metrics.com/trpc' 
            : '/trpc',
          async headers () {
            const token = localStorage.getItem('accessToken')
            // Get or generate CSRF token
            let csrfToken = localStorage.getItem('csrfToken')
            if (!csrfToken) {
              // Generate a new CSRF token if none exists
              csrfToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
              localStorage.setItem('csrfToken', csrfToken)
            }
            
            return {
              Authorization: token ? `Bearer ${token}` : '',
              'x-csrf-token': csrfToken
            }
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

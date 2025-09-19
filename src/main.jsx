import React from 'react'
import './styles/App.scss'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from 'react-query'
import App from './App.jsx'
import { TRPCProvider } from './utils/trpc.jsx'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10 // 10 minutes
    }
  }
})

createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <TRPCProvider>
                <App/>
            </TRPCProvider>
        </QueryClientProvider>
    </React.StrictMode>
)

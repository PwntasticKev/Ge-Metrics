import React from 'react'
import './styles/App.scss'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
// Firebase removed - using new auth system
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  }
})

createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <App/>
        </QueryClientProvider>
    </React.StrictMode>
)

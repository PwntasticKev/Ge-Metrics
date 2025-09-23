import React, { createContext, useState, useEffect, useContext } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { trpc, createTRPCClient } from '../../utils/trpc'
import authService from '../../services/authService' // Import authService

// Create a context for authentication
const AuthContext = createContext(null)

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext)

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 401 errors
        if (error?.status === 401) {
          return false
        }
        return failureCount < 3
      }
    }
  }
})

// Create tRPC client
const trpcClient = createTRPCClient()

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Session check failed:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Listen for auth state changes
    const unsubscribe = authService.onAuthStateChanged((newUser) => {
      setUser(newUser)
      // If a user logs in or out, we might want to refetch queries
      queryClient.invalidateQueries()
    })

    return () => unsubscribe()
  }, [])

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    register: authService.register.bind(authService)
  }

  return (
    <AuthContext.Provider value={value}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </trpc.Provider>
    </AuthContext.Provider>
  )
}

export default AuthProvider

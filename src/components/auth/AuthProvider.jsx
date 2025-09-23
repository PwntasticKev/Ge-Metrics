import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { httpBatchLink, createTRPCProxyClient } from '@trpc/client'
import { trpc } from '../../utils/trpc'
import authService from '../../services/authService' // Import authService
import { AuthContext } from '../../contexts/AuthContext'

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
const trpcClient = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:4000/trpc',
      async headers () {
        const token = localStorage.getItem('auth_token')
        return {
          Authorization: token ? `Bearer ${token}` : ''
        }
      }
    })
  ]
})

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Effect for initialization and auth state changes
  useEffect(() => {
    const checkSession = async () => {
      try {
        await authService.checkExistingSession()
      } catch (error) {
        console.error('Session check failed on mount:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    const unsubscribe = authService.onAuthStateChanged((newUser) => {
      setUser(newUser)
      setIsLoading(false)
      queryClient.invalidateQueries() // Invalidate queries on auth state change
    })

    return () => unsubscribe()
  }, []) // Empty dependency array ensures this runs only once

  // Effect for handling redirection logic
  useEffect(() => {
    if (isLoading) return // Don't redirect while still loading

    const publicPaths = ['/login', '/signup']
    const isPublicPath = publicPaths.includes(location.pathname)

    if (user && isPublicPath) {
      // If user is logged in and on a public path, redirect to home
      navigate('/')
    } else if (!user && !isPublicPath) {
      // If user is not logged in and not on a public path, redirect to login
      navigate('/login')
    }
  }, [user, location.pathname, isLoading, navigate])

  const login = async (credentials, callbacks) => {
    try {
      const data = await authService.login(credentials.email, credentials.password)
      if (callbacks && callbacks.onSuccess) {
        callbacks.onSuccess(data)
      }
    } catch (error) {
      if (callbacks && callbacks.onError) {
        callbacks.onError(error)
      }
    }
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout: authService.logout.bind(authService),
    register: authService.register.bind(authService)
  }

  return (
    <AuthContext.Provider value={value}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
          {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        </QueryClientProvider>
      </trpc.Provider>
    </AuthContext.Provider>
  )
}

export default AuthProvider

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../contexts/AuthContext'
import { trpc } from '../../utils/trpc.jsx'

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const { data: me, refetch: refetchMe } = trpc.auth.me.useQuery(
    undefined,
    { enabled: false, retry: false }
  )

  const { data: subscription, isLoading: isSubscriptionLoading, error: subscriptionError } = trpc.billing.getSubscription.useQuery(undefined, {
    enabled: !!user, // Only run when user is set.
    retry: 1, // Allow one retry for network issues
    retryDelay: 1000, // Wait 1 second before retry
    staleTime: 300000, // Cache for 5 minutes to reduce API calls
    cacheTime: 600000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnReconnect: true, // Refetch on network reconnect
    timeout: 10000 // 10 second timeout to prevent long hangs
  })

  
  const loginMutation = trpc.auth.login.useMutation()
  const registerMutation = trpc.auth.register.useMutation()
  const otpLoginMutation = trpc.auth.verifyOtpAndLogin.useMutation()

  const checkSession = useCallback(async () => {
    setIsLoading(true)
    const token = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    
    if (token) {
      try {
        const userProfile = await refetchMe()
        if (userProfile.data) {
          setUser(userProfile.data)
        } else {
          // Try to refresh the token if we have a refresh token
          if (refreshToken) {
            try {
              const refreshResult = await trpc.auth.refresh.mutate({ refreshToken })
              if (refreshResult && refreshResult.accessToken) {
                localStorage.setItem('accessToken', refreshResult.accessToken)
                if (refreshResult.refreshToken) {
                  localStorage.setItem('refreshToken', refreshResult.refreshToken)
                }
                const newProfile = await refetchMe()
                if (newProfile.data) {
                  setUser(newProfile.data)
                }
              } else {
                setUser(null)
                localStorage.removeItem('accessToken')
                localStorage.removeItem('refreshToken')
              }
            } catch (refreshError) {
              setUser(null)
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
            }
          } else {
            setUser(null)
            localStorage.removeItem('accessToken')
          }
        }
      } catch (error) {
        // Try to refresh the token if we have a refresh token
        if (refreshToken) {
          try {
            const refreshResult = await trpc.auth.refresh.mutate({ refreshToken })
            if (refreshResult && refreshResult.accessToken) {
              localStorage.setItem('accessToken', refreshResult.accessToken)
              if (refreshResult.refreshToken) {
                localStorage.setItem('refreshToken', refreshResult.refreshToken)
              }
              const newProfile = await refetchMe()
              if (newProfile.data) {
                setUser(newProfile.data)
              }
            } else {
              setUser(null)
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
            }
          } catch (refreshError) {
            setUser(null)
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
          }
        } else {
          setUser(null)
          localStorage.removeItem('accessToken')
        }
      }
    }
    setIsLoading(false)
  }, [refetchMe])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  // Remove auto-redirect - let users access free pages

  const login = useCallback((credentials, callbacks) => {
    loginMutation.mutate(credentials, {
      onSuccess: (data) => {
        if (data && !data.twoFactorRequired) {
          localStorage.setItem('accessToken', data.accessToken)
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken)
          }
          checkSession()
        }
        callbacks?.onSuccess(data)
      },
      onError: callbacks?.onError
    })
  }, [loginMutation, checkSession])

  const loginWithOtp = useCallback(async (credentials) => {
    try {
      const data = await otpLoginMutation.mutateAsync(credentials)
      if (data && data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken)
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken)
        }
        await checkSession()
      }
      return data
    } catch (error) {
      throw error
    }
  }, [otpLoginMutation, checkSession])

  const register = useCallback((credentials, callbacks) => {
    registerMutation.mutate(credentials, {
      onSuccess: (data) => {
        callbacks?.onSuccess?.(data)
      },
      onError: (error) => {
        callbacks?.onError?.(error)
      }
    })
  }, [registerMutation])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }, [navigate])

  const value = useMemo(() => {
    // Determine subscription status with proper loading state handling
    const getSubscriptionStatus = () => {
      // If user is not authenticated, they don't need a subscription
      if (!user) return { isSubscribed: true, isCheckingSubscription: false }
      
      // If still loading subscription data, don't block access
      if (isSubscriptionLoading) return { isSubscribed: true, isCheckingSubscription: true }
      
      // If there was an error loading subscription, assume subscribed to prevent blocking
      if (subscriptionError) {
        console.warn('Subscription check failed, allowing access:', subscriptionError)
        return { isSubscribed: true, isCheckingSubscription: false }
      }
      
      // No subscription found
      if (!subscription) return { isSubscribed: false, isCheckingSubscription: false }
      
      // Valid subscription check
      const isActive = ['active', 'trialing'].includes(subscription.status)
      const isTrialExpired = subscription?.status === 'trialing' && new Date(subscription.currentPeriodEnd) < new Date()
      
      return { 
        isSubscribed: isActive && !isTrialExpired, 
        isCheckingSubscription: false 
      }
    }
    
    const subscriptionStatus = getSubscriptionStatus()
    
    return {
      user,
      subscription,
      isAuthenticated: !!user,
      isSubscribed: subscriptionStatus.isSubscribed,
      isCheckingSubscription: subscriptionStatus.isCheckingSubscription,
      isLoading,
      isLoggingIn: loginMutation.isLoading || otpLoginMutation.isLoading,
      isRegistering: registerMutation.isLoading,
      subscriptionError,
      login,
      register,
      loginWithOtp,
      logout
    }
  }, [user, subscription, isLoading, isSubscriptionLoading, subscriptionError, loginMutation.isLoading, registerMutation.isLoading, otpLoginMutation.isLoading, login, register, loginWithOtp, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider

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

  const { data: subscription, isLoading: isSubscriptionLoading } = trpc.billing.getSubscription.useQuery(undefined, {
    enabled: !!user, // Only run when user is set.
    retry: false
  })

  
  const loginMutation = trpc.auth.login.useMutation()
  const registerMutation = trpc.auth.register.useMutation()
  const otpLoginMutation = trpc.auth.verifyOtpAndLogin.useMutation()

  const checkSession = useCallback(async () => {
    setIsLoading(true)
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const userProfile = await refetchMe()
        if (userProfile.data) {
          setUser(userProfile.data)
        } else {
          setUser(null)
          localStorage.removeItem('accessToken')
        }
      } catch (error) {
        setUser(null)
        localStorage.removeItem('accessToken')
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
    navigate('/login')
  }, [navigate])

  const value = useMemo(() => ({
    user,
    subscription,
    isAuthenticated: !!user,
    isSubscribed: subscription && ['active', 'trialing'].includes(subscription.status) && !(subscription?.status === 'trialing' && new Date(subscription.currentPeriodEnd) < new Date()),
    isLoading,
    isLoggingIn: loginMutation.isLoading || otpLoginMutation.isLoading,
    isRegistering: registerMutation.isLoading,
    login,
    register,
    loginWithOtp,
    logout
  }), [user, subscription, isLoading, isSubscriptionLoading, loginMutation.isLoading, registerMutation.isLoading, otpLoginMutation.isLoading, login, register, loginWithOtp, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider

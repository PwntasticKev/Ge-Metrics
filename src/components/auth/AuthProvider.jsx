import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../contexts/AuthContext'
import { trpc } from '../../utils/trpc.jsx'

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const { data: me, refetch: refetchMe, isError } = trpc.auth.me.useQuery(
    undefined,
    { enabled: false, retry: false }
  )

  const loginMutation = trpc.auth.login.useMutation()
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

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('accessToken')
    navigate('/login')
  }, [navigate])

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    isLoggingIn: loginMutation.isLoading || otpLoginMutation.isLoading,
    login,
    loginWithOtp,
    logout
  }), [user, isLoading, loginMutation.isLoading, otpLoginMutation.isLoading, login, loginWithOtp, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider

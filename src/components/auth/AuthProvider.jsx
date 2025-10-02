import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../contexts/AuthContext'
import { trpc } from '../../utils/trpc'

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

  const checkSession = async () => {
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
  }

  useEffect(() => {
    checkSession()
  }, [])

  const login = (credentials, callbacks) => {
    loginMutation.mutate(credentials, {
      onSuccess: (data) => {
        if (data && !data.twoFactorRequired) {
          localStorage.setItem('accessToken', data.accessToken)
          checkSession() // Refetch user to set the context
        }
        callbacks?.onSuccess(data)
      },
      onError: callbacks?.onError
    })
  }

  const loginWithOtp = async (credentials) => {
    try {
      const data = await otpLoginMutation.mutateAsync(credentials)
      if (data && data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken)
        await checkSession()
      }
      return data
    } catch (error) {
      throw error // Re-throw to be caught in the component
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('accessToken')
    // Invalidate queries if needed, using the context from trpc.jsx
    navigate('/login')
  }

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    isLoggingIn: loginMutation.isLoading,
    login,
    loginWithOtp,
    logout
  }), [user, isLoading, loginMutation.isLoading])

  // The TRPCProvider is now in App.jsx, wrapping this AuthProvider.
  // This simplifies AuthProvider to only handle auth logic.
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider

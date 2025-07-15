import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { trpc } from '../utils/trpc'

// Auth state management
export const useAuth = () => {
  const queryClient = useQueryClient()

  // Check if we have a token before making the query
  const hasToken = !!localStorage.getItem('accessToken')

  // Get current user - only if we have a token
  const {
    data: user,
    isLoading: isLoadingUser,
    error: userError
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => trpc.auth.me.query(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: hasToken, // Only run the query if we have a token
    refetchOnWindowFocus: false // Prevent refetching on window focus
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data) => trpc.auth.register.mutate(data),
    onSuccess: (data) => {
      // Store tokens
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)

      // Update query cache
      queryClient.setQueryData(['auth', 'me'], data.user)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    }
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data) => trpc.auth.login.mutate(data),
    onSuccess: (data) => {
      // Store tokens
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)

      // Update query cache
      queryClient.setQueryData(['auth', 'me'], data.user)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    }
  })

  // Google login mutation
  const googleLoginMutation = useMutation({
    mutationFn: (data) => trpc.auth.googleIdToken.mutate(data),
    onSuccess: (data) => {
      // Store tokens
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)

      // Update query cache
      queryClient.setQueryData(['auth', 'me'], data.user)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    }
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => {
      const refreshToken = localStorage.getItem('refreshToken')
      return trpc.auth.logout.mutate({ refreshToken })
    },
    onSuccess: () => {
      // Clear tokens
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')

      // Clear query cache
      queryClient.setQueryData(['auth', 'me'], null)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    }
  })

  // Refresh token mutation
  const refreshMutation = useMutation({
    mutationFn: () => {
      const refreshToken = localStorage.getItem('refreshToken')
      return trpc.auth.refresh.mutate({ refreshToken })
    },
    onSuccess: (data) => {
      // Store new tokens
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)

      // Update query cache
      queryClient.setQueryData(['auth', 'me'], data.user)
    },
    onError: () => {
      // Clear invalid tokens
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      queryClient.setQueryData(['auth', 'me'], null)
    }
  })

  return {
    // User state
    user,
    isAuthenticated: !!user,
    isLoadingUser,
    userError,

    // Mutations
    register: registerMutation.mutate,
    login: loginMutation.mutate,
    googleLogin: googleLoginMutation.mutate,
    logout: logoutMutation.mutate,
    refresh: refreshMutation.mutate,

    // Loading states
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isGoogleLoggingIn: googleLoginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isRefreshing: refreshMutation.isPending,

    // Errors
    registerError: registerMutation.error,
    loginError: loginMutation.error,
    googleLoginError: googleLoginMutation.error,
    logoutError: logoutMutation.error,
    refreshError: refreshMutation.error
  }
}

// Individual hook exports for convenience
export const useRegister = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => trpc.auth.register.mutate(data),
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      queryClient.setQueryData(['auth', 'me'], data.user)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    }
  })
}

export const useLogin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => trpc.auth.login.mutate(data),
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      queryClient.setQueryData(['auth', 'me'], data.user)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    }
  })
}

export const useGoogleLogin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => trpc.auth.googleIdToken.mutate(data),
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      queryClient.setQueryData(['auth', 'me'], data.user)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    }
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      const refreshToken = localStorage.getItem('refreshToken')
      return trpc.auth.logout.mutate({ refreshToken })
    },
    onSuccess: () => {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      queryClient.setQueryData(['auth', 'me'], null)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    }
  })
}

export const useRefresh = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      const refreshToken = localStorage.getItem('refreshToken')
      return trpc.auth.refresh.mutate({ refreshToken })
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      queryClient.setQueryData(['auth', 'me'], data.user)
    },
    onError: () => {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      queryClient.setQueryData(['auth', 'me'], null)
    }
  })
}

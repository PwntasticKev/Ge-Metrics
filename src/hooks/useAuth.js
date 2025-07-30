import { useQueryClient } from '@tanstack/react-query'
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
  } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: hasToken, // Only run the query if we have a token
    refetchOnWindowFocus: false // Prevent refetching on window focus
  })

  // Register mutation
  const registerMutation = trpc.auth.register.useMutation({
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
  const loginMutation = trpc.auth.login.useMutation({
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
  const logoutMutation = trpc.auth.logout.useMutation({
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
  const refreshMutation = trpc.auth.refresh.useMutation({
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
    logout: logoutMutation.mutate,
    refresh: refreshMutation.mutate,

    // Loading states
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isRefreshing: refreshMutation.isPending,

    // Errors
    registerError: registerMutation.error,
    loginError: loginMutation.error,
    logoutError: logoutMutation.error,
    refreshError: refreshMutation.error
  }
}

// Individual hook exports for convenience
export const useRegister = () => {
  const queryClient = useQueryClient()

  return trpc.auth.register.useMutation({
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

  return trpc.auth.login.useMutation({
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

  return trpc.auth.googleIdToken.useMutation({
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

  return trpc.auth.logout.useMutation({
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

  return trpc.auth.refresh.useMutation({
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

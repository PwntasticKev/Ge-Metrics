/**
 * Authentication Service Tests
 */

import authService from './authService'

// Mock fetch globally
global.fetch = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
global.localStorage = localStorageMock

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('Login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await authService.login('test@example.com', 'password123')

      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      })

      expect(result).toEqual(mockResponse)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'access-token')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-token')
    })

    it('should handle login failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' })
      })

      await expect(authService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials')
    })

    it('should validate email format', async () => {
      await expect(authService.login('invalid-email', 'password123'))
        .rejects.toThrow('Invalid email format')
    })

    it('should validate password length', async () => {
      await expect(authService.login('test@example.com', '123'))
        .rejects.toThrow('Password must be at least 8 characters')
    })

    it('should login with test account', async () => {
      const mockResponse = {
        user: { id: 'master-user-id', email: 'admin@test.com', name: 'Admin User' },
        accessToken: 'test-token',
        refreshToken: 'test-refresh'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await authService.loginWithTestAccount()

      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'admin123'
        })
      })

      expect(result).toEqual(mockResponse)
    })
  })

  describe('Registration', () => {
    it('should register successfully with valid data', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      }

      const mockResponse = {
        user: { id: '2', ...userData },
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await authService.register(userData)

      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      expect(result).toEqual(mockResponse)
    })

    it('should handle registration failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'User already exists' })
      })

      await expect(authService.register({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User'
      })).rejects.toThrow('User already exists')
    })
  })

  describe('Logout', () => {
    it('should logout successfully', async () => {
      localStorageMock.getItem.mockReturnValue('refresh-token')

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      const result = await authService.logout()

      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'refresh-token' })
      })

      expect(result).toBe(true)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
    })

    it('should clear local data even if server request fails', async () => {
      localStorageMock.getItem.mockReturnValue('refresh-token')

      fetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await authService.logout()

      expect(result).toBe(true)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
    })
  })

  describe('Current User', () => {
    it('should get current user with valid token', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' }

      localStorageMock.getItem.mockReturnValue('valid-token')
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      })

      const result = await authService.getCurrentUser()

      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/auth/me', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' }
      })

      expect(result).toEqual(mockUser)
    })

    it('should return null with invalid token', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token')
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid token' })
      })

      const result = await authService.getCurrentUser()

      expect(result).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
    })

    it('should return null with no token', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const result = await authService.getCurrentUser()

      expect(result).toBeNull()
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('Authentication State', () => {
    it('should check if user is authenticated', () => {
      const sessionData = {
        token: 'session-token',
        expiresAt: Date.now() + 3600000 // 1 hour from now
      }

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_token') return 'auth-token'
        if (key === 'auth_session') return JSON.stringify(sessionData)
        return null
      })

      const result = authService.isAuthenticated()

      expect(result).toBe(true)
    })

    it('should return false for expired session', () => {
      const sessionData = {
        token: 'session-token',
        expiresAt: Date.now() - 3600000 // 1 hour ago
      }

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_token') return 'auth-token'
        if (key === 'auth_session') return JSON.stringify(sessionData)
        return null
      })

      const result = authService.isAuthenticated()

      expect(result).toBe(false)
    })

    it('should return false with no tokens', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const result = authService.isAuthenticated()

      expect(result).toBe(false)
    })
  })

  describe('Token Management', () => {
    it('should get auth token', () => {
      localStorageMock.getItem.mockReturnValue('auth-token')

      const result = authService.getAuthToken()

      expect(result).toBe('auth-token')
      expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token')
    })

    it('should get refresh token', () => {
      localStorageMock.getItem.mockReturnValue('refresh-token')

      const result = authService.getRefreshToken()

      expect(result).toBe('refresh-token')
      expect(localStorageMock.getItem).toHaveBeenCalledWith('refresh_token')
    })
  })

  describe('Auth State Listeners', () => {
    it('should add and notify auth state listeners', () => {
      const mockCallback = jest.fn()

      authService.currentUser = { id: '1', name: 'Test User' }

      const unsubscribe = authService.onAuthStateChanged(mockCallback)

      expect(mockCallback).toHaveBeenCalledWith({ id: '1', name: 'Test User' })

      // Test unsubscribe
      unsubscribe()
      expect(authService.authListeners).not.toContain(mockCallback)
    })

    it('should notify all listeners on auth state change', () => {
      const mockCallback1 = jest.fn()
      const mockCallback2 = jest.fn()

      authService.onAuthStateChanged(mockCallback1)
      authService.onAuthStateChanged(mockCallback2)

      const newUser = { id: '2', name: 'New User' }
      authService.notifyAuthListeners(newUser)

      expect(mockCallback1).toHaveBeenCalledWith(newUser)
      expect(mockCallback2).toHaveBeenCalledWith(newUser)
    })
  })

  describe('Profile Management', () => {
    it('should update profile', async () => {
      authService.currentUser = { id: '1', name: 'Old Name', email: 'test@example.com' }

      const updates = { name: 'New Name' }
      const result = await authService.updateProfile(updates)

      expect(result).toEqual({
        id: '1',
        name: 'New Name',
        email: 'test@example.com'
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user_data',
        JSON.stringify(result)
      )
    })

    it('should throw error when not authenticated', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      await expect(authService.updateProfile({ name: 'New Name' }))
        .rejects.toThrow('Not authenticated')
    })
  })

  describe('Security Helpers', () => {
    it('should check if identifier is blocked', () => {
      // This would test the securityService integration
      const result = authService.isBlocked('test@example.com')
      expect(typeof result).toBe('boolean')
    })

    it('should get failed attempts count', () => {
      const result = authService.getFailedAttempts('test@example.com')
      expect(result).toHaveProperty('count')
      expect(typeof result.count).toBe('number')
    })
  })

  describe('Test Helpers', () => {
    it('should provide master credentials', () => {
      const credentials = authService.getMasterCredentials()

      expect(credentials).toEqual({
        email: 'admin@test.com',
        password: 'admin123',
        name: 'Admin User'
      })
    })
  })

  describe('Data Management', () => {
    it('should set auth data correctly', () => {
      const authData = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      }

      authService.setAuthData(authData)

      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'access-token')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-token')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user_data', JSON.stringify(authData.user))
      expect(authService.currentUser).toEqual(authData.user)
    })

    it('should clear auth data correctly', () => {
      authService.currentUser = { id: '1', name: 'Test User' }

      authService.clearAuthData()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user_data')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_session')
      expect(authService.currentUser).toBeNull()
    })
  })
})

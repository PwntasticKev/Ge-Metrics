/**
 * Authentication Service
 * Handles user authentication, session management, and token storage
 */

import securityService from './securityService'

class AuthService {
  constructor () {
    this.isBrowser = typeof window !== 'undefined'
    this.token = null
    this.user = null
    this.init()
  }

  init () {
    if (this.isBrowser) {
      this.checkExistingSession()
    }
  }

  /**
   * Authentication Methods
   */
  async login (email, password) {
    try {
      // Rate limiting check
      const rateLimit = securityService.checkRateLimit(email, 'login')
      if (!rateLimit.allowed) {
        throw new Error(rateLimit.error)
      }

      // Validate inputs
      const emailValidation = securityService.validateInput(email, 'email')
      const passwordValidation = securityService.validateInput(password, 'password')

      if (!emailValidation.valid) {
        throw new Error(emailValidation.error)
      }
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.error)
      }

      // Make login request
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: emailValidation.sanitized || email,
          password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Record failed attempt
        securityService.recordFailedAttempt(email)
        throw new Error(data.error || 'Login failed')
      }

      // Clear any previous failed attempts
      securityService.clearFailedAttempts(email)

      // Store authentication data
      this.setAuthData(data)

      // Create security service session
      securityService.createSession(data.user.id, data.user)

      return data
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  async register (userData) {
    try {
      // Validate inputs
      const emailValidation = securityService.validateInput(userData.email, 'email')
      const passwordValidation = securityService.validateInput(userData.password, 'password')
      const nameValidation = securityService.validateInput(userData.name, 'text')

      if (!emailValidation.valid) {
        throw new Error(emailValidation.error)
      }
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.error)
      }
      if (!nameValidation.valid) {
        throw new Error(nameValidation.error)
      }

      // Make registration request
      const response = await fetch(`${this.baseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: emailValidation.sanitized || userData.email,
          password: userData.password,
          name: nameValidation.sanitized || userData.name
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // Store authentication data
      this.setAuthData(data)

      // Create security service session
      securityService.createSession(data.user.id, data.user)

      return data
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  async logout () {
    try {
      const refreshToken = localStorage.getItem('refresh_token')

      if (refreshToken) {
        // Notify server of logout
        await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken })
        })
      }

      // Clear local storage
      this.clearAuthData()

      // Destroy security service session
      const sessionData = localStorage.getItem('auth_session')
      if (sessionData) {
        const session = JSON.parse(sessionData)
        securityService.destroySession(session.token)
      }

      // Notify listeners
      this.notifyAuthListeners(null)

      return true
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear local data even if server request fails
      this.clearAuthData()
      this.notifyAuthListeners(null)
      return true
    }
  }

  async getCurrentUser () {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return null
      }

      const response = await fetch(`${this.baseURL}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        // Token might be expired
        this.clearAuthData()
        return null
      }

      const userData = await response.json()
      this.currentUser = userData
      return userData
    } catch (error) {
      console.error('Get current user error:', error)
      this.clearAuthData()
      return null
    }
  }

  /**
   * Session Management
   */
  async checkExistingSession () {
    if (!this.isBrowser) return
    try {
      const sessionData = localStorage.getItem('auth_session')
      const authToken = localStorage.getItem('auth_token')

      if (!sessionData || !authToken) {
        return false
      }

      const session = JSON.parse(sessionData)

      // Check if session is expired
      if (session.expiresAt && session.expiresAt < Date.now()) {
        this.clearAuthData()
        return false
      }

      // Validate session with security service
      const sessionValidation = securityService.validateSession(session.token)
      if (!sessionValidation.valid) {
        this.clearAuthData()
        return false
      }

      // Try to get current user from server
      const user = await this.getCurrentUser()
      if (user) {
        this.currentUser = user
        this.notifyAuthListeners(user)
        return true
      }

      return false
    } catch (error) {
      console.error('Session check error:', error)
      this.clearAuthData()
      return false
    }
  }

  isAuthenticated () {
    const token = localStorage.getItem('auth_token')
    const sessionData = localStorage.getItem('auth_session')

    if (!token || !sessionData) {
      return false
    }

    try {
      const session = JSON.parse(sessionData)
      return session.expiresAt > Date.now()
    } catch {
      return false
    }
  }

  getAuthToken () {
    return localStorage.getItem('auth_token')
  }

  getRefreshToken () {
    return localStorage.getItem('refresh_token')
  }

  /**
   * Data Management
   */
  setAuthData (authData) {
    if (!this.isBrowser) return
    // Store tokens
    localStorage.setItem('auth_token', authData.accessToken)
    localStorage.setItem('refresh_token', authData.refreshToken)

    // Store user data
    this.currentUser = authData.user
    localStorage.setItem('user_data', JSON.stringify(authData.user))

    // Notify listeners
    this.notifyAuthListeners(authData.user)
  }

  clearAuthData () {
    if (!this.isBrowser) return
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_data')
    localStorage.removeItem('auth_session')
    this.currentUser = null
  }

  /**
   * Authentication State Listeners
   */
  onAuthStateChanged (callback) {
    this.authListeners.push(callback)

    // Immediately call with current state
    callback(this.currentUser)

    // Return unsubscribe function
    return () => {
      this.authListeners = this.authListeners.filter(listener => listener !== callback)
    }
  }

  notifyAuthListeners (user) {
    this.authListeners.forEach(callback => {
      try {
        callback(user)
      } catch (error) {
        console.error('Auth listener error:', error)
      }
    })
  }

  /**
   * Token Refresh (for future implementation)
   */
  async refreshToken () {
    try {
      const refreshToken = this.getRefreshToken()
      if (!refreshToken) {
        throw new Error('No refresh token available')
      }

      // This would be implemented when the server supports token refresh
      // For now, we'll just return the existing token
      return this.getAuthToken()
    } catch (error) {
      console.error('Token refresh error:', error)
      this.logout()
      throw error
    }
  }

  /**
   * User Profile Management
   */
  async updateProfile (updates) {
    try {
      const token = this.getAuthToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      // This would be implemented when the server supports profile updates
      console.log('Profile update would be sent to server:', updates)

      // For now, just update local storage
      const currentUser = { ...this.currentUser, ...updates }
      this.currentUser = currentUser
      localStorage.setItem('user_data', JSON.stringify(currentUser))

      this.notifyAuthListeners(currentUser)
      return currentUser
    } catch (error) {
      console.error('Profile update error:', error)
      throw error
    }
  }

  /**
   * Password Management
   */
  async changePassword (currentPassword, newPassword) {
    try {
      const token = this.getAuthToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      // Validate new password
      const passwordValidation = securityService.validateInput(newPassword, 'password')
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.error)
      }

      // This would be implemented when the server supports password changes
      console.log('Password change would be sent to server')

      return true
    } catch (error) {
      console.error('Password change error:', error)
      throw error
    }
  }

  /**
   * Security Helpers
   */
  isBlocked (identifier) {
    return securityService.isBlocked(identifier)
  }

  getFailedAttempts (identifier) {
    return securityService.failedAttempts.get(identifier.toLowerCase()) || { count: 0 }
  }

  /**
   * Development Helpers
   */
  // Get development credentials from environment variables
  getDevelopmentCredentials () {
    return {
      email: process.env.REACT_APP_DEV_EMAIL || 'dev@ge-metrics.com',
      password: process.env.REACT_APP_DEV_PASSWORD || '',
      name: process.env.REACT_APP_DEV_NAME || 'Development User'
    }
  }
}

// Export singleton instance
export default new AuthService()

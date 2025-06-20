/**
 * Comprehensive User Management Service
 * Handles user operations, roles, permissions, sessions, and subscription verification
 */

class UserManagementService {
  constructor () {
    this.users = new Map()
    this.sessions = new Map()
    this.blockedUsers = new Set()
    this.roles = new Map()
    this.permissions = new Map()
    this.auditLog = []
    this.subscriptionVerifier = null
    this.onlineUsers = new Set()
    this.messageTemplates = this.getDefaultMessageTemplates()

    this.initializeRoles()
    this.initializeMockData()
    this.initializeRealTimeTracking()
  }

  /**
   * Initialize role system with permissions
   */
  initializeRoles () {
    // Define permissions
    const permissions = {
      // User Management
      'users:read': 'View user information',
      'users:write': 'Create and edit users',
      'users:delete': 'Delete users',
      'users:ban': 'Ban/unban users',
      'users:sessions': 'Manage user sessions',
      'users:roles': 'Assign user roles',

      // Billing Management
      'billing:read': 'View billing information',
      'billing:write': 'Process refunds and billing changes',
      'billing:admin': 'Full billing administration',

      // System Administration
      'system:settings': 'Modify system settings',
      'system:logs': 'View system logs',
      'system:maintenance': 'Perform system maintenance',

      // Content Management
      'content:read': 'View all content',
      'content:write': 'Create and edit content',
      'content:moderate': 'Moderate user content',

      // Analytics and Reports
      'analytics:read': 'View analytics data',
      'analytics:export': 'Export analytics data',
      'reports:generate': 'Generate reports',

      // API Access
      'api:read': 'Read API access',
      'api:write': 'Write API access',
      'api:admin': 'Full API administration'
    }

    // Store permissions
    Object.entries(permissions).forEach(([key, description]) => {
      this.permissions.set(key, { key, description, category: key.split(':')[0] })
    })

    // Define roles with their permissions
    const roles = {
      user: {
        name: 'Regular User',
        description: 'Standard user with basic access',
        permissions: [],
        level: 0,
        canAccessPages: ['/', '/watchlist', '/profile', '/settings']
      },
      mod: {
        name: 'Moderator',
        description: 'Content moderator with limited admin access',
        permissions: [
          'users:read',
          'users:ban',
          'content:read',
          'content:write',
          'content:moderate',
          'analytics:read'
        ],
        level: 1,
        canAccessPages: ['/', '/watchlist', '/profile', '/settings', '/admin/users', '/admin/content']
      },
      jmod: {
        name: 'J-Moderator',
        description: 'Senior moderator with extended permissions',
        permissions: [
          'users:read',
          'users:write',
          'users:ban',
          'users:sessions',
          'billing:read',
          'content:read',
          'content:write',
          'content:moderate',
          'analytics:read',
          'analytics:export',
          'reports:generate',
          'system:logs'
        ],
        level: 2,
        canAccessPages: ['/', '/watchlist', '/profile', '/settings', '/admin/users', '/admin/content', '/admin/billing', '/admin/analytics']
      },
      admin: {
        name: 'Administrator',
        description: 'Full system administration access',
        permissions: Array.from(this.permissions.keys()),
        level: 3,
        canAccessPages: ['*'] // Access to all pages
      }
    }

    // Store roles
    Object.entries(roles).forEach(([key, role]) => {
      this.roles.set(key, { ...role, key })
    })
  }

  /**
   * Initialize mock data for testing
   */
  initializeMockData () {
    const mockUsers = [
      {
        id: 'user_admin_001',
        name: 'System Administrator',
        email: 'admin@ge-metrics.com',
        runescape_name: 'AdminChar',
        role: 'admin',
        membership: 'premium',
        subscription_status: 'active',
        subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        otp_enabled: true,
        mailchimp_api_key: 'mc_key_123',
        created_at: new Date('2024-01-01'),
        last_login: new Date(),
        login_count: 150,
        is_blocked: false,
        session_id: 'sess_admin_001',
        status: 'active',
        subscription: {
          type: 'premium',
          status: 'active',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          autoRenew: true
        },
        freeTrial: {
          used: false,
          startDate: null,
          endDate: null,
          notes: ''
        },
        isOnline: true,
        lastSeen: new Date(),
        ipAddress: '127.0.0.1',
        location: 'New York, US',
        device: 'Desktop',
        joinDate: new Date('2024-01-01'),
        totalSessions: 45,
        avgSessionTime: 25, // minutes
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true
        }
      },
      {
        id: 'user_jmod_001',
        name: 'John Moderator',
        email: 'jmod@ge-metrics.com',
        runescape_name: 'JMod_John',
        role: 'jmod',
        membership: 'premium',
        subscription_status: 'active',
        subscription_end: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
        otp_enabled: false,
        mailchimp_api_key: null,
        created_at: new Date('2024-02-15'),
        last_login: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        login_count: 45,
        is_blocked: false,
        session_id: 'sess_jmod_001',
        status: 'active',
        subscription: {
          type: 'premium',
          status: 'active',
          startDate: new Date('2024-02-15'),
          endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
          autoRenew: true
        },
        freeTrial: {
          used: false,
          startDate: null,
          endDate: null,
          notes: ''
        },
        isOnline: true,
        lastSeen: new Date(),
        ipAddress: '192.168.1.100',
        location: 'New York, US',
        device: 'Desktop',
        joinDate: new Date('2024-02-15'),
        totalSessions: 45,
        avgSessionTime: 25, // minutes
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: true
        }
      },
      {
        id: 'user_mod_001',
        name: 'Sarah Moderator',
        email: 'mod@ge-metrics.com',
        runescape_name: 'Mod_Sarah',
        role: 'mod',
        membership: 'free',
        subscription_status: 'trial',
        subscription_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        otp_enabled: true,
        mailchimp_api_key: 'mc_key_456',
        created_at: new Date('2024-03-01'),
        last_login: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        login_count: 12,
        is_blocked: false,
        session_id: 'sess_mod_001',
        status: 'active',
        subscription: {
          type: 'trial',
          status: 'active',
          startDate: new Date('2024-03-01'),
          endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
          autoRenew: false
        },
        freeTrial: {
          used: true,
          startDate: new Date('2024-03-01'),
          endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
          notes: ''
        },
        isOnline: true,
        lastSeen: new Date(),
        ipAddress: '192.168.1.101',
        location: 'California, US',
        device: 'Mobile',
        joinDate: new Date('2024-03-01'),
        totalSessions: 12,
        avgSessionTime: 18,
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          marketingEmails: false
        }
      },
      {
        id: 'user_regular_001',
        name: 'Regular User',
        email: 'user@example.com',
        runescape_name: 'RegularPlayer',
        role: 'user',
        membership: 'free',
        subscription_status: 'expired',
        subscription_end: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        otp_enabled: false,
        mailchimp_api_key: null,
        created_at: new Date('2024-03-10'),
        last_login: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        login_count: 8,
        is_blocked: false,
        session_id: null,
        status: 'active',
        subscription: {
          type: 'free',
          status: 'expired',
          startDate: new Date('2024-03-10'),
          endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          autoRenew: false
        },
        freeTrial: {
          used: true,
          startDate: new Date('2024-03-10'),
          endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          notes: ''
        },
        isOnline: false,
        lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        ipAddress: null,
        location: null,
        device: null,
        joinDate: new Date('2024-03-10'),
        totalSessions: 8,
        avgSessionTime: 8,
        preferences: {
          emailNotifications: false,
          smsNotifications: false,
          marketingEmails: false
        }
      },
      {
        id: 'user_blocked_001',
        name: 'Blocked User',
        email: 'blocked@example.com',
        runescape_name: 'BlockedPlayer',
        role: 'user',
        membership: 'free',
        subscription_status: 'canceled',
        subscription_end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        otp_enabled: false,
        mailchimp_api_key: null,
        created_at: new Date('2024-01-15'),
        last_login: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        login_count: 25,
        is_blocked: true,
        session_id: null,
        status: 'inactive',
        subscription: {
          type: 'free',
          status: 'canceled',
          startDate: new Date('2024-01-15'),
          endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          autoRenew: false
        },
        freeTrial: {
          used: false,
          startDate: new Date('2024-01-15'),
          endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          notes: ''
        },
        isOnline: false,
        lastSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        ipAddress: null,
        location: null,
        device: null,
        joinDate: new Date('2024-01-15'),
        totalSessions: 25,
        avgSessionTime: 25,
        preferences: {
          emailNotifications: false,
          smsNotifications: false,
          marketingEmails: false
        }
      }
    ]

    // Store users
    mockUsers.forEach(user => {
      this.users.set(user.id, user)
      if (user.session_id) {
        this.sessions.set(user.session_id, {
          userId: user.id,
          createdAt: new Date(),
          lastActivity: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'Mock Browser'
        })
      }
      if (user.is_blocked) {
        this.blockedUsers.add(user.id)
      }
    })
  }

  /**
   * Initialize real-time tracking simulation
   */
  initializeRealTimeTracking () {
    // Simulate user activity updates every 30 seconds
    setInterval(() => {
      this.updateUserActivity()
    }, 30000)

    // Simulate some users going online/offline randomly
    setInterval(() => {
      this.simulateUserStatusChanges()
    }, 60000)
  }

  /**
   * Simulate user activity updates
   */
  updateUserActivity () {
    this.users.forEach(user => {
      if (user.isOnline) {
        user.lastSeen = new Date()
        user.totalSessions += Math.random() < 0.1 ? 1 : 0 // 10% chance of new session
      }
    })
  }

  /**
   * Simulate user status changes
   */
  simulateUserStatusChanges () {
    this.users.forEach(user => {
      if (Math.random() < 0.1) { // 10% chance of status change
        user.isOnline = !user.isOnline
        if (!user.isOnline) {
          user.lastSeen = new Date()
        }
        this.logAudit('user_status_change', 'system', `User ${user.email} went ${user.isOnline ? 'online' : 'offline'}`)
      }
    })
  }

  /**
   * Get default message templates
   */
  getDefaultMessageTemplates () {
    return {
      welcome: {
        subject: 'Welcome to GE Metrics!',
        body: 'Welcome to GE Metrics! We\'re excited to have you on board. Start exploring the Grand Exchange data and maximize your trading profits!'
      },
      trialExpiring: {
        subject: 'Your free trial is expiring soon',
        body: 'Your free trial will expire in 3 days. Upgrade to premium to continue accessing all features!'
      },
      subscriptionExpiring: {
        subject: 'Subscription renewal reminder',
        body: 'Your premium subscription will expire soon. Renew now to avoid interruption of service.'
      },
      reactivation: {
        subject: 'We miss you at GE Metrics!',
        body: 'It\'s been a while since your last visit. Come back and check out our new features!'
      },
      newsletter: {
        subject: 'GE Metrics Weekly Update',
        body: 'Check out this week\'s market trends and trading opportunities!'
      }
    }
  }

  /**
   * User Management Operations
   */
  getAllUsers (filters = {}) {
    let users = Array.from(this.users.values())

    // Apply filters
    if (filters.role) {
      users = users.filter(user => user.role === filters.role)
    }
    if (filters.membership) {
      users = users.filter(user => user.membership === filters.membership)
    }
    if (filters.subscription_status) {
      users = users.filter(user => user.subscription_status === filters.subscription_status)
    }
    if (filters.is_blocked !== undefined) {
      users = users.filter(user => user.is_blocked === filters.is_blocked)
    }
    if (filters.search) {
      const query = filters.search.toLowerCase()
      users = users.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.runescape_name?.toLowerCase().includes(query)
      )
    }

    return users.map(user => ({
      ...user,
      onlineStatus: this.getOnlineStatus(user),
      subscriptionStatus: this.getSubscriptionStatus(user)
    }))
  }

  getUserById (userId) {
    const user = this.users.get(userId)
    if (!user) return null

    return {
      ...user,
      onlineStatus: this.getOnlineStatus(user),
      subscriptionStatus: this.getSubscriptionStatus(user)
    }
  }

  getUserByEmail (email) {
    return Array.from(this.users.values()).find(user => user.email === email)
  }

  createUser (userData) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const user = {
      id: userId,
      name: userData.name,
      email: userData.email,
      runescape_name: userData.runescape_name || null,
      role: userData.role || 'user',
      membership: userData.membership || 'free',
      subscription_status: userData.subscription_status || 'none',
      subscription_end: userData.subscription_end || null,
      otp_enabled: false,
      mailchimp_api_key: null,
      created_at: new Date(),
      last_login: null,
      login_count: 0,
      is_blocked: false,
      session_id: null,
      status: 'active',
      subscription: {
        type: userData.subscription_type || 'free',
        status: userData.subscription_status || 'none',
        startDate: userData.subscription_start || null,
        endDate: userData.subscription_end || null,
        autoRenew: userData.auto_renew || false
      },
      freeTrial: {
        used: false,
        startDate: null,
        endDate: null,
        notes: userData.trial_notes || ''
      },
      isOnline: false,
      lastSeen: new Date(),
      ipAddress: null,
      location: null,
      device: null,
      joinDate: new Date(),
      totalSessions: 0,
      avgSessionTime: 0,
      preferences: userData.preferences || {},
      ...userData
    }

    this.users.set(userId, user)
    this.logAudit('user_created', userId, { user: user.email })

    return { success: true, user }
  }

  updateUser (userId, updates) {
    const user = this.users.get(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const updatedUser = { ...user, ...updates, updated_at: new Date() }
    this.users.set(userId, updatedUser)
    this.logAudit('user_updated', userId, { updates })

    return { success: true, user: updatedUser }
  }

  deleteUser (userId) {
    const user = this.users.get(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Destroy any active sessions
    this.destroyUserSessions(userId)

    this.users.delete(userId)
    this.blockedUsers.delete(userId)
    this.logAudit('user_deleted', userId, { user: user.email })

    return { success: true }
  }

  /**
   * Role and Permission Management
   */
  updateUserRole (userId, newRole, adminUserId) {
    const user = this.users.get(userId)
    const admin = this.users.get(adminUserId)

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    if (!admin || !this.hasPermission(adminUserId, 'users:roles')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    if (!this.roles.has(newRole)) {
      return { success: false, error: 'Invalid role' }
    }

    const oldRole = user.role
    user.role = newRole
    user.updated_at = new Date()

    this.users.set(userId, user)
    this.logAudit('role_updated', userId, { oldRole, newRole, admin: admin.email })

    return { success: true, user }
  }

  getUserRole (userId) {
    const user = this.users.get(userId)
    if (!user) return null

    return this.roles.get(user.role)
  }

  hasPermission (userId, permission) {
    const user = this.users.get(userId)
    if (!user) return false

    const role = this.roles.get(user.role)
    if (!role) return false

    return role.permissions.includes(permission)
  }

  hasAnyPermission (userId, permissions) {
    return permissions.some(permission => this.hasPermission(userId, permission))
  }

  canAccessPage (userId, pagePath) {
    const user = this.users.get(userId)
    if (!user) return false

    const role = this.roles.get(user.role)
    if (!role) return false

    // Admin has access to all pages
    if (role.canAccessPages.includes('*')) return true

    // Check specific page access
    return role.canAccessPages.some(allowedPath => {
      if (allowedPath === pagePath) return true
      if (allowedPath.endsWith('*')) {
        const basePath = allowedPath.slice(0, -1)
        return pagePath.startsWith(basePath)
      }
      return false
    })
  }

  /**
   * Session Management
   */
  createSession (userId, ipAddress, userAgent) {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const session = {
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress,
      userAgent
    }

    this.sessions.set(sessionId, session)

    // Update user's current session
    const user = this.users.get(userId)
    if (user) {
      user.session_id = sessionId
      user.last_login = new Date()
      user.login_count = (user.login_count || 0) + 1
      this.users.set(userId, user)
    }

    this.logAudit('session_created', userId, { sessionId, ipAddress })

    return { success: true, sessionId }
  }

  destroySession (sessionId) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    const userId = session.userId
    this.sessions.delete(sessionId)

    // Clear user's session reference
    const user = this.users.get(userId)
    if (user && user.session_id === sessionId) {
      user.session_id = null
      this.users.set(userId, user)
    }

    this.logAudit('session_destroyed', userId, { sessionId })

    return { success: true }
  }

  destroyUserSessions (userId) {
    const userSessions = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.userId === userId)

    userSessions.forEach(([sessionId]) => {
      this.sessions.delete(sessionId)
    })

    // Clear user's session reference
    const user = this.users.get(userId)
    if (user) {
      user.session_id = null
      this.users.set(userId, user)
    }

    this.logAudit('all_sessions_destroyed', userId, { count: userSessions.length })

    return { success: true, destroyedCount: userSessions.length }
  }

  validateSession (sessionId) {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    // Update last activity
    session.lastActivity = new Date()
    this.sessions.set(sessionId, session)

    return session
  }

  getUserSessions (userId) {
    return Array.from(this.sessions.entries())
      .filter(([_, session]) => session.userId === userId)
      .map(([sessionId, session]) => ({ sessionId, ...session }))
  }

  /**
   * User Blocking/Unblocking
   */
  blockUser (userId, reason, adminUserId) {
    const user = this.users.get(userId)
    const admin = this.users.get(adminUserId)

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    if (!admin || !this.hasPermission(adminUserId, 'users:ban')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    user.is_blocked = true
    user.block_reason = reason
    user.blocked_at = new Date()
    user.blocked_by = adminUserId

    this.users.set(userId, user)
    this.blockedUsers.add(userId)

    // Destroy all user sessions
    this.destroyUserSessions(userId)

    this.logAudit('user_blocked', userId, { reason, admin: admin.email })

    return { success: true }
  }

  unblockUser (userId, adminUserId) {
    const user = this.users.get(userId)
    const admin = this.users.get(adminUserId)

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    if (!admin || !this.hasPermission(adminUserId, 'users:ban')) {
      return { success: false, error: 'Insufficient permissions' }
    }

    user.is_blocked = false
    user.block_reason = null
    user.blocked_at = null
    user.blocked_by = null
    user.unblocked_at = new Date()
    user.unblocked_by = adminUserId

    this.users.set(userId, user)
    this.blockedUsers.delete(userId)

    this.logAudit('user_unblocked', userId, { admin: admin.email })

    return { success: true }
  }

  isUserBlocked (userId) {
    return this.blockedUsers.has(userId)
  }

  /**
   * Subscription Verification
   */
  verifySubscription (userId) {
    const user = this.users.get(userId)
    if (!user) return { valid: false, reason: 'User not found' }

    if (user.is_blocked) {
      return { valid: false, reason: 'User is blocked' }
    }

    // Check subscription status
    if (user.subscription_status === 'active') {
      if (user.subscription_end && new Date() > user.subscription_end) {
        // Subscription expired
        this.updateUser(userId, {
          subscription_status: 'expired',
          membership: 'free'
        })
        return { valid: false, reason: 'Subscription expired' }
      }
      return { valid: true, plan: user.membership }
    }

    if (user.subscription_status === 'trial') {
      if (user.subscription_end && new Date() > user.subscription_end) {
        // Trial expired
        this.updateUser(userId, {
          subscription_status: 'expired',
          membership: 'free'
        })
        return { valid: false, reason: 'Trial expired' }
      }
      return { valid: true, plan: 'trial' }
    }

    // Free tier or expired/canceled
    return {
      valid: user.subscription_status === 'none' || user.subscription_status === 'free',
      plan: 'free',
      reason: user.subscription_status === 'expired'
        ? 'Subscription expired'
        : user.subscription_status === 'canceled' ? 'Subscription canceled' : null
    }
  }

  /**
   * Password Reset and Communication
   */
  sendPasswordReset (userId) {
    const user = this.users.get(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Generate reset token (in real app, this would be stored securely)
    const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // In real app, send email with reset link
    console.log(`Password reset link for ${user.email}: /reset-password?token=${resetToken}`)

    this.logAudit('password_reset_sent', userId, { email: user.email })

    return { success: true, message: 'Password reset email sent' }
  }

  sendUsernameReminder (userId) {
    const user = this.users.get(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // In real app, send email with username
    console.log(`Username reminder for ${user.email}: Your username is ${user.runescape_name || 'Not set'}`)

    this.logAudit('username_reminder_sent', userId, { email: user.email })

    return { success: true, message: 'Username reminder sent' }
  }

  /**
   * Free Trial Management
   */
  grantFreeTrial (userId, duration = 30, endDate = null, notes = '') {
    try {
      const user = this.users.get(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Calculate trial end date
      let trialEndDate
      if (endDate) {
        // Use provided end date
        trialEndDate = new Date(endDate)
      } else {
        // Calculate based on duration
        trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + duration)
      }

      // Update user with trial information
      const updatedUser = {
        ...user,
        subscription_status: 'trial',
        membership: 'premium',
        subscription_end: trialEndDate,
        trial_granted_by: 'admin',
        trial_granted_at: new Date(),
        trial_admin_note: notes,
        trial_duration: duration,
        trial_end_date: trialEndDate.toISOString(),
        trial_granted_date: new Date().toISOString(),
        trial_notes: notes
      }

      this.users.set(userId, updatedUser)

      // Log the action
      this.logAudit('trial_granted', userId, {
        duration,
        endDate: trialEndDate.toISOString(),
        notes,
        grantedBy: 'admin'
      })

      return {
        success: true,
        user: updatedUser,
        trialEndDate: trialEndDate.toISOString()
      }
    } catch (error) {
      console.error('Error granting free trial:', error)
      return { success: false, error: error.message }
    }
  }

  updateTrial (userId, newDuration = null, newEndDate = null, notes = '') {
    try {
      const user = this.users.get(userId)
      if (!user) {
        throw new Error('User not found')
      }

      if (user.subscription_status !== 'trial') {
        throw new Error('User is not currently on trial')
      }

      let trialEndDate
      if (newEndDate) {
        trialEndDate = new Date(newEndDate)
      } else if (newDuration) {
        trialEndDate = new Date(user.trial_granted_at)
        trialEndDate.setDate(trialEndDate.getDate() + newDuration)
      } else {
        throw new Error('Either newDuration or newEndDate must be provided')
      }

      const updatedUser = {
        ...user,
        subscription_status: 'trial',
        membership: 'premium',
        subscription_end: trialEndDate,
        trial_duration: newDuration || user.trial_duration,
        trial_admin_note: notes || user.trial_admin_note,
        trial_end_date: trialEndDate.toISOString(),
        trial_notes: notes || user.trial_notes,
        last_modified: new Date().toISOString()
      }

      this.users.set(userId, updatedUser)

      this.logAudit('trial_updated', userId, {
        newDuration,
        newEndDate: trialEndDate.toISOString(),
        notes,
        updatedBy: 'admin'
      })

      return {
        success: true,
        user: updatedUser,
        trialEndDate: trialEndDate.toISOString()
      }
    } catch (error) {
      console.error('Error updating trial:', error)
      return { success: false, error: error.message }
    }
  }

  getTrialInfo (userId) {
    try {
      const user = this.users.get(userId)
      if (!user) {
        throw new Error('User not found')
      }

      if (user.subscription_status !== 'trial') {
        return { success: false, error: 'User is not on trial' }
      }

      const now = new Date()
      const trialEnd = new Date(user.subscription_end)
      const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))

      return {
        success: true,
        trialInfo: {
          startDate: user.trial_granted_date,
          endDate: user.subscription_end,
          duration: user.trial_duration,
          daysRemaining: Math.max(0, daysRemaining),
          isExpired: now > trialEnd,
          notes: user.trial_admin_note || ''
        }
      }
    } catch (error) {
      console.error('Error getting trial info:', error)
      return { success: false, error: error.message }
    }
  }

  isTrialExpired (userId) {
    try {
      const trialInfo = this.getTrialInfo(userId)
      if (!trialInfo.success) {
        return false
      }
      return trialInfo.trialInfo.isExpired
    } catch (error) {
      console.error('Error checking trial expiration:', error)
      return false
    }
  }

  /**
   * Statistics and Analytics
   */
  getUserStats () {
    const users = Array.from(this.users.values())

    return {
      total: users.length,
      active: users.filter(u => u.session_id).length,
      blocked: users.filter(u => u.is_blocked).length,
      byRole: {
        admin: users.filter(u => u.role === 'admin').length,
        jmod: users.filter(u => u.role === 'jmod').length,
        mod: users.filter(u => u.role === 'mod').length,
        user: users.filter(u => u.role === 'user').length
      },
      bySubscription: {
        active: users.filter(u => u.subscription_status === 'active').length,
        trial: users.filter(u => u.subscription_status === 'trial').length,
        expired: users.filter(u => u.subscription_status === 'expired').length,
        free: users.filter(u => u.subscription_status === 'none' || u.subscription_status === 'free').length
      },
      withOTP: users.filter(u => u.otp_enabled).length,
      withMailchimp: users.filter(u => u.mailchimp_api_key).length
    }
  }

  /**
   * Audit Logging
   */
  logAudit (action, userId, metadata = {}) {
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      userId,
      timestamp: new Date(),
      metadata
    }

    this.auditLog.push(entry)

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000)
    }

    return entry
  }

  getAuditLog (filters = {}) {
    let logs = [...this.auditLog]

    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId)
    }

    if (filters.action) {
      logs = logs.filter(log => log.action === filters.action)
    }

    if (filters.startDate) {
      logs = logs.filter(log => log.timestamp >= filters.startDate)
    }

    if (filters.endDate) {
      logs = logs.filter(log => log.timestamp <= filters.endDate)
    }

    return logs.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Middleware for API protection
   */
  createAuthMiddleware () {
    return (req, res, next) => {
      const sessionId = req.headers.authorization?.replace('Bearer ', '')

      if (!sessionId) {
        return res.status(401).json({ error: 'No session token provided' })
      }

      const session = this.validateSession(sessionId)
      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' })
      }

      const user = this.users.get(session.userId)
      if (!user) {
        return res.status(401).json({ error: 'User not found' })
      }

      if (user.is_blocked) {
        return res.status(403).json({ error: 'User account is blocked' })
      }

      // Verify subscription for premium features
      const subscriptionCheck = this.verifySubscription(user.id)
      if (!subscriptionCheck.valid && req.path.includes('/premium/')) {
        return res.status(402).json({
          error: 'Subscription required',
          reason: subscriptionCheck.reason
        })
      }

      req.user = user
      req.session = session
      next()
    }
  }

  createPermissionMiddleware (requiredPermission) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      if (!this.hasPermission(req.user.id, requiredPermission)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: requiredPermission
        })
      }

      next()
    }
  }

  /**
   * Export/Import functionality
   */
  exportUserData (format = 'json') {
    const users = Array.from(this.users.values())
    const stats = this.getUserStats()
    const auditLog = this.getAuditLog()

    const data = {
      users,
      stats,
      auditLog,
      exportedAt: new Date(),
      version: '1.0'
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = ['id', 'name', 'email', 'role', 'membership', 'subscription_status', 'created_at', 'last_login', 'is_blocked']
      const csvRows = users.map(user =>
        csvHeaders.map(header => user[header] || '').join(',')
      )

      return [csvHeaders.join(','), ...csvRows].join('\n')
    }

    return JSON.stringify(data, null, 2)
  }

  // Online Status Methods
  getOnlineStatus (user) {
    if (user.isOnline) return 'online'

    const minutesAgo = Math.floor((Date.now() - user.lastSeen.getTime()) / (1000 * 60))
    if (minutesAgo < 5) return 'away'
    if (minutesAgo < 30) return 'recently'
    return 'offline'
  }

  getOnlineUsers () {
    return Array.from(this.users.values()).filter(user => user.isOnline)
  }

  setUserOnlineStatus (userId, isOnline, metadata = {}) {
    const user = this.users.get(userId)
    if (!user) return false

    user.isOnline = isOnline
    user.lastSeen = new Date()

    if (metadata.ipAddress) user.ipAddress = metadata.ipAddress
    if (metadata.location) user.location = metadata.location
    if (metadata.device) user.device = metadata.device

    this.logAudit('user_status_update', 'system', `User ${user.email} status changed to ${isOnline ? 'online' : 'offline'}`, metadata)
    return true
  }

  // Subscription Management
  getSubscriptionStatus (user) {
    if (!user.subscription) {
      return {
        status: 'none',
        type: 'none',
        daysRemaining: 0,
        autoRenew: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null
      }
    }

    const now = new Date()
    const endDate = new Date(user.subscription.endDate)
    const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)))

    let status = 'active'
    if (daysRemaining <= 0) {
      status = 'expired'
    } else if (daysRemaining <= 7) {
      status = 'expiring'
    }

    return {
      status,
      type: user.subscription.type, // 'monthly' or 'yearly'
      daysRemaining,
      autoRenew: user.subscription.autoRenew || false,
      stripeCustomerId: user.subscription.stripeCustomerId || null,
      stripeSubscriptionId: user.subscription.stripeSubscriptionId || null,
      nextBillingDate: user.subscription.nextBillingDate || null,
      amount: user.subscription.amount || null,
      currency: user.subscription.currency || 'USD'
    }
  }

  updateUserSubscription (userId, subscriptionData) {
    const user = this.getUserById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Premium-only subscription structure
    const allowedTypes = ['monthly', 'yearly']
    if (subscriptionData.type && !allowedTypes.includes(subscriptionData.type)) {
      throw new Error('Invalid subscription type. Only monthly and yearly subscriptions are available.')
    }

    // Update subscription with Stripe integration fields
    user.subscription = {
      ...user.subscription,
      ...subscriptionData,
      updatedAt: new Date()
    }

    // Update legacy fields for compatibility
    user.membership = 'premium'
    user.subscription_status = subscriptionData.status || 'active'
    user.subscription_end = subscriptionData.endDate || user.subscription_end

    this.users.set(userId, user)
    this.logAudit('subscription_updated', userId, {
      newSubscription: subscriptionData,
      stripeIntegration: true
    })

    return user.subscription
  }

  // Mass Messaging System
  getMessageRecipients (criteria) {
    let recipients = Array.from(this.users.values())

    // Filter by subscription status
    if (criteria.subscriptionStatus) {
      recipients = recipients.filter(user => {
        const status = this.getSubscriptionStatus(user)
        return criteria.subscriptionStatus.includes(status)
      })
    }

    // Filter by online status
    if (criteria.onlineStatus) {
      recipients = recipients.filter(user => {
        const status = this.getOnlineStatus(user)
        return criteria.onlineStatus.includes(status)
      })
    }

    // Filter by user status
    if (criteria.userStatus) {
      recipients = recipients.filter(user => criteria.userStatus.includes(user.status))
    }

    // Filter by role
    if (criteria.roles) {
      recipients = recipients.filter(user => criteria.roles.includes(user.role))
    }

    // Filter by preferences
    if (criteria.emailNotifications) {
      recipients = recipients.filter(user => user.preferences.emailNotifications)
    }

    // Filter by join date
    if (criteria.joinedAfter) {
      recipients = recipients.filter(user => user.joinDate >= criteria.joinedAfter)
    }

    if (criteria.joinedBefore) {
      recipients = recipients.filter(user => user.joinDate <= criteria.joinedBefore)
    }

    return recipients
  }

  sendMassMessage (criteria, message, senderId = 'admin') {
    const recipients = this.getMessageRecipients(criteria)

    const messageId = Date.now().toString()
    const messageRecord = {
      id: messageId,
      senderId,
      recipients: recipients.map(r => r.id),
      subject: message.subject,
      body: message.body,
      sentAt: new Date(),
      status: 'sent',
      deliveryStats: {
        total: recipients.length,
        delivered: recipients.length,
        failed: 0,
        opened: 0,
        clicked: 0
      }
    }

    // Simulate message delivery
    this.logAudit('mass_message_sent', senderId, `Sent message "${message.subject}" to ${recipients.length} recipients`, {
      messageId,
      recipientCount: recipients.length,
      criteria
    })

    return messageRecord
  }

  getMessageTemplates () {
    return this.messageTemplates
  }

  createMessageTemplate (name, template) {
    this.messageTemplates[name] = template
    return true
  }

  // Smart recipient suggestions
  getSmartRecipientSuggestions () {
    const now = new Date()
    const suggestions = []

    // Users with expiring subscriptions
    const expiringUsers = Array.from(this.users.values()).filter(user => {
      const status = this.getSubscriptionStatus(user)
      return status === 'expiring'
    })
    if (expiringUsers.length > 0) {
      suggestions.push({
        name: 'Expiring Subscriptions',
        description: `${expiringUsers.length} users with subscriptions expiring within 7 days`,
        criteria: { subscriptionStatus: ['expiring'] },
        template: 'subscriptionExpiring',
        priority: 'high'
      })
    }

    // Inactive users
    const inactiveUsers = Array.from(this.users.values()).filter(user => {
      const daysSinceLastSeen = Math.floor((now - user.lastSeen) / (1000 * 60 * 60 * 24))
      return daysSinceLastSeen > 7 && user.status === 'active'
    })
    if (inactiveUsers.length > 0) {
      suggestions.push({
        name: 'Inactive Users',
        description: `${inactiveUsers.length} users inactive for over 7 days`,
        criteria: { userStatus: ['active'] }, // Custom filter needed
        template: 'reactivation',
        priority: 'medium'
      })
    }

    // Free users (potential upsell)
    const freeUsers = Array.from(this.users.values()).filter(user => user.subscription.type === 'free')
    if (freeUsers.length > 0) {
      suggestions.push({
        name: 'Free Users',
        description: `${freeUsers.length} users on free plan (upsell opportunity)`,
        criteria: { subscriptionStatus: ['free'] },
        template: 'newsletter',
        priority: 'low'
      })
    }

    return suggestions
  }

  // Analytics and Statistics
  getUserAnalytics () {
    const total = Array.from(this.users.values()).length
    const online = Array.from(this.users.values()).filter(u => u.isOnline).length
    const active = Array.from(this.users.values()).filter(u => u.status === 'active').length
    const premium = Array.from(this.users.values()).filter(u => u.subscription.type === 'premium' && u.subscription.status === 'active').length
    const free = Array.from(this.users.values()).filter(u => u.subscription.type === 'free').length
    const trial = Array.from(this.users.values()).filter(u => u.subscription.type === 'trial').length

    return {
      total,
      online,
      active,
      inactive: total - active,
      subscription: {
        premium,
        free,
        trial,
        expired: Array.from(this.users.values()).filter(u => this.getSubscriptionStatus(u) === 'expired').length
      },
      onlineRate: ((online / total) * 100).toFixed(1),
      premiumRate: ((premium / total) * 100).toFixed(1)
    }
  }

  /**
   * Create Stripe-ready subscription data
   */
  createStripeSubscription (userId, planType, stripeData) {
    const user = this.getUserById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const now = new Date()
    let endDate, amount

    // Premium-only pricing
    if (planType === 'monthly') {
      endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      amount = 9.99 // Monthly price
    } else if (planType === 'yearly') {
      endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 365 days
      amount = 99.99 // Yearly price (save ~17%)
    } else {
      throw new Error('Invalid plan type. Only monthly and yearly plans are available.')
    }

    const subscriptionData = {
      type: planType,
      status: 'active',
      startDate: now,
      endDate,
      autoRenew: true,
      stripeCustomerId: stripeData.customerId,
      stripeSubscriptionId: stripeData.subscriptionId,
      stripePriceId: stripeData.priceId,
      nextBillingDate: endDate,
      amount,
      currency: 'USD',
      createdAt: now
    }

    return this.updateUserSubscription(userId, subscriptionData)
  }

  /**
   * Get available subscription plans (premium-only)
   */
  getAvailablePlans () {
    return [
      {
        id: 'monthly',
        name: 'Monthly Premium',
        description: 'Full access to all features',
        price: 9.99,
        currency: 'USD',
        interval: 'month',
        intervalCount: 1,
        features: [
          'Unlimited item tracking',
          'Advanced market predictions',
          'Real-time price alerts',
          'Portfolio management',
          'API access',
          'Priority support',
          'Market manipulation tools',
          'Exclusive trading strategies'
        ],
        stripePriceId: 'price_monthly_premium', // Replace with actual Stripe price ID
        recommended: false
      },
      {
        id: 'yearly',
        name: 'Yearly Premium',
        description: 'Full access to all features (Save 17%)',
        price: 99.99,
        currency: 'USD',
        interval: 'year',
        intervalCount: 1,
        features: [
          'Unlimited item tracking',
          'Advanced market predictions',
          'Real-time price alerts',
          'Portfolio management',
          'API access',
          'Priority support',
          'Market manipulation tools',
          'Exclusive trading strategies',
          '2 months free compared to monthly'
        ],
        stripePriceId: 'price_yearly_premium', // Replace with actual Stripe price ID
        recommended: true,
        savings: '17%'
      }
    ]
  }

  /**
   * Check if user has active premium subscription
   */
  hasActivePremium (userId) {
    const user = this.getUserById(userId)
    if (!user) return false

    const subscriptionStatus = this.getSubscriptionStatus(user)
    return subscriptionStatus.status === 'active' && subscriptionStatus.type !== 'none'
  }

  /**
   * Get subscription analytics for admin dashboard
   */
  getSubscriptionAnalytics () {
    const users = Array.from(this.users.values())
    const now = new Date()

    const analytics = {
      totalSubscribers: 0,
      monthlySubscribers: 0,
      yearlySubscribers: 0,
      activeSubscriptions: 0,
      expiringSubscriptions: 0,
      expiredSubscriptions: 0,
      monthlyRevenue: 0,
      yearlyRevenue: 0,
      totalRevenue: 0,
      churnRate: 0,
      averageSubscriptionLength: 0,
      conversionRate: 0
    }

    users.forEach(user => {
      const status = this.getSubscriptionStatus(user)

      if (status.type !== 'none') {
        analytics.totalSubscribers++

        if (status.type === 'monthly') {
          analytics.monthlySubscribers++
          analytics.monthlyRevenue += 9.99
        } else if (status.type === 'yearly') {
          analytics.yearlySubscribers++
          analytics.yearlyRevenue += 99.99
        }

        if (status.status === 'active') {
          analytics.activeSubscriptions++
        } else if (status.status === 'expiring') {
          analytics.expiringSubscriptions++
        } else if (status.status === 'expired') {
          analytics.expiredSubscriptions++
        }
      }
    })

    analytics.totalRevenue = analytics.monthlyRevenue + analytics.yearlyRevenue
    analytics.conversionRate = users.length > 0 ? (analytics.totalSubscribers / users.length) * 100 : 0

    return analytics
  }

  /**
   * Handle subscription webhooks from Stripe
   */
  handleStripeWebhook (event) {
    const { type, data } = event

    switch (type) {
      case 'customer.subscription.created':
        return this.handleSubscriptionCreated(data.object)

      case 'customer.subscription.updated':
        return this.handleSubscriptionUpdated(data.object)

      case 'customer.subscription.deleted':
        return this.handleSubscriptionCanceled(data.object)

      case 'invoice.payment_succeeded':
        return this.handlePaymentSucceeded(data.object)

      case 'invoice.payment_failed':
        return this.handlePaymentFailed(data.object)

      default:
        console.log(`Unhandled Stripe webhook event: ${type}`)
        return { handled: false, message: `Unhandled event type: ${type}` }
    }
  }

  handleSubscriptionCreated (subscription) {
    // Find user by Stripe customer ID
    const user = Array.from(this.users.values()).find(u =>
      u.subscription?.stripeCustomerId === subscription.customer
    )

    if (user) {
      const planType = subscription.items.data[0].price.recurring.interval === 'month' ? 'monthly' : 'yearly'

      this.updateUserSubscription(user.id, {
        type: planType,
        status: 'active',
        stripeSubscriptionId: subscription.id,
        startDate: new Date(subscription.current_period_start * 1000),
        endDate: new Date(subscription.current_period_end * 1000),
        nextBillingDate: new Date(subscription.current_period_end * 1000),
        autoRenew: !subscription.cancel_at_period_end
      })

      this.logAudit('stripe_subscription_created', user.id, { subscriptionId: subscription.id })
      return { handled: true, userId: user.id }
    }

    return { handled: false, message: 'User not found for customer ID' }
  }

  handleSubscriptionUpdated (subscription) {
    const user = Array.from(this.users.values()).find(u =>
      u.subscription?.stripeSubscriptionId === subscription.id
    )

    if (user) {
      let status = 'active'
      if (subscription.status === 'canceled') status = 'expired'
      else if (subscription.status === 'past_due') status = 'past_due'
      else if (subscription.cancel_at_period_end) status = 'expiring'

      this.updateUserSubscription(user.id, {
        status,
        endDate: new Date(subscription.current_period_end * 1000),
        nextBillingDate: new Date(subscription.current_period_end * 1000),
        autoRenew: !subscription.cancel_at_period_end
      })

      this.logAudit('stripe_subscription_updated', user.id, {
        subscriptionId: subscription.id,
        newStatus: status
      })
      return { handled: true, userId: user.id }
    }

    return { handled: false, message: 'Subscription not found' }
  }

  handleSubscriptionCanceled (subscription) {
    const user = Array.from(this.users.values()).find(u =>
      u.subscription?.stripeSubscriptionId === subscription.id
    )

    if (user) {
      this.updateUserSubscription(user.id, {
        status: 'expired',
        autoRenew: false,
        canceledAt: new Date()
      })

      this.logAudit('stripe_subscription_canceled', user.id, { subscriptionId: subscription.id })
      return { handled: true, userId: user.id }
    }

    return { handled: false, message: 'Subscription not found' }
  }

  handlePaymentSucceeded (invoice) {
    const user = Array.from(this.users.values()).find(u =>
      u.subscription?.stripeCustomerId === invoice.customer
    )

    if (user) {
      // Extend subscription period
      const subscription = user.subscription
      const newEndDate = new Date(invoice.period_end * 1000)

      this.updateUserSubscription(user.id, {
        status: 'active',
        endDate: newEndDate,
        nextBillingDate: newEndDate,
        lastPaymentDate: new Date(invoice.created * 1000),
        lastPaymentAmount: invoice.amount_paid / 100 // Convert from cents
      })

      this.logAudit('stripe_payment_succeeded', user.id, {
        invoiceId: invoice.id,
        amount: invoice.amount_paid / 100
      })
      return { handled: true, userId: user.id }
    }

    return { handled: false, message: 'Customer not found' }
  }

  handlePaymentFailed (invoice) {
    const user = Array.from(this.users.values()).find(u =>
      u.subscription?.stripeCustomerId === invoice.customer
    )

    if (user) {
      this.updateUserSubscription(user.id, {
        status: 'past_due',
        lastFailedPayment: new Date(invoice.created * 1000)
      })

      this.logAudit('stripe_payment_failed', user.id, {
        invoiceId: invoice.id,
        attemptedAmount: invoice.amount_due / 100
      })
      return { handled: true, userId: user.id }
    }

    return { handled: false, message: 'Customer not found' }
  }
}

// Create singleton instance
const userManagementService = new UserManagementService()

export default userManagementService

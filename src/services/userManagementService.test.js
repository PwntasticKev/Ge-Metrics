import { describe, it, expect, beforeEach } from 'vitest'
import userManagementService from './userManagementService.js'

describe('UserManagementService', () => {
  beforeEach(() => {
    // Reset service to initial state
    userManagementService.users.clear()
    userManagementService.sessions.clear()
    userManagementService.blockedUsers.clear()
    userManagementService.auditLog.length = 0
    userManagementService.initializeMockData()
  })

  describe('User Management', () => {
    it('should get all users', () => {
      const users = userManagementService.getAllUsers()
      expect(users).toHaveLength(5)
      expect(users[0]).toHaveProperty('name')
      expect(users[0]).toHaveProperty('email')
      expect(users[0]).toHaveProperty('role')
    })

    it('should filter users by role', () => {
      const adminUsers = userManagementService.getAllUsers({ role: 'admin' })
      expect(adminUsers).toHaveLength(1)
      expect(adminUsers[0].role).toBe('admin')
    })

    it('should filter users by search query', () => {
      const searchResults = userManagementService.getAllUsers({ search: 'admin' })
      expect(searchResults.length).toBeGreaterThan(0)
      expect(searchResults[0].email.toLowerCase()).toContain('admin')
    })

    it('should create a new user', () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        runescape_name: 'TestPlayer',
        role: 'user'
      }

      const result = userManagementService.createUser(userData)
      expect(result.success).toBe(true)
      expect(result.user).toHaveProperty('id')
      expect(result.user.name).toBe(userData.name)
      expect(result.user.email).toBe(userData.email)
    })

    it('should update an existing user', () => {
      const users = userManagementService.getAllUsers()
      const userId = users[0].id

      const updates = {
        name: 'Updated Name',
        membership: 'premium'
      }

      const result = userManagementService.updateUser(userId, updates)
      expect(result.success).toBe(true)
      expect(result.user.name).toBe('Updated Name')
      expect(result.user.membership).toBe('premium')
    })

    it('should delete a user', () => {
      const users = userManagementService.getAllUsers()
      const userId = users[0].id

      const result = userManagementService.deleteUser(userId)
      expect(result.success).toBe(true)

      const updatedUsers = userManagementService.getAllUsers()
      expect(updatedUsers).toHaveLength(4)
    })

    it('should get user by ID', () => {
      const users = userManagementService.getAllUsers()
      const userId = users[0].id

      const user = userManagementService.getUserById(userId)
      expect(user).toBeDefined()
      expect(user.id).toBe(userId)
    })

    it('should get user by email', () => {
      const user = userManagementService.getUserByEmail('admin@test.com')
      expect(user).toBeDefined()
      expect(user.email).toBe('admin@test.com')
    })
  })

  describe('Role and Permission Management', () => {
    it('should update user role', () => {
      const users = userManagementService.getAllUsers()
      const userId = users.find(u => u.role === 'user').id
      const adminId = users.find(u => u.role === 'admin').id

      const result = userManagementService.updateUserRole(userId, 'mod', adminId)
      expect(result.success).toBe(true)
      expect(result.user.role).toBe('mod')
    })

    it('should get user role information', () => {
      const users = userManagementService.getAllUsers()
      const adminUser = users.find(u => u.role === 'admin')

      const roleInfo = userManagementService.getUserRole(adminUser.id)
      expect(roleInfo).toBeDefined()
      expect(roleInfo.name).toBe('Administrator')
      expect(roleInfo.permissions).toBeInstanceOf(Array)
    })

    it('should check user permissions', () => {
      const users = userManagementService.getAllUsers()
      const adminUser = users.find(u => u.role === 'admin')
      const regularUser = users.find(u => u.role === 'user')

      expect(userManagementService.hasPermission(adminUser.id, 'users:write')).toBe(true)
      expect(userManagementService.hasPermission(regularUser.id, 'users:write')).toBe(false)
    })

    it('should check any permission', () => {
      const users = userManagementService.getAllUsers()
      const modUser = users.find(u => u.role === 'mod')

      const hasAnyPermission = userManagementService.hasAnyPermission(modUser.id, ['users:read', 'users:write'])
      expect(hasAnyPermission).toBe(true)
    })

    it('should check page access', () => {
      const users = userManagementService.getAllUsers()
      const adminUser = users.find(u => u.role === 'admin')
      const regularUser = users.find(u => u.role === 'user')

      expect(userManagementService.canAccessPage(adminUser.id, '/admin/users')).toBe(true)
      expect(userManagementService.canAccessPage(regularUser.id, '/admin/users')).toBe(false)
    })
  })

  describe('Session Management', () => {
    it('should create a session', () => {
      const users = userManagementService.getAllUsers()
      const userId = users[0].id

      const result = userManagementService.createSession(userId, '127.0.0.1', 'Test Browser')
      expect(result.success).toBe(true)
      expect(result.sessionId).toBeDefined()
    })

    it('should validate a session', () => {
      const users = userManagementService.getAllUsers()
      const userId = users[0].id

      const sessionResult = userManagementService.createSession(userId, '127.0.0.1', 'Test Browser')
      const session = userManagementService.validateSession(sessionResult.sessionId)

      expect(session).toBeDefined()
      expect(session.userId).toBe(userId)
    })

    it('should destroy a session', () => {
      const users = userManagementService.getAllUsers()
      const userId = users[0].id

      const sessionResult = userManagementService.createSession(userId, '127.0.0.1', 'Test Browser')
      const destroyResult = userManagementService.destroySession(sessionResult.sessionId)

      expect(destroyResult.success).toBe(true)

      const session = userManagementService.validateSession(sessionResult.sessionId)
      expect(session).toBeNull()
    })

    it('should destroy all user sessions', () => {
      const users = userManagementService.getAllUsers()
      const userId = users[0].id

      // Create multiple sessions
      userManagementService.createSession(userId, '127.0.0.1', 'Browser 1')
      userManagementService.createSession(userId, '127.0.0.2', 'Browser 2')

      const result = userManagementService.destroyUserSessions(userId)
      expect(result.success).toBe(true)
      expect(result.destroyedCount).toBe(2)
    })

    it('should get user sessions', () => {
      const users = userManagementService.getAllUsers()
      const userId = users[0].id

      userManagementService.createSession(userId, '127.0.0.1', 'Browser 1')
      userManagementService.createSession(userId, '127.0.0.2', 'Browser 2')

      const sessions = userManagementService.getUserSessions(userId)
      expect(sessions).toHaveLength(2)
    })
  })

  describe('User Blocking', () => {
    it('should block a user', () => {
      const users = userManagementService.getAllUsers()
      const userId = users.find(u => u.role === 'user').id
      const adminId = users.find(u => u.role === 'admin').id

      const result = userManagementService.blockUser(userId, 'Violation of terms', adminId)
      expect(result.success).toBe(true)

      const user = userManagementService.getUserById(userId)
      expect(user.is_blocked).toBe(true)
      expect(user.block_reason).toBe('Violation of terms')
    })

    it('should unblock a user', () => {
      const users = userManagementService.getAllUsers()
      const userId = users.find(u => u.role === 'user').id
      const adminId = users.find(u => u.role === 'admin').id

      // First block the user
      userManagementService.blockUser(userId, 'Test block', adminId)

      // Then unblock
      const result = userManagementService.unblockUser(userId, adminId)
      expect(result.success).toBe(true)

      const user = userManagementService.getUserById(userId)
      expect(user.is_blocked).toBe(false)
      expect(user.block_reason).toBeNull()
    })

    it('should check if user is blocked', () => {
      const users = userManagementService.getAllUsers()
      const blockedUser = users.find(u => u.is_blocked)

      expect(userManagementService.isUserBlocked(blockedUser.id)).toBe(true)
    })
  })

  describe('Subscription Verification', () => {
    it('should verify active subscription', () => {
      const users = userManagementService.getAllUsers()
      const activeUser = users.find(u => u.subscription_status === 'active')

      const verification = userManagementService.verifySubscription(activeUser.id)
      expect(verification.valid).toBe(true)
      expect(verification.plan).toBe(activeUser.membership)
    })

    it('should detect expired subscription', () => {
      const users = userManagementService.getAllUsers()
      const expiredUser = users.find(u => u.subscription_status === 'expired')

      const verification = userManagementService.verifySubscription(expiredUser.id)
      expect(verification.valid).toBe(false)
      expect(verification.reason).toContain('expired')
    })

    it('should handle blocked user subscription', () => {
      const users = userManagementService.getAllUsers()
      const blockedUser = users.find(u => u.is_blocked)

      const verification = userManagementService.verifySubscription(blockedUser.id)
      expect(verification.valid).toBe(false)
      expect(verification.reason).toBe('User is blocked')
    })
  })

  describe('Free Trial Management', () => {
    it('should grant free trial', () => {
      const users = userManagementService.getAllUsers()
      const userId = users.find(u => u.subscription_status === 'none' || u.subscription_status === 'expired').id
      const adminId = users.find(u => u.role === 'admin').id

      const result = userManagementService.grantFreeTrial(userId, 30, 'Customer support request', adminId)
      expect(result.success).toBe(true)
      expect(result.trialEnd).toBeInstanceOf(Date)

      const user = userManagementService.getUserById(userId)
      expect(user.subscription_status).toBe('trial')
      expect(user.membership).toBe('premium')
    })
  })

  describe('Communication Features', () => {
    it('should send password reset', () => {
      const users = userManagementService.getAllUsers()
      const userId = users[0].id

      const result = userManagementService.sendPasswordReset(userId)
      expect(result.success).toBe(true)
      expect(result.message).toContain('Password reset email sent')
    })

    it('should send username reminder', () => {
      const users = userManagementService.getAllUsers()
      const userId = users[0].id

      const result = userManagementService.sendUsernameReminder(userId)
      expect(result.success).toBe(true)
      expect(result.message).toContain('Username reminder sent')
    })
  })

  describe('Statistics and Analytics', () => {
    it('should get user statistics', () => {
      const stats = userManagementService.getUserStats()

      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('active')
      expect(stats).toHaveProperty('blocked')
      expect(stats).toHaveProperty('byRole')
      expect(stats).toHaveProperty('bySubscription')
      expect(stats).toHaveProperty('withOTP')
      expect(stats).toHaveProperty('withMailchimp')

      expect(typeof stats.total).toBe('number')
      expect(stats.byRole).toHaveProperty('admin')
      expect(stats.bySubscription).toHaveProperty('active')
    })
  })

  describe('Audit Logging', () => {
    it('should log audit events', () => {
      const entry = userManagementService.logAudit('test_action', 'user_123', { test: 'data' })

      expect(entry).toHaveProperty('id')
      expect(entry).toHaveProperty('action')
      expect(entry).toHaveProperty('userId')
      expect(entry).toHaveProperty('timestamp')
      expect(entry).toHaveProperty('metadata')
      expect(entry.action).toBe('test_action')
      expect(entry.userId).toBe('user_123')
    })

    it('should get audit log', () => {
      userManagementService.logAudit('action_1', 'user_1')
      userManagementService.logAudit('action_2', 'user_2')

      const logs = userManagementService.getAuditLog()
      expect(logs.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter audit log', () => {
      userManagementService.logAudit('action_1', 'user_1')
      userManagementService.logAudit('action_2', 'user_1')
      userManagementService.logAudit('action_3', 'user_2')

      const userLogs = userManagementService.getAuditLog({ userId: 'user_1' })
      expect(userLogs).toHaveLength(2)

      const actionLogs = userManagementService.getAuditLog({ action: 'action_1' })
      expect(actionLogs).toHaveLength(1)
    })
  })

  describe('Data Export', () => {
    it('should export user data as JSON', () => {
      const jsonData = userManagementService.exportUserData('json')
      const parsed = JSON.parse(jsonData)

      expect(parsed).toHaveProperty('users')
      expect(parsed).toHaveProperty('stats')
      expect(parsed).toHaveProperty('auditLog')
      expect(parsed).toHaveProperty('exportedAt')
      expect(parsed).toHaveProperty('version')
    })

    it('should export user data as CSV', () => {
      const csvData = userManagementService.exportUserData('csv')

      expect(typeof csvData).toBe('string')
      expect(csvData).toContain('id,name,email,role')
      expect(csvData.split('\n').length).toBeGreaterThan(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid user ID for updates', () => {
      const result = userManagementService.updateUser('invalid_id', { name: 'Test' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should handle invalid role assignment', () => {
      const users = userManagementService.getAllUsers()
      const userId = users[0].id
      const adminId = users.find(u => u.role === 'admin').id

      const result = userManagementService.updateUserRole(userId, 'invalid_role', adminId)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid role')
    })

    it('should handle insufficient permissions', () => {
      const users = userManagementService.getAllUsers()
      const userId = users[0].id
      const regularUserId = users.find(u => u.role === 'user').id

      const result = userManagementService.updateUserRole(userId, 'mod', regularUserId)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient permissions')
    })

    it('should handle blocking non-existent user', () => {
      const adminId = userManagementService.getAllUsers().find(u => u.role === 'admin').id

      const result = userManagementService.blockUser('invalid_id', 'Test reason', adminId)
      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })
  })

  describe('Middleware Functions', () => {
    it('should create auth middleware', () => {
      const middleware = userManagementService.createAuthMiddleware()
      expect(typeof middleware).toBe('function')
    })

    it('should create permission middleware', () => {
      const middleware = userManagementService.createPermissionMiddleware('users:read')
      expect(typeof middleware).toBe('function')
    })
  })
})

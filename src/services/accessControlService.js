class AccessControlService {
  constructor () {
    this.roles = {
      ADMIN: 'admin',
      USER: 'user',
      MODERATOR: 'moderator'
    }
  }

  // Check if user has access to the application
  hasAccess (user) {
    if (!user) return false
    return user.access === true
  }

  // Check if user has specific role
  hasRole (user, role) {
    if (!user) return false
    return user.role === role
  }

  // Check if user is admin
  isAdmin (user) {
    return this.hasRole(user, this.roles.ADMIN)
  }

  // Check if user is moderator or admin
  isModerator (user) {
    return this.hasRole(user, this.roles.MODERATOR) || this.isAdmin(user)
  }

  // Grant access to user
  async grantAccess (userId, approvedBy) {
    try {
      // This would update the database
      // await db.users.update({
      //   where: { id: userId },
      //   data: {
      //     access: true,
      //     approved_by: approvedBy,
      //     approved_at: new Date()
      //   }
      // })

      return { success: true, message: 'Access granted successfully' }
    } catch (error) {
      console.error('Error granting access:', error)
      throw error
    }
  }

  // Revoke access from user
  async revokeAccess (userId, revokedBy) {
    try {
      // This would update the database
      // await db.users.update({
      //   where: { id: userId },
      //   data: {
      //     access: false,
      //     approved_by: null,
      //     approved_at: null
      //   }
      // })

      return { success: true, message: 'Access revoked successfully' }
    } catch (error) {
      console.error('Error revoking access:', error)
      throw error
    }
  }

  // Get pending access requests
  async getPendingRequests () {
    try {
      // This would query the database
      // const pendingUsers = await db.users.findMany({
      //   where: { access: false },
      //   select: {
      //     id: true,
      //     name: true,
      //     email: true,
      //     runescape_name: true,
      //     created_at: true
      //   },
      //   orderBy: { created_at: 'desc' }
      // })

      // Mock data for demo
      const pendingUsers = [
        {
          id: 2,
          name: 'New User',
          email: 'newuser@example.com',
          runescape_name: 'NewPlayer123',
          created_at: new Date()
        }
      ]

      return pendingUsers
    } catch (error) {
      console.error('Error fetching pending requests:', error)
      throw error
    }
  }

  // Update user role
  async updateRole (userId, newRole, updatedBy) {
    try {
      if (!Object.values(this.roles).includes(newRole)) {
        throw new Error('Invalid role specified')
      }

      // This would update the database
      // await db.users.update({
      //   where: { id: userId },
      //   data: { role: newRole }
      // })

      return { success: true, message: 'Role updated successfully' }
    } catch (error) {
      console.error('Error updating role:', error)
      throw error
    }
  }

  // Middleware function to check access
  requireAccess () {
    return (req, res, next) => {
      const user = req.user // Assuming user is attached to request

      if (!this.hasAccess(user)) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your account is pending approval. Please contact an administrator.'
        })
      }

      next()
    }
  }

  // Middleware function to check admin role
  requireAdmin () {
    return (req, res, next) => {
      const user = req.user

      if (!this.isAdmin(user)) {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'You do not have permission to perform this action.'
        })
      }

      next()
    }
  }

  // Get user access status message
  getAccessStatusMessage (user) {
    if (!user) {
      return {
        status: 'no_user',
        message: 'Please log in to access the application.',
        canAccess: false
      }
    }

    if (!user.access) {
      return {
        status: 'pending_approval',
        message: 'Your account is pending approval. You will receive an email once approved.',
        canAccess: false
      }
    }

    return {
      status: 'approved',
      message: 'Welcome! You have full access to the application.',
      canAccess: true
    }
  }
}

export default new AccessControlService()

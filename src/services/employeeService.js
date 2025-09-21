// Employee Management Service for GE Metrics
// Handles employee roles, permissions, and admin access

class EmployeeService {
  constructor () {
    this.employees = new Map()
    this.roles = new Map()
    this.permissions = new Map()
    this.auditLog = []
    this.initialized = false

    this.initializeDefaultRoles()
    this.initializeMockData()
  }

  // Initialize default roles and permissions
  initializeDefaultRoles () {
    // Define permissions
    const permissions = {
      // User Management
      'users:read': 'View user information',
      'users:write': 'Create and edit users',
      'users:delete': 'Delete users',
      'users:ban': 'Ban/unban users',

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

      // Employee Management
      'employees:read': 'View employee information',
      'employees:write': 'Manage employee accounts',
      'employees:roles': 'Assign employee roles',

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
        isEmployee: false,
        level: 0
      },
      support: {
        name: 'Support Specialist',
        description: 'Customer support team member',
        permissions: [
          'users:read',
          'billing:read',
          'content:read',
          'analytics:read'
        ],
        isEmployee: true,
        level: 1
      },
      moderator: {
        name: 'Content Moderator',
        description: 'Moderates user content and community',
        permissions: [
          'users:read',
          'users:ban',
          'content:read',
          'content:write',
          'content:moderate',
          'analytics:read'
        ],
        isEmployee: true,
        level: 2
      },
      analyst: {
        name: 'Data Analyst',
        description: 'Analyzes data and generates reports',
        permissions: [
          'users:read',
          'billing:read',
          'content:read',
          'analytics:read',
          'analytics:export',
          'reports:generate'
        ],
        isEmployee: true,
        level: 2
      },
      manager: {
        name: 'Team Manager',
        description: 'Manages team operations and employees',
        permissions: [
          'users:read',
          'users:write',
          'users:ban',
          'billing:read',
          'billing:write',
          'content:read',
          'content:write',
          'content:moderate',
          'analytics:read',
          'analytics:export',
          'reports:generate',
          'employees:read',
          'employees:write',
          'system:logs'
        ],
        isEmployee: true,
        level: 3
      },
      admin: {
        name: 'Administrator',
        description: 'Full system administration access',
        permissions: Array.from(this.permissions.keys()),
        isEmployee: true,
        level: 4
      }
    }

    // Store roles
    Object.entries(roles).forEach(([key, role]) => {
      this.roles.set(key, { ...role, key })
    })

    this.initialized = true
  }

  // Initialize mock employee data
  initializeMockData () {
    const mockEmployees = [
      {
        id: 'emp_001',
        email: 'admin@ge-metrics.com',
        name: 'System Administrator',
        role: 'admin',
        department: 'Engineering',
        hireDate: new Date('2023-01-01'),
        status: 'active',
        lastLogin: new Date(),
        permissions: this.roles.get('admin').permissions
      },
      {
        id: 'emp_002',
        email: 'manager@ge-metrics.com',
        name: 'Operations Manager',
        role: 'manager',
        department: 'Operations',
        hireDate: new Date('2023-02-15'),
        status: 'active',
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        permissions: this.roles.get('manager').permissions
      },
      {
        id: 'emp_003',
        email: 'support@ge-metrics.com',
        name: 'Support Specialist',
        role: 'support',
        department: 'Customer Success',
        hireDate: new Date('2023-03-01'),
        status: 'active',
        lastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        permissions: this.roles.get('support').permissions
      }
    ]

    mockEmployees.forEach(employee => {
      this.employees.set(employee.id, employee)
    })
  }

  // Check if user is an employee
  isEmployee (userEmail) {
    const employee = Array.from(this.employees.values())
      .find(emp => emp.email.toLowerCase() === userEmail.toLowerCase())

    return !!(employee && employee.status === 'active')
  }

  // Get employee by email
  getEmployeeByEmail (email) {
    return Array.from(this.employees.values())
      .find(emp => emp.email.toLowerCase() === email.toLowerCase())
  }

  // Get employee by ID
  getEmployee (employeeId) {
    return this.employees.get(employeeId)
  }

  // Get all employees
  getAllEmployees () {
    return Array.from(this.employees.values()).sort((a, b) => {
      const roleA = this.roles.get(a.role)
      const roleB = this.roles.get(b.role)
      return roleB.level - roleA.level // Sort by role level descending
    })
  }

  // Create new employee
  createEmployee (employeeData) {
    try {
      const { email, name, role, department } = employeeData

      // Validate required fields
      if (!email || !name || !role) {
        throw new Error('Email, name, and role are required')
      }

      // Check if email already exists
      if (this.getEmployeeByEmail(email)) {
        throw new Error('Employee with this email already exists')
      }

      // Validate role
      if (!this.roles.has(role)) {
        throw new Error('Invalid role specified')
      }

      const employeeId = `emp_${Date.now()}`
      const roleData = this.roles.get(role)

      const employee = {
        id: employeeId,
        email: email.toLowerCase(),
        name,
        role,
        department: department || 'Unassigned',
        hireDate: new Date(),
        status: 'active',
        lastLogin: null,
        permissions: [...roleData.permissions],
        createdAt: new Date(),
        createdBy: 'system' // In real app, this would be the current admin
      }

      this.employees.set(employeeId, employee)

      this.logAuditEvent('employee_created', {
        employeeId,
        email,
        role,
        createdBy: 'system'
      })

      return { success: true, employee }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Update employee
  updateEmployee (employeeId, updates) {
    try {
      const employee = this.employees.get(employeeId)
      if (!employee) {
        throw new Error('Employee not found')
      }

      // Validate role if being updated
      if (updates.role && !this.roles.has(updates.role)) {
        throw new Error('Invalid role specified')
      }

      const oldData = { ...employee }
      const updatedEmployee = {
        ...employee,
        ...updates,
        updatedAt: new Date(),
        updatedBy: 'system' // In real app, this would be the current admin
      }

      // Update permissions if role changed
      if (updates.role && updates.role !== employee.role) {
        const roleData = this.roles.get(updates.role)
        updatedEmployee.permissions = [...roleData.permissions]
      }

      this.employees.set(employeeId, updatedEmployee)

      this.logAuditEvent('employee_updated', {
        employeeId,
        oldData,
        newData: updatedEmployee,
        updatedBy: 'system'
      })

      return { success: true, employee: updatedEmployee }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Deactivate employee
  deactivateEmployee (employeeId, reason = 'No reason provided') {
    try {
      const employee = this.employees.get(employeeId)
      if (!employee) {
        throw new Error('Employee not found')
      }

      const updatedEmployee = {
        ...employee,
        status: 'inactive',
        deactivatedAt: new Date(),
        deactivationReason: reason,
        deactivatedBy: 'system'
      }

      this.employees.set(employeeId, updatedEmployee)

      this.logAuditEvent('employee_deactivated', {
        employeeId,
        reason,
        deactivatedBy: 'system'
      })

      return { success: true, employee: updatedEmployee }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Reactivate employee
  reactivateEmployee (employeeId) {
    try {
      const employee = this.employees.get(employeeId)
      if (!employee) {
        throw new Error('Employee not found')
      }

      const updatedEmployee = {
        ...employee,
        status: 'active',
        reactivatedAt: new Date(),
        reactivatedBy: 'system'
      }

      // Remove deactivation fields
      delete updatedEmployee.deactivatedAt
      delete updatedEmployee.deactivationReason
      delete updatedEmployee.deactivatedBy

      this.employees.set(employeeId, updatedEmployee)

      this.logAuditEvent('employee_reactivated', {
        employeeId,
        reactivatedBy: 'system'
      })

      return { success: true, employee: updatedEmployee }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Check if user has specific permission
  hasPermission (userEmail, permission) {
    const employee = this.getEmployeeByEmail(userEmail)
    if (!employee || employee.status !== 'active') {
      return false
    }

    return employee.permissions.includes(permission)
  }

  // Check if user has any of the specified permissions
  hasAnyPermission (userEmail, permissions) {
    return permissions.some(permission => this.hasPermission(userEmail, permission))
  }

  // Check if user has all of the specified permissions
  hasAllPermissions (userEmail, permissions) {
    return permissions.every(permission => this.hasPermission(userEmail, permission))
  }

  // Get user permissions
  getUserPermissions (userEmail) {
    const employee = this.getEmployeeByEmail(userEmail)
    if (!employee || employee.status !== 'active') {
      return []
    }

    return employee.permissions
  }

  // Get user role
  getUserRole (userEmail) {
    const employee = this.getEmployeeByEmail(userEmail)
    if (!employee || employee.status !== 'active') {
      return 'user'
    }

    return employee.role
  }

  // Get all roles
  getAllRoles () {
    return Array.from(this.roles.values()).sort((a, b) => a.level - b.level)
  }

  // Get all permissions
  getAllPermissions () {
    return Array.from(this.permissions.values())
  }

  // Get permissions by category
  getPermissionsByCategory () {
    const categories = {}

    this.permissions.forEach(permission => {
      const category = permission.category
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(permission)
    })

    return categories
  }

  // Update last login time
  updateLastLogin (userEmail) {
    const employee = this.getEmployeeByEmail(userEmail)
    if (employee) {
      employee.lastLogin = new Date()
      this.employees.set(employee.id, employee)
    }
  }

  // Get employee statistics
  getEmployeeStats () {
    const employees = this.getAllEmployees()
    const activeEmployees = employees.filter(emp => emp.status === 'active')
    const inactiveEmployees = employees.filter(emp => emp.status === 'inactive')

    const roleStats = {}
    employees.forEach(emp => {
      const role = this.roles.get(emp.role)
      if (!roleStats[role.name]) {
        roleStats[role.name] = { active: 0, inactive: 0, total: 0 }
      }
      roleStats[role.name][emp.status]++
      roleStats[role.name].total++
    })

    const departmentStats = {}
    employees.forEach(emp => {
      if (!departmentStats[emp.department]) {
        departmentStats[emp.department] = { active: 0, inactive: 0, total: 0 }
      }
      departmentStats[emp.department][emp.status]++
      departmentStats[emp.department].total++
    })

    return {
      total: employees.length,
      active: activeEmployees.length,
      inactive: inactiveEmployees.length,
      roleStats,
      departmentStats,
      recentHires: employees
        .filter(emp => emp.hireDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .length
    }
  }

  // Log audit event
  logAuditEvent (action, data) {
    const event = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      data,
      timestamp: new Date(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server'
    }

    this.auditLog.push(event)

    // Keep only last 1000 events
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000)
    }
  }

  // Get audit log
  getAuditLog (limit = 100, offset = 0) {
    const sortedLog = [...this.auditLog].sort((a, b) => b.timestamp - a.timestamp)
    return {
      events: sortedLog.slice(offset, offset + limit),
      total: this.auditLog.length,
      hasMore: offset + limit < this.auditLog.length
    }
  }

  // Search employees
  searchEmployees (query, filters = {}) {
    let employees = this.getAllEmployees()

    // Apply text search
    if (query) {
      const searchTerm = query.toLowerCase()
      employees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm) ||
        emp.email.toLowerCase().includes(searchTerm) ||
        emp.department.toLowerCase().includes(searchTerm)
      )
    }

    // Apply filters
    if (filters.role) {
      employees = employees.filter(emp => emp.role === filters.role)
    }

    if (filters.department) {
      employees = employees.filter(emp => emp.department === filters.department)
    }

    if (filters.status) {
      employees = employees.filter(emp => emp.status === filters.status)
    }

    return employees
  }

  // Export employee data
  exportEmployeeData (format = 'json') {
    const employees = this.getAllEmployees()
    const exportData = employees.map(emp => ({
      id: emp.id,
      email: emp.email,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      status: emp.status,
      hireDate: emp.hireDate,
      lastLogin: emp.lastLogin
    }))

    if (format === 'csv') {
      const headers = Object.keys(exportData[0]).join(',')
      const rows = exportData.map(emp => Object.values(emp).join(','))
      return headers + '\n' + rows.join('\n')
    }

    return JSON.stringify(exportData, null, 2)
  }
}

// Export singleton instance
export const employeeService = new EmployeeService()
export default employeeService

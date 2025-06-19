import { employeeService } from './employeeService'

describe('EmployeeService', () => {
  beforeEach(() => {
    // Reset to clean state before each test
    employeeService.employees.clear()
    employeeService.auditLog = []
    employeeService.initializeMockData()
  })

  describe('Employee Management', () => {
    test('should create new employee successfully', () => {
      const employeeData = {
        email: 'test@ge-metrics.com',
        name: 'Test Employee',
        role: 'support',
        department: 'Customer Success'
      }

      const result = employeeService.createEmployee(employeeData)

      expect(result.success).toBe(true)
      expect(result.employee).toMatchObject({
        email: 'test@ge-metrics.com',
        name: 'Test Employee',
        role: 'support',
        department: 'Customer Success',
        status: 'active'
      })
      expect(result.employee.id).toBeDefined()
      expect(result.employee.permissions).toEqual(
        employeeService.roles.get('support').permissions
      )
    })

    test('should fail to create employee with duplicate email', () => {
      const employeeData = {
        email: 'admin@ge-metrics.com', // Already exists in mock data
        name: 'Duplicate Admin',
        role: 'admin'
      }

      const result = employeeService.createEmployee(employeeData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Employee with this email already exists')
    })

    test('should fail to create employee with invalid role', () => {
      const employeeData = {
        email: 'test@ge-metrics.com',
        name: 'Test Employee',
        role: 'invalid_role'
      }

      const result = employeeService.createEmployee(employeeData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid role specified')
    })

    test('should update employee successfully', () => {
      const employees = employeeService.getAllEmployees()
      const employee = employees[0]

      const updates = {
        name: 'Updated Name',
        role: 'manager',
        department: 'Operations'
      }

      const result = employeeService.updateEmployee(employee.id, updates)

      expect(result.success).toBe(true)
      expect(result.employee.name).toBe('Updated Name')
      expect(result.employee.role).toBe('manager')
      expect(result.employee.department).toBe('Operations')
      expect(result.employee.permissions).toEqual(
        employeeService.roles.get('manager').permissions
      )
    })

    test('should deactivate employee successfully', () => {
      const employees = employeeService.getAllEmployees()
      const employee = employees[0]
      const reason = 'Performance issues'

      const result = employeeService.deactivateEmployee(employee.id, reason)

      expect(result.success).toBe(true)
      expect(result.employee.status).toBe('inactive')
      expect(result.employee.deactivationReason).toBe(reason)
      expect(result.employee.deactivatedAt).toBeDefined()
    })

    test('should reactivate employee successfully', () => {
      const employees = employeeService.getAllEmployees()
      const employee = employees[0]

      // First deactivate
      employeeService.deactivateEmployee(employee.id, 'Test')

      // Then reactivate
      const result = employeeService.reactivateEmployee(employee.id)

      expect(result.success).toBe(true)
      expect(result.employee.status).toBe('active')
      expect(result.employee.deactivatedAt).toBeUndefined()
      expect(result.employee.deactivationReason).toBeUndefined()
    })
  })

  describe('Employee Lookup', () => {
    test('should find employee by email', () => {
      const employee = employeeService.getEmployeeByEmail('admin@ge-metrics.com')

      expect(employee).toBeDefined()
      expect(employee.email).toBe('admin@ge-metrics.com')
      expect(employee.role).toBe('admin')
    })

    test('should return undefined for non-existent email', () => {
      const employee = employeeService.getEmployeeByEmail('nonexistent@ge-metrics.com')

      expect(employee).toBeUndefined()
    })

    test('should check if user is employee correctly', () => {
      expect(employeeService.isEmployee('admin@ge-metrics.com')).toBe(true)
      expect(employeeService.isEmployee('nonexistent@ge-metrics.com')).toBe(false)
    })

    test('should not consider inactive employee as employee', () => {
      const employees = employeeService.getAllEmployees()
      const employee = employees[0]

      employeeService.deactivateEmployee(employee.id, 'Test')

      expect(employeeService.isEmployee(employee.email)).toBe(false)
    })
  })

  describe('Permission System', () => {
    test('should check specific permission correctly', () => {
      expect(employeeService.hasPermission('admin@ge-metrics.com', 'users:read')).toBe(true)
      expect(employeeService.hasPermission('support@ge-metrics.com', 'users:delete')).toBe(false)
      expect(employeeService.hasPermission('nonexistent@ge-metrics.com', 'users:read')).toBe(false)
    })

    test('should check any permission correctly', () => {
      const permissions = ['users:read', 'users:write']

      expect(employeeService.hasAnyPermission('admin@ge-metrics.com', permissions)).toBe(true)
      expect(employeeService.hasAnyPermission('support@ge-metrics.com', permissions)).toBe(true)
      expect(employeeService.hasAnyPermission('support@ge-metrics.com', ['users:delete'])).toBe(false)
    })

    test('should check all permissions correctly', () => {
      const permissions = ['users:read', 'billing:read']

      expect(employeeService.hasAllPermissions('admin@ge-metrics.com', permissions)).toBe(true)
      expect(employeeService.hasAllPermissions('support@ge-metrics.com', permissions)).toBe(true)
      expect(employeeService.hasAllPermissions('support@ge-metrics.com', ['users:read', 'users:delete'])).toBe(false)
    })

    test('should get user permissions correctly', () => {
      const adminPermissions = employeeService.getUserPermissions('admin@ge-metrics.com')
      const supportPermissions = employeeService.getUserPermissions('support@ge-metrics.com')

      expect(adminPermissions.length).toBeGreaterThan(supportPermissions.length)
      expect(supportPermissions).toContain('users:read')
      expect(supportPermissions).not.toContain('users:delete')
    })

    test('should get user role correctly', () => {
      expect(employeeService.getUserRole('admin@ge-metrics.com')).toBe('admin')
      expect(employeeService.getUserRole('support@ge-metrics.com')).toBe('support')
      expect(employeeService.getUserRole('nonexistent@ge-metrics.com')).toBe('user')
    })
  })

  describe('Role Management', () => {
    test('should get all roles', () => {
      const roles = employeeService.getAllRoles()

      expect(roles.length).toBeGreaterThan(0)
      expect(roles.find(r => r.key === 'admin')).toBeDefined()
      expect(roles.find(r => r.key === 'support')).toBeDefined()
    })

    test('should get all permissions', () => {
      const permissions = employeeService.getAllPermissions()

      expect(permissions.length).toBeGreaterThan(0)
      expect(permissions.find(p => p.key === 'users:read')).toBeDefined()
      expect(permissions.find(p => p.key === 'billing:read')).toBeDefined()
    })

    test('should get permissions by category', () => {
      const categories = employeeService.getPermissionsByCategory()

      expect(categories.users).toBeDefined()
      expect(categories.billing).toBeDefined()
      expect(categories.system).toBeDefined()
      expect(categories.users.length).toBeGreaterThan(0)
    })
  })

  describe('Employee Statistics', () => {
    test('should calculate employee statistics correctly', () => {
      const stats = employeeService.getEmployeeStats()

      expect(stats.total).toBe(3) // Mock data has 3 employees
      expect(stats.active).toBe(3)
      expect(stats.inactive).toBe(0)
      expect(stats.roleStats).toBeDefined()
      expect(stats.departmentStats).toBeDefined()
    })

    test('should update statistics after employee changes', () => {
      const employees = employeeService.getAllEmployees()
      const employee = employees[0]

      // Deactivate one employee
      employeeService.deactivateEmployee(employee.id, 'Test')

      const stats = employeeService.getEmployeeStats()

      expect(stats.active).toBe(2)
      expect(stats.inactive).toBe(1)
    })
  })

  describe('Search and Filtering', () => {
    test('should search employees by name', () => {
      const results = employeeService.searchEmployees('Administrator')

      expect(results.length).toBe(1)
      expect(results[0].name).toContain('Administrator')
    })

    test('should search employees by email', () => {
      const results = employeeService.searchEmployees('admin@')

      expect(results.length).toBe(1)
      expect(results[0].email).toContain('admin@')
    })

    test('should filter employees by role', () => {
      const results = employeeService.searchEmployees('', { role: 'admin' })

      expect(results.length).toBe(1)
      expect(results[0].role).toBe('admin')
    })

    test('should filter employees by status', () => {
      const employees = employeeService.getAllEmployees()
      employeeService.deactivateEmployee(employees[0].id, 'Test')

      const activeResults = employeeService.searchEmployees('', { status: 'active' })
      const inactiveResults = employeeService.searchEmployees('', { status: 'inactive' })

      expect(activeResults.length).toBe(2)
      expect(inactiveResults.length).toBe(1)
      expect(inactiveResults[0].status).toBe('inactive')
    })

    test('should combine search and filters', () => {
      const results = employeeService.searchEmployees('admin', { role: 'admin' })

      expect(results.length).toBe(1)
      expect(results[0].role).toBe('admin')
      expect(results[0].email).toContain('admin')
    })
  })

  describe('Audit Logging', () => {
    test('should log employee creation', () => {
      const employeeData = {
        email: 'test@ge-metrics.com',
        name: 'Test Employee',
        role: 'support'
      }

      employeeService.createEmployee(employeeData)

      const auditLog = employeeService.getAuditLog(10)
      const createEvent = auditLog.events.find(e => e.action === 'employee_created')

      expect(createEvent).toBeDefined()
      expect(createEvent.data.email).toBe('test@ge-metrics.com')
    })

    test('should log employee updates', () => {
      const employees = employeeService.getAllEmployees()
      const employee = employees[0]

      employeeService.updateEmployee(employee.id, { name: 'Updated Name' })

      const auditLog = employeeService.getAuditLog(10)
      const updateEvent = auditLog.events.find(e => e.action === 'employee_updated')

      expect(updateEvent).toBeDefined()
      expect(updateEvent.data.employeeId).toBe(employee.id)
    })

    test('should log employee deactivation', () => {
      const employees = employeeService.getAllEmployees()
      const employee = employees[0]

      employeeService.deactivateEmployee(employee.id, 'Test reason')

      const auditLog = employeeService.getAuditLog(10)
      const deactivateEvent = auditLog.events.find(e => e.action === 'employee_deactivated')

      expect(deactivateEvent).toBeDefined()
      expect(deactivateEvent.data.reason).toBe('Test reason')
    })
  })

  describe('Data Export', () => {
    test('should export employee data as JSON', () => {
      const jsonData = employeeService.exportEmployeeData('json')
      const parsed = JSON.parse(jsonData)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(3)
      expect(parsed[0]).toHaveProperty('id')
      expect(parsed[0]).toHaveProperty('email')
      expect(parsed[0]).toHaveProperty('name')
    })

    test('should export employee data as CSV', () => {
      const csvData = employeeService.exportEmployeeData('csv')

      expect(csvData).toContain('id,email,name,role,department,status,hireDate,lastLogin')
      expect(csvData.split('\n').length).toBe(4) // Header + 3 employees
    })
  })

  describe('Last Login Tracking', () => {
    test('should update last login time', () => {
      const beforeUpdate = new Date()

      employeeService.updateLastLogin('admin@ge-metrics.com')

      const employee = employeeService.getEmployeeByEmail('admin@ge-metrics.com')

      expect(employee.lastLogin).toBeDefined()
      expect(new Date(employee.lastLogin)).toBeInstanceOf(Date)
      expect(new Date(employee.lastLogin).getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
    })

    test('should not update last login for non-existent employee', () => {
      // Should not throw error
      expect(() => {
        employeeService.updateLastLogin('nonexistent@ge-metrics.com')
      }).not.toThrow()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing required fields in employee creation', () => {
      const result1 = employeeService.createEmployee({ name: 'Test' }) // Missing email and role
      const result2 = employeeService.createEmployee({ email: 'test@test.com' }) // Missing name and role
      const result3 = employeeService.createEmployee({ email: 'test@test.com', name: 'Test' }) // Missing role

      expect(result1.success).toBe(false)
      expect(result2.success).toBe(false)
      expect(result3.success).toBe(false)
    })

    test('should handle updating non-existent employee', () => {
      const result = employeeService.updateEmployee('non-existent-id', { name: 'Test' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Employee not found')
    })

    test('should handle deactivating non-existent employee', () => {
      const result = employeeService.deactivateEmployee('non-existent-id', 'Test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Employee not found')
    })

    test('should maintain audit log size limit', () => {
      // Generate more than 1000 events
      for (let i = 0; i < 1050; i++) {
        employeeService.logAuditEvent('test_event', { index: i })
      }

      const auditLog = employeeService.getAuditLog(2000)

      expect(auditLog.events.length).toBeLessThanOrEqual(1000)
      expect(auditLog.total).toBeLessThanOrEqual(1000)
    })
  })
})

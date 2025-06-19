import React, { useState, useEffect } from 'react'
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Table,
  Badge,
  ActionIcon,
  Menu,
  Modal,
  TextInput,
  Select,
  Textarea,
  Alert,
  Tabs,
  Card,
  Grid,
  Stat,
  Progress,
  Avatar,
  Tooltip,
  SearchInput,
  Pagination,
  LoadingOverlay
} from '@mantine/core'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconUserCheck,
  IconUserX,
  IconShield,
  IconUsers,
  IconChevronDown,
  IconSearch,
  IconDownload,
  IconRefresh,
  IconSettings,
  IconAlertCircle,
  IconCheck,
  IconX
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { employeeService } from '../../../services/employeeService'
import { showNotification } from '@mantine/notifications'

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [actionType, setActionType] = useState('create') // 'create', 'edit', 'deactivate'
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({})

  const itemsPerPage = 10

  const form = useForm({
    initialValues: {
      email: '',
      name: '',
      role: 'support',
      department: '',
      reason: ''
    },
    validate: {
      email: (value) => {
        if (!value) return 'Email is required'
        if (!/^\S+@\S+\.\S+$/.test(value)) return 'Invalid email format'
        return null
      },
      name: (value) => {
        if (!value) return 'Name is required'
        if (value.length < 2) return 'Name must be at least 2 characters'
        return null
      },
      role: (value) => {
        if (!value) return 'Role is required'
        return null
      }
    }
  })

  // Load data on mount
  useEffect(() => {
    loadEmployees()
    loadStats()
  }, [])

  // Filter employees when search/filter changes
  useEffect(() => {
    filterEmployees()
  }, [employees, searchQuery, roleFilter, statusFilter, departmentFilter])

  const loadEmployees = () => {
    setLoading(true)
    try {
      const employeeData = employeeService.getAllEmployees()
      setEmployees(employeeData)
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to load employees',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = () => {
    try {
      const statsData = employeeService.getEmployeeStats()
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const filterEmployees = () => {
    const filtered = employeeService.searchEmployees(searchQuery, {
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      department: departmentFilter || undefined
    })
    setFilteredEmployees(filtered)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleCreateEmployee = () => {
    setActionType('create')
    setSelectedEmployee(null)
    form.reset()
    setModalOpen(true)
  }

  const handleEditEmployee = (employee) => {
    setActionType('edit')
    setSelectedEmployee(employee)
    form.setValues({
      email: employee.email,
      name: employee.name,
      role: employee.role,
      department: employee.department,
      reason: ''
    })
    setModalOpen(true)
  }

  const handleDeactivateEmployee = (employee) => {
    setActionType('deactivate')
    setSelectedEmployee(employee)
    form.setValues({ reason: '' })
    setConfirmModalOpen(true)
  }

  const handleReactivateEmployee = (employee) => {
    setActionType('reactivate')
    setSelectedEmployee(employee)
    setConfirmModalOpen(true)
  }

  const handleSubmit = async () => {
    const validation = form.validate()
    if (validation.hasErrors) return

    setLoading(true)
    try {
      let result

      switch (actionType) {
        case 'create':
          result = employeeService.createEmployee({
            email: form.values.email,
            name: form.values.name,
            role: form.values.role,
            department: form.values.department
          })
          break

        case 'edit':
          result = employeeService.updateEmployee(selectedEmployee.id, {
            name: form.values.name,
            role: form.values.role,
            department: form.values.department
          })
          break

        case 'deactivate':
          result = employeeService.deactivateEmployee(
            selectedEmployee.id,
            form.values.reason || 'No reason provided'
          )
          break

        case 'reactivate':
          result = employeeService.reactivateEmployee(selectedEmployee.id)
          break

        default:
          throw new Error('Invalid action type')
      }

      if (result.success) {
        showNotification({
          title: 'Success',
          message: `Employee ${actionType}d successfully`,
          color: 'green'
        })
        loadEmployees()
        loadStats()
        setModalOpen(false)
        setConfirmModalOpen(false)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const roles = employeeService.getAllRoles()
  const departments = [...new Set(employees.map(emp => emp.department))].filter(Boolean)

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'red'
      case 'manager': return 'orange'
      case 'analyst': return 'blue'
      case 'moderator': return 'purple'
      case 'support': return 'green'
      default: return 'gray'
    }
  }

  const getStatusBadgeColor = (status) => {
    return status === 'active' ? 'green' : 'red'
  }

  return (
    <Container size="xl" py="md">
      <LoadingOverlay visible={loading} />

      {/* Header */}
      <Group position="apart" mb="xl">
        <div>
          <Title order={2}>Employee Management</Title>
          <Text color="dimmed">Manage employee accounts, roles, and permissions</Text>
        </div>
        <Button leftIcon={<IconPlus size={16} />} onClick={handleCreateEmployee}>
          Add Employee
        </Button>
      </Group>

      {/* Statistics Cards */}
      <Grid mb="xl">
        <Grid.Col span={3}>
          <Card withBorder p="md">
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Total Employees
                </Text>
                <Text size="xl" weight={700}>
                  {stats.total || 0}
                </Text>
              </div>
              <IconUsers size={24} color="#339af0" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={3}>
          <Card withBorder p="md">
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Active
                </Text>
                <Text size="xl" weight={700} color="green">
                  {stats.active || 0}
                </Text>
              </div>
              <IconUserCheck size={24} color="#51cf66" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={3}>
          <Card withBorder p="md">
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Inactive
                </Text>
                <Text size="xl" weight={700} color="red">
                  {stats.inactive || 0}
                </Text>
              </div>
              <IconUserX size={24} color="#ff6b6b" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={3}>
          <Card withBorder p="md">
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Recent Hires
                </Text>
                <Text size="xl" weight={700}>
                  {stats.recentHires || 0}
                </Text>
              </div>
              <IconPlus size={24} color="#845ef7" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Filters */}
      <Paper withBorder p="md" mb="md">
        <Group>
          <TextInput
            placeholder="Search employees..."
            icon={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />

          <Select
            placeholder="Role"
            data={[
              { value: '', label: 'All Roles' },
              ...roles.map(role => ({ value: role.key, label: role.name }))
            ]}
            value={roleFilter}
            onChange={setRoleFilter}
            style={{ width: 150 }}
          />

          <Select
            placeholder="Status"
            data={[
              { value: '', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
          />

          <Select
            placeholder="Department"
            data={[
              { value: '', label: 'All Departments' },
              ...departments.map(dept => ({ value: dept, label: dept }))
            ]}
            value={departmentFilter}
            onChange={setDepartmentFilter}
            style={{ width: 150 }}
          />

          <ActionIcon onClick={loadEmployees} variant="light">
            <IconRefresh size={16} />
          </ActionIcon>
        </Group>
      </Paper>

      {/* Employee Table */}
      <Paper withBorder>
        <Table striped highlightOnHover>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <Group spacing="sm">
                    <Avatar size={32} radius="xl" color="blue">
                      {employee.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                      <Text size="sm" weight={500}>{employee.name}</Text>
                      <Text size="xs" color="dimmed">{employee.email}</Text>
                    </div>
                  </Group>
                </td>
                <td>
                  <Badge color={getRoleBadgeColor(employee.role)} variant="light">
                    {roles.find(r => r.key === employee.role)?.name || employee.role}
                  </Badge>
                </td>
                <td>
                  <Text size="sm">{employee.department}</Text>
                </td>
                <td>
                  <Badge color={getStatusBadgeColor(employee.status)} variant="light">
                    {employee.status}
                  </Badge>
                </td>
                <td>
                  <Text size="sm" color="dimmed">
                    {employee.lastLogin
                      ? new Date(employee.lastLogin).toLocaleDateString()
                      : 'Never'
                    }
                  </Text>
                </td>
                <td>
                  <Group spacing={4}>
                    <Tooltip label="Edit">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        onClick={() => handleEditEmployee(employee)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>

                    {employee.status === 'active'
                      ? (
                      <Tooltip label="Deactivate">
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="red"
                          onClick={() => handleDeactivateEmployee(employee)}
                        >
                          <IconUserX size={16} />
                        </ActionIcon>
                      </Tooltip>
                        )
                      : (
                      <Tooltip label="Reactivate">
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="green"
                          onClick={() => handleReactivateEmployee(employee)}
                        >
                          <IconUserCheck size={16} />
                        </ActionIcon>
                      </Tooltip>
                        )}
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        {filteredEmployees.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Text color="dimmed">No employees found</Text>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Group position="center" p="md">
            <Pagination
              value={currentPage}
              onChange={setCurrentPage}
              total={totalPages}
            />
          </Group>
        )}
      </Paper>

      {/* Employee Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={actionType === 'create' ? 'Add Employee' : 'Edit Employee'}
        size="md"
      >
        <Stack spacing="md">
          <TextInput
            label="Email"
            placeholder="employee@ge-metrics.com"
            required
            {...form.getInputProps('email')}
            disabled={actionType === 'edit'}
          />

          <TextInput
            label="Full Name"
            placeholder="Employee Name"
            required
            {...form.getInputProps('name')}
          />

          <Select
            label="Role"
            placeholder="Select role"
            required
            data={roles.map(role => ({
              value: role.key,
              label: `${role.name} - ${role.description}`
            }))}
            {...form.getInputProps('role')}
          />

          <TextInput
            label="Department"
            placeholder="Department"
            {...form.getInputProps('department')}
          />

          <Group position="right">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={loading}>
              {actionType === 'create' ? 'Create' : 'Update'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        opened={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title={`${actionType === 'deactivate' ? 'Deactivate' : 'Reactivate'} Employee`}
        size="md"
      >
        <Stack spacing="md">
          <Alert
            icon={<IconAlertCircle size={16} />}
            color={actionType === 'deactivate' ? 'red' : 'green'}
          >
            Are you sure you want to {actionType} {selectedEmployee?.name}?
            {actionType === 'deactivate' && (
              <Text size="sm" mt="xs">
                This will revoke all access and permissions immediately.
              </Text>
            )}
          </Alert>

          {actionType === 'deactivate' && (
            <Textarea
              label="Reason (Optional)"
              placeholder="Reason for deactivation..."
              {...form.getInputProps('reason')}
            />
          )}

          <Group position="right">
            <Button variant="default" onClick={() => setConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color={actionType === 'deactivate' ? 'red' : 'green'}
              onClick={handleSubmit}
              loading={loading}
            >
              {actionType === 'deactivate' ? 'Deactivate' : 'Reactivate'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}

export default EmployeeManagement

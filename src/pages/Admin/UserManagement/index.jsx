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
  Progress,
  Avatar,
  Tooltip,
  Pagination,
  LoadingOverlay,
  NumberInput,
  Switch,
  Divider,
  Accordion,
  Timeline,
  Code,
  ScrollArea,
  Checkbox
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
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
  IconX,
  IconBan,
  IconUserOff,
  IconKey,
  IconMail,
  IconClock,
  IconActivity,
  IconCreditCard,
  IconGift,
  IconLock,
  IconLockOpen,
  IconDots,
  IconFileExport,
  IconFilter,
  IconSortAscending,
  IconEyeOff,
  IconDevices,
  IconCalendar,
  IconCrown,
  IconStar,
  IconInfoCircle
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import userManagementService from '../../../services/userManagementService'
import { showNotification } from '@mantine/notifications'

const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState('view') // 'view', 'edit', 'role', 'trial', 'block', 'sessions'
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [membershipFilter, setMembershipFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({})
  const [auditLog, setAuditLog] = useState([])
  const [activeTab, setActiveTab] = useState('users')

  const itemsPerPage = 20

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      runescape_name: '',
      role: 'user',
      membership: 'free',
      subscription_status: 'none'
    }
  })

  const trialForm = useForm({
    initialValues: {
      duration: '',
      endDate: null,
      useEndDate: false,
      note: ''
    }
  })

  const blockForm = useForm({
    initialValues: {
      reason: ''
    }
  })

  useEffect(() => {
    loadUsers()
    loadStats()
    loadAuditLog()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchQuery, roleFilter, membershipFilter, statusFilter])

  const loadUsers = () => {
    setLoading(true)
    try {
      const userData = userManagementService.getAllUsers()
      setUsers(userData)
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to load users',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = () => {
    const statsData = userManagementService.getUserStats()
    setStats(statsData)
  }

  const loadAuditLog = () => {
    const logs = userManagementService.getAuditLog()
    setAuditLog(logs.slice(0, 50)) // Show last 50 entries
  }

  const filterUsers = () => {
    let filtered = [...users]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.runescape_name?.toLowerCase().includes(query)
      )
    }

    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    if (membershipFilter) {
      filtered = filtered.filter(user => user.membership === membershipFilter)
    }

    if (statusFilter) {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.session_id)
      } else if (statusFilter === 'blocked') {
        filtered = filtered.filter(user => user.is_blocked)
      } else if (statusFilter === 'expired') {
        filtered = filtered.filter(user => user.subscription_status === 'expired')
      }
    }

    setFilteredUsers(filtered)
    setCurrentPage(1)
  }

  const openModal = (type, user = null) => {
    setModalType(type)
    setSelectedUser(user)
    setModalOpen(true)

    if (type === 'edit' && user) {
      form.setValues({
        name: user.name,
        email: user.email,
        runescape_name: user.runescape_name || '',
        role: user.role,
        membership: user.membership,
        subscription_status: user.subscription_status
      })
    }

    if (type === 'trial') {
      trialForm.reset()
    }

    if (type === 'block') {
      blockForm.reset()
    }
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedUser(null)
    form.reset()
    trialForm.reset()
    blockForm.reset()
  }

  const handleCreateUser = async (values) => {
    try {
      const result = userManagementService.createUser(values)
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'User created successfully',
          color: 'green'
        })
        loadUsers()
        loadStats()
        closeModal()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleUpdateUser = async (values) => {
    try {
      const result = userManagementService.updateUser(selectedUser.id, values)
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'User updated successfully',
          color: 'green'
        })
        loadUsers()
        loadStats()
        closeModal()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const result = userManagementService.updateUserRole(userId, newRole, 'user_admin_001') // Current admin
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'User role updated successfully',
          color: 'green'
        })
        loadUsers()
        loadStats()
        loadAuditLog()
        closeModal()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleGrantTrial = async (values) => {
    try {
      // Determine if using end date or duration
      const endDate = values.useEndDate ? values.endDate : null
      const duration = values.useEndDate ? null : values.duration

      const result = userManagementService.grantFreeTrial(
        selectedUser.id,
        duration,
        endDate,
        values.note
      )
      if (result.success) {
        const message = values.useEndDate
          ? `Free trial granted until ${new Date(values.endDate).toLocaleDateString()}`
          : `Free trial granted for ${values.duration} days`

        showNotification({
          title: 'Success',
          message,
          color: 'green'
        })
        loadUsers()
        loadStats()
        loadAuditLog()
        closeModal()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleBlockUser = async (values) => {
    try {
      const result = userManagementService.blockUser(
        selectedUser.id,
        values.reason,
        'user_admin_001'
      )
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'User blocked successfully',
          color: 'green'
        })
        loadUsers()
        loadStats()
        loadAuditLog()
        closeModal()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleUnblockUser = async (userId) => {
    try {
      const result = userManagementService.unblockUser(userId, 'user_admin_001')
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'User unblocked successfully',
          color: 'green'
        })
        loadUsers()
        loadStats()
        loadAuditLog()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleDestroySession = async (userId) => {
    try {
      const result = userManagementService.destroyUserSessions(userId)
      if (result.success) {
        showNotification({
          title: 'Success',
          message: `Destroyed ${result.destroyedCount} session(s)`,
          color: 'green'
        })
        loadUsers()
        loadAuditLog()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleSendPasswordReset = async (userId) => {
    try {
      const result = userManagementService.sendPasswordReset(userId)
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'Password reset email sent',
          color: 'green'
        })
        loadAuditLog()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleSendUsernameReminder = async (userId) => {
    try {
      const result = userManagementService.sendUsernameReminder(userId)
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'Username reminder sent',
          color: 'green'
        })
        loadAuditLog()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const exportData = (format) => {
    try {
      const data = userManagementService.exportUserData(format)
      const blob = new Blob([data], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user-data-${new Date().toISOString().split('T')[0]}.${format}`
      a.click()
      URL.revokeObjectURL(url)

      showNotification({
        title: 'Success',
        message: `Data exported as ${format.toUpperCase()}`,
        color: 'green'
      })
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to export data',
        color: 'red'
      })
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'red'
      case 'jmod': return 'orange'
      case 'mod': return 'yellow'
      case 'user': return 'blue'
      default: return 'gray'
    }
  }

  const getSubscriptionBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'green'
      case 'trial': return 'blue'
      case 'expired': return 'red'
      case 'canceled': return 'gray'
      default: return 'gray'
    }
  }

  const formatDate = (date) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString()
  }

  const formatRelativeTime = (date) => {
    if (!date) return 'Never'
    const now = new Date()
    const diff = now - new Date(date)
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day(s) ago`
    if (hours > 0) return `${hours} hour(s) ago`
    if (minutes > 0) return `${minutes} minute(s) ago`
    return 'Just now'
  }

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageData = filteredUsers.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

  return (
    <Container size="xl" py="md">
      <LoadingOverlay visible={loading} />

      {/* Modals */}
      <Modal
        opened={modalOpen}
        onClose={closeModal}
        title={
          modalType === 'view'
            ? 'User Details'
            : modalType === 'edit'
              ? 'Edit User'
              : modalType === 'create'
                ? 'Create User'
                : modalType === 'role'
                  ? 'Change User Role'
                  : modalType === 'trial'
                    ? 'Grant Free Trial'
                    : modalType === 'block'
                      ? 'Block User'
                      : modalType === 'sessions' ? 'User Sessions' : 'User Management'
        }
        size={modalType === 'view' ? 'xl' : 'lg'}
      >
        {modalType === 'view' && selectedUser && (
          <Stack spacing="md">
            <Group position="apart" align="flex-start">
              <div>
                <Group spacing="sm" mb="xs">
                  <Avatar size="lg" color={getRoleBadgeColor(selectedUser.role)}>
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Text size="xl" weight={600}>{selectedUser.name}</Text>
                    <Text size="sm" color="dimmed">{selectedUser.email}</Text>
                    <Group spacing="xs" mt="xs">
                      <Badge color={getRoleBadgeColor(selectedUser.role)} size="sm">
                        {selectedUser.role.toUpperCase()}
                      </Badge>
                      <Badge color={getSubscriptionBadgeColor(selectedUser.subscription_status)} size="sm">
                        {selectedUser.subscription_status.toUpperCase()}
                      </Badge>
                      {selectedUser.is_blocked && (
                        <Badge color="red" size="sm">BLOCKED</Badge>
                      )}
                    </Group>
                  </div>
                </Group>
              </div>
              <Group spacing="xs">
                <ActionIcon color="blue" onClick={() => openModal('edit', selectedUser)}>
                  <IconEdit size={16} />
                </ActionIcon>
                <Menu>
                  <Menu.Target>
                    <ActionIcon>
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item icon={<IconCrown size={14} />} onClick={() => openModal('role', selectedUser)}>
                      Change Role
                    </Menu.Item>
                    <Menu.Item icon={<IconGift size={14} />} onClick={() => openModal('trial', selectedUser)}>
                      Grant Trial
                    </Menu.Item>
                    <Menu.Item icon={<IconKey size={14} />} onClick={() => handleSendPasswordReset(selectedUser.id)}>
                      Send Password Reset
                    </Menu.Item>
                    <Menu.Item icon={<IconMail size={14} />} onClick={() => handleSendUsernameReminder(selectedUser.id)}>
                      Send Username Reminder
                    </Menu.Item>
                    <Menu.Item icon={<IconDevices size={14} />} onClick={() => handleDestroySession(selectedUser.id)}>
                      Destroy Sessions
                    </Menu.Item>
                    <Menu.Divider />
                    {selectedUser.is_blocked
                      ? (
                      <Menu.Item icon={<IconLockOpen size={14} />} color="green" onClick={() => handleUnblockUser(selectedUser.id)}>
                        Unblock User
                      </Menu.Item>
                        )
                      : (
                      <Menu.Item icon={<IconBan size={14} />} color="red" onClick={() => openModal('block', selectedUser)}>
                        Block User
                      </Menu.Item>
                        )}
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>

            <Divider />

            <Grid>
              <Grid.Col span={6}>
                <Card withBorder>
                  <Stack spacing="xs">
                    <Text weight={500} size="sm">Account Information</Text>
                    <Group position="apart">
                      <Text size="xs" color="dimmed">RuneScape Name:</Text>
                      <Text size="xs">{selectedUser.runescape_name || 'Not set'}</Text>
                    </Group>
                    <Group position="apart">
                      <Text size="xs" color="dimmed">Member Since:</Text>
                      <Text size="xs">{formatDate(selectedUser.created_at)}</Text>
                    </Group>
                    <Group position="apart">
                      <Text size="xs" color="dimmed">Last Login:</Text>
                      <Text size="xs">{formatRelativeTime(selectedUser.last_login)}</Text>
                    </Group>
                    <Group position="apart">
                      <Text size="xs" color="dimmed">Login Count:</Text>
                      <Text size="xs">{selectedUser.login_count || 0}</Text>
                    </Group>
                    <Group position="apart">
                      <Text size="xs" color="dimmed">Currently Online:</Text>
                      <Badge size="xs" color={selectedUser.session_id ? 'green' : 'gray'}>
                        {selectedUser.session_id ? 'Online' : 'Offline'}
                      </Badge>
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={6}>
                <Card withBorder>
                  <Stack spacing="xs">
                    <Text weight={500} size="sm">Subscription Details</Text>
                    <Group position="apart">
                      <Text size="xs" color="dimmed">Plan:</Text>
                      <Text size="xs">{selectedUser.membership}</Text>
                    </Group>
                    <Group position="apart">
                      <Text size="xs" color="dimmed">Status:</Text>
                      <Badge size="xs" color={getSubscriptionBadgeColor(selectedUser.subscription_status)}>
                        {selectedUser.subscription_status}
                      </Badge>
                    </Group>
                    <Group position="apart">
                      <Text size="xs" color="dimmed">Expires:</Text>
                      <Text size="xs">{selectedUser.subscription_end ? formatDate(selectedUser.subscription_end) : 'N/A'}</Text>
                    </Group>
                    {selectedUser.trial_granted_by && (
                      <>
                        <Group position="apart">
                          <Text size="xs" color="dimmed">Trial Granted:</Text>
                          <Text size="xs">{formatDate(selectedUser.trial_granted_at)}</Text>
                        </Group>
                        <Group position="apart">
                          <Text size="xs" color="dimmed">Admin Note:</Text>
                          <Text size="xs">{selectedUser.trial_admin_note || 'None'}</Text>
                        </Group>
                      </>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={6}>
                <Card withBorder>
                  <Stack spacing="xs">
                    <Text weight={500} size="sm">Security Settings</Text>
                    <Group position="apart">
                      <Text size="xs" color="dimmed">2FA Enabled:</Text>
                      <Badge size="xs" color={selectedUser.otp_enabled ? 'green' : 'gray'}>
                        {selectedUser.otp_enabled ? 'Yes' : 'No'}
                      </Badge>
                    </Group>
                    <Group position="apart">
                      <Text size="xs" color="dimmed">Mailchimp API:</Text>
                      <Badge size="xs" color={selectedUser.mailchimp_api_key ? 'green' : 'gray'}>
                        {selectedUser.mailchimp_api_key ? 'Configured' : 'Not Set'}
                      </Badge>
                    </Group>
                    {selectedUser.is_blocked && (
                      <>
                        <Group position="apart">
                          <Text size="xs" color="dimmed">Blocked:</Text>
                          <Text size="xs">{formatDate(selectedUser.blocked_at)}</Text>
                        </Group>
                        <Group position="apart">
                          <Text size="xs" color="dimmed">Reason:</Text>
                          <Text size="xs">{selectedUser.block_reason}</Text>
                        </Group>
                      </>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={6}>
                <Card withBorder>
                  <Stack spacing="xs">
                    <Text weight={500} size="sm">Role & Permissions</Text>
                    <Group position="apart">
                      <Text size="xs" color="dimmed">Current Role:</Text>
                      <Badge size="xs" color={getRoleBadgeColor(selectedUser.role)}>
                        {selectedUser.role.toUpperCase()}
                      </Badge>
                    </Group>
                    <Text size="xs" color="dimmed">Permissions:</Text>
                    <ScrollArea style={{ height: 100 }}>
                      <Stack spacing={2}>
                        {userManagementService.getUserRole(selectedUser.id)?.permissions.map(permission => (
                          <Code key={permission} size="xs">{permission}</Code>
                        )) || <Text size="xs" color="dimmed">No special permissions</Text>}
                      </Stack>
                    </ScrollArea>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        )}

        {modalType === 'create' && (
          <form onSubmit={form.onSubmit(handleCreateUser)}>
            <Stack spacing="md">
              <TextInput
                label="Full Name"
                placeholder="Enter full name"
                required
                {...form.getInputProps('name')}
              />
              <TextInput
                label="Email"
                placeholder="Enter email"
                type="email"
                required
                {...form.getInputProps('email')}
              />
              <TextInput
                label="RuneScape Username"
                placeholder="Enter RuneScape username"
                {...form.getInputProps('runescape_name')}
              />
              <Select
                label="Role"
                data={[
                  { value: 'user', label: 'User' },
                  { value: 'mod', label: 'Moderator' },
                  { value: 'jmod', label: 'J-Moderator' },
                  { value: 'admin', label: 'Administrator' }
                ]}
                {...form.getInputProps('role')}
              />
              <Select
                label="Membership"
                data={[
                  { value: 'free', label: 'Free' },
                  { value: 'premium', label: 'Premium' }
                ]}
                {...form.getInputProps('membership')}
              />
              <Group position="right">
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="submit">Create User</Button>
              </Group>
            </Stack>
          </form>
        )}

        {modalType === 'edit' && (
          <form onSubmit={form.onSubmit(handleUpdateUser)}>
            <Stack spacing="md">
              <TextInput
                label="Full Name"
                placeholder="Enter full name"
                required
                {...form.getInputProps('name')}
              />
              <TextInput
                label="Email"
                placeholder="Enter email"
                type="email"
                required
                {...form.getInputProps('email')}
              />
              <TextInput
                label="RuneScape Username"
                placeholder="Enter RuneScape username"
                {...form.getInputProps('runescape_name')}
              />
              <Select
                label="Membership"
                data={[
                  { value: 'free', label: 'Free' },
                  { value: 'premium', label: 'Premium' }
                ]}
                {...form.getInputProps('membership')}
              />
              <Group position="right">
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="submit">Update User</Button>
              </Group>
            </Stack>
          </form>
        )}

        {modalType === 'role' && selectedUser && (
          <Stack spacing="md">
            <Text size="sm">
              Change role for <strong>{selectedUser.name}</strong>
            </Text>
            <Select
              label="New Role"
              value={selectedUser.role}
              onChange={(value) => handleUpdateRole(selectedUser.id, value)}
              data={[
                { value: 'user', label: 'User - Basic access' },
                { value: 'mod', label: 'Moderator - Content moderation' },
                { value: 'jmod', label: 'J-Moderator - Extended permissions' },
                { value: 'admin', label: 'Administrator - Full access' }
              ]}
            />
            <Alert icon={<IconAlertCircle size={16} />} color="yellow">
              Changing user roles will affect their access permissions immediately.
            </Alert>
          </Stack>
        )}

        {modalType === 'trial' && selectedUser && (
          <form onSubmit={trialForm.onSubmit(handleGrantTrial)}>
            <Stack spacing="md">
              <Text size="sm">
                Grant free trial to <strong>{selectedUser.name}</strong>
              </Text>

              <Checkbox
                label="Set specific end date instead of duration"
                {...trialForm.getInputProps('useEndDate', { type: 'checkbox' })}
              />

              {!trialForm.values.useEndDate ? (
                <NumberInput
                  label="Trial Duration (Days)"
                  placeholder="Enter number of days (e.g., 7, 14, 30)"
                  min={1}
                  max={365}
                  required
                  {...trialForm.getInputProps('duration')}
                />
              ) : (
                <DateInput
                  label="Trial End Date"
                  placeholder="Select when the trial should end"
                  required
                  minDate={new Date()}
                  maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // Max 1 year from now
                  {...trialForm.getInputProps('endDate')}
                />
              )}

              <Textarea
                label="Admin Note"
                placeholder="Optional note about this trial grant"
                {...trialForm.getInputProps('note')}
              />

              <Alert icon={<IconInfoCircle size={16} />} color="blue">
                {!trialForm.values.useEndDate
                  ? `Trial will end on ${new Date(Date.now() + (trialForm.values.duration || 0) * 24 * 60 * 60 * 1000).toLocaleDateString()}`
                  : trialForm.values.endDate
                    ? `Trial will end on ${new Date(trialForm.values.endDate).toLocaleDateString()}`
                    : 'Please select an end date'
                }
              </Alert>

              <Group position="right">
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="submit" color="green">Grant Trial</Button>
              </Group>
            </Stack>
          </form>
        )}

        {modalType === 'block' && selectedUser && (
          <form onSubmit={blockForm.onSubmit(handleBlockUser)}>
            <Stack spacing="md">
              <Text size="sm">
                Block user <strong>{selectedUser.name}</strong>
              </Text>
              <Textarea
                label="Reason for blocking"
                placeholder="Enter reason for blocking this user"
                required
                {...blockForm.getInputProps('reason')}
              />
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                Blocking this user will immediately destroy all their active sessions and prevent login.
              </Alert>
              <Group position="right">
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="submit" color="red">Block User</Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>

      {/* Header */}
      <Group position="apart" mb="xl">
        <div>
          <Title order={2} color="white">
            <IconUsers size={28} style={{ marginRight: 8 }} />
            User Management
          </Title>
          <Text size="sm" color="rgba(255, 255, 255, 0.7)">
            Manage users, roles, permissions, and subscriptions
          </Text>
        </div>
        <Group spacing="xs">
          <Menu>
            <Menu.Target>
              <Button leftIcon={<IconFileExport size={16} />} variant="outline">
                Export
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => exportData('json')}>Export as JSON</Menu.Item>
              <Menu.Item onClick={() => exportData('csv')}>Export as CSV</Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Button leftIcon={<IconRefresh size={16} />} variant="outline" onClick={loadUsers}>
            Refresh
          </Button>
          <Button leftIcon={<IconPlus size={16} />} onClick={() => openModal('create')}>
            Add User
          </Button>
        </Group>
      </Group>

      {/* Stats Cards */}
      <Grid mb="xl">
        <Grid.Col span={3}>
          <Card withBorder>
            <Text size="sm" color="dimmed">Total Users</Text>
            <Text size="xl" weight={700}>{stats.total || 0}</Text>
            <Text size="xs" color="green">
              {stats.active || 0} currently online
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder>
            <Text size="sm" color="dimmed">Active Subscriptions</Text>
            <Text size="xl" weight={700}>{stats.bySubscription?.active || 0}</Text>
            <Text size="xs" color="blue">
              {stats.bySubscription?.trial || 0} on trial
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder>
            <Text size="sm" color="dimmed">Staff Members</Text>
            <Text size="xl" weight={700}>
              {(stats.byRole?.admin || 0) + (stats.byRole?.jmod || 0) + (stats.byRole?.mod || 0)}
            </Text>
            <Text size="xs" color="orange">
              {stats.byRole?.admin || 0} admins, {stats.byRole?.jmod || 0} jmods, {stats.byRole?.mod || 0} mods
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder>
            <Text size="sm" color="dimmed">Security</Text>
            <Text size="xl" weight={700}>{stats.withOTP || 0}</Text>
            <Text size="xs" color="purple">
              users with 2FA enabled
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Tabs */}
      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="users" icon={<IconUsers size={16} />}>
            Users ({filteredUsers.length})
          </Tabs.Tab>
          <Tabs.Tab value="audit" icon={<IconActivity size={16} />}>
            Audit Log
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="users" pt="md">
          {/* Filters */}
          <Card withBorder mb="md">
            <Grid>
              <Grid.Col span={4}>
                <TextInput
                  placeholder="Search users..."
                  icon={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Select
                  placeholder="Filter by role"
                  value={roleFilter}
                  onChange={setRoleFilter}
                  data={[
                    { value: '', label: 'All Roles' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'jmod', label: 'J-Mod' },
                    { value: 'mod', label: 'Mod' },
                    { value: 'user', label: 'User' }
                  ]}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Select
                  placeholder="Filter by membership"
                  value={membershipFilter}
                  onChange={setMembershipFilter}
                  data={[
                    { value: '', label: 'All Plans' },
                    { value: 'premium', label: 'Premium' },
                    { value: 'free', label: 'Free' }
                  ]}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Select
                  placeholder="Filter by status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  data={[
                    { value: '', label: 'All Status' },
                    { value: 'active', label: 'Online' },
                    { value: 'blocked', label: 'Blocked' },
                    { value: 'expired', label: 'Expired' }
                  ]}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    setSearchQuery('')
                    setRoleFilter('')
                    setMembershipFilter('')
                    setStatusFilter('')
                  }}
                >
                  Clear
                </Button>
              </Grid.Col>
            </Grid>
          </Card>

          {/* Users Table */}
          <Card withBorder>
            <ScrollArea>
              <Table striped highlightOnHover>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Subscription</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageData.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <Group spacing="sm">
                          <Avatar size="sm" color={getRoleBadgeColor(user.role)}>
                            {user.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <div>
                            <Text size="sm" weight={500}>{user.name}</Text>
                            <Text size="xs" color="dimmed">{user.email}</Text>
                            {user.runescape_name && (
                              <Text size="xs" color="dimmed">RS: {user.runescape_name}</Text>
                            )}
                          </div>
                        </Group>
                      </td>
                      <td>
                        <Badge color={getRoleBadgeColor(user.role)} size="sm">
                          {user.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td>
                        <Stack spacing={2}>
                          <Badge color={getSubscriptionBadgeColor(user.subscription_status)} size="sm">
                            {user.subscription_status}
                          </Badge>
                          <Text size="xs" color="dimmed">{user.membership}</Text>
                        </Stack>
                      </td>
                      <td>
                        <Stack spacing={2}>
                          <Group spacing="xs">
                            <Badge size="xs" color={user.session_id ? 'green' : 'gray'}>
                              {user.session_id ? 'Online' : 'Offline'}
                            </Badge>
                            {user.otp_enabled && (
                              <Tooltip label="2FA Enabled">
                                <IconShield size={12} color="green" />
                              </Tooltip>
                            )}
                            {user.mailchimp_api_key && (
                              <Tooltip label="Mailchimp Configured">
                                <IconMail size={12} color="blue" />
                              </Tooltip>
                            )}
                          </Group>
                          {user.is_blocked && (
                            <Badge size="xs" color="red">BLOCKED</Badge>
                          )}
                        </Stack>
                      </td>
                      <td>
                        <Text size="xs">{formatRelativeTime(user.last_login)}</Text>
                        <Text size="xs" color="dimmed">
                          {user.login_count || 0} logins
                        </Text>
                      </td>
                      <td>
                        <Group spacing="xs">
                          <ActionIcon color="blue" onClick={() => openModal('view', user)}>
                            <IconEye size={16} />
                          </ActionIcon>
                          <ActionIcon color="green" onClick={() => openModal('edit', user)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <Menu>
                            <Menu.Target>
                              <ActionIcon>
                                <IconDots size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item icon={<IconCrown size={14} />} onClick={() => openModal('role', user)}>
                                Change Role
                              </Menu.Item>
                              <Menu.Item icon={<IconGift size={14} />} onClick={() => openModal('trial', user)}>
                                Grant Trial
                              </Menu.Item>
                              <Menu.Item icon={<IconKey size={14} />} onClick={() => handleSendPasswordReset(user.id)}>
                                Password Reset
                              </Menu.Item>
                              <Menu.Item icon={<IconMail size={14} />} onClick={() => handleSendUsernameReminder(user.id)}>
                                Username Reminder
                              </Menu.Item>
                              <Menu.Item icon={<IconDevices size={14} />} onClick={() => handleDestroySession(user.id)}>
                                Destroy Sessions
                              </Menu.Item>
                              <Menu.Divider />
                              {user.is_blocked
                                ? (
                                <Menu.Item icon={<IconLockOpen size={14} />} color="green" onClick={() => handleUnblockUser(user.id)}>
                                  Unblock User
                                </Menu.Item>
                                  )
                                : (
                                <Menu.Item icon={<IconBan size={14} />} color="red" onClick={() => openModal('block', user)}>
                                  Block User
                                </Menu.Item>
                                  )}
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </ScrollArea>

            {filteredUsers.length === 0 && (
              <Text align="center" color="dimmed" py="xl">
                No users found matching the current filters
              </Text>
            )}

            {totalPages > 1 && (
              <Group position="center" mt="md">
                <Pagination
                  value={currentPage}
                  onChange={setCurrentPage}
                  total={totalPages}
                />
              </Group>
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="audit" pt="md">
          <Card withBorder>
            <Group position="apart" mb="md">
              <Text weight={500}>Recent Activity</Text>
              <Button size="xs" variant="outline" onClick={loadAuditLog}>
                <IconRefresh size={14} />
              </Button>
            </Group>

            <Timeline>
              {auditLog.map((entry) => (
                <Timeline.Item
                  key={entry.id}
                  title={entry.action.replace('_', ' ').toUpperCase()}
                  color={
                    entry.action.includes('block')
                      ? 'red'
                      : entry.action.includes('create')
                        ? 'green'
                        : entry.action.includes('delete')
                          ? 'red'
                          : entry.action.includes('update') ? 'blue' : 'gray'
                  }
                >
                  <Text size="xs" color="dimmed">
                    {formatDate(entry.timestamp)}
                  </Text>
                  {entry.metadata && (
                    <Code size="xs" mt="xs">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </Code>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>

            {auditLog.length === 0 && (
              <Text align="center" color="dimmed" py="xl">
                No audit log entries
              </Text>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>

      <Alert icon={<IconInfoCircle size={16} />} color="blue">
        Select a user from the table to view details, edit information, or perform actions.
      </Alert>
    </Container>
  )
}

export default UserManagement

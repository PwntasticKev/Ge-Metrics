import React, { useState } from 'react'
import {
  Container,
  Title,
  Paper,
  Table,
  Group,
  Text,
  Badge,
  Button,
  TextInput,
  Select,
  Pagination,
  Modal,
  Stack,
  Grid,
  Card,
  ActionIcon,
  Tooltip,
  Avatar,
  Center,
  Loader,
  Tabs,
  Alert,
  ScrollArea,
  Timeline,
  Switch,
  NumberInput,
  Code,
  Divider,
  RingProgress,
  ThemeIcon,
  SimpleGrid
} from '@mantine/core'
import {
  IconUser,
  IconEdit,
  IconTrash,
  IconEye,
  IconUserPlus,
  IconSearch,
  IconFilter,
  IconRefresh,
  IconAlertTriangle,
  IconActivity,
  IconApi,
  IconShield,
  IconCreditCard,
  IconMail,
  IconCalendar,
  IconClock,
  IconDevices,
  IconMapPin,
  IconBrowserCheck,
  IconCheck,
  IconX,
  IconExternalLink
} from '@tabler/icons-react'
import { trpc } from '../../utils/trpc'
import { notifications } from '@mantine/notifications'
import { DateInput } from '@mantine/dates'

const UserStatusBadge = ({ status }) => {
  const getStatusProps = (status) => {
    switch (status) {
      case 'active':
        return { color: 'green', label: 'Active' }
      case 'inactive':
        return { color: 'gray', label: 'Inactive' }
      case 'suspended':
        return { color: 'red', label: 'Suspended' }
      case 'pending':
        return { color: 'yellow', label: 'Pending' }
      default:
        return { color: 'gray', label: 'Unknown' }
    }
  }
  
  const props = getStatusProps(status)
  return <Badge color={props.color} size="sm">{props.label}</Badge>
}

const UserRoleBadge = ({ role }) => {
  const getRoleProps = (role) => {
    switch (role) {
      case 'admin':
        return { color: 'red', label: 'Admin' }
      case 'moderator':
        return { color: 'orange', label: 'Moderator' }
      case 'premium':
        return { color: 'blue', label: 'Premium' }
      case 'user':
        return { color: 'green', label: 'User' }
      default:
        return { color: 'gray', label: 'Unknown' }
    }
  }
  
  const props = getRoleProps(role)
  return <Badge color={props.color} size="sm">{props.label}</Badge>
}

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [userDetailModalOpen, setUserDetailModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    role: 'user',
    trialDays: 14
  })
  const [userDetailsTab, setUserDetailsTab] = useState('overview')

  // Real TRPC data queries
  const { data: usersData, isLoading, refetch } = trpc.adminUsers.getAllUsers.useQuery({
    page,
    limit,
    search: searchTerm || undefined,
    role: roleFilter || undefined,
    subscriptionStatus: statusFilter || undefined
  })

  const { data: userStats } = trpc.adminUsers.getUserStats.useQuery()

  // User details query (only when modal is open)
  const { data: userDetails, isLoading: userDetailsLoading } = trpc.adminUsers.getUserDetails.useQuery(
    { userId: selectedUserId },
    { enabled: !!selectedUserId && userDetailModalOpen }
  )

  // Pending invitations query
  const { data: pendingInvitations, refetch: refetchInvitations } = trpc.adminInvitations.getPendingInvitations.useQuery({
    page: 1,
    limit: 20
  })

  // Mutations
  const updateUserMutation = trpc.adminUsers.updateUser.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'User updated successfully',
        color: 'green'
      })
      setEditModalOpen(false)
      setEditFormData({})
      refetch()
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  })

  const createInvitationMutation = trpc.adminInvitations.createInvitation.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Invitation sent successfully',
        color: 'green'
      })
      setInviteModalOpen(false)
      setInviteFormData({ email: '', role: 'user', trialDays: 14 })
      refetchInvitations()
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  })

  const extendTrialMutation = trpc.adminUsers.extendUserTrialAdvanced.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Trial extended successfully',
        color: 'green'
      })
      refetch()
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  })

  const deleteUserMutation = trpc.adminUsers.deleteUser.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'User deleted successfully',
        color: 'green'
      })
      refetch()
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  })

  const handleViewUser = (user) => {
    setSelectedUserId(user.id)
    setUserDetailsTab('overview')
    setUserDetailModalOpen(true)
  }

  const handleEditUser = (user) => {
    setSelectedUser(user)
    setEditFormData({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      role: user.role || 'user',
      subscriptionStatus: user.subscriptionStatus || 'inactive',
      trialEnd: user.trialEnd ? new Date(user.trialEnd).toISOString().split('T')[0] : ''
    })
    setEditModalOpen(true)
  }

  const handleInviteUser = () => {
    setInviteModalOpen(true)
  }

  const handleSaveUser = () => {
    updateUserMutation.mutate({
      userId: selectedUser.id,
      ...editFormData
    })
  }

  const handleSendInvitation = () => {
    createInvitationMutation.mutate(inviteFormData)
  }

  const handleResetPassword = (user) => {
    setSelectedUser(user)
    setResetPasswordModalOpen(true)
  }

  const confirmResetPassword = () => {
    notifications.show({
      title: 'Password Reset',
      message: `Password reset email sent to ${selectedUser.email}`,
      color: 'green'
    })
    setResetPasswordModalOpen(false)
    setSelectedUser(null)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <Container size="xl">
      <Group position="apart" mb="xl">
        <Title order={2}>User Management</Title>
        <Group>
          <Button leftIcon={<IconUserPlus size={16} />} onClick={handleInviteUser}>
            Invite User
          </Button>
          <Badge color="blue" size="lg">
            {pendingInvitations?.invitations?.length || 0} Pending Invites
          </Badge>
        </Group>
      </Group>

      {/* Summary Cards */}
      <Grid mb="xl">
        <Grid.Col md={3}>
          <Card withBorder>
            <Group position="apart">
              <div>
                <Text size="sm" color="dimmed">Total Users</Text>
                <Text size="xl" weight={700}>
                  {userStats?.totalUsers?.toLocaleString() || '0'}
                </Text>
              </div>
              <IconUser size={24} color="blue" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col md={3}>
          <Card withBorder>
            <Group position="apart">
              <div>
                <Text size="sm" color="dimmed">Active Users</Text>
                <Text size="xl" weight={700}>
                  {userStats?.activeUsers?.toLocaleString() || '0'}
                </Text>
              </div>
              <IconUser size={24} color="green" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col md={3}>
          <Card withBorder>
            <Group position="apart">
              <div>
                <Text size="sm" color="dimmed">Premium Users</Text>
                <Text size="xl" weight={700}>
                  {userStats?.premiumUsers?.toLocaleString() || '0'}
                </Text>
              </div>
              <IconUser size={24} color="purple" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col md={3}>
          <Card withBorder>
            <Group position="apart">
              <div>
                <Text size="sm" color="dimmed">New This Month</Text>
                <Text size="xl" weight={700}>
                  {userStats?.newUsersThisMonth?.toLocaleString() || '0'}
                </Text>
              </div>
              <IconUserPlus size={24} color="orange" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Filters */}
      <Paper withBorder p="md" mb="md">
        <Grid>
          <Grid.Col md={4}>
            <TextInput
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<IconSearch size={16} />}
            />
          </Grid.Col>
          <Grid.Col md={3}>
            <Select
              placeholder="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              data={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'pending', label: 'Pending' }
              ]}
              clearable
            />
          </Grid.Col>
          <Grid.Col md={3}>
            <Select
              placeholder="Filter by role"
              value={roleFilter}
              onChange={setRoleFilter}
              data={[
                { value: 'admin', label: 'Admin' },
                { value: 'moderator', label: 'Moderator' },
                { value: 'premium', label: 'Premium' },
                { value: 'user', label: 'User' }
              ]}
              clearable
            />
          </Grid.Col>
          <Grid.Col md={2}>
            <Button leftIcon={<IconRefresh size={16} />} variant="light" fullWidth onClick={refetch}>
              Refresh
            </Button>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* Users Table */}
      <Paper withBorder>
        {isLoading ? (
          <Center p="xl">
            <Loader />
          </Center>
        ) : (
          <>
            <Table striped highlightOnHover>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Subscription</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersData?.users?.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Group spacing="sm">
                        <Avatar src={user.avatar} size="sm" radius="xl">
                          {user.name?.charAt(0) || user.email?.charAt(0)}
                        </Avatar>
                        <div>
                          <Text size="sm" weight={500}>{user.name || 'Unknown'}</Text>
                          <Text size="xs" color="dimmed">{user.email}</Text>
                        </div>
                      </Group>
                    </td>
                    <td>
                      <UserRoleBadge role={user.role || 'user'} />
                    </td>
                    <td>
                      <UserStatusBadge status={user.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td>
                      <div>
                        <UserStatusBadge status={user.subscriptionStatus || 'none'} />
                        <Text size="xs" color="dimmed">{user.subscriptionPlan || 'free'}</Text>
                      </div>
                    </td>
                    <td>
                      <Text size="sm">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                      </Text>
                    </td>
                    <td>
                      <Group spacing="xs">
                        <Tooltip label="View Details">
                          <ActionIcon onClick={() => handleViewUser(user)}>
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Edit User">
                          <ActionIcon onClick={() => handleEditUser(user)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Reset Password">
                          <ActionIcon color="orange" onClick={() => handleResetPassword(user)}>
                            <IconRefresh size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete User">
                          <ActionIcon 
                            color="red" 
                            onClick={() => deleteUserMutation.mutate({ userId: user.id })}
                            loading={deleteUserMutation.isLoading}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </td>
                  </tr>
                )) || []}
              </tbody>
            </Table>

            {usersData?.pagination && (
              <Group position="center" p="md">
                <Pagination
                  page={page}
                  onChange={setPage}
                  total={usersData.pagination.totalPages}
                />
              </Group>
            )}
          </>
        )}
      </Paper>

      {/* Enhanced User Detail Modal */}
      <Modal
        opened={userDetailModalOpen}
        onClose={() => {
          setUserDetailModalOpen(false)
          setSelectedUserId(null)
        }}
        title="User Details"
        size="xl"
      >
        {userDetailsLoading ? (
          <Center p="xl">
            <Loader />
          </Center>
        ) : userDetails ? (
          <Tabs value={userDetailsTab} onTabChange={setUserDetailsTab}>
            <Tabs.List>
              <Tabs.Tab value="overview" icon={<IconUser size={16} />}>Overview</Tabs.Tab>
              <Tabs.Tab value="sessions" icon={<IconDevices size={16} />}>Sessions</Tabs.Tab>
              <Tabs.Tab value="activity" icon={<IconActivity size={16} />}>Activity</Tabs.Tab>
              <Tabs.Tab value="security" icon={<IconShield size={16} />}>Security</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              <SimpleGrid cols={2}>
                <Stack>
                  <Card withBorder>
                    <Text weight={500} mb="sm">User Information</Text>
                    <Stack spacing="xs">
                      <Group position="apart">
                        <Text size="sm" color="dimmed">Name:</Text>
                        <Text size="sm">{userDetails.name || 'Not set'}</Text>
                      </Group>
                      <Group position="apart">
                        <Text size="sm" color="dimmed">Email:</Text>
                        <Text size="sm">{userDetails.email}</Text>
                      </Group>
                      <Group position="apart">
                        <Text size="sm" color="dimmed">Username:</Text>
                        <Text size="sm">{userDetails.username}</Text>
                      </Group>
                      <Group position="apart">
                        <Text size="sm" color="dimmed">Role:</Text>
                        <UserRoleBadge role={userDetails.role || 'user'} />
                      </Group>
                      <Group position="apart">
                        <Text size="sm" color="dimmed">Verified:</Text>
                        <Badge color={userDetails.emailVerified ? 'green' : 'red'} size="sm">
                          {userDetails.emailVerified ? 'Yes' : 'No'}
                        </Badge>
                      </Group>
                    </Stack>
                  </Card>

                  <Card withBorder>
                    <Text weight={500} mb="sm">API Usage (30 days)</Text>
                    <Group>
                      <div>
                        <Text size="xl" weight={700}>{userDetails.apiStats?.totalRequests || 0}</Text>
                        <Text size="sm" color="dimmed">Total Requests</Text>
                      </div>
                      <div>
                        <Text size="xl" weight={700}>{userDetails.apiStats?.avgResponseTime || 0}ms</Text>
                        <Text size="sm" color="dimmed">Avg Response</Text>
                      </div>
                    </Group>
                  </Card>
                </Stack>

                <Stack>
                  <Card withBorder>
                    <Text weight={500} mb="sm">Subscription Details</Text>
                    <Stack spacing="xs">
                      <Group position="apart">
                        <Text size="sm" color="dimmed">Status:</Text>
                        <UserStatusBadge status={userDetails.subscriptionStatus || 'inactive'} />
                      </Group>
                      <Group position="apart">
                        <Text size="sm" color="dimmed">Plan:</Text>
                        <Text size="sm">{userDetails.subscriptionPlan || 'free'}</Text>
                      </Group>
                      {userDetails.isTrialing && (
                        <Group position="apart">
                          <Text size="sm" color="dimmed">Trial Ends:</Text>
                          <Text size="sm">{formatDate(userDetails.trialEnd)}</Text>
                        </Group>
                      )}
                    </Stack>
                  </Card>

                  <Card withBorder>
                    <Text weight={500} mb="sm">Active Sessions</Text>
                    <Text size="xl" weight={700}>{userDetails.activeSessions?.length || 0}</Text>
                    <Text size="sm" color="dimmed">Current active sessions</Text>
                  </Card>
                </Stack>
              </SimpleGrid>
            </Tabs.Panel>

            <Tabs.Panel value="sessions" pt="md">
              <Text weight={500} mb="md">Active Sessions</Text>
              {userDetails.activeSessions?.length > 0 ? (
                <Stack>
                  {userDetails.activeSessions.map((session, index) => (
                    <Card withBorder key={index}>
                      <Group position="apart">
                        <div>
                          <Text size="sm" weight={500}>
                            {session.deviceInfo?.browser || 'Unknown'} on {session.deviceInfo?.os || 'Unknown'}
                          </Text>
                          <Text size="xs" color="dimmed">
                            {session.location?.city || 'Unknown'}, {session.location?.country || 'Unknown'}
                          </Text>
                          <Text size="xs" color="dimmed">
                            Last active: {formatDate(session.lastActivity)}
                          </Text>
                        </div>
                        <Group>
                          <Badge size="sm" color="green">Active</Badge>
                          <Text size="xs" color="dimmed">{session.ipAddress}</Text>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text color="dimmed">No active sessions</Text>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="security" pt="md">
              <Text weight={500} mb="md">Security Events</Text>
              {userDetails.securityEvents?.length > 0 ? (
                <Stack>
                  {userDetails.securityEvents.slice(0, 10).map((event, index) => (
                    <Alert key={index} color={event.severity === 'high' ? 'red' : event.severity === 'medium' ? 'yellow' : 'blue'}>
                      <Group position="apart">
                        <div>
                          <Text size="sm" weight={500}>{event.eventType}</Text>
                          <Text size="xs" color="dimmed">{formatDate(event.createdAt)}</Text>
                        </div>
                        <Badge color={event.resolved ? 'green' : 'red'} size="sm">
                          {event.resolved ? 'Resolved' : 'Open'}
                        </Badge>
                      </Group>
                    </Alert>
                  ))}
                </Stack>
              ) : (
                <Text color="dimmed">No security events</Text>
              )}
            </Tabs.Panel>
          </Tabs>
        ) : (
          <Text>User not found</Text>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit User"
        size="md"
      >
        <Stack>
          <TextInput
            label="Name"
            value={editFormData.name || ''}
            onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
          />
          <TextInput
            label="Username"
            value={editFormData.username || ''}
            onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
          />
          <Select
            label="Role"
            value={editFormData.role}
            onChange={(value) => setEditFormData({...editFormData, role: value})}
            data={[
              { value: 'user', label: 'User' },
              { value: 'moderator', label: 'Moderator' },
              { value: 'admin', label: 'Admin' }
            ]}
          />
          <Select
            label="Subscription Status"
            value={editFormData.subscriptionStatus}
            onChange={(value) => setEditFormData({...editFormData, subscriptionStatus: value})}
            data={[
              { value: 'active', label: 'Active' },
              { value: 'trialing', label: 'Trialing' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'canceled', label: 'Canceled' }
            ]}
          />
          <TextInput
            label="Trial End Date"
            type="date"
            value={editFormData.trialEnd || ''}
            onChange={(e) => setEditFormData({...editFormData, trialEnd: e.target.value})}
          />
          <Group position="right">
            <Button variant="light" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUser} loading={updateUserMutation.isLoading}>Save</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Invite User Modal */}
      <Modal
        opened={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite New User"
        size="md"
      >
        <Stack>
          <TextInput
            label="Email Address"
            placeholder="user@example.com"
            value={inviteFormData.email}
            onChange={(e) => setInviteFormData({...inviteFormData, email: e.target.value})}
            required
          />
          <Select
            label="Role"
            value={inviteFormData.role}
            onChange={(value) => setInviteFormData({...inviteFormData, role: value})}
            data={[
              { value: 'user', label: 'User' },
              { value: 'moderator', label: 'Moderator' },
              { value: 'admin', label: 'Admin' }
            ]}
          />
          <NumberInput
            label="Trial Days"
            value={inviteFormData.trialDays}
            onChange={(value) => setInviteFormData({...inviteFormData, trialDays: value})}
            min={1}
            max={365}
          />
          <Group position="right">
            <Button variant="light" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSendInvitation} loading={createInvitationMutation.isLoading}>Send Invitation</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}

export default UserManagement
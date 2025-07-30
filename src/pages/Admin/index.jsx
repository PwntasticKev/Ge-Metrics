import { useState } from 'react'
import {
  Box,
  Card,
  Text,
  Button,
  Group,
  Table,
  Badge,
  ActionIcon,
  Select,
  Stack,
  Title,
  Alert,
  Tabs,
  Modal,
  TextInput,
  Textarea
} from '@mantine/core'
import {
  IconCheck,
  IconX,
  IconUser,
  IconUsers,
  IconSettings,
  IconMail,
  IconClock,
  IconShield,
  IconAlertCircle,
  IconCreditCard,
  IconMathSymbols
} from '@tabler/icons-react'
import accessControlService from '../../services/accessControlService.js'
import { useNavigate } from 'react-router-dom'

export default function AdminPanel () {
  const [activeTab, setActiveTab] = useState('pending')
  const [emailModalOpened, setEmailModalOpened] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const navigate = useNavigate()

  // Mock data - this would come from your API
  const pendingUsers = [
    {
      id: 2,
      name: 'John Smith',
      email: 'john@example.com',
      runescape_name: 'JohnPKer123',
      created_at: new Date('2024-01-20'),
      access: false,
      role: 'user'
    },
    {
      id: 3,
      name: 'Sarah Wilson',
      email: 'sarah.wilson@gmail.com',
      runescape_name: 'SarahFlips',
      created_at: new Date('2024-01-21'),
      access: false,
      role: 'user'
    }
  ]

  const approvedUsers = [
    {
      id: 1,
      name: 'Admin User',
      email: 'admin@test.com',
      runescape_name: 'AdminChar',
      created_at: new Date('2024-01-15'),
      approved_at: new Date('2024-01-15'),
      access: true,
      role: 'admin'
    },
    {
      id: 4,
      name: 'Test User',
      email: 'test@example.com',
      runescape_name: 'TestAccount',
      created_at: new Date('2024-01-18'),
      approved_at: new Date('2024-01-19'),
      access: true,
      role: 'user'
    }
  ]

  const handleApproveUser = async (userId) => {
    try {
      await accessControlService.grantAccess(userId, 1) // 1 = current admin user ID
      // Refresh data here
      console.log(`User ${userId} approved`)
    } catch (error) {
      console.error('Error approving user:', error)
    }
  }

  const handleRejectUser = async (userId) => {
    try {
      // This would delete the user or mark as rejected
      console.log(`User ${userId} rejected`)
    } catch (error) {
      console.error('Error rejecting user:', error)
    }
  }

  const handleRevokeAccess = async (userId) => {
    try {
      await accessControlService.revokeAccess(userId, 1)
      console.log(`Access revoked for user ${userId}`)
    } catch (error) {
      console.error('Error revoking access:', error)
    }
  }

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await accessControlService.updateRole(userId, newRole, 1)
      console.log(`Role updated for user ${userId} to ${newRole}`)
    } catch (error) {
      console.error('Error updating role:', error)
    }
  }

  const handleSendEmail = (user) => {
    setSelectedUser(user)
    setEmailSubject(`Welcome to GE Metrics - Account ${user.access ? 'Approved' : 'Status Update'}`)
    setEmailMessage(user.access
      ? `Hi ${user.name},\n\nYour GE Metrics account has been approved! You can now access all features.\n\nBest regards,\nGE Metrics Team`
      : `Hi ${user.name},\n\nThank you for registering with GE Metrics. Your account is currently under review.\n\nBest regards,\nGE Metrics Team`
    )
    setEmailModalOpened(true)
  }

  const sendNotificationEmail = async () => {
    try {
      // This would send the email using your email service
      console.log('Sending email to:', selectedUser.email)
      console.log('Subject:', emailSubject)
      console.log('Message:', emailMessage)

      setEmailModalOpened(false)
      setSelectedUser(null)
      setEmailSubject('')
      setEmailMessage('')
    } catch (error) {
      console.error('Error sending email:', error)
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'red'
      case 'moderator': return 'orange'
      case 'user': return 'blue'
      default: return 'gray'
    }
  }

  const PendingUsersTable = () => (
    <Card withBorder>
      <Table striped highlightOnHover>
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>RuneScape Name</th>
            <th>Registered</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pendingUsers.map((user) => (
            <tr key={user.id}>
              <td>
                <Group spacing="sm">
                  <IconUser size={16} />
                  <div>
                    <Text size="sm" weight={500}>{user.name}</Text>
                    <Text size="xs" color="dimmed">ID: {user.id}</Text>
                  </div>
                </Group>
              </td>
              <td>
                <Text size="sm">{user.email}</Text>
              </td>
              <td>
                <Text size="sm">{user.runescape_name || 'N/A'}</Text>
              </td>
              <td>
                <Group spacing="xs">
                  <IconClock size={14} />
                  <Text size="xs">{user.created_at.toLocaleDateString()}</Text>
                </Group>
              </td>
              <td>
                <Group spacing="xs">
                  <ActionIcon
                    color="green"
                    onClick={() => handleApproveUser(user.id)}
                    title="Approve User"
                  >
                    <IconCheck size={16} />
                  </ActionIcon>
                  <ActionIcon
                    color="red"
                    onClick={() => handleRejectUser(user.id)}
                    title="Reject User"
                  >
                    <IconX size={16} />
                  </ActionIcon>
                  <ActionIcon
                    color="blue"
                    onClick={() => handleSendEmail(user)}
                    title="Send Email"
                  >
                    <IconMail size={16} />
                  </ActionIcon>
                </Group>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {pendingUsers.length === 0 && (
        <Text align="center" color="dimmed" py="xl">
          No pending user requests
        </Text>
      )}
    </Card>
  )

  const ApprovedUsersTable = () => (
    <Card withBorder>
      <Table striped highlightOnHover>
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Approved</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {approvedUsers.map((user) => (
            <tr key={user.id}>
              <td>
                <Group spacing="sm">
                  <IconUser size={16} />
                  <div>
                    <Text size="sm" weight={500}>{user.name}</Text>
                    <Text size="xs" color="dimmed">{user.runescape_name}</Text>
                  </div>
                </Group>
              </td>
              <td>
                <Text size="sm">{user.email}</Text>
              </td>
              <td>
                <Select
                  size="xs"
                  value={user.role}
                  onChange={(value) => handleUpdateRole(user.id, value)}
                  data={[
                    { value: 'user', label: 'User' },
                    { value: 'moderator', label: 'Moderator' },
                    { value: 'admin', label: 'Admin' }
                  ]}
                  disabled={user.id === 1} // Don't allow changing main admin
                />
              </td>
              <td>
                <Text size="xs">{user.approved_at?.toLocaleDateString()}</Text>
              </td>
              <td>
                <Badge color={user.access ? 'green' : 'red'} size="sm">
                  {user.access ? 'Active' : 'Suspended'}
                </Badge>
              </td>
              <td>
                <Group spacing="xs">
                  {user.id !== 1 && ( // Don't allow revoking main admin
                    <ActionIcon
                      color="red"
                      onClick={() => handleRevokeAccess(user.id)}
                      title="Revoke Access"
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  )}
                  <ActionIcon
                    color="blue"
                    onClick={() => handleSendEmail(user)}
                    title="Send Email"
                  >
                    <IconMail size={16} />
                  </ActionIcon>
                </Group>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  )

  return (
    <>
      <Modal
        opened={emailModalOpened}
        onClose={() => setEmailModalOpened(false)}
        title="Send Email Notification"
        size="lg"
      >
        <Stack spacing="md">
          <TextInput
            label="To"
            value={selectedUser?.email ?? ''}
            disabled
          />
          <TextInput
            label="Subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value ?? '')}
          />
          <Textarea
            label="Message"
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value ?? '')}
            minRows={6}
          />
          <Group position="right">
            <Button variant="outline" onClick={() => setEmailModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={sendNotificationEmail}>
              Send Email
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Box sx={{ py: 4 }}>
        <Group position="apart" mb="xl">
          <div>
            <Title order={2} color="white">
              <IconShield size={28} style={{ marginRight: 8 }} />
              Admin Panel
            </Title>
            <Text size="sm" color="rgba(255, 255, 255, 0.7)">
              Manage user access, permissions, and account approvals
            </Text>
          </div>
          <Badge color="red" size="lg" leftIcon={<IconShield size={16} />}>
            Administrator Access
          </Badge>
        </Group>

        <Alert
          icon={<IconAlertCircle size={16} />}
          color="yellow"
          variant="light"
          mb="md"
        >
          <Text size="sm">
            <strong>Security Notice:</strong> All user management actions are logged.
            Only approve users you trust and verify their identity when possible.
          </Text>
        </Alert>

        <Tabs value={activeTab} onTabChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="pending" icon={<IconClock size={16} />}>
              Pending Requests ({pendingUsers.length})
            </Tabs.Tab>
            <Tabs.Tab value="approved" icon={<IconUsers size={16} />}>
              Approved Users ({approvedUsers.length})
            </Tabs.Tab>
            <Tabs.Tab value="settings" icon={<IconSettings size={16} />}>
              System Settings
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="pending" pt="md">
            <Stack spacing="md">
              <div>
                <Text size="lg" weight={500} mb="xs" color="white">
                  Pending User Approvals
                </Text>
                <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                  Review and approve new user registrations
                </Text>
              </div>
              <PendingUsersTable />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="approved" pt="md">
            <Stack spacing="md">
              <div>
                <Text size="lg" weight={500} mb="xs" color="white">
                  User Management
                </Text>
                <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                  Manage existing user accounts, roles, and permissions
                </Text>
              </div>
              <ApprovedUsersTable />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="settings" pt="md">
            <Stack spacing="md">
              <div>
                <Text size="lg" weight={500} mb="xs" color="white">
                  System Configuration
                </Text>
                <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                  Configure system-wide settings and security options
                </Text>
              </div>
              <Card withBorder p="xl">
                <Text align="center" color="dimmed" py="xl">
                  System settings coming soon...
                </Text>
              </Card>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Group position="center" mt="md">
          <Button
            variant="light"
            size="md"
            leftIcon={<IconMathSymbols size={18} />}
            onClick={() => navigate('/admin/formulas')}
            style={{ height: 60 }}
          >
            <div style={{ textAlign: 'left' }}>
              <Text weight={500}>Formula Documentation</Text>
              <Text size="xs" color="dimmed">Trading formulas & calculations</Text>
            </div>
          </Button>

          <Button
            variant="light"
            size="md"
            leftIcon={<IconClock size={18} />}
            onClick={() => navigate('/admin/cron-jobs')}
            style={{ height: 60 }}
          >
            <div style={{ textAlign: 'left' }}>
              <Text weight={500}>Cron Jobs</Text>
              <Text size="xs" color="dimmed">Monitor automated tasks</Text>
            </div>
          </Button>
        </Group>
      </Box>
    </>
  )
}

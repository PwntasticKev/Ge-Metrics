import React, { useState } from 'react'
import {
  Box,
  Center,
  Loader,
  Group,
  Text,
  Badge,
  Card,
  Alert,
  Button,
  Modal,
  Textarea,
  Stack,
  Title,
  Container,
  Tabs,
  ActionIcon,
  Tooltip
} from '@mantine/core'
import {
  IconClock,
  IconRefresh,
  IconInfoCircle,
  IconCheck,
  IconX,
  IconEye,
  IconUsers,
  IconShield
} from '@tabler/icons-react'
import { trpc } from '../../utils/trpc.jsx'
import { showNotification } from '@mantine/notifications'
import { getRelativeTime } from '../../utils/utils.jsx'
import ItemData from '../../utils/item-data.jsx'
import MoneyMakingMethodsTable from '../MoneyMakingMethods/components/MoneyMakingMethodsTable.jsx'

export default function AdminMoneyMakingMethods() {
  const { items } = ItemData()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [activeTab, setActiveTab] = useState('pending')
  
  // Fetch pending methods
  const { 
    data: pendingMethods, 
    isLoading: pendingLoading, 
    error: pendingError, 
    refetch: refetchPending 
  } = trpc.moneyMakingMethods.getPendingMethods.useQuery({
    limit: 50,
    offset: 0
  })

  // Fetch all methods for admin overview
  const { 
    data: allMethods, 
    isLoading: allLoading, 
    error: allError, 
    refetch: refetchAll 
  } = trpc.moneyMakingMethods.getAllMethodsForReview.useQuery({
    limit: 100,
    offset: 0,
    status: 'all'
  })

  // Get admin stats
  const { data: adminStats } = trpc.moneyMakingMethods.getAdminStats.useQuery()

  // Approval mutation
  const approveMethodMutation = trpc.moneyMakingMethods.approveMethod.useMutation({
    onSuccess: (data) => {
      showNotification({
        title: 'Success',
        message: data.message || 'Method approved successfully',
        color: 'green'
      })
      refetchPending()
      refetchAll()
      setApprovalModalOpen(false)
      setSelectedMethod(null)
    },
    onError: (error) => {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  })

  // Rejection mutation
  const rejectMethodMutation = trpc.moneyMakingMethods.rejectMethod.useMutation({
    onSuccess: (data) => {
      showNotification({
        title: 'Success', 
        message: data.message || 'Method rejected',
        color: 'green'
      })
      refetchPending()
      refetchAll()
      setRejectionModalOpen(false)
      setSelectedMethod(null)
      setRejectionReason('')
    },
    onError: (error) => {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  })

  // Delete method mutation (admin only)
  const deleteMethodMutation = trpc.moneyMakingMethods.deleteMethodGlobally.useMutation({
    onSuccess: () => {
      showNotification({
        title: 'Success',
        message: 'Method deleted successfully',
        color: 'green'
      })
      refetchPending()
      refetchAll()
    },
    onError: (error) => {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  })

  // Update current time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleApproveMethod = (method) => {
    setSelectedMethod(method)
    setApprovalModalOpen(true)
  }

  const handleRejectMethod = (method) => {
    setSelectedMethod(method)
    setRejectionModalOpen(true)
  }

  const handleDeleteMethod = async (methodId) => {
    if (window.confirm('Are you sure you want to permanently delete this method? This action cannot be undone.')) {
      await deleteMethodMutation.mutateAsync({ id: methodId })
    }
  }

  const confirmApproval = async () => {
    if (!selectedMethod) return
    await approveMethodMutation.mutateAsync({ 
      id: selectedMethod.id
    })
  }

  const confirmRejection = async () => {
    if (!selectedMethod || !rejectionReason.trim()) {
      showNotification({
        title: 'Error',
        message: 'Please provide a rejection reason',
        color: 'red'
      })
      return
    }
    await rejectMethodMutation.mutateAsync({ 
      id: selectedMethod.id,
      rejectionReason: rejectionReason.trim()
    })
  }

  // Custom actions for approval workflow
  const getCustomActions = (method) => {
    if (method.status === 'pending') {
      return (
        <Group spacing="xs">
          <Tooltip label="Approve method">
            <ActionIcon
              color="green"
              variant="filled"
              size="sm"
              onClick={() => handleApproveMethod(method)}
            >
              <IconCheck size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Reject method">
            <ActionIcon
              color="red"
              variant="filled"
              size="sm"
              onClick={() => handleRejectMethod(method)}
            >
              <IconX size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )
    }
    return null
  }

  if (pendingLoading && allLoading) {
    return (
      <Container size="xl" py="md">
        <Center style={{ height: '50vh' }}>
          <Loader size="lg" />
        </Center>
      </Container>
    )
  }

  const pendingCount = adminStats?.pending || pendingMethods?.length || 0
  const approvedCount = adminStats?.approved || 0
  const rejectedCount = adminStats?.rejected || 0
  const totalCount = adminStats?.total || 0

  return (
    <Container size="xl" py="md">
      <Stack spacing="lg">
        {/* Header */}
        <Group position="apart">
          <div>
            <Title order={2}>Admin: Money Making Methods</Title>
            <Text color="dimmed" size="sm">
              Review and manage community-submitted money making methods
            </Text>
          </div>
          <Group>
            <Badge color="blue" size="lg">
              <Group spacing="xs">
                <IconClock size={14} />
                <span>{getRelativeTime(new Date(), currentTime)}</span>
              </Group>
            </Badge>
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => {
                refetchPending()
                refetchAll()
              }}
              loading={pendingLoading || allLoading}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Group>
        </Group>

        {/* Stats Cards */}
        <Group>
          <Card withBorder>
            <Group spacing="xs">
              <IconClock size={20} color="orange" />
              <div>
                <Text size="sm" color="dimmed">Pending Review</Text>
                <Text weight={600} size="lg">{pendingCount}</Text>
              </div>
            </Group>
          </Card>
          
          <Card withBorder>
            <Group spacing="xs">
              <IconCheck size={20} color="green" />
              <div>
                <Text size="sm" color="dimmed">Approved</Text>
                <Text weight={600} size="lg">{approvedCount}</Text>
              </div>
            </Group>
          </Card>

          <Card withBorder>
            <Group spacing="xs">
              <IconX size={20} color="red" />
              <div>
                <Text size="sm" color="dimmed">Rejected</Text>
                <Text weight={600} size="lg">{rejectedCount}</Text>
              </div>
            </Group>
          </Card>

          <Card withBorder>
            <Group spacing="xs">
              <IconUsers size={20} color="blue" />
              <div>
                <Text size="sm" color="dimmed">Total Methods</Text>
                <Text weight={600} size="lg">{totalCount}</Text>
              </div>
            </Group>
          </Card>
        </Group>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onTabChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="pending" icon={<IconClock size={14} />}>
              Pending Review ({pendingCount})
            </Tabs.Tab>
            <Tabs.Tab value="all" icon={<IconEye size={14} />}>
              All Methods ({totalCount})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="pending" pt="md">
            {pendingError ? (
              <Alert color="red" icon={<IconInfoCircle size={16} />}>
                Error loading pending methods: {pendingError.message}
              </Alert>
            ) : pendingMethods && pendingMethods.length > 0 ? (
              <MoneyMakingMethodsTable
                methods={pendingMethods}
                onEdit={() => {}} // No edit in admin panel
                onDelete={handleDeleteMethod}
                showActions={true}
                showUser={true}
                customActions={getCustomActions}
              />
            ) : (
              <Card withBorder py="xl">
                <Center>
                  <Stack align="center" spacing="md">
                    <IconCheck size={48} color="green" />
                    <div style={{ textAlign: 'center' }}>
                      <Text weight={600} size="lg">No pending methods</Text>
                      <Text color="dimmed" size="sm">
                        All methods have been reviewed
                      </Text>
                    </div>
                  </Stack>
                </Center>
              </Card>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="all" pt="md">
            {allError ? (
              <Alert color="red" icon={<IconInfoCircle size={16} />}>
                Error loading methods: {allError.message}
              </Alert>
            ) : allMethods && allMethods.length > 0 ? (
              <MoneyMakingMethodsTable
                methods={allMethods}
                onEdit={() => {}} // No edit in admin panel
                onDelete={handleDeleteMethod}
                showActions={true}
                showUser={true}
                customActions={getCustomActions}
              />
            ) : (
              <Card withBorder py="xl">
                <Center>
                  <Stack align="center" spacing="md">
                    <IconShield size={48} color="gray" />
                    <div style={{ textAlign: 'center' }}>
                      <Text weight={600} size="lg">No methods found</Text>
                      <Text color="dimmed" size="sm">
                        No money making methods have been created yet
                      </Text>
                    </div>
                  </Stack>
                </Center>
              </Card>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Approval Modal */}
      <Modal
        opened={approvalModalOpen}
        onClose={() => {
          setApprovalModalOpen(false)
          setSelectedMethod(null)
        }}
        title="Approve Method"
        centered
      >
        <Stack spacing="md">
          {selectedMethod && (
            <div>
              <Text weight={500}>Method: {selectedMethod.methodName}</Text>
              <Text size="sm" color="dimmed">By: @{selectedMethod.username}</Text>
              <Text size="sm" color="dimmed" mt="xs">
                {selectedMethod.description}
              </Text>
            </div>
          )}
          
          <Alert color="green" icon={<IconInfoCircle size={16} />}>
            <Text size="sm">
              Approving this method will make it visible in the global money making methods 
              and available to all users.
            </Text>
          </Alert>

          <Group position="right">
            <Button variant="subtle" onClick={() => setApprovalModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              color="green"
              onClick={confirmApproval}
              loading={approveMethodMutation.isLoading}
            >
              Approve Method
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        opened={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false)
          setSelectedMethod(null)
          setRejectionReason('')
        }}
        title="Reject Method"
        centered
      >
        <Stack spacing="md">
          {selectedMethod && (
            <div>
              <Text weight={500}>Method: {selectedMethod.methodName}</Text>
              <Text size="sm" color="dimmed">By: @{selectedMethod.username}</Text>
              <Text size="sm" color="dimmed" mt="xs">
                {selectedMethod.description}
              </Text>
            </div>
          )}
          
          <div>
            <Text size="sm" weight={500} mb="xs">
              Rejection Reason *
            </Text>
            <Textarea
              placeholder="Please provide a clear reason for rejecting this method..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              minRows={3}
              maxRows={6}
              required
            />
          </div>

          <Alert color="red" icon={<IconInfoCircle size={16} />}>
            <Text size="sm">
              The user will be notified of the rejection and can see your feedback 
              to improve their submission.
            </Text>
          </Alert>

          <Group position="right">
            <Button variant="subtle" onClick={() => setRejectionModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              color="red"
              onClick={confirmRejection}
              loading={rejectMethodMutation.isLoading}
              disabled={!rejectionReason.trim()}
            >
              Reject Method
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}
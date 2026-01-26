import {
  Box,
  Center,
  Loader,
  Group,
  Text,
  Badge,
  Card,
  Button,
  Modal,
  Alert,
  ActionIcon,
  Tooltip,
  Title,
  Stack,
  Container,
  Tabs
} from '@mantine/core'
import { IconClock, IconRefresh, IconPlus, IconInfoCircle, IconEdit, IconTrash, IconCoin, IconTrashX } from '@tabler/icons-react'
import React, { useState } from 'react'
import { trpc } from '../../utils/trpc.jsx'
import PremiumPageWrapper from '../../components/PremiumPageWrapper'
import { showNotification } from '@mantine/notifications'
import { getRelativeTime, formatNumber } from '../../utils/utils.jsx'
import ItemData from '../../utils/item-data.jsx'
import MoneyMakingMethodCreationModal from './components/MoneyMakingMethodCreationModal.jsx'
import MoneyMakingMethodEditModal from './components/MoneyMakingMethodEditModal.jsx'
import MoneyMakingMethodsTable from './components/MoneyMakingMethodsTable.jsx'
import TrashMethodsView from './components/TrashMethodsView.jsx'
import { useMethodTrashScoring } from '../../hooks/useMethodTrashScoring.js'

export default function UserMoneyMakingMethods() {
  const { items, mapStatus, priceStatus } = ItemData()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [creationModalOpen, setCreationModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [activeTab, setActiveTab] = useState('methods')
  
  // Get method trash scoring functionality
  const { hasUserVoted, isTrash } = useMethodTrashScoring()
  
  // Fetch user's own money making methods
  const { 
    data: userMethods, 
    isLoading, 
    error, 
    refetch: refetchMethods 
  } = trpc.moneyMakingMethods.getUserMethods.useQuery({
    limit: 30,
    offset: 0,
    status: 'all'
  })

  // Delete method mutation
  const deleteMethodMutation = trpc.moneyMakingMethods.deleteMethod.useMutation({
    onSuccess: () => {
      showNotification({
        title: 'Success',
        message: 'Money making method deleted successfully',
        color: 'green'
      })
      refetchMethods()
    },
    onError: (error) => {
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to delete method',
        color: 'red'
      })
    }
  })

  const handleMethodCreated = () => {
    setCreationModalOpen(false)
    refetchMethods()
  }

  const handleMethodUpdated = () => {
    setEditModalOpen(false)
    setSelectedMethod(null)
    refetchMethods()
  }

  const handleEditMethod = (method) => {
    setSelectedMethod(method)
    setEditModalOpen(true)
  }

  const handleDeleteMethod = (methodId) => {
    if (window.confirm('Are you sure you want to delete this method? This action cannot be undone.')) {
      deleteMethodMutation.mutate({ id: methodId })
    }
  }

  const formatProfitPerHour = (profit) => {
    if (!profit || profit === 0) return 'Calculating...'
    return formatNumber(profit) + ' gp/hr'
  }

  const getStatusBadge = (status, isGlobal) => {
    if (status === 'approved' && isGlobal) {
      return <Badge color="green" variant="filled">Global</Badge>
    }
    if (status === 'approved') {
      return <Badge color="blue" variant="filled">Approved</Badge>
    }
    if (status === 'pending') {
      return <Badge color="orange" variant="filled">Pending Review</Badge>
    }
    if (status === 'rejected') {
      return <Badge color="red" variant="filled">Rejected</Badge>
    }
    return <Badge color="gray" variant="filled">{status}</Badge>
  }

  // Filter out methods that the user has marked as trash
  const filteredMethods = userMethods?.filter(method => 
    !hasUserVoted(method.id) && !isTrash(method.id)
  ) || []

  if (isLoading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Loader size="lg" />
      </Center>
    )
  }

  if (error) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" title="Error loading methods">
          {error.message}
        </Alert>
      </Container>
    )
  }

  return (
    <PremiumPageWrapper>
      <Container size="xl" py="md">
        <Stack spacing="lg">
          {/* Header */}
          <Group position="apart">
            <div>
              <Title order={2}>My Money Making Methods</Title>
              <Text color="dimmed" size="sm">
                Create and manage your OSRS profit methods. Submit for global approval to share with the community.
              </Text>
            </div>
            <Group>
              <Button
                leftIcon={<IconPlus size={14} />}
                onClick={() => setCreationModalOpen(true)}
                variant="filled"
              >
                Create Method
              </Button>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => refetchMethods()}
                loading={isLoading}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Group>
          </Group>

          {/* Summary Cards */}
          <Group>
            <Card withBorder>
              <Group spacing="xs">
                <IconCoin size={20} color="orange" />
                <div>
                  <Text size="sm" color="dimmed">Total Methods</Text>
                  <Text weight={600}>{filteredMethods?.length || 0}</Text>
                </div>
              </Group>
            </Card>
            
            <Card withBorder>
              <Group spacing="xs">
                <IconInfoCircle size={20} color="green" />
                <div>
                  <Text size="sm" color="dimmed">Approved</Text>
                  <Text weight={600}>
                    {filteredMethods?.filter(m => m.status === 'approved').length || 0}
                  </Text>
                </div>
              </Group>
            </Card>

            <Card withBorder>
              <Group spacing="xs">
                <IconClock size={20} color="blue" />
                <div>
                  <Text size="sm" color="dimmed">Pending</Text>
                  <Text weight={600}>
                    {filteredMethods?.filter(m => m.status === 'pending').length || 0}
                  </Text>
                </div>
              </Group>
            </Card>
          </Group>

          {/* Tabs for Methods and Trash */}
          <Tabs value={activeTab} onTabChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="methods" icon={<IconCoin size={14} />}>
                My Methods
              </Tabs.Tab>
              <Tabs.Tab value="trash" icon={<IconTrashX size={14} />} color="orange">
                Trash
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="methods" pt="md">
              {filteredMethods && filteredMethods.length > 0 ? (
                <MoneyMakingMethodsTable
                  methods={filteredMethods}
                  onEdit={handleEditMethod}
                  onDelete={handleDeleteMethod}
                  showActions={true}
                />
              ) : (
                <Card withBorder py="xl">
                  <Center>
                    <Stack align="center" spacing="md">
                      <IconCoin size={48} color="gray" />
                      <div style={{ textAlign: 'center' }}>
                        <Text weight={600} size="lg">No methods created yet</Text>
                        <Text color="dimmed" size="sm">
                          Create your first money making method to get started
                        </Text>
                      </div>
                      <Button
                        leftIcon={<IconPlus size={14} />}
                        onClick={() => setCreationModalOpen(true)}
                      >
                        Create Your First Method
                      </Button>
                    </Stack>
                  </Center>
                </Card>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="trash" pt="md">
              <TrashMethodsView />
            </Tabs.Panel>
          </Tabs>
        </Stack>

        {/* Modals */}
        <MoneyMakingMethodCreationModal
          opened={creationModalOpen}
          onClose={() => setCreationModalOpen(false)}
          onMethodCreated={handleMethodCreated}
          items={items}
        />

        <MoneyMakingMethodEditModal
          opened={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedMethod(null)
          }}
          onMethodUpdated={handleMethodUpdated}
          method={selectedMethod}
          items={items}
        />
      </Container>
    </PremiumPageWrapper>
  )
}
import React, { useState } from 'react'
import {
  Box,
  Card,
  Table,
  Text,
  Button,
  Group,
  Badge,
  ActionIcon,
  Center,
  Loader,
  Alert,
  Stack,
  Title,
  Tooltip,
  TextInput,
  Select,
  Pagination
} from '@mantine/core'
import {
  IconTrash,
  IconAlertTriangle,
  IconCheck,
  IconRefresh,
  IconSearch,
  IconShield
} from '@tabler/icons-react'
import { trpc } from '../../../utils/trpc.jsx'
import { showNotification } from '@mantine/notifications'
import { useMediaQuery } from '@mantine/hooks'

export default function AdminTrashManagement() {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('percentage')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(25)
  
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  // Get global trash statistics
  const {
    data: trashStats,
    isLoading,
    refetch,
    error
  } = trpc.trash.getGlobalTrashStats.useQuery(undefined, {
    refetchOnWindowFocus: false
  })

  // Clear votes and allow re-voting mutation
  const clearVotesAllowRevoteMutation = trpc.trash.clearVotesAllowRevote.useMutation({
    onSuccess: () => {
      showNotification({
        title: 'Success',
        message: 'All trash votes cleared. Users can vote again.',
        color: 'green'
      })
      refetch()
    },
    onError: (error) => {
      showNotification({
        title: 'Error',
        message: `Failed to clear votes: ${error.message}`,
        color: 'red'
      })
    }
  })
  
  // Block voting mutation
  const blockVotingMutation = trpc.trash.blockVoting.useMutation({
    onSuccess: () => {
      showNotification({
        title: 'Success',
        message: 'Item marked as clean. Future voting blocked.',
        color: 'blue'
      })
      refetch()
    },
    onError: (error) => {
      showNotification({
        title: 'Error',
        message: `Failed to block voting: ${error.message}`,
        color: 'red'
      })
    }
  })

  const handleClearVotesAllowRevote = async (itemId, itemName) => {
    if (window.confirm(`Clear all trash votes for "${itemName}"? Users will be able to vote again.`)) {
      await clearVotesAllowRevoteMutation.mutateAsync({ itemId })
    }
  }
  
  const handleBlockVoting = async (itemId, itemName) => {
    if (window.confirm(`Block all future voting for "${itemName}"? This will permanently mark the item as clean.`)) {
      await blockVotingMutation.mutateAsync({ itemId })
    }
  }

  const handleRefresh = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <Center style={{ height: 400 }}>
        <Loader size="lg" />
      </Center>
    )
  }

  if (error) {
    return (
      <Alert color="red" icon={<IconAlertTriangle size={16} />}>
        Failed to load trash management data: {error.message}
      </Alert>
    )
  }

  if (!trashStats) {
    return (
      <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
        No trash data available
      </Alert>
    )
  }

  // Filter and sort items
  const filteredItems = trashStats.itemsWithTrash
    .filter(item => 
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.itemId.toString().includes(search)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'percentage':
          return b.trashPercentage - a.trashPercentage
        case 'votes':
          return b.trashCount - a.trashCount
        case 'name':
          return a.itemName.localeCompare(b.itemName)
        default:
          return 0
      }
    })

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage)

  const getBadgeColor = (percentage) => {
    if (percentage >= 50) return 'red'
    if (percentage >= 25) return 'orange'
    if (percentage >= 10) return 'yellow'
    return 'blue'
  }

  return (
    <Box p="md">
      <Stack spacing="md">
        {/* Header */}
        <Group position="apart" align="flex-end">
          <div>
            <Title order={2}>Global Trash Management</Title>
            <Text size="sm" color="dimmed">
              Manage items that users have marked as unreliable or problematic
            </Text>
          </div>
          <Button
            leftIcon={<IconRefresh size={16} />}
            onClick={handleRefresh}
            loading={clearVotesAllowRevoteMutation.isLoading || blockVotingMutation.isLoading}
          >
            Refresh
          </Button>
        </Group>

        {/* Statistics */}
        <Card withBorder p="md">
          <Group spacing="xl">
            <div>
              <Text size="sm" color="dimmed">Total Users</Text>
              <Text size="lg" weight={500}>{trashStats.totalUsers.toLocaleString()}</Text>
            </div>
            <div>
              <Text size="sm" color="dimmed">Items with Trash Votes</Text>
              <Text size="lg" weight={500}>{trashStats.itemsWithTrash.length.toLocaleString()}</Text>
            </div>
            <div>
              <Text size="sm" color="dimmed">High Risk Items (>50%)</Text>
              <Text size="lg" weight={500} color="red">
                {trashStats.itemsWithTrash.filter(item => item.trashPercentage >= 50).length}
              </Text>
            </div>
            <div>
              <Text size="sm" color="dimmed">Warning Items (25-50%)</Text>
              <Text size="lg" weight={500} color="orange">
                {trashStats.itemsWithTrash.filter(item => item.trashPercentage >= 25 && item.trashPercentage < 50).length}
              </Text>
            </div>
          </Group>
        </Card>

        {/* Filters */}
        <Card withBorder p="md">
          <Group spacing="md" align="flex-end">
            <TextInput
              label="Search Items"
              placeholder="Search by item name or ID..."
              icon={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flexGrow: 1 }}
            />
            <Select
              label="Sort By"
              value={sortBy}
              onChange={setSortBy}
              data={[
                { value: 'percentage', label: 'Trash Percentage' },
                { value: 'votes', label: 'Vote Count' },
                { value: 'name', label: 'Item Name' }
              ]}
              style={{ minWidth: 150 }}
            />
          </Group>
        </Card>

        {/* Items Table */}
        <Card withBorder p={0}>
          <Table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Trash Votes</th>
                <th>Percentage</th>
                <th>Risk Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <tr key={item.itemId}>
                    <td>
                      <div>
                        <Text size="sm" weight={500}>
                          {item.itemName}
                        </Text>
                        <Text size="xs" color="dimmed">
                          ID: {item.itemId}
                        </Text>
                      </div>
                    </td>
                    <td>
                      <Text size="sm">
                        {item.trashCount} / {trashStats.totalUsers}
                      </Text>
                    </td>
                    <td>
                      <Text size="sm" weight={500}>
                        {item.trashPercentage.toFixed(1)}%
                      </Text>
                    </td>
                    <td>
                      <Badge
                        color={getBadgeColor(item.trashPercentage)}
                        variant="light"
                        size="sm"
                      >
                        {item.trashPercentage >= 50 ? 'HIGH RISK' : 
                         item.trashPercentage >= 25 ? 'WARNING' : 
                         item.trashPercentage >= 10 ? 'CAUTION' : 'LOW'}
                      </Badge>
                    </td>
                    <td>
                      <Group spacing="xs">
                        <Tooltip label="Clear votes (allow re-voting)">
                          <ActionIcon
                            color="yellow"
                            variant="light"
                            onClick={() => handleClearVotesAllowRevote(item.itemId, item.itemName)}
                            loading={clearVotesAllowRevoteMutation.isLoading}
                            size={isMobile ? 'sm' : 'md'}
                          >
                            <IconRefresh size={isMobile ? 14 : 16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Block all future votes">
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => handleBlockVoting(item.itemId, item.itemName)}
                            loading={blockVotingMutation.isLoading}
                            size={isMobile ? 'sm' : 'md'}
                          >
                            <IconShield size={isMobile ? 14 : 16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <Center py="xl">
                      <Text color="dimmed">
                        {search ? 'No items match your search' : 'No items have been marked as trash'}
                      </Text>
                    </Center>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <Group position="center" p="md">
              <Pagination
                value={currentPage}
                onChange={setCurrentPage}
                total={totalPages}
                size="sm"
              />
            </Group>
          )}
        </Card>
      </Stack>
    </Box>
  )
}
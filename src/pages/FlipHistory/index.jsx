import React, { useState } from 'react'
import {
  Box,
  Card,
  Title,
  Text,
  Group,
  Badge,
  Button,
  Stack,
  Table,
  Pagination,
  Select,
  TextInput,
  ActionIcon,
  Modal,
  NumberInput,
  Textarea,
  Center,
  Loader,
  Alert
} from '@mantine/core'
import {
  IconPlus,
  IconTrash,
  IconSearch,
  IconTrendingUp,
  IconTrendingDown,
  IconCalendar,
  IconCoin,
  IconActivity
} from '@tabler/icons-react'
import { useAuth } from '../../hooks/useAuth'
import { trpc } from '../../utils/trpc.jsx'
import { getRelativeTime } from '../../utils/utils'

export default function FlipHistory() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [addModalOpen, setAddModalOpen] = useState(false)
  
  // Form state for adding flips
  const [formData, setFormData] = useState({
    itemName: '',
    itemId: '',
    flipType: 'buy',
    quantity: 1,
    price: 0,
    profit: 0,
    notes: ''
  })

  // Queries
  const { data: flips, isLoading, refetch } = trpc.flips.getFlips.useQuery({
    limit,
    offset: (page - 1) * limit
  })

  const { data: stats } = trpc.flips.getFlipStats.useQuery()

  // Mutations
  const addFlipMutation = trpc.flips.addFlip.useMutation({
    onSuccess: () => {
      refetch()
      setAddModalOpen(false)
      setFormData({
        itemName: '',
        itemId: '',
        flipType: 'buy',
        quantity: 1,
        price: 0,
        profit: 0,
        notes: ''
      })
    }
  })

  const deleteFlipMutation = trpc.flips.deleteFlip.useMutation({
    onSuccess: () => {
      refetch()
    }
  })

  const handleAddFlip = () => {
    addFlipMutation.mutate({
      itemId: formData.itemId || formData.itemName.toLowerCase().replace(/\s+/g, '_'),
      itemName: formData.itemName,
      flipType: formData.flipType,
      quantity: formData.quantity,
      price: formData.price,
      profit: formData.profit,
      notes: formData.notes
    })
  }

  const handleDeleteFlip = (id) => {
    deleteFlipMutation.mutate({ id })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US').format(value || 0)
  }

  const filteredFlips = flips?.filter(flip => {
    const matchesSearch = !searchTerm || 
      flip.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flip.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = typeFilter === 'all' || flip.transactionType === typeFilter
    
    return matchesSearch && matchesType
  }) || []

  if (isLoading) {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    )
  }

  return (
    <Box p="md">
      {/* Header with Stats */}
      <Card withBorder radius="md" mb="lg" p="xl">
        <Group position="apart" mb="md">
          <div>
            <Title order={2}>Flip History</Title>
            <Text size="sm" color="dimmed">
              Track your flipping performance and analyze profit trends
            </Text>
          </div>
          <Button 
            leftIcon={<IconPlus size={16} />}
            onClick={() => setAddModalOpen(true)}
          >
            Add Flip
          </Button>
        </Group>

        {/* Quick Stats */}
        <Group spacing="xl">
          <div>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Total Profit
            </Text>
            <Text size="xl" weight={700} color={stats?.totalProfit >= 0 ? 'green' : 'red'}>
              {formatCurrency(stats?.totalProfit)} GP
            </Text>
          </div>
          <div>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Total Flips
            </Text>
            <Text size="xl" weight={700}>
              {stats?.totalFlips}
            </Text>
          </div>
          <div>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Avg Profit/Flip
            </Text>
            <Text size="xl" weight={700} color={stats?.avgProfit >= 0 ? 'green' : 'red'}>
              {formatCurrency(Math.round(stats?.avgProfit || 0))} GP
            </Text>
          </div>
          <div>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Best Trade
            </Text>
            <Text size="xl" weight={700} color="green">
              {formatCurrency(stats?.bestTrade)} GP
            </Text>
          </div>
        </Group>
      </Card>

      {/* Filters */}
      <Card withBorder radius="md" mb="md" p="md">
        <Group spacing="md">
          <TextInput
            placeholder="Search flips..."
            leftIcon={<IconSearch size={16} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            data={[
              { value: 'all', label: 'All Types' },
              { value: 'buy', label: 'Buys' },
              { value: 'sell', label: 'Sells' }
            ]}
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 150 }}
          />
        </Group>
      </Card>

      {/* Flips Table */}
      <Card withBorder radius="md">
        {filteredFlips.length === 0 ? (
          <Center p="xl">
            <Stack align="center">
              <IconActivity size={48} color="gray" />
              <Text color="dimmed">No flips found</Text>
              <Button 
                variant="light" 
                leftIcon={<IconPlus size={16} />}
                onClick={() => setAddModalOpen(true)}
              >
                Add your first flip
              </Button>
            </Stack>
          </Center>
        ) : (
          <>
            <Table striped highlightOnHover>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Profit/Loss</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlips.map((flip) => (
                  <tr key={flip.id}>
                    <td>
                      <Text weight={500}>{flip.itemName}</Text>
                      {flip.notes && (
                        <Text size="xs" color="dimmed">{flip.notes}</Text>
                      )}
                    </td>
                    <td>
                      <Badge 
                        color={flip.transactionType === 'buy' ? 'blue' : 'green'}
                        variant="light"
                        leftIcon={flip.transactionType === 'buy' ? 
                          <IconTrendingDown size={12} /> : 
                          <IconTrendingUp size={12} />
                        }
                      >
                        {flip.transactionType.toUpperCase()}
                      </Badge>
                    </td>
                    <td>{formatCurrency(flip.quantity)}</td>
                    <td>{formatCurrency(flip.price)} GP</td>
                    <td>
                      <Text 
                        color={flip.profit >= 0 ? 'green' : 'red'}
                        weight={500}
                      >
                        {flip.profit >= 0 ? '+' : ''}{formatCurrency(flip.profit)} GP
                      </Text>
                    </td>
                    <td>
                      <Text size="sm" color="dimmed">
                        {getRelativeTime(flip.createdAt)}
                      </Text>
                    </td>
                    <td>
                      <ActionIcon 
                        color="red" 
                        variant="subtle"
                        onClick={() => handleDeleteFlip(flip.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* Pagination */}
            {flips && flips.length === limit && (
              <Group position="center" mt="md">
                <Pagination 
                  value={page} 
                  onChange={setPage}
                  total={Math.ceil((stats?.totalFlips || 0) / limit)}
                />
              </Group>
            )}
          </>
        )}
      </Card>

      {/* Add Flip Modal */}
      <Modal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Flip"
        size="md"
      >
        <Stack spacing="md">
          <TextInput
            label="Item Name"
            placeholder="Enter item name..."
            value={formData.itemName}
            onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
            required
          />
          
          <Select
            label="Flip Type"
            data={[
              { value: 'buy', label: 'Buy' },
              { value: 'sell', label: 'Sell' }
            ]}
            value={formData.flipType}
            onChange={(value) => setFormData({ ...formData, flipType: value })}
          />
          
          <NumberInput
            label="Quantity"
            placeholder="Enter quantity..."
            value={formData.quantity}
            onChange={(value) => setFormData({ ...formData, quantity: value || 1 })}
            min={1}
            required
          />
          
          <NumberInput
            label="Price (GP)"
            placeholder="Enter price per item..."
            value={formData.price}
            onChange={(value) => setFormData({ ...formData, price: value || 0 })}
            min={0}
            required
          />
          
          <NumberInput
            label="Profit/Loss (GP)"
            placeholder="Enter profit or loss..."
            value={formData.profit}
            onChange={(value) => setFormData({ ...formData, profit: value || 0 })}
          />
          
          <Textarea
            label="Notes (Optional)"
            placeholder="Add any notes about this flip..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            minRows={2}
          />
          
          <Group position="right" mt="md">
            <Button variant="subtle" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddFlip}
              loading={addFlipMutation.isLoading}
              disabled={!formData.itemName || formData.price <= 0}
            >
              Add Flip
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}
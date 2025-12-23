import React, { useState, useEffect, useRef, forwardRef } from 'react'
import {
  Box,
  Card,
  Title,
  Text,
  Group,
  Avatar,
  Badge,
  Button,
  Stack,
  SimpleGrid,
  Tabs,
  Progress,
  ActionIcon,
  Tooltip,
  Modal,
  TextInput,
  Select,
  NumberInput,
  Textarea,
  Divider,
  Alert,
  Center,
  Loader,
  ThemeIcon,
  Autocomplete,
  Image
} from '@mantine/core'
import { createChart, ColorType } from 'lightweight-charts'
import {
  IconCrown,
  IconTrophy,
  IconTarget,
  IconActivity,
  IconCoin,
  IconTrendingUp,
  IconTrendingDown,
  IconCalendar,
  IconUser,
  IconSettings,
  IconHistory,
  IconChartLine,
  IconPlus,
  IconExternalLink,
  IconShield,
  IconMail,
  IconBrandDiscord,
  IconEdit,
  IconBell,
  IconStar,
  IconInfoCircle
} from '@tabler/icons-react'
import { useAuth } from '../../hooks/useAuth'
import { trpc } from '../../utils/trpc.jsx'
import { getRelativeTime } from '../../utils/utils'
import { useNavigate } from 'react-router-dom'
import ItemData from '../../utils/item-data.jsx'

// Profit Chart Component using Lightweight Charts
function ProfitChart({ data, formatCurrency }) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#C1C2C5',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12
      },
      grid: {
        vertLines: { color: '#373A40', style: 1 },
        horzLines: { color: '#373A40', style: 1 }
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#339af0', width: 1, style: 1 },
        horzLine: { color: '#339af0', width: 1, style: 1 }
      },
      rightPriceScale: {
        borderColor: '#373A40'
      },
      timeScale: {
        borderColor: '#373A40',
        timeVisible: true,
        secondsVisible: false
      }
    })

    chartRef.current = chart

    const series = chart.addAreaSeries({
      lineColor: '#228be6',
      topColor: '#228be61a',
      bottomColor: '#228be600',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 0,
        minMove: 1
      }
    })

    seriesRef.current = series

    // Transform data: [{ date, profit }] -> [{ time, value }]
    const chartData = data.map(item => ({
      time: Math.floor(new Date(item.date).getTime() / 1000),
      value: item.profit || 0
    }))

    series.setData(chartData)

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [data])

  return (
    <div
      ref={chartContainerRef}
      style={{
        width: '100%',
        height: '300px'
      }}
    />
  )
}

export default function ProfileModern() {
  const { user, isSubscribed, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [addFlipOpen, setAddFlipOpen] = useState(false)
  const [editFlipOpen, setEditFlipOpen] = useState(false)
  const [editingFlip, setEditingFlip] = useState(null)
  
  // Get item data for autocomplete
  const { items } = ItemData()
  
  // Transaction form state
  const [flipForm, setFlipForm] = useState({
    itemId: '',
    itemName: '',
    quantity: 1,
    price: 0,
    profit: 0,
    notes: ''
  })
  
  // Hotkey handler for form submission
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        if (addFlipOpen && flipForm.itemName && flipForm.price > 0) {
          event.preventDefault()
          handleAddFlip()
        }
      }
    }
    
    if (addFlipOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [addFlipOpen, flipForm.itemName, flipForm.price])

  // TRPC utils for invalidating queries
  const utils = trpc.useUtils()

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.flips.getFlipStats.useQuery()
  const { data: recentFlips } = trpc.flips.getRecentFlips.useQuery({ limit: 5 })
  const { data: profitOverTime } = trpc.flips.getProfitOverTime.useQuery({ days: 30 })
  const { data: settings } = trpc.settings.get.useQuery()

  // Mutations
  const addFlipMutation = trpc.flips.addFlip.useMutation({
    onSuccess: () => {
      // Invalidate and refetch all flip-related queries for real-time updates
      utils.flips.getFlipStats.invalidate()
      utils.flips.getRecentFlips.invalidate()
      utils.flips.getProfitOverTime.invalidate()
    }
  })

  const updateFlipMutation = trpc.flips.updateFlip.useMutation({
    onSuccess: () => {
      // Invalidate and refetch all flip-related queries for real-time updates
      utils.flips.getFlipStats.invalidate()
      utils.flips.getRecentFlips.invalidate()
      utils.flips.getProfitOverTime.invalidate()
    }
  })

  const handleAddFlip = async () => {
    try {
      await addFlipMutation.mutateAsync({
        itemId: flipForm.itemId || flipForm.itemName.toLowerCase().replace(/\s+/g, '_'),
        itemName: flipForm.itemName,
        flipType: 'buy', // Default to buy since we're tracking profit
        quantity: flipForm.quantity,
        price: flipForm.price,
        profit: flipForm.profit,
        notes: flipForm.notes
      })
      setAddFlipOpen(false)
      setFlipForm({
        itemId: '',
        itemName: '',
        quantity: 1,
        price: 0,
        profit: 0,
        notes: ''
      })
    } catch (error) {
      console.error('Failed to add transaction:', error)
    }
  }

  const handleEditFlip = (flip) => {
    setEditingFlip(flip)
    setFlipForm({
      itemId: flip.itemId,
      itemName: flip.itemName,
      quantity: flip.quantity,
      price: flip.price,
      profit: flip.profit,
      notes: flip.notes || ''
    })
    setEditFlipOpen(true)
  }

  const handleUpdateFlip = async () => {
    try {
      await updateFlipMutation.mutateAsync({
        id: editingFlip.id,
        itemId: flipForm.itemName.toLowerCase().replace(/\s+/g, '_'),
        itemName: flipForm.itemName,
        flipType: flipForm.flipType,
        quantity: flipForm.quantity,
        price: flipForm.price,
        profit: flipForm.profit,
        notes: flipForm.notes
      })
      setEditFlipOpen(false)
      setEditingFlip(null)
      setFlipForm({
        itemName: '',
        flipType: 'buy',
        quantity: 1,
        price: 0,
        profit: 0,
        notes: ''
      })
    } catch (error) {
      console.error('Failed to update flip:', error)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US').format(value || 0)
  }
  
  // Autocomplete item component with forwardRef
  const AutocompleteItem = forwardRef(({ value, image, ...others }, ref) => (
    <div ref={ref} {...others}>
      <Group spacing="sm">
        <Image
          src={image}
          alt={value}
          width={24}
          height={24}
          fit="contain"
        />
        <Text>{value}</Text>
      </Group>
    </div>
  ))

  // Filter items for autocomplete
  const getFilteredItems = (query) => {
    if (!query || query.length < 2 || !items.length) return []
    
    return items
      .filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10) // Limit to 10 suggestions
      .map(item => ({
        value: item.name,
        image: item.img,
        id: item.id
      }))
  }

  const getMembershipInfo = () => {
    if (user?.role === 'admin') {
      return {
        icon: <IconShield size={16} />,
        label: 'ADMIN',
        color: 'violet',
        gradient: { from: 'violet', to: 'purple' }
      }
    }
    if (isSubscribed) {
      return {
        icon: <IconCrown size={16} />,
        label: 'PREMIUM',
        color: 'yellow',
        gradient: { from: 'gold', to: 'yellow' }
      }
    }
    return {
      icon: <IconUser size={16} />,
      label: 'FREE',
      color: 'gray',
      gradient: { from: 'gray', to: 'dark' }
    }
  }

  const membershipInfo = getMembershipInfo()
  const daysSinceJoined = user ? Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)) : 0

  if (statsLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    )
  }

  return (
    <Box p="md">
      {/* Profile Header */}
      <Card withBorder radius="md" p="xl" mb="lg" style={{ 
        background: `linear-gradient(135deg, ${membershipInfo.gradient.from} 0%, ${membershipInfo.gradient.to} 100%)`,
        color: 'white'
      }}>
        <Group position="apart">
          <Group spacing="xl">
            <Avatar 
              size="xl" 
              radius="xl"
              src={null}
              style={{ 
                border: '3px solid rgba(255, 255, 255, 0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }}
            >
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            
            <div>
              <Group spacing="md" align="center" mb="xs">
                <Title order={2} color="white">
                  {user?.username || 'Player'}
                </Title>
                <Group spacing={4}>
                  {membershipInfo.icon}
                  <Badge
                    variant="gradient"
                    gradient={membershipInfo.gradient}
                    size="lg"
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    {membershipInfo.label}
                  </Badge>
                </Group>
              </Group>
              
              <Text size="sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }} mb="xs">
                {user?.email} • Joined {daysSinceJoined} days ago
              </Text>
              
              <Group spacing="xs">
                <Badge variant="light" color="white" style={{ color: '#333' }}>
                  Trader
                </Badge>
                {stats?.totalFlips > 50 && (
                  <Badge variant="light" color="white" style={{ color: '#333' }}>
                    Active Trader
                  </Badge>
                )}
                {stats?.totalProfit > 10000000 && (
                  <Badge variant="light" color="white" style={{ color: '#333' }}>
                    High Roller
                  </Badge>
                )}
              </Group>
            </div>
          </Group>
          
          <Stack align="flex-end" spacing="xs">
            <Group spacing="xs">
              <ThemeIcon size="sm" color="white" variant="outline">
                <IconTrophy size={14} />
              </ThemeIcon>
              <Text size="lg" weight={700} color="white">
                {formatCurrency(stats?.totalProfit)} GP
              </Text>
            </Group>
            <Text size="xs" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Total Profit
            </Text>
          </Stack>
        </Group>
      </Card>

      {/* Quick Stats Grid */}
      <SimpleGrid cols={4} breakpoints={[{ maxWidth: 'sm', cols: 2 }]} mb="lg">
        <Card withBorder radius="md" p="md">
          <Group position="apart" mb="xs">
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Total Trades
            </Text>
            <IconActivity size={16} color="blue" />
          </Group>
          <Text size="xl" weight={700}>
            {stats?.totalFlips || 0}
          </Text>
          <Text size="xs" color="dimmed">
            All time flips
          </Text>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group position="apart" mb="xs">
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Avg Profit
            </Text>
            <IconTarget size={16} color="green" />
          </Group>
          <Text size="xl" weight={700} color="green">
            {formatCurrency(Math.round(stats?.avgProfit || 0))} GP
          </Text>
          <Text size="xs" color="dimmed">
            Per transaction
          </Text>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group position="apart" mb="xs">
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Best Profit
            </Text>
            <IconTrendingUp size={16} color="green" />
          </Group>
          <Text size="xl" weight={700} color="green">
            {formatCurrency(stats?.bestFlip || 0)} GP
          </Text>
          <Text size="xs" color="dimmed">
            Single transaction
          </Text>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group position="apart" mb="xs">
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Trading Volume
            </Text>
            <IconCoin size={16} color="yellow" />
          </Group>
          <Text size="xl" weight={700}>
            {formatCurrency(stats?.totalVolume || 0)} GP
          </Text>
          <Text size="xs" color="dimmed">
            Total traded
          </Text>
        </Card>
      </SimpleGrid>

      {/* Tabs Section */}
      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" icon={<IconChartLine size={14} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="activity" icon={<IconHistory size={14} />}>
            Recent Activity
          </Tabs.Tab>
          <Tabs.Tab value="settings" icon={<IconSettings size={14} />}>
            Settings
          </Tabs.Tab>
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Panel value="overview" pt="lg">
          <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'md', cols: 1 }]} spacing="lg">
            {/* Profit Chart */}
            <Card withBorder radius="md" p="lg">
              <Group position="apart" mb="lg">
                <div>
                  <Title order={3}>Profit Over Time</Title>
                  <Text size="sm" color="dimmed">Last 30 days performance</Text>
                </div>
                <Badge color="blue" variant="light">30 Days</Badge>
              </Group>
              
              {profitOverTime && profitOverTime.length > 0 ? (
                <ProfitChart data={profitOverTime} formatCurrency={formatCurrency} />
              ) : (
                <Center h={300}>
                  <Stack align="center">
                    <IconChartLine size={48} color="gray" />
                    <Text color="dimmed">No trading data yet</Text>
                    <Button 
                      size="sm" 
                      variant="light"
                      onClick={() => setAddFlipOpen(true)}
                    >
                      Add your first flip
                    </Button>
                  </Stack>
                </Center>
              )}
            </Card>

            {/* Goals & Quick Actions */}
            <Card withBorder radius="md" p="lg">
              <Title order={3} mb="lg">Quick Actions</Title>
              
              <Stack spacing="md">
                <Button
                  leftIcon={<IconPlus size={16} />}
                  variant="light"
                  fullWidth
                  onClick={() => setAddFlipOpen(true)}
                >
                  Add Flip
                </Button>
                
                <Button
                  leftIcon={<IconHistory size={16} />}
                  variant="outline"
                  fullWidth
                  onClick={() => navigate('/flip-history')}
                >
                  View Transaction History
                </Button>
                
                <Button
                  leftIcon={<IconExternalLink size={16} />}
                  variant="subtle"
                  fullWidth
                  onClick={() => navigate('/billing')}
                >
                  Manage Subscription
                </Button>
              </Stack>

              <Divider my="lg" />

              <div>
                <Text weight={500} mb="xs">Monthly Goal Progress</Text>
                <Progress 
                  value={(stats?.totalProfit || 0) % 10000000 / 100000} 
                  label={`${formatCurrency((stats?.totalProfit || 0) % 10000000)} / 10M GP`}
                  size="lg"
                  radius="md"
                  color="green"
                />
                <Text size="xs" color="dimmed" mt="xs">
                  Progress towards 10M GP monthly goal
                </Text>
              </div>
            </Card>
          </SimpleGrid>
        </Tabs.Panel>

        {/* Activity Tab */}
        <Tabs.Panel value="activity" pt="lg">
          <Card withBorder radius="md" p="lg">
            <Group position="apart" mb="lg">
              <Title order={3}>Recent Flips</Title>
              <Button 
                variant="light" 
                size="sm"
                rightIcon={<IconExternalLink size={14} />}
                onClick={() => navigate('/flip-history')}
              >
                View All
              </Button>
            </Group>
            
            {recentFlips && recentFlips.length > 0 ? (
              <Stack spacing="md">
                {recentFlips.map((flip) => (
                  <Group key={flip.id} position="apart" p="md" style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.02)', 
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                  }}>
                    <Group spacing="md">
                      <div style={{ position: 'relative' }}>
                        <ThemeIcon 
                          color={flip.transactionType === 'buy' ? 'blue' : 'green'}
                          variant="light"
                          size={36}
                        >
                          {flip.transactionType === 'buy' ? 
                            <IconTrendingDown size={16} /> : 
                            <IconTrendingUp size={16} />
                          }
                        </ThemeIcon>
                        {/* Tiny item image overlay */}
                        {(() => {
                          const item = items.find(item => item.name.toLowerCase() === flip.itemName.toLowerCase())
                          return item ? (
                            <Image
                              src={item.img}
                              alt={flip.itemName}
                              width={16}
                              height={16}
                              fit="contain"
                              style={{
                                position: 'absolute',
                                top: '-2px',
                                right: '-2px',
                                border: '1px solid white',
                                borderRadius: '2px',
                                backgroundColor: 'white'
                              }}
                            />
                          ) : null
                        })()}
                      </div>
                      <div>
                        <Text weight={500}>{flip.itemName}</Text>
                        <Text size="sm" color="dimmed">
                          {flip.transactionType.toUpperCase()} • {formatCurrency(flip.quantity)} @ {formatCurrency(flip.price)} GP
                        </Text>
                      </div>
                    </Group>
                    <Group spacing="xs">
                      <div style={{ textAlign: 'right' }}>
                        <Text 
                          weight={500}
                          color={flip.profit >= 0 ? 'green' : 'red'}
                        >
                          {flip.profit >= 0 ? '+' : ''}{formatCurrency(flip.profit)} GP
                        </Text>
                        <Text size="xs" color="dimmed">
                          {getRelativeTime(flip.createdAt)}
                        </Text>
                      </div>
                      <ActionIcon 
                        variant="light" 
                        size="sm"
                        onClick={() => handleEditFlip(flip)}
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                    </Group>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Center p="xl">
                <Stack align="center">
                  <IconActivity size={48} color="gray" />
                  <Text color="dimmed">No flips yet</Text>
                  <Button 
                    variant="light"
                    onClick={() => setAddFlipOpen(true)}
                  >
                    Add your first flip
                  </Button>
                </Stack>
              </Center>
            )}
          </Card>
        </Tabs.Panel>

        {/* Settings Tab */}
        <Tabs.Panel value="settings" pt="lg">
          <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'md', cols: 1 }]} spacing="lg">
            {/* Account Settings */}
            <Card withBorder radius="md" p="lg">
              <Title order={3} mb="lg">Account Settings</Title>
              
              <Stack spacing="md">
                <Group position="apart">
                  <Group spacing="xs">
                    <IconShield size={16} />
                    <Text size="sm">Two-Factor Authentication</Text>
                  </Group>
                  <Badge color={settings?.otpEnabled ? 'green' : 'red'} size="sm">
                    {settings?.otpEnabled ? 'ENABLED' : 'DISABLED'}
                  </Badge>
                </Group>

                <Group position="apart">
                  <Group spacing="xs">
                    <IconBrandDiscord size={16} />
                    <Text size="sm">Discord Connected</Text>
                  </Group>
                  <Badge color={user?.discordConnected ? 'green' : 'gray'} size="sm">
                    {user?.discordConnected ? 'CONNECTED' : 'NOT CONNECTED'}
                  </Badge>
                </Group>

                <Group position="apart">
                  <Group spacing="xs">
                    <IconMail size={16} />
                    <Text size="sm">Email Notifications</Text>
                  </Group>
                  <Badge color={settings?.emailNotifications ? 'blue' : 'gray'} size="sm">
                    {settings?.emailNotifications ? 'ON' : 'OFF'}
                  </Badge>
                </Group>
              </Stack>
            </Card>

            {/* Subscription Info */}
            <Card withBorder radius="md" p="lg">
              <Title order={3} mb="lg">Subscription</Title>
              
              <Stack spacing="md">
                <Group position="apart">
                  <Text size="sm">Current Plan</Text>
                  <Group spacing={4}>
                    {membershipInfo.icon}
                    <Badge 
                      color={membershipInfo.color} 
                      variant="filled"
                    >
                      {membershipInfo.label}
                    </Badge>
                  </Group>
                </Group>
                
                {isSubscribed && (
                  <>
                    <Group position="apart">
                      <Text size="sm">Status</Text>
                      <Badge color="green">ACTIVE</Badge>
                    </Group>
                    <Group position="apart">
                      <Text size="sm">Next Billing</Text>
                      <Text size="sm" weight={500}>
                        {settings?.subscriptionExpiry || 'N/A'}
                      </Text>
                    </Group>
                  </>
                )}
                
                <Button 
                  variant="light" 
                  fullWidth 
                  mt="md"
                  onClick={() => navigate('/billing')}
                >
                  Manage Subscription
                </Button>
              </Stack>
            </Card>
          </SimpleGrid>
          
          {/* Logout Button */}
          <Card withBorder radius="md" p="lg" mt="lg">
            <Group position="apart">
              <div>
                <Text weight={500}>Sign Out</Text>
                <Text size="sm" color="dimmed">Sign out of your GE-Metrics account</Text>
              </div>
              <Button 
                color="red" 
                variant="light"
                onClick={logout}
              >
                Sign Out
              </Button>
            </Group>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Add Flip Modal */}
      <Modal
        opened={addFlipOpen}
        onClose={() => setAddFlipOpen(false)}
        title="Add Flip"
        size="md"
      >
        <Stack spacing="md">
          <Autocomplete
            label="Item Name"
            placeholder="Start typing to search items..."
            value={flipForm.itemName}
            onChange={(value) => {
              setFlipForm({ ...flipForm, itemName: value })
              // Auto-select item if it's an exact match
              const exactMatch = items.find(item => item.name.toLowerCase() === value.toLowerCase())
              if (exactMatch) {
                setFlipForm(prev => ({ ...prev, itemId: exactMatch.id.toString() }))
              }
            }}
            data={getFilteredItems(flipForm.itemName)}
            itemComponent={AutocompleteItem}
            filter={() => true}
            required
          />
          
          <Alert color="blue" icon={<IconInfoCircle size={16} />}>
            <Text size="sm">Track your flipping profits by entering buy and sell transactions separately.</Text>
          </Alert>
          
          <NumberInput
            label="Quantity"
            placeholder="Enter quantity..."
            value={flipForm.quantity}
            onChange={(value) => setFlipForm({ ...flipForm, quantity: value || 1 })}
            min={1}
            required
          />
          
          <NumberInput
            label="Price (GP)"
            placeholder="Enter price per item..."
            value={flipForm.price}
            onChange={(value) => setFlipForm({ ...flipForm, price: value || 0 })}
            min={0}
            required
          />
          
          <NumberInput
            label="Profit/Loss (GP)"
            placeholder="Enter profit or loss..."
            value={flipForm.profit}
            onChange={(value) => setFlipForm({ ...flipForm, profit: value || 0 })}
          />
          
          <Textarea
            label="Notes (Optional)"
            placeholder="Add any notes about this flip..."
            value={flipForm.notes}
            onChange={(e) => setFlipForm({ ...flipForm, notes: e.target.value })}
            minRows={2}
          />
          
          <Group position="right" mt="md">
            <Button variant="subtle" onClick={() => setAddFlipOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddFlip}
              loading={addFlipMutation.isLoading}
              disabled={!flipForm.itemName || flipForm.price <= 0}
            >
              <Group spacing="xs">
                <Text>Add Flip</Text>
                <Text size="xs" color="dimmed">
                  (⌘⏎)
                </Text>
              </Group>
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Flip Modal */}
      <Modal
        opened={editFlipOpen}
        onClose={() => {
          setEditFlipOpen(false)
          setEditingFlip(null)
        }}
        title="Edit Flip"
        size="md"
      >
        <Stack spacing="md">
          <Autocomplete
            label="Item Name"
            placeholder="Start typing to search items..."
            value={flipForm.itemName}
            onChange={(value) => setFlipForm({ ...flipForm, itemName: value })}
            data={getFilteredItems(flipForm.itemName)}
            itemComponent={AutocompleteItem}
            filter={() => true} // Disable default filtering since we handle it
            required
          />
          
          <Select
            label="Flip Type"
            data={[
              { value: 'buy', label: 'Buy' },
              { value: 'sell', label: 'Sell' }
            ]}
            value={flipForm.flipType}
            onChange={(value) => setFlipForm({ ...flipForm, flipType: value })}
          />
          
          <NumberInput
            label="Quantity"
            placeholder="Enter quantity..."
            value={flipForm.quantity}
            onChange={(value) => setFlipForm({ ...flipForm, quantity: value || 1 })}
            min={1}
            required
          />
          
          <NumberInput
            label="Price (GP)"
            placeholder="Enter price per item..."
            value={flipForm.price}
            onChange={(value) => setFlipForm({ ...flipForm, price: value || 0 })}
            min={0}
            required
          />
          
          <NumberInput
            label="Profit/Loss (GP)"
            placeholder="Enter profit or loss..."
            value={flipForm.profit}
            onChange={(value) => setFlipForm({ ...flipForm, profit: value || 0 })}
          />
          
          <Textarea
            label="Notes (Optional)"
            placeholder="Add any notes about this flip..."
            value={flipForm.notes}
            onChange={(e) => setFlipForm({ ...flipForm, notes: e.target.value })}
            minRows={2}
          />
          
          <Group position="right" mt="md">
            <Button variant="subtle" onClick={() => {
              setEditFlipOpen(false)
              setEditingFlip(null)
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateFlip}
              loading={updateFlipMutation.isLoading}
              disabled={!flipForm.itemName || flipForm.price <= 0}
            >
              Update Flip
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}
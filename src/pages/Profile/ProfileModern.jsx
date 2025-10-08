import React, { useState } from 'react'
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
  ThemeIcon
} from '@mantine/core'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area
} from 'recharts'
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
  IconStar
} from '@tabler/icons-react'
import { useAuth } from '../../hooks/useAuth'
import { trpc } from '../../utils/trpc.jsx'
import { getRelativeTime } from '../../utils/utils'
import { useNavigate } from 'react-router-dom'

export default function ProfileModern() {
  const { user, isSubscribed, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [addTransactionOpen, setAddTransactionOpen] = useState(false)
  
  // Transaction form state
  const [transactionForm, setTransactionForm] = useState({
    itemName: '',
    transactionType: 'buy',
    quantity: 1,
    price: 0,
    profit: 0,
    notes: ''
  })

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.transactions.getStats.useQuery()
  const { data: recentTransactions } = trpc.transactions.getRecentTransactions.useQuery({ limit: 5 })
  const { data: profitOverTime } = trpc.transactions.getProfitOverTime.useQuery({ days: 30 })
  const { data: settings } = trpc.settings.get.useQuery()

  // Mutations
  const addTransactionMutation = trpc.transactions.addTransaction.useMutation()

  const handleAddTransaction = async () => {
    try {
      await addTransactionMutation.mutateAsync({
        itemId: transactionForm.itemName.toLowerCase().replace(/\s+/g, '_'),
        itemName: transactionForm.itemName,
        transactionType: transactionForm.transactionType,
        quantity: transactionForm.quantity,
        price: transactionForm.price,
        profit: transactionForm.profit,
        notes: transactionForm.notes
      })
      setAddTransactionOpen(false)
      setTransactionForm({
        itemName: '',
        transactionType: 'buy',
        quantity: 1,
        price: 0,
        profit: 0,
        notes: ''
      })
    } catch (error) {
      console.error('Failed to add transaction:', error)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US').format(value || 0)
  }

  const getMembershipInfo = () => {
    if (user?.role === 'admin') {
      return {
        icon: <IconShield size={16} />,
        label: 'ADMIN',
        color: 'red',
        gradient: { from: 'red', to: 'pink' }
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
                <Badge
                  variant="gradient"
                  gradient={membershipInfo.gradient}
                  leftIcon={membershipInfo.icon}
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
              
              <Text size="sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }} mb="xs">
                {user?.email} • Joined {daysSinceJoined} days ago
              </Text>
              
              <Group spacing="xs">
                <Badge variant="light" color="white" style={{ color: '#333' }}>
                  Trader
                </Badge>
                {stats?.totalTransactions > 50 && (
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
            {stats?.totalTransactions || 0}
          </Text>
          <Text size="xs" color="dimmed">
            All time transactions
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
              Best Trade
            </Text>
            <IconTrendingUp size={16} color="green" />
          </Group>
          <Text size="xl" weight={700} color="green">
            {formatCurrency(stats?.bestTrade || 0)} GP
          </Text>
          <Text size="xs" color="dimmed">
            Highest profit
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
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={profitOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip
                        formatter={(value) => [`${formatCurrency(value)} GP`, 'Daily Profit']}
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="#228be6"
                        fill="#228be6"
                        fillOpacity={0.1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Center h={300}>
                  <Stack align="center">
                    <IconChartLine size={48} color="gray" />
                    <Text color="dimmed">No trading data yet</Text>
                    <Button 
                      size="sm" 
                      variant="light"
                      onClick={() => setAddTransactionOpen(true)}
                    >
                      Add your first transaction
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
                  onClick={() => setAddTransactionOpen(true)}
                >
                  Add Transaction
                </Button>
                
                <Button
                  leftIcon={<IconHistory size={16} />}
                  variant="outline"
                  fullWidth
                  onClick={() => navigate('/transaction-history')}
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
              <Title order={3}>Recent Transactions</Title>
              <Button 
                variant="light" 
                size="sm"
                rightIcon={<IconExternalLink size={14} />}
                onClick={() => navigate('/transaction-history')}
              >
                View All
              </Button>
            </Group>
            
            {recentTransactions && recentTransactions.length > 0 ? (
              <Stack spacing="md">
                {recentTransactions.map((transaction) => (
                  <Group key={transaction.id} position="apart" p="md" style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.02)', 
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                  }}>
                    <Group spacing="md">
                      <ThemeIcon 
                        color={transaction.transactionType === 'buy' ? 'blue' : 'green'}
                        variant="light"
                      >
                        {transaction.transactionType === 'buy' ? 
                          <IconTrendingDown size={16} /> : 
                          <IconTrendingUp size={16} />
                        }
                      </ThemeIcon>
                      <div>
                        <Text weight={500}>{transaction.itemName}</Text>
                        <Text size="sm" color="dimmed">
                          {transaction.transactionType.toUpperCase()} • {formatCurrency(transaction.quantity)} @ {formatCurrency(transaction.price)} GP
                        </Text>
                      </div>
                    </Group>
                    <div style={{ textAlign: 'right' }}>
                      <Text 
                        weight={500}
                        color={transaction.profit >= 0 ? 'green' : 'red'}
                      >
                        {transaction.profit >= 0 ? '+' : ''}{formatCurrency(transaction.profit)} GP
                      </Text>
                      <Text size="xs" color="dimmed">
                        {getRelativeTime(transaction.createdAt)}
                      </Text>
                    </div>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Center p="xl">
                <Stack align="center">
                  <IconActivity size={48} color="gray" />
                  <Text color="dimmed">No transactions yet</Text>
                  <Button 
                    variant="light"
                    onClick={() => setAddTransactionOpen(true)}
                  >
                    Add your first transaction
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
                  <Badge 
                    color={membershipInfo.color} 
                    variant="filled"
                    leftIcon={membershipInfo.icon}
                  >
                    {membershipInfo.label}
                  </Badge>
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

      {/* Add Transaction Modal */}
      <Modal
        opened={addTransactionOpen}
        onClose={() => setAddTransactionOpen(false)}
        title="Add Transaction"
        size="md"
      >
        <Stack spacing="md">
          <TextInput
            label="Item Name"
            placeholder="Enter item name..."
            value={transactionForm.itemName}
            onChange={(e) => setTransactionForm({ ...transactionForm, itemName: e.target.value })}
            required
          />
          
          <Select
            label="Transaction Type"
            data={[
              { value: 'buy', label: 'Buy' },
              { value: 'sell', label: 'Sell' }
            ]}
            value={transactionForm.transactionType}
            onChange={(value) => setTransactionForm({ ...transactionForm, transactionType: value })}
          />
          
          <NumberInput
            label="Quantity"
            placeholder="Enter quantity..."
            value={transactionForm.quantity}
            onChange={(value) => setTransactionForm({ ...transactionForm, quantity: value || 1 })}
            min={1}
            required
          />
          
          <NumberInput
            label="Price (GP)"
            placeholder="Enter price per item..."
            value={transactionForm.price}
            onChange={(value) => setTransactionForm({ ...transactionForm, price: value || 0 })}
            min={0}
            required
          />
          
          <NumberInput
            label="Profit/Loss (GP)"
            placeholder="Enter profit or loss..."
            value={transactionForm.profit}
            onChange={(value) => setTransactionForm({ ...transactionForm, profit: value || 0 })}
          />
          
          <Textarea
            label="Notes (Optional)"
            placeholder="Add any notes about this transaction..."
            value={transactionForm.notes}
            onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
            minRows={2}
          />
          
          <Group position="right" mt="md">
            <Button variant="subtle" onClick={() => setAddTransactionOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddTransaction}
              loading={addTransactionMutation.isLoading}
              disabled={!transactionForm.itemName || transactionForm.price <= 0}
            >
              Add Transaction
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}
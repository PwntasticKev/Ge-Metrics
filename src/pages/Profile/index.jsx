import React, { useState, useEffect } from 'react'
import {
  Grid,
  Card,
  Title,
  Text,
  Group,
  Avatar,
  Badge,
  Button,
  Stack,
  SimpleGrid,
  Modal,
  Switch,
  TextInput,
  ActionIcon,
  Tooltip,
  Select,
  Divider,
  Textarea,
  useMantineTheme
} from '@mantine/core'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from 'recharts'
import {
  IconUser,
  IconMail,
  IconPhone,
  IconMapPin,
  IconCalendar,
  IconCrown,
  IconTrophy,
  IconTarget,
  IconPlus,
  IconTrash,
  IconCheck,
  IconX,
  IconEdit,
  IconPalette,
  IconMoon,
  IconSun,
  IconShield,
  IconBrandDiscord,
  IconCreditCard,
  IconSettings2,
  IconCircleDotted,
  IconLogout,
  IconCrown as IconCrownSolid
} from '@tabler/icons-react'
import { useAuth } from '../../hooks/useAuth'
import UserEdit from './components/modals/user-edit'
import UserSubscription from './components/modals/user-subscription'
import UserGoals from './components/modals/user-goals'
import { trpc } from '../../utils/trpc.jsx'
import jmodImage from '../../assets/jmod.png'

// Default avatar options
const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108755-2616b612b1e0?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face'
]

// Mock profit data for the chart
const PROFIT_DATA = [
  { date: '2024-01', profit: 45000 },
  { date: '2024-02', profit: 52000 },
  { date: '2024-03', profit: 48000 },
  { date: '2024-04', profit: 61000 },
  { date: '2024-05', profit: 55000 },
  { date: '2024-06', profit: 73000 },
  { date: '2024-07', profit: 68000 },
  { date: '2024-08', profit: 82000 },
  { date: '2024-09', profit: 76000 },
  { date: '2024-10', profit: 89000 },
  { date: '2024-11', profit: 95000 },
  { date: '2024-12', profit: 125000 }
]

export default function Profile () {
  const theme = useMantineTheme()
  const { user, logout } = useAuth()
  const [activeModal, setActiveModal] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0])
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true)

  // User data (in real app, this would come from API)
  const [userStats, setUserStats] = useState({
    totalProfit: 1247650,
    totalTransactions: 342,
    joinDate: '2024-01-15',
    clanName: 'Elite Traders',
    subscriptionStatus: 'active',
    subscriptionPlan: 'yearly',
    subscriptionExpiry: '2025-01-15',
    badges: ['Early Adopter', 'Profit Master', 'Volume Trader'],
    runescapeName: 'Pwntastic',
    discordConnected: true,
    mailchimpSubscribed: true,
    otpEnabled: true
  })

  // Goal tracker state
  const [weeklyGoals, setWeeklyGoals] = useState([
    { id: 1, text: 'Flip 10M GP in a week', completed: false },
    { id: 2, text: 'Reach 100 total trades', completed: false }
  ])
  const [monthlyGoals, setMonthlyGoals] = useState([
    { id: 1, text: 'Earn 50M GP profit this month', completed: false }
  ])
  const [dailyGoals, setDailyGoals] = useState([])
  const [goalInput, setGoalInput] = useState('')
  const [goalType, setGoalType] = useState('weekly')
  const [notes, setNotes] = useState('')

  // Transaction state
  const [transactions, setTransactions] = useState([])
  const [transactionInput, setTransactionInput] = useState('')

  useEffect(() => {
    // Load saved theme preferences
    const savedDarkMode = localStorage.getItem('darkMode')
    const savedAvatar = localStorage.getItem('selectedAvatar')

    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode))
    if (savedAvatar) setSelectedAvatar(savedAvatar)
  }, [])

  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode))
  }

  const handleAvatarSelect = (avatar) => {
    setSelectedAvatar(avatar)
    localStorage.setItem('selectedAvatar', avatar)
    setAvatarModalOpen(false)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  const getSubscriptionBadgeColor = () => {
    switch (userStats.subscriptionStatus) {
      case 'active': return 'green'
      case 'trial': return 'blue'
      case 'expired': return 'red'
      default: return 'gray'
    }
  }

  const daysSinceJoined = Math.floor((new Date() - new Date(userStats.joinDate)) / (1000 * 60 * 60 * 24))

  // Defensive fallback for selectedAvatar
  const avatarToShow = selectedAvatar || DEFAULT_AVATARS[0]
  // Defensive fallback for userStats fields
  const runescapeName = userStats?.runescapeName || 'Player'
  const badges = Array.isArray(userStats?.badges) ? userStats.badges : []
  const subscriptionPlan = userStats?.subscriptionPlan || 'free'
  const subscriptionStatus = userStats?.subscriptionStatus || 'inactive'
  const subscriptionExpiry = userStats?.subscriptionExpiry || 'N/A'
  const clanName = userStats?.clanName || 'No Clan'
  const totalProfit = userStats?.totalProfit ?? 0
  const totalTransactions = userStats?.totalTransactions ?? 0
  const otpEnabled = !!userStats?.otpEnabled
  const discordConnected = !!userStats?.discordConnected
  const mailchimpSubscribed = !!userStats?.mailchimpSubscribed
  const joinDate = userStats?.joinDate || '2024-01-01'

  // Add transaction handler
  const handleAddTransaction = () => {
    let input = transactionInput.trim()

    // Handle common abbreviations
    if (input.toLowerCase().includes('k')) {
      input = input.toLowerCase().replace('k', '000')
    }
    if (input.toLowerCase().includes('m')) {
      input = input.toLowerCase().replace('m', '000000')
    }
    if (input.toLowerCase().includes('b')) {
      input = input.toLowerCase().replace('b', '000000000')
    }

    const value = parseInt(input.replace(/[^0-9-]/g, ''))
    if (!isNaN(value)) {
      const newTransactions = [...transactions, { id: Date.now(), value }]
      setTransactions(newTransactions)

      // Update userStats with new total profit and transaction count
      setUserStats(prev => ({
        ...prev,
        totalProfit: prev.totalProfit + value,
        totalTransactions: prev.totalTransactions + 1
      }))

      setTransactionInput('')
    }
  }

  const currentProgress = transactions.reduce((sum, t) => sum + t.value, 0)

  // Add goal
  const handleAddGoal = () => {
    if (!goalInput.trim()) return
    const newGoal = { id: Date.now(), text: goalInput, completed: false }
    if (goalType === 'daily') {
      setDailyGoals([...dailyGoals, newGoal])
    } else if (goalType === 'weekly') {
      setWeeklyGoals([...weeklyGoals, newGoal])
    } else {
      setMonthlyGoals([...monthlyGoals, newGoal])
    }
    setGoalInput('')
  }

  // Toggle goal completion
  const handleToggleGoal = (type, id) => {
    if (type === 'daily') {
      setDailyGoals(dailyGoals.map(g => g.id === id ? { ...g, completed: !g.completed } : g))
    } else if (type === 'weekly') {
      setWeeklyGoals(weeklyGoals.map(g => g.id === id ? { ...g, completed: !g.completed } : g))
    } else {
      setMonthlyGoals(monthlyGoals.map(g => g.id === id ? { ...g, completed: !g.completed } : g))
    }
  }

  // Remove goal
  const handleRemoveGoal = (type, id) => {
    if (type === 'daily') {
      setDailyGoals(dailyGoals.filter(g => g.id !== id))
    } else if (type === 'weekly') {
      setWeeklyGoals(weeklyGoals.filter(g => g.id !== id))
    } else {
      setMonthlyGoals(monthlyGoals.filter(g => g.id !== id))
    }
  }

  return <>
    <UserEdit/>
    {activeModal === 'subscription' && <UserSubscription open={true} handleChange={setActiveModal}/>}
    {activeModal === 'goals' && <UserGoals open={true} handleChange={setActiveModal}/>}

    {/* Avatar Selection Modal */}
    <Modal
      opened={avatarModalOpen}
      onClose={() => setAvatarModalOpen(false)}
      title="Choose Your Avatar"
      size="lg"
    >
      <SimpleGrid cols={5} spacing="md">
        {DEFAULT_AVATARS.map((avatar, index) => (
          <Avatar
            key={index}
            src={avatar}
            size="xl"
            radius="xl"
            style={{
              cursor: 'pointer',
              border: selectedAvatar === avatar ? `3px solid ${theme.colors.blue[5]}` : '3px solid transparent',
              transition: 'all 0.2s ease'
            }}
            onClick={() => handleAvatarSelect(avatar)}
          />
        ))}
      </SimpleGrid>
    </Modal>

    <Grid gutter="lg">
      {/* Profile Header */}
      <Grid.Col span={12}>
        <Card withBorder radius="md" p="xl">
          <Group position="apart">
            <Group spacing="xl">
              <div style={{ position: 'relative' }}>
                <Tooltip label="Premium">
                  <Avatar
                    src={jmodImage}
                    size="xl"
                    radius="xl"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setAvatarModalOpen(true)}
                  />
                </Tooltip>
              </div>

              <div>
                <Group spacing="md" align="center">
                  <Title order={2}>{runescapeName}</Title>
                  <Badge
                    color={getSubscriptionBadgeColor()}
                    variant="light"
                    leftIcon={<IconCrownSolid size={12} />}
                  >
                    {subscriptionPlan.toUpperCase()} MEMBER
                  </Badge>
                </Group>

                <Text color="dimmed" size="sm" mt="xs">
                  {user?.email} • Joined {daysSinceJoined} days ago
                </Text>

                <Group spacing="xs" mt="sm">
                  {badges.map((badge, index) => (
                    <Badge key={index} variant="outline" size="sm">
                      {badge}
                    </Badge>
                  ))}
                </Group>
              </div>
            </Group>

            <Stack align="flex-end">
              <Badge size="lg" color="green" variant="light">
                <IconTrophy size={14} /> {formatCurrency(totalProfit)} GP
              </Badge>
              <Text size="sm" color="dimmed">Total Profit</Text>
            </Stack>
          </Group>
        </Card>
      </Grid.Col>

      {/* Quick Stats */}
      <Grid.Col span={12}>
        <SimpleGrid cols={4} breakpoints={[{ maxWidth: 'sm', cols: 2 }]}>
          <Card withBorder radius="md" p="md">
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Total Profit
                </Text>
                <Text size="xl" weight={700} color="green">
                  {formatCurrency(totalProfit)} GP
                </Text>
              </div>
              <IconTrophy size={24} color={theme.colors.green[6]} />
            </Group>
          </Card>

          <Card withBorder radius="md" p="md">
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Transactions
                </Text>
                <Text size="xl" weight={700}>
                  {totalTransactions}
                </Text>
              </div>
              <IconTarget size={24} color={theme.colors.blue[6]} />
            </Group>
          </Card>

          <Card withBorder radius="md" p="md">
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Avg per Trade
                </Text>
                <Text size="xl" weight={700}>
                  {formatCurrency(Math.round(totalProfit / totalTransactions))} GP
                </Text>
              </div>
              <IconCrown size={24} color={theme.colors.yellow[6]} />
            </Group>
          </Card>

          <Card withBorder radius="md" p="md">
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Clan
                </Text>
                <Text size="lg" weight={700}>
                  {clanName}
                </Text>
              </div>
              <IconShield size={24} color={theme.colors.purple[6]} />
            </Group>
          </Card>
        </SimpleGrid>
      </Grid.Col>

      {/* Goals & Notes Section */}
      <Grid.Col span={8}>
        <Card withBorder radius="md" p="md" mb="md">
          <Title order={3} mb="md">Goals & Notes</Title>
          <Group mb="sm">
            <Select
              data={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]}
              value={goalType ?? 'weekly'}
              onChange={(value) => setGoalType(value ?? 'weekly')}
              style={{ width: 120 }}
            />
            <TextInput
              placeholder={`Add a ${goalType} goal...`}
              value={goalInput ?? ''}
              onChange={e => setGoalInput(e.target.value ?? '')}
              onKeyDown={e => { if (e.key === 'Enter') handleAddGoal() }}
              style={{ flex: 1 }}
            />
            <Button onClick={handleAddGoal} variant="light">Add</Button>
          </Group>
          <Group align="flex-start" spacing="xl">
            <Stack spacing="xs" style={{ flex: 1 }}>
              <Text weight={500}>Daily Goals</Text>
              {dailyGoals.length === 0 && <Text color="dimmed" size="sm">No daily goals set.</Text>}
              {dailyGoals.map(goal => (
                <Group key={goal.id} spacing="xs">
                  <Button size="xs" variant={goal.completed ? 'filled' : 'outline'} color={goal.completed ? 'green' : 'gray'} onClick={() => handleToggleGoal('daily', goal.id)}>
                    {goal.completed ? '✓' : ''}
                  </Button>
                  <Text style={{ textDecoration: goal.completed ? 'line-through' : 'none', flex: 1 }}>{goal.text}</Text>
                  <Button size="xs" color="red" variant="subtle" onClick={() => handleRemoveGoal('daily', goal.id)}>Remove</Button>
                </Group>
              ))}
            </Stack>
            <Stack spacing="xs" style={{ flex: 1 }}>
              <Text weight={500}>Weekly Goals</Text>
              {weeklyGoals.length === 0 && <Text color="dimmed" size="sm">No weekly goals set.</Text>}
              {weeklyGoals.map(goal => (
                <Group key={goal.id} spacing="xs">
                  <Button size="xs" variant={goal.completed ? 'filled' : 'outline'} color={goal.completed ? 'green' : 'gray'} onClick={() => handleToggleGoal('weekly', goal.id)}>
                    {goal.completed ? '✓' : ''}
                  </Button>
                  <Text style={{ textDecoration: goal.completed ? 'line-through' : 'none', flex: 1 }}>{goal.text}</Text>
                  <Button size="xs" color="red" variant="subtle" onClick={() => handleRemoveGoal('weekly', goal.id)}>Remove</Button>
                </Group>
              ))}
            </Stack>
            <Stack spacing="xs" style={{ flex: 1 }}>
              <Text weight={500}>Monthly Goals</Text>
              {monthlyGoals.length === 0 && <Text color="dimmed" size="sm">No monthly goals set.</Text>}
              {monthlyGoals.map(goal => (
                <Group key={goal.id} spacing="xs">
                  <Button size="xs" variant={goal.completed ? 'filled' : 'outline'} color={goal.completed ? 'green' : 'gray'} onClick={() => handleToggleGoal('monthly', goal.id)}>
                    {goal.completed ? '✓' : ''}
                  </Button>
                  <Text style={{ textDecoration: goal.completed ? 'line-through' : 'none', flex: 1 }}>{goal.text}</Text>
                  <Button size="xs" color="red" variant="subtle" onClick={() => handleRemoveGoal('monthly', goal.id)}>Remove</Button>
                </Group>
              ))}
            </Stack>
          </Group>
          <Divider my="md" />
          <Text weight={500} mb="xs">Notes</Text>
          <Textarea
            placeholder="Add notes for your trading, goals, or anything else..."
            value={notes ?? ''}
            onChange={e => setNotes(e.target.value ?? '')}
            minRows={3}
            autosize
          />
          <Divider my="md" />
          <Group position="apart" align="flex-end">
            <div style={{ flex: 1 }}>
              <Text weight={500} mb="xs">Quick Profit/Loss</Text>
              <Group spacing="xs">
                <TextInput
                  placeholder="Enter amount (e.g., 50k, 1.5m, 2b, -25k)"
                  value={transactionInput ?? ''}
                  onChange={e => setTransactionInput(e.target.value ?? '')}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddTransaction() }}
                  style={{ flex: 1 }}
                  size="sm"
                />
                <Button onClick={handleAddTransaction} size="sm" variant="light">Add</Button>
              </Group>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text size="sm" color="dimmed">Current Progress</Text>
              <Text size="lg" weight={600} color={currentProgress >= 0 ? 'green' : 'red'}>
                {formatCurrency(currentProgress)} GP
              </Text>
            </div>
          </Group>
          {transactions?.slice(-3).reverse().map(transaction => (
            <Text key={transaction.id} size="xs" color={transaction.value >= 0 ? 'green' : 'red'}>
              {transaction.value >= 0 ? '+' : ''}{formatCurrency(transaction.value)} GP
            </Text>
          ))}
        </Card>
        {/* Profit Chart with Goal Line */}
        <Card withBorder radius="md" p="md">
          <Group position="apart" mb="md">
            <Title order={3}>Profit Over Time</Title>
            <Badge variant="light">Last 12 Months</Badge>
          </Group>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={PROFIT_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip
                  formatter={(value) => [`${formatCurrency(value)} GP`, 'Profit']}
                  labelStyle={{ color: theme.colorScheme === 'dark' ? theme.white : theme.black }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke={theme.colors.green[6]}
                  strokeWidth={3}
                  dot={{ fill: theme.colors.green[6], strokeWidth: 2, r: 4 }}
                />
                {/* Main goal line (use first monthly goal if available) */}
                {monthlyGoals[0] && (
                  <Line
                    type="monotone"
                    dataKey={() => parseInt(monthlyGoals[0].text.replace(/[^0-9]/g, '')) || 0}
                    stroke={theme.colors.blue[6]}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                    name="Goal"
                  />
                )}
                {/* Current progress line */}
                <Line
                  type="monotone"
                  dataKey={() => currentProgress}
                  stroke={theme.colors.yellow[6]}
                  strokeWidth={3}
                  dot={false}
                  name="Current Progress"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Grid.Col>

      {/* Subscription & Settings */}
      <Grid.Col span={4}>
        <Stack spacing="md">
          {/* Subscription Status */}
          <Card withBorder radius="md" p="md">
            <Group position="apart" mb="md">
              <Title order={4}>Subscription</Title>
              <Badge color={getSubscriptionBadgeColor()}>
                {subscriptionStatus.toUpperCase()}
              </Badge>
            </Group>

            <Stack spacing="xs">
              <Group position="apart">
                <Text size="sm">Plan</Text>
                <Text size="sm" weight={600}>{subscriptionPlan}</Text>
              </Group>
              <Group position="apart">
                <Text size="sm">Expires</Text>
                <Text size="sm" weight={600}>{subscriptionExpiry}</Text>
              </Group>
            </Stack>

            <Button
              variant="light"
              fullWidth
              mt="md"
              leftIcon={<IconCreditCard size={16} />}
              onClick={() => setActiveModal('subscription')}
            >
              Manage Subscription
            </Button>
          </Card>

          {/* Theme Settings */}
          <Card withBorder radius="md" p="md">
            <Group position="apart" mb="md">
              <Title order={4}>Theme</Title>
              <IconPalette size={20} />
            </Group>

            <Stack spacing="md">
              <Group position="apart">
                <Text size="sm">Dark Mode</Text>
                <Switch
                  checked={darkMode}
                  onChange={handleDarkModeToggle}
                  onLabel={<IconMoon size={12} />}
                  offLabel={<IconSun size={12} />}
                />
              </Group>
            </Stack>
          </Card>

          {/* Account Status */}
          <Card withBorder radius="md" p="md">
            <Title order={4} mb="md">Account Status</Title>

            <Stack spacing="xs">
              <Group position="apart">
                <Group spacing="xs">
                  <IconShield size={16} />
                  <Text size="sm">2FA Enabled</Text>
                </Group>
                <Badge color={otpEnabled ? 'green' : 'red'} size="sm">
                  {otpEnabled ? 'ON' : 'OFF'}
                </Badge>
              </Group>

              <Group position="apart">
                <Group spacing="xs">
                  <IconBrandDiscord size={16} />
                  <Text size="sm">Discord</Text>
                </Group>
                <Badge color={discordConnected ? 'green' : 'gray'} size="sm">
                  {discordConnected ? 'LINKED' : 'NOT LINKED'}
                </Badge>
              </Group>

              <Group position="apart">
                <Group spacing="xs">
                  <IconMail size={16} />
                  <Text size="sm">Newsletter</Text>
                </Group>
                <Badge color={mailchimpSubscribed ? 'blue' : 'gray'} size="sm">
                  {mailchimpSubscribed ? 'SUBSCRIBED' : 'UNSUBSCRIBED'}
                </Badge>
              </Group>
            </Stack>
          </Card>
        </Stack>
      </Grid.Col>

      {/* Settings Menu */}
      <Grid.Col span={12}>
        <Card withBorder radius="md" p="md">
          <Title order={3} mb="md">Settings</Title>

          <SimpleGrid cols={3} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
            <Button
              variant="light"
              size="md"
              leftIcon={<IconCircleDotted size={18} />}
              onClick={() => setActiveModal('goals')}
              style={{ height: 60 }}
            >
              <div style={{ textAlign: 'left' }}>
                <Text weight={500}>Goals</Text>
                <Text size="xs" color="dimmed">Set trading targets</Text>
              </div>
            </Button>

            <Button
              variant="light"
              size="md"
              leftIcon={<IconSettings2 size={18} />}
              onClick={() => setActiveModal('subscription')}
              style={{ height: 60 }}
            >
              <div style={{ textAlign: 'left' }}>
                <Text weight={500}>Subscription</Text>
                <Text size="xs" color="dimmed">Manage billing</Text>
              </div>
            </Button>

            <Button
              variant="light"
              size="md"
              leftIcon={<IconUser size={18} />}
              style={{ height: 60 }}
            >
              <div style={{ textAlign: 'left' }}>
                <Text weight={500}>Account</Text>
                <Text size="xs" color="dimmed">Profile settings</Text>
              </div>
            </Button>
          </SimpleGrid>
        </Card>
      </Grid.Col>

      {/* Logout */}
      <Grid.Col span={12}>
        <Button
          variant="light"
          color="red"
          leftIcon={<IconLogout />}
          onClick={logout}
          size="md"
        >
          Sign Out
        </Button>
      </Grid.Col>
    </Grid>
  </>
}

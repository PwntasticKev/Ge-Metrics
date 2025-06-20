import { useState, useEffect } from 'react'
import {
  Button,
  Center,
  Flex,
  Grid,
  Image,
  Indicator,
  Text,
  useMantineTheme,
  Card,
  Group,
  Stack,
  Badge,
  Avatar,
  SimpleGrid,
  Select,
  ColorPicker,
  Switch,
  Divider,
  ActionIcon,
  Modal,
  Title,
  Progress,
  Timeline,
  Alert,
  Anchor
} from '@mantine/core'
import {
  IconChevronRight,
  IconCircleDotted,
  IconLogout,
  IconSettings2,
  IconTrendingUp,
  IconCrown,
  IconPalette,
  IconUser,
  IconCreditCard,
  IconChartLine,
  IconCalendar,
  IconCoins,
  IconShield,
  IconMoon,
  IconSun,
  IconBrandDiscord,
  IconMail,
  IconExternalLink
} from '@tabler/icons-react'
import jmodImage from '../../assets/jmod.png'
import authService from '../../services/authService'
import UserEdit from './components/modals/user-edit.jsx'
import UserGoals from './components/modals/user-goals.jsx'
import UserSubscription from './components/modals/user-subscription.jsx'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
  const user = authService.getCurrentUser() || { email: 'guest@example.com' }
  const [activeModal, setActiveModal] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0])
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [themeColor, setThemeColor] = useState('#339af0')
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

  useEffect(() => {
    // Load saved theme preferences
    const savedColor = localStorage.getItem('themeColor')
    const savedDarkMode = localStorage.getItem('darkMode')
    const savedAvatar = localStorage.getItem('selectedAvatar')

    if (savedColor) setThemeColor(savedColor)
    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode))
    if (savedAvatar) setSelectedAvatar(savedAvatar)
  }, [])

  const handleThemeColorChange = (color) => {
    setThemeColor(color)
    localStorage.setItem('themeColor', color)
    document.documentElement.style.setProperty('--mantine-primary-color', color)
  }

  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode))
    document.documentElement.setAttribute('data-mantine-color-scheme', newDarkMode ? 'dark' : 'light')
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

  return <>
    <UserEdit/>
    {activeModal === 'goals' && <UserGoals open={true} handleChange={setActiveModal}/>}
    {activeModal === 'subscription' && <UserSubscription open={true} handleChange={setActiveModal}/>}

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
                <Indicator
                  label={<Image height={20} width={20} src={jmodImage} alt="Premium"/>}
                  inline
                  size={20}
                  offset={12}
                  position="bottom-end"
                  color="none"
                >
                  <Avatar
                    src={selectedAvatar}
                    size="xl"
                    radius="xl"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setAvatarModalOpen(true)}
                  />
                </Indicator>
              </div>

              <div>
                <Group spacing="md" align="center">
                  <Title order={2}>{userStats.runescapeName}</Title>
                  <Badge
                    color={getSubscriptionBadgeColor()}
                    variant="light"
                    leftIcon={<IconCrown size={12} />}
                  >
                    {userStats.subscriptionPlan.toUpperCase()} MEMBER
                  </Badge>
                </Group>

                <Text color="dimmed" size="sm" mt="xs">
                  {user.email} • Joined {daysSinceJoined} days ago
                </Text>

                <Group spacing="xs" mt="sm">
                  {userStats.badges.map((badge, index) => (
                    <Badge key={index} variant="outline" size="sm">
                      {badge}
                    </Badge>
                  ))}
                </Group>
              </div>
            </Group>

            <Stack align="flex-end">
              <Badge size="lg" color="green" variant="light">
                <IconTrendingUp size={14} /> {formatCurrency(userStats.totalProfit)} GP
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
                  {formatCurrency(userStats.totalProfit)} GP
                </Text>
              </div>
              <IconTrendingUp size={24} color={theme.colors.green[6]} />
            </Group>
          </Card>

          <Card withBorder radius="md" p="md">
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Transactions
                </Text>
                <Text size="xl" weight={700}>
                  {userStats.totalTransactions}
                </Text>
              </div>
              <IconChartLine size={24} color={theme.colors.blue[6]} />
            </Group>
          </Card>

          <Card withBorder radius="md" p="md">
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Avg per Trade
                </Text>
                <Text size="xl" weight={700}>
                  {formatCurrency(Math.round(userStats.totalProfit / userStats.totalTransactions))} GP
                </Text>
              </div>
              <IconCoins size={24} color={theme.colors.yellow[6]} />
            </Group>
          </Card>

          <Card withBorder radius="md" p="md">
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Clan
                </Text>
                <Text size="lg" weight={700}>
                  {userStats.clanName}
                </Text>
              </div>
              <IconShield size={24} color={theme.colors.purple[6]} />
            </Group>
          </Card>
        </SimpleGrid>
      </Grid.Col>

      {/* Profit Chart */}
      <Grid.Col span={8}>
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
                <Tooltip
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
                {userStats.subscriptionStatus.toUpperCase()}
              </Badge>
            </Group>

            <Stack spacing="xs">
              <Group position="apart">
                <Text size="sm">Plan</Text>
                <Text size="sm" weight={600}>{userStats.subscriptionPlan}</Text>
              </Group>
              <Group position="apart">
                <Text size="sm">Expires</Text>
                <Text size="sm" weight={600}>{userStats.subscriptionExpiry}</Text>
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

              <div>
                <Text size="sm" mb="xs">Primary Color</Text>
                <ColorPicker
                  format="hex"
                  value={themeColor}
                  onChange={handleThemeColorChange}
                  swatches={[
                    '#339af0', '#51cf66', '#ff6b6b', '#ffd43b',
                    '#9775fa', '#ff8cc8', '#74c0fc', '#fd7e14'
                  ]}
                  size="sm"
                />
              </div>
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
                <Badge color={userStats.otpEnabled ? 'green' : 'red'} size="sm">
                  {userStats.otpEnabled ? 'ON' : 'OFF'}
                </Badge>
              </Group>

              <Group position="apart">
                <Group spacing="xs">
                  <IconBrandDiscord size={16} />
                  <Text size="sm">Discord</Text>
                </Group>
                <Badge color={userStats.discordConnected ? 'green' : 'gray'} size="sm">
                  {userStats.discordConnected ? 'LINKED' : 'NOT LINKED'}
                </Badge>
              </Group>

              <Group position="apart">
                <Group spacing="xs">
                  <IconMail size={16} />
                  <Text size="sm">Newsletter</Text>
                </Group>
                <Badge color={userStats.mailchimpSubscribed ? 'blue' : 'gray'} size="sm">
                  {userStats.mailchimpSubscribed ? 'SUBSCRIBED' : 'UNSUBSCRIBED'}
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
          onClick={() => authService.logout()}
          size="md"
        >
          Sign Out
        </Button>
      </Grid.Col>
    </Grid>
  </>
}

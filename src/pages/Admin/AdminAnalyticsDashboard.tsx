import React, { useState, useEffect, useRef } from 'react'
import {
  Container,
  Grid,
  Card,
  Title,
  Text,
  Group,
  Stack,
  Badge,
  Progress,
  SimpleGrid,
  ThemeIcon,
  RingProgress,
  ScrollArea,
  Loader,
  Center,
  ActionIcon,
  Select,
  SegmentedControl,
  Paper,
  Alert,
  Button,
  Tooltip,
  Box,
  Indicator
} from '@mantine/core'
import {
  IconUsers,
  IconActivity,
  IconDatabase,
  IconServer,
  IconRefresh,
  IconWifi,
  IconWifiOff,
  IconChartLine,
  IconCpu,
  IconMemory,
  IconClock,
  IconAlertTriangle,
  IconCheck,
  IconTrendingUp,
  IconTrendingDown,
  IconBolt,
  IconNetwork,
  IconApi,
  IconShield,
  IconEye,
  IconUserCheck,
  IconWorldUpload
} from '@tabler/icons-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useAdminAnalytics } from '../../hooks/useRealtimeAnalytics'
import { formatNumber } from '../../utils/formatters'
import { PullToRefreshContainer } from '../../components/PullToRefresh/PullToRefreshContainer'
import { SwipeableChart } from '../../components/SwipeableCard/SwipeableChart'
import RealtimeDashboard from '../../components/RealtimeAnalytics/RealtimeDashboard'

// Real-time metric card component
const MetricCard = ({ 
  title, 
  value, 
  icon, 
  color, 
  trend, 
  trendValue, 
  loading,
  subtitle,
  isLive = false 
}) => {
  const TrendIcon = trend === 'up' ? IconTrendingUp : IconTrendingDown

  return (
    <Card shadow="sm" radius="md" withBorder h="100%">
      <Group position="apart" align="flex-start">
        <div style={{ flex: 1 }}>
          <Group spacing="xs">
            <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
              {title}
            </Text>
            {isLive && (
              <Indicator color="green" processing size={8}>
                <Box />
              </Indicator>
            )}
          </Group>
          {loading ? (
            <Center h={40}>
              <Loader size="sm" />
            </Center>
          ) : (
            <>
              <Text size="xl" fw={900}>
                {typeof value === 'number' 
                  ? formatNumber(value, { compact: true })
                  : value || '0'
                }
              </Text>
              {subtitle && (
                <Text size="xs" color="dimmed">
                  {subtitle}
                </Text>
              )}
            </>
          )}
          {trendValue && !loading && (
            <Group spacing={4} mt={5}>
              <TrendIcon 
                size={14} 
                color={trend === 'up' ? 'green' : 'red'} 
              />
              <Text 
                size="xs" 
                color={trend === 'up' ? 'green' : 'red'}
              >
                {trendValue}
              </Text>
            </Group>
          )}
        </div>
        <ThemeIcon color={color} variant="light" size="lg" radius="md">
          {icon}
        </ThemeIcon>
      </Group>
    </Card>
  )
}

// Performance metrics component
const PerformanceMetrics = ({ metrics }) => {
  if (!metrics) {
    return (
      <Card withBorder radius="md" p="md">
        <Center h={200}>
          <Loader />
        </Center>
      </Card>
    )
  }

  const performanceData = [
    { 
      name: 'API Response', 
      value: metrics.apiResponseTime || 0, 
      max: 1000,
      unit: 'ms',
      color: 'blue' 
    },
    { 
      name: 'Database Query', 
      value: metrics.dbQueryTime || 0, 
      max: 500,
      unit: 'ms',
      color: 'green' 
    },
    { 
      name: 'Cache Hit Rate', 
      value: metrics.cacheHitRate || 0, 
      max: 100,
      unit: '%',
      color: 'orange' 
    },
    { 
      name: 'Error Rate', 
      value: metrics.errorRate || 0, 
      max: 10,
      unit: '%',
      color: 'red' 
    }
  ]

  return (
    <Card withBorder radius="md" p="md">
      <Title order={5} mb="md">Performance Metrics</Title>
      <Stack spacing="sm">
        {performanceData.map((metric) => (
          <div key={metric.name}>
            <Group position="apart" mb={5}>
              <Text size="sm">{metric.name}</Text>
              <Badge color={metric.color} variant="light">
                {formatNumber(metric.value)}{metric.unit}
              </Badge>
            </Group>
            <Progress
              value={(metric.value / metric.max) * 100}
              color={metric.color}
              size="sm"
              radius="xl"
            />
          </div>
        ))}
      </Stack>
    </Card>
  )
}

// Main admin analytics dashboard
export const AdminAnalyticsDashboard = () => {
  const {
    isConnected,
    usePollingFallback,
    connectionError,
    dashboardData,
    events,
    refreshDashboard,
    getStatus
  } = useAdminAnalytics()

  const [timeRange, setTimeRange] = useState('1h')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState('all')
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshDashboard()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, refreshDashboard])

  // Handle manual refresh
  const handleRefresh = async () => {
    await refreshDashboard()
  }

  const connectionStatus = getStatus()
  const isLoading = !dashboardData.userActivity && !connectionError

  // Chart data preparation
  const activityChartData = dashboardData.userActivity?.data || []
  const revenueChartData = dashboardData.revenue?.daily || []
  const methodsChartData = dashboardData.topMethods || []

  // Swipeable charts configuration
  const charts = [
    {
      id: 'activity',
      title: 'User Activity',
      subtitle: 'Active users over time',
      badge: isConnected ? 'Live' : 'Polling',
      badgeColor: isConnected ? 'green' : 'yellow',
      component: (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activityChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="active_users" 
              stroke="#8884d8" 
              fill="#8884d8" 
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      )
    },
    {
      id: 'revenue',
      title: 'Revenue Trends',
      subtitle: 'Daily revenue performance',
      component: (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenueChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="revenue" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      )
    },
    {
      id: 'methods',
      title: 'Top Money Making Methods',
      subtitle: 'Most profitable methods',
      component: (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={methodsChartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={100} />
            <Tooltip />
            <Bar dataKey="profit" fill="#ffc658" />
          </BarChart>
        </ResponsiveContainer>
      )
    }
  ]

  return (
    <PullToRefreshContainer onRefresh={handleRefresh} disabled={!containerRef.current}>
      <Container size="xl" ref={containerRef}>
        <Stack spacing="lg">
          {/* Header */}
          <Group position="apart">
            <div>
              <Title order={2}>Analytics Dashboard</Title>
              <Text color="dimmed" size="sm">
                Real-time system metrics and analytics
              </Text>
            </div>
            <Group>
              <Badge 
                color={isConnected ? 'green' : usePollingFallback ? 'yellow' : 'red'}
                leftSection={isConnected ? <IconWifi size={14} /> : <IconWifiOff size={14} />}
                size="lg"
              >
                {isConnected ? 'Live' : usePollingFallback ? 'Polling' : 'Offline'}
              </Badge>
              <SegmentedControl
                value={timeRange}
                onChange={setTimeRange}
                data={[
                  { label: '1H', value: '1h' },
                  { label: '24H', value: '24h' },
                  { label: '7D', value: '7d' },
                  { label: '30D', value: '30d' }
                ]}
              />
              <ActionIcon
                variant="default"
                size="lg"
                onClick={handleRefresh}
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Group>
          </Group>

          {/* Connection Error */}
          {connectionError && (
            <Alert color="red" icon={<IconAlertTriangle />}>
              {connectionError.message || 'Failed to connect to analytics service'}
            </Alert>
          )}

          {/* Key Metrics */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            <MetricCard
              title="Active Users"
              value={dashboardData.userActivity?.summary?.totalActive || 0}
              icon={<IconUsers size={20} />}
              color="blue"
              trend="up"
              trendValue="+12.5%"
              loading={isLoading}
              isLive={isConnected}
            />
            <MetricCard
              title="Total Sessions"
              value={dashboardData.userActivity?.summary?.totalSessions || 0}
              icon={<IconActivity size={20} />}
              color="green"
              trend="up"
              trendValue="+8.3%"
              loading={isLoading}
              subtitle="Last 24 hours"
            />
            <MetricCard
              title="API Calls"
              value={dashboardData.apiMetrics?.totalCalls || 0}
              icon={<IconApi size={20} />}
              color="orange"
              trend="down"
              trendValue="-3.2%"
              loading={isLoading}
              isLive={isConnected}
            />
            <MetricCard
              title="System Load"
              value={dashboardData.systemMetrics?.cpuUsage 
                ? `${Math.round(dashboardData.systemMetrics.cpuUsage)}%`
                : '0%'
              }
              icon={<IconCpu size={20} />}
              color="red"
              loading={isLoading}
              subtitle="CPU Usage"
            />
          </SimpleGrid>

          {/* Charts Section */}
          <Grid>
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <SwipeableChart
                charts={charts}
                showDots={true}
                showHints={true}
                height={400}
                onChartChange={(index, chart) => {
                  console.log('Chart changed to:', chart.title)
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Stack spacing="md">
                <PerformanceMetrics metrics={dashboardData.performance} />
                <ConnectionStatusCard status={connectionStatus} />
              </Stack>
            </Grid.Col>
          </Grid>

          {/* System Health Grid */}
          <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
            <SystemResourceCard 
              title="Memory Usage"
              icon={<IconMemory />}
              metrics={dashboardData.systemMetrics?.memory}
            />
            <DatabaseHealthCard 
              metrics={dashboardData.databaseMetrics}
            />
            <SecurityMetricsCard 
              metrics={dashboardData.securityMetrics}
            />
          </SimpleGrid>

          {/* Real-time Events */}
          <Card withBorder radius="md" p="md">
            <Group position="apart" mb="md">
              <Title order={5}>Real-time Events</Title>
              <Badge>{events.length} events</Badge>
            </Group>
            <ScrollArea h={200}>
              <Stack spacing="xs">
                {events.slice(-10).reverse().map((event, index) => (
                  <EventItem key={index} event={event} />
                ))}
              </Stack>
            </ScrollArea>
          </Card>

          {/* Embedded Realtime Dashboard */}
          <Card withBorder radius="md" p="md">
            <Title order={5} mb="md">Detailed Analytics</Title>
            <RealtimeDashboard />
          </Card>
        </Stack>
      </Container>
    </PullToRefreshContainer>
  )
}

// Helper components
const ConnectionStatusCard = ({ status }) => (
  <Card withBorder radius="md" p="md">
    <Title order={5} mb="md">Connection Status</Title>
    <Stack spacing="xs">
      <Group position="apart">
        <Text size="sm">Total Connections</Text>
        <Badge>{status.totalConnections || 0}</Badge>
      </Group>
      <Group position="apart">
        <Text size="sm">Authenticated</Text>
        <Badge color="green">{status.authenticatedConnections || 0}</Badge>
      </Group>
      <Group position="apart">
        <Text size="sm">Admin Users</Text>
        <Badge color="orange">{status.adminConnections || 0}</Badge>
      </Group>
      <Group position="apart">
        <Text size="sm">Buffered Events</Text>
        <Badge color="blue">{status.bufferedEvents || 0}</Badge>
      </Group>
    </Stack>
  </Card>
)

const SystemResourceCard = ({ title, icon, metrics }) => (
  <Card withBorder radius="md" p="md">
    <Group position="apart" mb="md">
      <Title order={5}>{title}</Title>
      <ThemeIcon variant="light">{icon}</ThemeIcon>
    </Group>
    {metrics ? (
      <Stack spacing="xs">
        <RingProgress
          size={120}
          thickness={12}
          sections={[
            { 
              value: Math.round((metrics.heapUsed / metrics.heapTotal) * 100), 
              color: 'blue' 
            }
          ]}
          label={
            <Text size="sm" align="center">
              {Math.round((metrics.heapUsed / metrics.heapTotal) * 100)}%
            </Text>
          }
        />
        <Text size="xs" color="dimmed" align="center">
          {formatNumber(metrics.heapUsed / 1024 / 1024)}MB / {formatNumber(metrics.heapTotal / 1024 / 1024)}MB
        </Text>
      </Stack>
    ) : (
      <Center h={150}>
        <Loader />
      </Center>
    )}
  </Card>
)

const DatabaseHealthCard = ({ metrics }) => (
  <Card withBorder radius="md" p="md">
    <Group position="apart" mb="md">
      <Title order={5}>Database Health</Title>
      <ThemeIcon variant="light" color="green">
        <IconDatabase />
      </ThemeIcon>
    </Group>
    {metrics ? (
      <Stack spacing="xs">
        <Group position="apart">
          <Text size="sm">Connections</Text>
          <Badge color="green">{metrics.connectionCount || 0}</Badge>
        </Group>
        <Group position="apart">
          <Text size="sm">Query Time</Text>
          <Badge color="blue">{metrics.avgQueryTime || 0}ms</Badge>
        </Group>
        <Group position="apart">
          <Text size="sm">Active Queries</Text>
          <Badge color="orange">{metrics.activeQueries || 0}</Badge>
        </Group>
      </Stack>
    ) : (
      <Center h={100}>
        <Loader />
      </Center>
    )}
  </Card>
)

const SecurityMetricsCard = ({ metrics }) => (
  <Card withBorder radius="md" p="md">
    <Group position="apart" mb="md">
      <Title order={5}>Security Metrics</Title>
      <ThemeIcon variant="light" color="red">
        <IconShield />
      </ThemeIcon>
    </Group>
    {metrics ? (
      <Stack spacing="xs">
        <Group position="apart">
          <Text size="sm">Failed Logins</Text>
          <Badge color="red">{metrics.failedLogins || 0}</Badge>
        </Group>
        <Group position="apart">
          <Text size="sm">Rate Limited</Text>
          <Badge color="orange">{metrics.rateLimited || 0}</Badge>
        </Group>
        <Group position="apart">
          <Text size="sm">Blocked IPs</Text>
          <Badge color="red">{metrics.blockedIPs || 0}</Badge>
        </Group>
      </Stack>
    ) : (
      <Center h={100}>
        <Loader />
      </Center>
    )}
  </Card>
)

const EventItem = ({ event }) => {
  const getEventIcon = () => {
    switch (event.type) {
      case 'user_activity': return <IconUserCheck size={16} />
      case 'price_update': return <IconChartLine size={16} />
      case 'method_update': return <IconBolt size={16} />
      case 'system_metric': return <IconCpu size={16} />
      default: return <IconActivity size={16} />
    }
  }

  const getEventColor = () => {
    switch (event.type) {
      case 'user_activity': return 'blue'
      case 'price_update': return 'green'
      case 'method_update': return 'orange'
      case 'system_metric': return 'red'
      default: return 'gray'
    }
  }

  return (
    <Group spacing="sm" noWrap>
      <ThemeIcon size="sm" variant="light" color={getEventColor()}>
        {getEventIcon()}
      </ThemeIcon>
      <div style={{ flex: 1 }}>
        <Text size="sm" lineClamp={1}>
          {event.data.action || event.data.message || event.type}
        </Text>
        <Text size="xs" color="dimmed">
          {new Date(event.timestamp).toLocaleTimeString()}
        </Text>
      </div>
    </Group>
  )
}

export default AdminAnalyticsDashboard
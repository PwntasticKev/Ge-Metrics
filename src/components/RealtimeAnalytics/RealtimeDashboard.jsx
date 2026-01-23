import React, { useState, useEffect } from 'react'
import {
  Card,
  Grid,
  Group,
  Text,
  Badge,
  Stack,
  Title,
  Button,
  Alert,
  Center,
  Loader,
  Progress,
  Tooltip,
  ActionIcon,
  RingProgress,
  SimpleGrid
} from '@mantine/core'
import {
  IconUsers,
  IconActivity,
  IconServer,
  IconRefresh,
  IconWifi,
  IconWifiOff,
  IconChartLine,
  IconDatabase,
  IconCpu,
  IconMemory,
  IconNetworkOff,
  IconAlertTriangle
} from '@tabler/icons-react'
import { useAdminAnalytics } from '../../hooks/useRealtimeAnalytics'
import { formatNumber } from '../../utils/formatters'

const RealtimeDashboard = () => {
  const {
    isConnected,
    usePollingFallback,
    connectionError,
    dashboardData,
    events,
    refreshDashboard,
    getStatus
  } = useAdminAnalytics()

  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshDashboard()
      setLastRefresh(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshDashboard])

  const handleManualRefresh = () => {
    refreshDashboard()
    setLastRefresh(new Date())
  }

  const connectionStatus = getStatus()

  return (
    <Stack spacing="lg">
      {/* Header */}
      <Group position="apart">
        <div>
          <Title order={2}>Real-time Analytics Dashboard</Title>
          <Text color="dimmed" size="sm">
            Live monitoring of system performance and user activity
          </Text>
        </div>
        <Group>
          <ConnectionStatusIndicator
            isConnected={isConnected}
            usePollingFallback={usePollingFallback}
            error={connectionError}
          />
          <Button
            leftIcon={<IconRefresh size={16} />}
            onClick={handleManualRefresh}
            variant="light"
            size="sm"
          >
            Refresh
          </Button>
        </Group>
      </Group>

      {/* Connection Error Alert */}
      {connectionError && (
        <Alert color="red" icon={<IconAlertTriangle size={16} />}>
          Connection Error: {connectionError.message || 'Failed to connect to analytics service'}
        </Alert>
      )}

      {/* Main Metrics Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <ConnectionStatsCard connectionStatus={connectionStatus} />
        <UserActivityCard userActivity={dashboardData.userActivity} />
        <SystemPerformanceCard systemMetrics={dashboardData.systemMetrics} />
        <RecentEventsCard events={events} />
      </SimpleGrid>

      {/* Detailed Charts Row */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <UserActivityChart data={dashboardData.userActivity?.data || []} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <SystemHealthCard systemMetrics={dashboardData.systemMetrics} />
        </Grid.Col>
      </Grid>

      {/* Footer Info */}
      <Group position="apart">
        <Text size="xs" color="dimmed">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </Text>
        <Group spacing="xs">
          <Text size="xs" color="dimmed">Auto-refresh:</Text>
          <Button
            size="xs"
            variant={autoRefresh ? 'filled' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </Group>
      </Group>
    </Stack>
  )
}

const ConnectionStatusIndicator = ({ isConnected, usePollingFallback, error }) => {
  let color = 'red'
  let icon = <IconNetworkOff size={16} />
  let label = 'Disconnected'

  if (isConnected) {
    color = 'green'
    icon = <IconWifi size={16} />
    label = 'WebSocket Connected'
  } else if (usePollingFallback) {
    color = 'yellow'
    icon = <IconActivity size={16} />
    label = 'Polling Mode'
  }

  return (
    <Tooltip label={error ? error.message : label}>
      <Badge color={color} leftSection={icon} size="lg">
        {label}
      </Badge>
    </Tooltip>
  )
}

const ConnectionStatsCard = ({ connectionStatus }) => {
  const { totalConnections = 0, authenticatedConnections = 0, adminConnections = 0 } = connectionStatus

  return (
    <Card withBorder p="md">
      <Group position="apart" mb="xs">
        <Text weight={500} size="sm" color="dimmed">
          WebSocket Connections
        </Text>
        <IconUsers size={18} color="blue" />
      </Group>

      <Stack spacing="xs">
        <div>
          <Text size="xl" weight={700}>
            {formatNumber(totalConnections)}
          </Text>
          <Text size="xs" color="dimmed">Total Active</Text>
        </div>
        
        <Group grow>
          <div>
            <Text size="sm" weight={600} color="green">
              {formatNumber(authenticatedConnections)}
            </Text>
            <Text size="xs" color="dimmed">Authenticated</Text>
          </div>
          <div>
            <Text size="sm" weight={600} color="orange">
              {formatNumber(adminConnections)}
            </Text>
            <Text size="xs" color="dimmed">Admins</Text>
          </div>
        </Group>
      </Stack>
    </Card>
  )
}

const UserActivityCard = ({ userActivity }) => {
  if (!userActivity?.data?.length) {
    return (
      <Card withBorder p="md">
        <Center h={120}>
          <Stack align="center" spacing="xs">
            <Loader size="sm" />
            <Text size="sm" color="dimmed">Loading user activity...</Text>
          </Stack>
        </Center>
      </Card>
    )
  }

  const latestHour = userActivity.data[0] || {}
  const activeUsers = latestHour.active_users || 0
  const totalSessions = latestHour.total_sessions || 0

  return (
    <Card withBorder p="md">
      <Group position="apart" mb="xs">
        <Text weight={500} size="sm" color="dimmed">
          User Activity (Last Hour)
        </Text>
        <IconActivity size={18} color="green" />
      </Group>

      <Stack spacing="xs">
        <div>
          <Text size="xl" weight={700} color="green">
            {formatNumber(activeUsers)}
          </Text>
          <Text size="xs" color="dimmed">Active Users</Text>
        </div>
        
        <div>
          <Text size="sm" weight={600}>
            {formatNumber(totalSessions)}
          </Text>
          <Text size="xs" color="dimmed">Total Sessions</Text>
        </div>
      </Stack>
    </Card>
  )
}

const SystemPerformanceCard = ({ systemMetrics }) => {
  if (!systemMetrics?.memory) {
    return (
      <Card withBorder p="md">
        <Center h={120}>
          <Stack align="center" spacing="xs">
            <Loader size="sm" />
            <Text size="sm" color="dimmed">Loading system metrics...</Text>
          </Stack>
        </Center>
      </Card>
    )
  }

  const { memory, process } = systemMetrics
  const memoryUsagePercent = Math.round((memory.heapUsed / memory.heapTotal) * 100)
  const uptimeHours = Math.round(process.uptime / 3600)

  return (
    <Card withBorder p="md">
      <Group position="apart" mb="xs">
        <Text weight={500} size="sm" color="dimmed">
          System Performance
        </Text>
        <IconServer size={18} color="orange" />
      </Group>

      <Stack spacing="xs">
        <div>
          <Group spacing="xs">
            <Text size="lg" weight={700}>
              {memoryUsagePercent}%
            </Text>
            <Progress value={memoryUsagePercent} size="sm" style={{ flex: 1 }} />
          </Group>
          <Text size="xs" color="dimmed">Memory Usage</Text>
        </div>
        
        <div>
          <Text size="sm" weight={600}>
            {uptimeHours}h
          </Text>
          <Text size="xs" color="dimmed">Uptime</Text>
        </div>
      </Stack>
    </Card>
  )
}

const RecentEventsCard = ({ events }) => {
  const recentEvents = events.slice(-5).reverse()

  return (
    <Card withBorder p="md">
      <Group position="apart" mb="xs">
        <Text weight={500} size="sm" color="dimmed">
          Recent Events
        </Text>
        <IconChartLine size={18} color="violet" />
      </Group>

      <Stack spacing="xs" style={{ height: 90, overflow: 'hidden' }}>
        {recentEvents.length > 0 ? (
          recentEvents.map((event, index) => (
            <Group key={index} spacing="xs" noWrap>
              <Badge size="xs" color={getEventColor(event.type)}>
                {event.type}
              </Badge>
              <Text size="xs" color="dimmed" truncate>
                {getEventDescription(event)}
              </Text>
            </Group>
          ))
        ) : (
          <Text size="xs" color="dimmed" italic>
            No recent events
          </Text>
        )}
      </Stack>
    </Card>
  )
}

const UserActivityChart = ({ data }) => {
  if (!data.length) {
    return (
      <Card withBorder p="md">
        <Title order={4} mb="md">User Activity Timeline</Title>
        <Center h={200}>
          <Text color="dimmed">No activity data available</Text>
        </Center>
      </Card>
    )
  }

  return (
    <Card withBorder p="md">
      <Title order={4} mb="md">User Activity Timeline (Last 24h)</Title>
      {/* Simplified chart - in production, use recharts or similar */}
      <Stack spacing="xs">
        {data.slice(0, 8).map((item, index) => (
          <Group key={index} position="apart">
            <Text size="sm">
              {new Date(item.hour).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
            <Group spacing="md">
              <Badge variant="light" color="blue">
                {formatNumber(item.active_users)} users
              </Badge>
              <Badge variant="light" color="green">
                {formatNumber(item.total_sessions)} sessions
              </Badge>
            </Group>
          </Group>
        ))}
      </Stack>
    </Card>
  )
}

const SystemHealthCard = ({ systemMetrics }) => {
  if (!systemMetrics) {
    return (
      <Card withBorder p="md">
        <Title order={4} mb="md">System Health</Title>
        <Center h={200}>
          <Loader />
        </Center>
      </Card>
    )
  }

  const { memory, database, websocket } = systemMetrics
  const memoryUsage = Math.round((memory.heapUsed / memory.heapTotal) * 100)

  return (
    <Card withBorder p="md">
      <Title order={4} mb="md">System Health</Title>
      
      <Stack spacing="md">
        <Group position="apart">
          <Group spacing="xs">
            <IconMemory size={16} />
            <Text size="sm">Memory</Text>
          </Group>
          <RingProgress
            size={60}
            thickness={6}
            sections={[{ value: memoryUsage, color: memoryUsage > 80 ? 'red' : 'blue' }]}
            label={
              <Text size="xs" align="center">
                {memoryUsage}%
              </Text>
            }
          />
        </Group>

        <Group position="apart">
          <Group spacing="xs">
            <IconDatabase size={16} />
            <Text size="sm">Database</Text>
          </Group>
          <Badge color="green" variant="light">
            {formatNumber(database?.connectionCount || 0)} connections
          </Badge>
        </Group>

        <Group position="apart">
          <Group spacing="xs">
            <IconWifi size={16} />
            <Text size="sm">WebSocket</Text>
          </Group>
          <Badge color="blue" variant="light">
            {formatNumber(websocket?.totalConnections || 0)} active
          </Badge>
        </Group>
      </Stack>
    </Card>
  )
}

// Utility functions
const getEventColor = (type) => {
  const colors = {
    user_activity: 'blue',
    price_update: 'green',
    method_update: 'orange',
    system_metric: 'red'
  }
  return colors[type] || 'gray'
}

const getEventDescription = (event) => {
  switch (event.type) {
    case 'user_activity':
      return `User ${event.data.action} on ${event.data.page}`
    case 'price_update':
      return `Price updated for item ${event.data.itemId}`
    case 'method_update':
      return `Method "${event.data.methodName}" was ${event.data.status}`
    case 'system_metric':
      return `System metric updated`
    default:
      return 'Unknown event'
  }
}

export default RealtimeDashboard
import React, { useState, useEffect } from 'react'
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Button,
  Stack,
  SimpleGrid,
  Paper,
  Alert,
  Loader,
  Center,
  Box,
  ThemeIcon,
  Divider
} from '@mantine/core'
import {
  IconActivity,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconRefresh,
  IconApi,
  IconClock
} from '@tabler/icons-react'

const ApiStatus = () => {
  const [apiStatus, setApiStatus] = useState({})
  const [overallStatus, setOverallStatus] = useState('checking')
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)

  const checkEndpoint = async (url, name) => {
    const startTime = Date.now()
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors'
      })

      const latency = Date.now() - startTime
      const status = response.ok ? 'online' : 'offline'

      return {
        status,
        latency,
        lastCheck: new Date(),
        error: response.ok ? null : `HTTP ${response.status}`
      }
    } catch (error) {
      const latency = Date.now() - startTime
      return {
        status: 'offline',
        latency,
        lastCheck: new Date(),
        error: error.message
      }
    }
  }

  const checkAllEndpoints = async () => {
    setIsLoading(true)
    const endpoints = [
      { name: 'OSRS Wiki - Latest Prices', url: 'https://prices.runescape.wiki/api/v1/osrs/latest', group: 'OSRS Wiki' },
      { name: 'OSRS Wiki - 5m Timestamps', url: 'https://prices.runescape.wiki/api/v1/osrs/5m', group: 'OSRS Wiki' },
      { name: 'OSRS Wiki - Item Mapping', url: 'https://prices.runescape.wiki/api/v1/osrs/mapping', group: 'OSRS Wiki' },
      { name: 'OSRS Wiki - 24h Volumes', url: 'https://prices.runescape.wiki/api/v1/osrs/24h', group: 'OSRS Wiki' },
      { name: 'OSRS Wiki - Real-time Volumes', url: 'https://prices.runescape.wiki/api/v1/osrs/volumes', group: 'OSRS Wiki' },
      { name: 'OSRS Wiki - Timeseries', url: 'https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=1h&id=4151', group: 'OSRS Wiki' },
      { name: 'OSRS Wiki - 1h Data', url: 'https://prices.runescape.wiki/api/v1/osrs/1h', group: 'OSRS Wiki' }
    ]

    const results = {}

    // Check all endpoints in parallel
    const promises = endpoints.map(async (endpoint) => {
      const result = await checkEndpoint(endpoint.url, endpoint.name)
      results[endpoint.name] = result
    })

    await Promise.all(promises)

    setApiStatus(results)

    // Determine overall status
    const statuses = Object.values(results).map(r => r.status)
    if (statuses.every(s => s === 'online')) {
      setOverallStatus('online')
    } else if (statuses.some(s => s === 'online')) {
      setOverallStatus('partial')
    } else {
      setOverallStatus('offline')
    }

    setLastUpdate(new Date())
    setIsLoading(false)
  }

  useEffect(() => {
    checkAllEndpoints()

    // Check every 30 seconds
    const interval = setInterval(checkAllEndpoints, 30000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'green'
      case 'offline': return 'red'
      case 'partial': return 'yellow'
      case 'checking': return 'gray'
      default: return 'gray'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return 'All Systems Operational'
      case 'offline': return 'All Systems Down'
      case 'partial': return 'Partial Outage'
      case 'checking': return 'Checking Status...'
      default: return 'Unknown Status'
    }
  }

  const formatLatency = (latency) => {
    if (latency === null) return 'N/A'
    if (latency < 100) return `${latency}ms (Excellent)`
    if (latency < 300) return `${latency}ms (Good)`
    if (latency < 1000) return `${latency}ms (Fair)`
    return `${latency}ms (Slow)`
  }

  const getLatencyColor = (latency) => {
    if (latency === null) return 'gray'
    if (latency < 100) return 'green'
    if (latency < 300) return 'lime'
    if (latency < 1000) return 'yellow'
    return 'red'
  }

  return (
    <Container size="xl" py="xl">
      {/* Header */}
      <Group position="apart" mb="xl">
        <div>
          <Title order={1} mb="xs">API Status</Title>
          <Text color="dimmed">Monitor OSRS Wiki API endpoints and performance</Text>
        </div>
        <Button
          leftIcon={<IconRefresh size={18} />}
          onClick={checkAllEndpoints}
          loading={isLoading}
          variant="light"
        >
          Refresh
        </Button>
      </Group>

      {/* Overall Status Card */}
      <Card shadow="sm" radius="md" withBorder mb="xl" style={{
        background: overallStatus === 'online' 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
          : overallStatus === 'partial'
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)'
          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)'
      }}>
        <Group position="apart" align="center">
          <Group>
            <ThemeIcon
              size={60}
              radius="md"
              variant="light"
              color={getStatusColor(overallStatus)}
            >
              {overallStatus === 'online' ? (
                <IconCheck size={30} />
              ) : overallStatus === 'offline' ? (
                <IconX size={30} />
              ) : (
                <IconActivity size={30} />
              )}
            </ThemeIcon>
            <div>
              <Text size="lg" weight={700} color={getStatusColor(overallStatus)}>
                {getStatusText(overallStatus)}
              </Text>
              <Text size="sm" color="dimmed" mt={4}>
                Last updated: {lastUpdate.toLocaleString()}
              </Text>
            </div>
          </Group>
          <Badge size="lg" color={getStatusColor(overallStatus)} variant="filled">
            {overallStatus.toUpperCase()}
          </Badge>
        </Group>
      </Card>

      {/* API Endpoints Grid */}
      {isLoading && Object.keys(apiStatus).length === 0 ? (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      ) : (
        <SimpleGrid cols={1} breakpoints={[{ minWidth: 'md', cols: 2 }, { minWidth: 'lg', cols: 3 }]} spacing="md" mb="xl">
          {Object.entries(apiStatus).map(([serviceName, service]) => (
            <Card key={serviceName} shadow="sm" radius="md" withBorder>
              <Group position="apart" align="flex-start" mb="md">
                <Group spacing="xs">
                  <ThemeIcon size="md" radius="md" variant="light" color={getStatusColor(service.status)}>
                    <IconApi size={18} />
                  </ThemeIcon>
                  <div>
                    <Text weight={600} size="sm" lineClamp={2}>
                      {serviceName}
                    </Text>
                  </div>
                </Group>
                <Badge color={getStatusColor(service.status)} variant="dot">
                  {service.status}
                </Badge>
              </Group>

              <Divider mb="md" />

              <Stack spacing="xs">
                <Group position="apart">
                  <Text size="xs" color="dimmed">Response Time</Text>
                  <Badge size="sm" color={getLatencyColor(service.latency)} variant="light">
                    {formatLatency(service.latency)}
                  </Badge>
                </Group>

                <Group position="apart">
                  <Text size="xs" color="dimmed">Last Check</Text>
                  <Group spacing={4}>
                    <IconClock size={14} />
                    <Text size="xs">
                      {service.lastCheck ? service.lastCheck.toLocaleTimeString() : 'Never'}
                    </Text>
                  </Group>
                </Group>

                {service.error && (
                  <Alert icon={<IconAlertCircle size={16} />} color="red" size="sm" mt="xs">
                    <Text size="xs">{service.error}</Text>
                  </Alert>
                )}
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Info Section */}
      <Paper shadow="sm" radius="md" p="md" withBorder>
        <Title order={3} mb="md">About This Status Page</Title>
        <Text size="sm" color="dimmed" mb="lg">
          This page monitors the availability and performance of the OSRS Wiki API endpoints
          that power the GE Metrics application. Status checks are performed every 30 seconds.
        </Text>

        <SimpleGrid cols={1} breakpoints={[{ minWidth: 'md', cols: 2 }]} spacing="md">
          <Box>
            <Title order={4} size="sm" mb="sm">Monitored Endpoints</Title>
            <Stack spacing="xs">
              <Text size="xs"><strong>Latest Prices:</strong> Real-time item pricing data</Text>
              <Text size="xs"><strong>Item Mapping:</strong> Item ID to name mappings</Text>
              <Text size="xs"><strong>Timeseries:</strong> Historical price data</Text>
              <Text size="xs"><strong>5-Minute Data:</strong> 5-minute interval data</Text>
              <Text size="xs"><strong>1-Hour Data:</strong> 1-hour interval data</Text>
              <Text size="xs"><strong>24h Volumes:</strong> 24-hour trading volumes</Text>
              <Text size="xs"><strong>Real-time Volumes:</strong> Current trading volumes</Text>
            </Stack>
          </Box>

          <Box>
            <Title order={4} size="sm" mb="sm">Status Legend</Title>
            <Stack spacing="xs">
              <Group spacing="xs">
                <Badge color="green" variant="dot" size="sm">Online</Badge>
                <Text size="xs">Service is operational</Text>
              </Group>
              <Group spacing="xs">
                <Badge color="yellow" variant="dot" size="sm">Partial</Badge>
                <Text size="xs">Some services are down</Text>
              </Group>
              <Group spacing="xs">
                <Badge color="red" variant="dot" size="sm">Offline</Badge>
                <Text size="xs">Service is unavailable</Text>
              </Group>
              <Group spacing="xs">
                <Badge color="gray" variant="dot" size="sm">Checking</Badge>
                <Text size="xs">Status being verified</Text>
              </Group>
            </Stack>
          </Box>
        </SimpleGrid>
      </Paper>
    </Container>
  )
}

export default ApiStatus


import React, { useState, useEffect } from 'react'
import {
  Container,
  Title,
  Grid,
  Card,
  Text,
  Button,
  Table,
  Badge,
  Group,
  TextInput,
  Select,
  Stack,
  Tabs,
  Alert,
  ActionIcon,
  Tooltip,
  Progress,
  ScrollArea,
  Paper,
  Center,
  LoadingOverlay,
  Timeline,
  ThemeIcon,
  Divider,
  Menu,
  Modal,
  Code,
  JsonInput,
  NumberInput,
  Switch,
  RingProgress,
  SimpleGrid,
  Textarea
} from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import {
  IconShield,
  IconAlertTriangle,
  IconUsers,
  IconEye,
  IconBan,
  IconSearch,
  IconFilter,
  IconDownload,
  IconRefresh,
  IconClock,
  IconMapPin,
  IconDevices,
  IconKey,
  IconLock,
  IconLockOpen,
  IconUserX,
  IconLogin,
  IconLogout,
  IconFingerprint,
  IconNetwork,
  IconBug,
  IconExclamationMark,
  IconCheck,
  IconX,
  IconDots,
  IconChartLine,
  IconActivity,
  IconDatabase,
  IconServer,
  IconWorldWww,
  IconMail,
  IconPhone,
  IconCalendar,
  IconClock2,
  IconTrendingUp,
  IconTrendingDown
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

// Mock security service
const securityService = {
  getLogs: () => [
    {
      id: 1,
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      level: 'high',
      category: 'authentication',
      action: 'failed_login',
      userId: 123,
      userName: 'john.doe@example.com',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'New York, US',
      description: 'Multiple failed login attempts detected',
      details: {
        attempts: 5,
        timeWindow: '5 minutes',
        blocked: true,
        reason: 'Brute force protection triggered'
      },
      resolved: false,
      assignedTo: null
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      level: 'medium',
      category: 'access',
      action: 'unauthorized_access',
      userId: 456,
      userName: 'jane.smith@example.com',
      ipAddress: '10.0.0.50',
      userAgent: 'curl/7.68.0',
      location: 'Unknown',
      description: 'Attempted access to admin endpoint without proper permissions',
      details: {
        endpoint: '/admin/users',
        method: 'POST',
        statusCode: 403,
        userRole: 'user'
      },
      resolved: true,
      assignedTo: 'admin@ge-metrics.com'
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      level: 'low',
      category: 'session',
      action: 'session_expired',
      userId: 789,
      userName: 'bob.wilson@example.com',
      ipAddress: '203.0.113.1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      location: 'California, US',
      description: 'User session expired due to inactivity',
      details: {
        sessionDuration: '2 hours',
        lastActivity: '30 minutes ago',
        autoLogout: true
      },
      resolved: true,
      assignedTo: null
    },
    {
      id: 4,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      level: 'critical',
      category: 'system',
      action: 'sql_injection_attempt',
      userId: null,
      userName: 'Anonymous',
      ipAddress: '198.51.100.42',
      userAgent: 'sqlmap/1.6.12',
      location: 'Unknown',
      description: 'SQL injection attempt detected in search parameter',
      details: {
        parameter: 'search',
        payload: "' OR 1=1 --",
        blocked: true,
        wafTriggered: true
      },
      resolved: false,
      assignedTo: 'security@ge-metrics.com'
    },
    {
      id: 5,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      level: 'high',
      category: 'data',
      action: 'data_export',
      userId: 101,
      userName: 'admin@ge-metrics.com',
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      location: 'New York, US',
      description: 'Large data export performed',
      details: {
        recordCount: 10000,
        dataType: 'user_data',
        exportFormat: 'CSV',
        fileSize: '2.5 MB'
      },
      resolved: true,
      assignedTo: null
    }
  ],

  getSecurityMetrics: () => ({
    totalEvents: 1247,
    criticalEvents: 12,
    highEvents: 45,
    mediumEvents: 156,
    lowEvents: 1034,
    resolvedEvents: 1189,
    unresolvedEvents: 58,
    todayEvents: 89,
    weekEvents: 567,
    monthEvents: 1247,
    topThreats: [
      { type: 'Brute Force', count: 23, trend: 'up' },
      { type: 'SQL Injection', count: 8, trend: 'down' },
      { type: 'XSS Attempt', count: 15, trend: 'stable' },
      { type: 'Unauthorized Access', count: 34, trend: 'up' }
    ],
    topCountries: [
      { country: 'United States', count: 456, percentage: 36.6 },
      { country: 'China', count: 234, percentage: 18.8 },
      { country: 'Russia', count: 123, percentage: 9.9 },
      { country: 'Brazil', count: 89, percentage: 7.1 }
    ],
    hourlyActivity: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      events: Math.floor(Math.random() * 50) + 10
    }))
  }),

  blockIP: async (ipAddress, reason) => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return { success: true }
  },

  resolveEvent: async (eventId, resolution) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true }
  },

  assignEvent: async (eventId, assignee) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true }
  }
}

export default function SecurityLogs () {
  const [logs, setLogs] = useState([])
  const [metrics, setMetrics] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('logs')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // Modals
  const [detailsModalOpened, setDetailsModalOpened] = useState(false)
  const [blockIPModalOpened, setBlockIPModalOpened] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [blockReason, setBlockReason] = useState('')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [logsData, metricsData] = await Promise.all([
        securityService.getLogs(),
        securityService.getSecurityMetrics()
      ])

      setLogs(logsData)
      setMetrics(metricsData)
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load security data',
        color: 'red',
        icon: <IconX size={16} />
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBlockIP = async () => {
    if (!selectedLog) return

    try {
      const result = await securityService.blockIP(selectedLog.ipAddress, blockReason)

      if (result.success) {
        notifications.show({
          title: 'IP Blocked',
          message: `Successfully blocked IP ${selectedLog.ipAddress}`,
          color: 'green',
          icon: <IconCheck size={16} />
        })

        setBlockIPModalOpened(false)
        setBlockReason('')
        loadData()
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to block IP address',
        color: 'red',
        icon: <IconX size={16} />
      })
    }
  }

  const handleResolveEvent = async (eventId) => {
    try {
      const result = await securityService.resolveEvent(eventId, 'Resolved by admin')

      if (result.success) {
        notifications.show({
          title: 'Event Resolved',
          message: 'Security event marked as resolved',
          color: 'green',
          icon: <IconCheck size={16} />
        })

        loadData()
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to resolve event',
        color: 'red',
        icon: <IconX size={16} />
      })
    }
  }

  const getLevelBadge = (level) => {
    const configs = {
      critical: { color: 'red', label: 'Critical' },
      high: { color: 'orange', label: 'High' },
      medium: { color: 'yellow', label: 'Medium' },
      low: { color: 'blue', label: 'Low' }
    }

    const config = configs[level] || configs.low
    return (
      <Badge size="sm" color={config.color}>
        {config.label}
      </Badge>
    )
  }

  const getCategoryIcon = (category) => {
    const icons = {
      authentication: <IconLogin size={16} />,
      access: <IconLock size={16} />,
      session: <IconClock size={16} />,
      system: <IconServer size={16} />,
      data: <IconDatabase size={16} />,
      network: <IconNetwork size={16} />
    }

    return icons[category] || <IconShield size={16} />
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery)

    const matchesLevel = !levelFilter || log.level === levelFilter
    const matchesCategory = !categoryFilter || log.category === categoryFilter
    const matchesStatus = !statusFilter ||
      (statusFilter === 'resolved' && log.resolved) ||
      (statusFilter === 'unresolved' && !log.resolved)

    return matchesSearch && matchesLevel && matchesCategory && matchesStatus
  })

  return (
    <Container size="xl" py="md">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Security Logs</Title>
          <Text size="sm" color="dimmed">
            Monitor security events and threats in real-time
          </Text>
        </div>
        <Group>
          <Button
            leftIcon={<IconRefresh size={16} />}
            onClick={loadData}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            variant="light"
            leftIcon={<IconDownload size={16} />}
            onClick={() => notifications.show({ title: 'Export Started', message: 'Security logs export initiated' })}
          >
            Export Logs
          </Button>
        </Group>
      </Group>

      <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? 'events')}>
        <Tabs.List>
          <Tabs.Tab value="logs" leftIcon={<IconActivity size={16} />}>
            Security Events ({filteredLogs.length})
          </Tabs.Tab>
          <Tabs.Tab value="analytics" leftIcon={<IconChartLine size={16} />}>
            Analytics
          </Tabs.Tab>
          <Tabs.Tab value="threats" leftIcon={<IconAlertTriangle size={16} />}>
            Threat Intelligence
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="logs" pt="md">
          {/* Filters */}
          <Card withBorder mb="md">
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <TextInput
                  placeholder="Search logs..."
                  leftIcon={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value ?? '')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Level"
                  data={[
                    { value: '', label: 'All Levels' },
                    { value: 'critical', label: 'Critical' },
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' }
                  ]}
                  value={levelFilter}
                  onChange={(value) => setLevelFilter(value ?? '')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Category"
                  data={[
                    { value: '', label: 'All Categories' },
                    { value: 'authentication', label: 'Authentication' },
                    { value: 'access', label: 'Access Control' },
                    { value: 'session', label: 'Session' },
                    { value: 'system', label: 'System' },
                    { value: 'data', label: 'Data' },
                    { value: 'network', label: 'Network' }
                  ]}
                  value={categoryFilter}
                  onChange={(value) => setCategoryFilter(value ?? '')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Status"
                  data={[
                    { value: '', label: 'All Status' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'unresolved', label: 'Unresolved' }
                  ]}
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value ?? '')}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Button
                  variant="light"
                  leftIcon={<IconFilter size={16} />}
                  onClick={() => {
                    setSearchQuery('')
                    setLevelFilter('')
                    setCategoryFilter('')
                    setStatusFilter('')
                  }}
                >
                  Clear
                </Button>
              </Grid.Col>
            </Grid>
          </Card>

          {/* Security Events Table */}
          <Card withBorder>
            <ScrollArea>
              <Table highlightOnHover>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Level</th>
                    <th>Category</th>
                    <th>Event</th>
                    <th>User</th>
                    <th>IP Address</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <Text size="sm">
                          {log.timestamp.toLocaleString()}
                        </Text>
                      </td>
                      <td>{getLevelBadge(log.level)}</td>
                      <td>
                        <Group spacing="xs">
                          <ThemeIcon size="sm" variant="light">
                            {getCategoryIcon(log.category)}
                          </ThemeIcon>
                          <Text size="sm" tt="capitalize">
                            {log.category}
                          </Text>
                        </Group>
                      </td>
                      <td>
                        <div>
                          <Text size="sm" fw={500}>
                            {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Text>
                          <Text size="xs" color="dimmed" lineClamp={1}>
                            {log.description}
                          </Text>
                        </div>
                      </td>
                      <td>
                        <Text size="sm">
                          {log.userName || 'Anonymous'}
                        </Text>
                      </td>
                      <td>
                        <Group spacing="xs">
                          <Text size="sm" style={{ fontFamily: 'monospace' }}>
                            {log.ipAddress}
                          </Text>
                          <Tooltip label={log.location}>
                            <ThemeIcon size="xs" variant="transparent">
                              <IconMapPin size={12} />
                            </ThemeIcon>
                          </Tooltip>
                        </Group>
                      </td>
                      <td>
                        <Badge
                          size="sm"
                          color={log.resolved ? 'green' : 'orange'}
                        >
                          {log.resolved ? 'Resolved' : 'Open'}
                        </Badge>
                      </td>
                      <td>
                        <Group spacing={4}>
                          <ActionIcon
                            size="sm"
                            variant="light"
                            onClick={() => {
                              setSelectedLog(log)
                              setDetailsModalOpened(true)
                            }}
                          >
                            <IconEye size={14} />
                          </ActionIcon>
                          <Menu>
                            <Menu.Target>
                              <ActionIcon size="sm" variant="light">
                                <IconDots size={14} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              {!log.resolved && (
                                <Menu.Item
                                  leftIcon={<IconCheck size={14} />}
                                  onClick={() => handleResolveEvent(log.id)}
                                >
                                  Mark Resolved
                                </Menu.Item>
                              )}
                              <Menu.Item
                                leftIcon={<IconBan size={14} />}
                                color="red"
                                onClick={() => {
                                  setSelectedLog(log)
                                  setBlockIPModalOpened(true)
                                }}
                              >
                                Block IP
                              </Menu.Item>
                              <Menu.Item
                                leftIcon={<IconUserX size={14} />}
                                color="orange"
                                onClick={() => notifications.show({ title: 'User Flagged', message: `User ${log.userName} flagged for review` })}
                              >
                                Flag User
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="analytics" pt="md">
          {/* Security Metrics */}
          <Grid mb="lg">
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
              <Card withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
                      Total Events
                    </Text>
                    <Text fw={700} size="xl">
                      {metrics.totalEvents?.toLocaleString() || 0}
                    </Text>
                    <Text size="xs" color="blue">
                      {metrics.todayEvents || 0} today
                    </Text>
                  </div>
                  <IconActivity size={24} color="blue" />
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
              <Card withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
                      Critical Events
                    </Text>
                    <Text fw={700} size="xl" color="red">
                      {metrics.criticalEvents || 0}
                    </Text>
                    <Text size="xs" color="red">
                      Requires attention
                    </Text>
                  </div>
                  <IconAlertTriangle size={24} color="red" />
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
              <Card withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
                      Resolution Rate
                    </Text>
                    <Text fw={700} size="xl" color="green">
                      {metrics.totalEvents ? Math.round((metrics.resolvedEvents / metrics.totalEvents) * 100) : 0}%
                    </Text>
                    <Text size="xs" color="green">
                      {metrics.resolvedEvents || 0} resolved
                    </Text>
                  </div>
                  <IconCheck size={24} color="green" />
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
              <Card withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
                      Open Events
                    </Text>
                    <Text fw={700} size="xl" color="orange">
                      {metrics.unresolvedEvents || 0}
                    </Text>
                    <Text size="xs" color="orange">
                      Need attention
                    </Text>
                  </div>
                  <IconExclamationMark size={24} color="orange" />
                </Group>
              </Card>
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder>
                <Title order={4} mb="md">Top Threats</Title>
                <Stack spacing="sm">
                  {metrics.topThreats?.map((threat, index) => (
                    <Group key={index} justify="space-between">
                      <Group spacing="sm">
                        <ThemeIcon
                          size="sm"
                          color={threat.trend === 'up' ? 'red' : threat.trend === 'down' ? 'green' : 'blue'}
                          variant="light"
                        >
                          {threat.trend === 'up'
                            ? <IconTrendingUp size={14} />
                            : threat.trend === 'down'
                              ? <IconTrendingDown size={14} />
                              : <IconActivity size={14} />}
                        </ThemeIcon>
                        <Text size="sm">{threat.type}</Text>
                      </Group>
                      <Badge size="sm" color={threat.trend === 'up' ? 'red' : 'blue'}>
                        {threat.count}
                      </Badge>
                    </Group>
                  )) || []}
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card withBorder>
                <Title order={4} mb="md">Top Source Countries</Title>
                <Stack spacing="sm">
                  {metrics.topCountries?.map((country, index) => (
                    <div key={index}>
                      <Group justify="space-between" mb="xs">
                        <Text size="sm">{country.country}</Text>
                        <Text size="sm" color="dimmed">
                          {country.count} ({country.percentage}%)
                        </Text>
                      </Group>
                      <Progress value={country.percentage} size="sm" />
                    </div>
                  )) || []}
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="threats" pt="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card withBorder>
                <Title order={4} mb="md">Real-time Threat Monitor</Title>
                <Timeline active={2} bulletSize={24} lineWidth={2}>
                  <Timeline.Item
                    bullet={<IconAlertTriangle size={12} />}
                    title="SQL Injection Attempt Blocked"
                    color="red"
                  >
                    <Text color="dimmed" size="sm">
                      Malicious payload detected from IP 198.51.100.42
                    </Text>
                    <Text size="xs" color="dimmed">2 minutes ago</Text>
                  </Timeline.Item>

                  <Timeline.Item
                    bullet={<IconBan size={12} />}
                    title="IP Address Blocked"
                    color="orange"
                  >
                    <Text color="dimmed" size="sm">
                      Brute force attack detected, IP automatically blocked
                    </Text>
                    <Text size="xs" color="dimmed">15 minutes ago</Text>
                  </Timeline.Item>

                  <Timeline.Item
                    bullet={<IconShield size={12} />}
                    title="Security Scan Completed"
                    color="green"
                  >
                    <Text color="dimmed" size="sm">
                      Automated security scan found no vulnerabilities
                    </Text>
                    <Text size="xs" color="dimmed">1 hour ago</Text>
                  </Timeline.Item>

                  <Timeline.Item
                    bullet={<IconLock size={12} />}
                    title="Failed Login Threshold Reached"
                    color="yellow"
                  >
                    <Text color="dimmed" size="sm">
                      User account temporarily locked due to failed attempts
                    </Text>
                    <Text size="xs" color="dimmed">2 hours ago</Text>
                  </Timeline.Item>
                </Timeline>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack spacing="md">
                <Card withBorder>
                  <Title order={5} mb="md">Threat Level</Title>
                  <Center>
                    <RingProgress
                      size={120}
                      thickness={12}
                      sections={[
                        { value: 25, color: 'red', tooltip: 'Critical: 25%' },
                        { value: 35, color: 'orange', tooltip: 'High: 35%' },
                        { value: 40, color: 'yellow', tooltip: 'Medium: 40%' }
                      ]}
                      label={
                        <Text ta="center" fw={700} size="lg">
                          Medium
                        </Text>
                      }
                    />
                  </Center>
                </Card>

                <Card withBorder>
                  <Title order={5} mb="md">Active Protections</Title>
                  <Stack spacing="xs">
                    <Group justify="space-between">
                      <Text size="sm">WAF</Text>
                      <Badge color="green">Active</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">DDoS Protection</Text>
                      <Badge color="green">Active</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Rate Limiting</Text>
                      <Badge color="green">Active</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">IP Blocking</Text>
                      <Badge color="green">Active</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">2FA Enforcement</Text>
                      <Badge color="yellow">Partial</Badge>
                    </Group>
                  </Stack>
                </Card>
              </Stack>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>
      </Tabs>

      {/* Event Details Modal */}
      <Modal
        opened={detailsModalOpened}
        onClose={() => setDetailsModalOpened(false)}
        title="Security Event Details"
        size="lg"
      >
        {selectedLog && (
          <Stack>
            <Grid>
              <Grid.Col span={6}>
                <Text size="sm" color="dimmed">Event ID</Text>
                <Text fw={500}>{selectedLog.id}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" color="dimmed">Timestamp</Text>
                <Text fw={500}>{selectedLog.timestamp.toLocaleString()}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" color="dimmed">Severity Level</Text>
                {getLevelBadge(selectedLog.level)}
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" color="dimmed">Category</Text>
                <Text fw={500} tt="capitalize">{selectedLog.category}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" color="dimmed">User</Text>
                <Text fw={500}>{selectedLog.userName || 'Anonymous'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" color="dimmed">IP Address</Text>
                <Text fw={500} style={{ fontFamily: 'monospace' }}>
                  {selectedLog.ipAddress}
                </Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="sm" color="dimmed">Location</Text>
                <Text fw={500}>{selectedLog.location}</Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="sm" color="dimmed">User Agent</Text>
                <Code block>{selectedLog.userAgent}</Code>
              </Grid.Col>
            </Grid>

            <Divider />

            <div>
              <Text size="sm" color="dimmed" mb="xs">Description</Text>
              <Text>{selectedLog.description}</Text>
            </div>

            <div>
              <Text size="sm" color="dimmed" mb="xs">Event Details</Text>
              <JsonInput
                value={JSON.stringify(selectedLog.details, null, 2)}
                readOnly
                minRows={4}
                maxRows={8}
              />
            </div>

            <Group justify="flex-end">
              <Button variant="light" onClick={() => setDetailsModalOpened(false)}>
                Close
              </Button>
              {!selectedLog.resolved && (
                <Button
                  color="green"
                  onClick={() => {
                    handleResolveEvent(selectedLog.id)
                    setDetailsModalOpened(false)
                  }}
                >
                  Mark as Resolved
                </Button>
              )}
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Block IP Modal */}
      <Modal
        opened={blockIPModalOpened}
        onClose={() => setBlockIPModalOpened(false)}
        title="Block IP Address"
        size="md"
      >
        {selectedLog && (
          <Stack>
            <Alert icon={<IconAlertTriangle size={16} />} color="orange">
              You are about to block IP address {selectedLog.ipAddress}. This will prevent all access from this IP.
            </Alert>

            <Textarea
              label="Reason for blocking"
              placeholder="Enter reason for blocking this IP address"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value ?? '')}
              required
              minRows={3}
            />

            <Group justify="flex-end">
              <Button variant="light" onClick={() => setBlockIPModalOpened(false)}>
                Cancel
              </Button>
              <Button
                color="red"
                onClick={handleBlockIP}
                disabled={!blockReason.trim()}
              >
                Block IP Address
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  )
}

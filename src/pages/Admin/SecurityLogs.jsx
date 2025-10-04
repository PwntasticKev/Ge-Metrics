import React, { useState, useEffect } from 'react'
import {
  Container,
  Title,
  Grid,
  Card,
  Text,
  Button,
  Badge,
  Group,
  Stack,
  TextInput,
  Select,
  Table,
  Pagination,
  Loader,
  Alert,
  Modal,
  Textarea,
  Box,
  Tabs,
  Paper,
  ActionIcon,
  Tooltip,
  Progress,
  SegmentedControl,
  NumberInput,
  DatePicker,
  Divider
} from '@mantine/core'
import { 
  IconShield, 
  IconActivity, 
  IconAlertTriangle, 
  IconCheck, 
  IconX, 
  IconSearch,
  IconFilter,
  IconRefresh,
  IconDownload,
  IconEye,
  IconBug,
  IconServer,
  IconUsers,
  IconChartLine,
  IconClock,
  IconExclamationMark
} from '@tabler/icons-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { trpc } from '../../utils/trpc'
import { notifications } from '@mantine/notifications'

const SecurityLogs = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [auditFilters, setAuditFilters] = useState({
    page: 1,
    limit: 50,
    action: '',
    resource: '',
    userId: null,
    startDate: '',
    endDate: '',
    search: ''
  })
  const [securityEventFilters, setSecurityEventFilters] = useState({
    page: 1,
    limit: 50,
    severity: '',
    eventType: '',
    resolved: null,
    startDate: '',
    endDate: ''
  })
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [resolution, setResolution] = useState('')
  const [apiAnalyticsFilters, setApiAnalyticsFilters] = useState({
    startDate: '',
    endDate: '',
    groupBy: 'day'
  })

  // TRPC queries
  const { data: securityOverview, isLoading: overviewLoading, refetch: refetchOverview } = trpc.adminSecurity.getSecurityOverview.useQuery()
  
  const { data: auditLog, isLoading: auditLoading, refetch: refetchAudit } = trpc.adminSecurity.getAuditLog.useQuery(auditFilters)
  
  const { data: securityEvents, isLoading: eventsLoading, refetch: refetchEvents } = trpc.adminSecurity.getSecurityEvents.useQuery(securityEventFilters)
  
  const { data: apiAnalytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = trpc.adminSecurity.getApiUsageAnalytics.useQuery(apiAnalyticsFilters)

  // Mutations
  const resolveEventMutation = trpc.adminSecurity.resolveSecurityEvent.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Security event resolved successfully',
        color: 'green'
      })
      setResolveModalOpen(false)
      setResolution('')
      setSelectedEvent(null)
      refetchEvents()
      refetchOverview()
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  })

  const handleResolveEvent = () => {
    if (!selectedEvent || !resolution.trim()) return
    
    resolveEventMutation.mutate({
      eventId: selectedEvent.id,
      resolution: resolution.trim()
    })
  }

  const refreshAllData = () => {
    refetchOverview()
    refetchAudit()
    refetchEvents()
    refetchAnalytics()
  }

  // Helper functions
  const formatDate = (date) => {
    return new Date(date).toLocaleString()
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'red'
      case 'medium': return 'yellow'
      case 'low': return 'blue'
      default: return 'gray'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green'
      case 'canceled': return 'red'
      case 'trialing': return 'blue'
      case 'past_due': return 'orange'
      default: return 'gray'
    }
  }

  // Security Overview Tab
  const SecurityOverviewTab = () => {
    if (overviewLoading) return <Loader />

    const { auditLog: auditStats, securityEvents, apiUsage } = securityOverview

    return (
      <Stack spacing="lg">
        {/* Key Metrics Cards */}
        <Grid>
          <Grid.Col md={3}>
            <Card withBorder>
              <Group position="apart">
                <div>
                  <Text size="sm" color="dimmed">Total Audit Entries</Text>
                  <Text size="xl" weight={700}>{auditStats.total.toLocaleString()}</Text>
                </div>
                <IconShield size={24} color="blue" />
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col md={3}>
            <Card withBorder>
              <Group position="apart">
                <div>
                  <Text size="sm" color="dimmed">Entries Today</Text>
                  <Text size="xl" weight={700}>{auditStats.today.toLocaleString()}</Text>
                </div>
                <IconActivity size={24} color="green" />
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col md={3}>
            <Card withBorder>
              <Group position="apart">
                <div>
                  <Text size="sm" color="dimmed">API Requests Today</Text>
                  <Text size="xl" weight={700}>{apiUsage.requestsToday.toLocaleString()}</Text>
                </div>
                <IconServer size={24} color="purple" />
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col md={3}>
            <Card withBorder>
              <Group position="apart">
                <div>
                  <Text size="sm" color="dimmed">Error Rate</Text>
                  <Text size="xl" weight={700}>{apiUsage.errorRate}%</Text>
                </div>
                <IconBug size={24} color="red" />
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Security Events */}
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <Group position="apart">
              <Title order={4}>Recent Security Events</Title>
              <Badge color="red">{securityEvents.filter(e => !e.resolved).length} Unresolved</Badge>
            </Group>
          </Card.Section>
          <Card.Section inheritPadding py="md">
            <Stack spacing="sm">
              {securityEvents.slice(0, 5).map((event) => (
                <Paper key={event.id} p="sm" withBorder>
                  <Group position="apart" align="flex-start">
                    <div style={{ flex: 1 }}>
                      <Group spacing="xs" mb="xs">
                        <Badge color={getSeverityColor(event.severity)} size="sm">
                          {event.severity.toUpperCase()}
                        </Badge>
                        <Badge color={event.resolved ? 'green' : 'red'} size="sm">
                          {event.resolved ? 'Resolved' : 'Open'}
                        </Badge>
                        <Text size="xs" color="dimmed">{formatDate(event.createdAt)}</Text>
                      </Group>
                      <Text size="sm" weight={500}>{event.description}</Text>
                      <Text size="xs" color="dimmed">IP: {event.ipAddress}</Text>
                    </div>
                    {!event.resolved && (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => {
                          setSelectedEvent(event)
                          setResolveModalOpen(true)
                        }}
                      >
                        Resolve
                      </Button>
                    )}
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Card.Section>
        </Card>

        {/* Action Distribution Chart */}
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <Title order={4}>Audit Log Action Distribution</Title>
          </Card.Section>
          <Card.Section inheritPadding py="md">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={auditStats.actionDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="action" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#228be6" />
              </BarChart>
            </ResponsiveContainer>
          </Card.Section>
        </Card>

        {/* Top API Endpoints */}
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <Title order={4}>Top API Endpoints</Title>
          </Card.Section>
          <Card.Section inheritPadding py="md">
            <Stack spacing="sm">
              {apiUsage.topEndpoints.map((endpoint, index) => (
                <Group key={index} position="apart">
                  <div style={{ flex: 1 }}>
                    <Text size="sm" weight={500}>{endpoint.endpoint}</Text>
                    <Text size="xs" color="dimmed">
                      {endpoint.requests} requests • {endpoint.avgResponseTime}ms avg • {endpoint.errorRate}% errors
                    </Text>
                  </div>
                  <Progress 
                    value={(endpoint.requests / apiUsage.topEndpoints[0].requests) * 100} 
                    size="sm" 
                    style={{ width: 100 }} 
                  />
                </Group>
              ))}
            </Stack>
          </Card.Section>
        </Card>
      </Stack>
    )
  }

  // Audit Log Tab
  const AuditLogTab = () => {
    if (auditLoading) return <Loader />

    return (
      <Stack spacing="lg">
        {/* Filters */}
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <Group position="apart">
              <Title order={4}>Audit Log Filters</Title>
              <Button variant="light" onClick={() => setAuditFilters({
                page: 1, limit: 50, action: '', resource: '', userId: null, startDate: '', endDate: '', search: ''
              })}>
                Clear Filters
              </Button>
            </Group>
          </Card.Section>
          <Card.Section inheritPadding py="md">
            <Grid>
              <Grid.Col md={4}>
                <TextInput
                  label="Search"
                  placeholder="Search actions, resources, or details"
                  value={auditFilters.search}
                  onChange={(e) => setAuditFilters({ ...auditFilters, search: e.target.value, page: 1 })}
                  icon={<IconSearch size={16} />}
                />
              </Grid.Col>
              <Grid.Col md={2}>
                <Select
                  label="Action"
                  placeholder="All actions"
                  value={auditFilters.action}
                  onChange={(value) => setAuditFilters({ ...auditFilters, action: value || '', page: 1 })}
                  data={[
                    'login', 'logout', 'create_user', 'update_user', 'delete_user',
                    'issue_refund', 'cancel_subscription', 'resolve_security_event'
                  ]}
                  clearable
                />
              </Grid.Col>
              <Grid.Col md={2}>
                <Select
                  label="Resource"
                  placeholder="All resources"
                  value={auditFilters.resource}
                  onChange={(value) => setAuditFilters({ ...auditFilters, resource: value || '', page: 1 })}
                  data={['user', 'subscription', 'security_event', 'system']}
                  clearable
                />
              </Grid.Col>
              <Grid.Col md={2}>
                <NumberInput
                  label="User ID"
                  placeholder="Filter by user"
                  value={auditFilters.userId}
                  onChange={(value) => setAuditFilters({ ...auditFilters, userId: value, page: 1 })}
                />
              </Grid.Col>
              <Grid.Col md={2}>
                <Button
                  mt="xl"
                  variant="light"
                  onClick={() => refetchAudit()}
                  leftIcon={<IconRefresh size={16} />}
                >
                  Refresh
                </Button>
              </Grid.Col>
            </Grid>
          </Card.Section>
        </Card>

        {/* Audit Log Table */}
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <Group position="apart">
              <Title order={4}>Audit Log Entries</Title>
              <Group>
                <Text size="sm" color="dimmed">
                  {auditLog?.pagination.total} total entries
                </Text>
                <Button variant="light" size="sm" leftIcon={<IconDownload size={16} />}>
                  Export
                </Button>
              </Group>
            </Group>
          </Card.Section>
          <Card.Section>
            <Table striped highlightOnHover>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLog?.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <Text size="sm">{formatDate(entry.createdAt)}</Text>
                    </td>
                    <td>
                      <div>
                        <Text size="sm" weight={500}>{entry.userName || 'Unknown'}</Text>
                        <Text size="xs" color="dimmed">{entry.userEmail}</Text>
                      </div>
                    </td>
                    <td>
                      <Badge size="sm">{entry.action}</Badge>
                    </td>
                    <td>
                      <Text size="sm">{entry.resource}</Text>
                      {entry.resourceId && (
                        <Text size="xs" color="dimmed">ID: {entry.resourceId}</Text>
                      )}
                    </td>
                    <td>
                      <Text size="sm" style={{ fontFamily: 'monospace' }}>{entry.ipAddress}</Text>
                    </td>
                    <td>
                      <Tooltip label={JSON.stringify(entry.details, null, 2)} multiline>
                        <ActionIcon variant="subtle">
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Section>
          {auditLog?.pagination && (
            <Card.Section withBorder inheritPadding py="xs">
              <Group position="center">
                <Pagination
                  page={auditFilters.page}
                  onChange={(page) => setAuditFilters({ ...auditFilters, page })}
                  total={auditLog.pagination.totalPages}
                />
              </Group>
            </Card.Section>
          )}
        </Card>
      </Stack>
    )
  }

  // Security Events Tab
  const SecurityEventsTab = () => {
    if (eventsLoading) return <Loader />

    return (
      <Stack spacing="lg">
        {/* Filters */}
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <Title order={4}>Security Event Filters</Title>
          </Card.Section>
          <Card.Section inheritPadding py="md">
            <Grid>
              <Grid.Col md={3}>
                <Select
                  label="Severity"
                  placeholder="All severities"
                  value={securityEventFilters.severity}
                  onChange={(value) => setSecurityEventFilters({ ...securityEventFilters, severity: value || '', page: 1 })}
                  data={['low', 'medium', 'high']}
                  clearable
                />
              </Grid.Col>
              <Grid.Col md={3}>
                <Select
                  label="Event Type"
                  placeholder="All types"
                  value={securityEventFilters.eventType}
                  onChange={(value) => setSecurityEventFilters({ ...securityEventFilters, eventType: value || '', page: 1 })}
                  data={['multiple_failed_logins', 'suspicious_activity', 'admin_action_anomaly', 'rate_limit_exceeded']}
                  clearable
                />
              </Grid.Col>
              <Grid.Col md={3}>
                <Select
                  label="Status"
                  placeholder="All statuses"
                  value={securityEventFilters.resolved === null ? '' : securityEventFilters.resolved.toString()}
                  onChange={(value) => setSecurityEventFilters({ 
                    ...securityEventFilters, 
                    resolved: value === '' ? null : value === 'true', 
                    page: 1 
                  })}
                  data={[
                    { value: 'true', label: 'Resolved' },
                    { value: 'false', label: 'Open' }
                  ]}
                  clearable
                />
              </Grid.Col>
              <Grid.Col md={3}>
                <Button
                  mt="xl"
                  variant="light"
                  onClick={() => refetchEvents()}
                  leftIcon={<IconRefresh size={16} />}
                >
                  Refresh
                </Button>
              </Grid.Col>
            </Grid>
          </Card.Section>
        </Card>

        {/* Security Events Table */}
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <Group position="apart">
              <Title order={4}>Security Events</Title>
              <Text size="sm" color="dimmed">
                {securityEvents?.pagination.total} total events
              </Text>
            </Group>
          </Card.Section>
          <Card.Section>
            <Table striped highlightOnHover>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {securityEvents?.events.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <Text size="sm">{formatDate(event.createdAt)}</Text>
                    </td>
                    <td>
                      <Badge color={getSeverityColor(event.severity)} size="sm">
                        {event.severity.toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <Text size="sm">{event.eventType.replace(/_/g, ' ')}</Text>
                    </td>
                    <td>
                      <Text size="sm">{event.description}</Text>
                      <Text size="xs" color="dimmed" mt={2}>
                        {JSON.stringify(event.details)}
                      </Text>
                    </td>
                    <td>
                      <Text size="sm" style={{ fontFamily: 'monospace' }}>{event.ipAddress}</Text>
                    </td>
                    <td>
                      <Badge color={event.resolved ? 'green' : 'red'} size="sm">
                        {event.resolved ? 'Resolved' : 'Open'}
                      </Badge>
                      {event.resolved && (
                        <Text size="xs" color="dimmed" mt={2}>
                          {formatDate(event.resolvedAt)}
                        </Text>
                      )}
                    </td>
                    <td>
                      {!event.resolved && (
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => {
                            setSelectedEvent(event)
                            setResolveModalOpen(true)
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Section>
          {securityEvents?.pagination && (
            <Card.Section withBorder inheritPadding py="xs">
              <Group position="center">
                <Pagination
                  page={securityEventFilters.page}
                  onChange={(page) => setSecurityEventFilters({ ...securityEventFilters, page })}
                  total={securityEvents.pagination.totalPages}
                />
              </Group>
            </Card.Section>
          )}
        </Card>
      </Stack>
    )
  }

  // API Analytics Tab
  const ApiAnalyticsTab = () => {
    if (analyticsLoading) return <Loader />

    const COLORS = ['#228be6', '#40c057', '#fab005', '#fd7e14', '#e03131']

    return (
      <Stack spacing="lg">
        {/* API Usage Over Time */}
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <Title order={4}>API Usage Over Time</Title>
          </Card.Section>
          <Card.Section inheritPadding py="md">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={apiAnalytics?.requestsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Line type="monotone" dataKey="requests" stroke="#228be6" strokeWidth={2} />
                <Line type="monotone" dataKey="errors" stroke="#e03131" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card.Section>
        </Card>

        {/* Top Endpoints */}
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <Title order={4}>Top API Endpoints</Title>
          </Card.Section>
          <Card.Section inheritPadding py="md">
            <Table>
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Requests</th>
                  <th>Avg Response Time</th>
                  <th>Error Rate</th>
                  <th>Unique Users</th>
                </tr>
              </thead>
              <tbody>
                {apiAnalytics?.topEndpoints.map((endpoint, index) => (
                  <tr key={index}>
                    <td>
                      <Text size="sm" style={{ fontFamily: 'monospace' }}>{endpoint.endpoint}</Text>
                    </td>
                    <td>
                      <Text size="sm" weight={500}>{endpoint.requests.toLocaleString()}</Text>
                    </td>
                    <td>
                      <Text size="sm">{endpoint.avgResponseTime}ms</Text>
                    </td>
                    <td>
                      <Text size="sm" color={endpoint.errorRate > 1 ? 'red' : 'green'}>
                        {endpoint.errorRate}%
                      </Text>
                    </td>
                    <td>
                      <Text size="sm">{endpoint.uniqueUsers}</Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Section>
        </Card>

        {/* Status Code Distribution */}
        <Grid>
          <Grid.Col md={6}>
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="xs">
                <Title order={4}>Status Code Distribution</Title>
              </Card.Section>
              <Card.Section inheritPadding py="md">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={apiAnalytics?.statusCodeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ code, percentage }) => `${code} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {apiAnalytics?.statusCodeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Section>
            </Card>
          </Grid.Col>
          <Grid.Col md={6}>
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="xs">
                <Title order={4}>Top API Users</Title>
              </Card.Section>
              <Card.Section inheritPadding py="md">
                <Stack spacing="sm">
                  {apiAnalytics?.topUsers.map((user, index) => (
                    <Group key={index} position="apart">
                      <div>
                        <Text size="sm" weight={500}>{user.email}</Text>
                        <Text size="xs" color="dimmed">{user.requests} requests</Text>
                      </div>
                      <Text size="sm" color="dimmed">{user.avgResponseTime}ms avg</Text>
                    </Group>
                  ))}
                </Stack>
              </Card.Section>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    )
  }

  return (
    <Container size="xl">
      <Group position="apart" mb="xl">
        <Title order={2}>Security & API Monitoring</Title>
        <Group>
          <Button variant="light" onClick={refreshAllData} leftIcon={<IconRefresh size={16} />}>
            Refresh All
          </Button>
        </Group>
      </Group>

      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" icon={<IconShield size={16} />}>
            Security Overview
          </Tabs.Tab>
          <Tabs.Tab value="audit" icon={<IconActivity size={16} />}>
            Audit Log
          </Tabs.Tab>
          <Tabs.Tab value="events" icon={<IconAlertTriangle size={16} />}>
            Security Events
          </Tabs.Tab>
          <Tabs.Tab value="api" icon={<IconChartLine size={16} />}>
            API Analytics
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <SecurityOverviewTab />
        </Tabs.Panel>

        <Tabs.Panel value="audit" pt="md">
          <AuditLogTab />
        </Tabs.Panel>

        <Tabs.Panel value="events" pt="md">
          <SecurityEventsTab />
        </Tabs.Panel>

        <Tabs.Panel value="api" pt="md">
          <ApiAnalyticsTab />
        </Tabs.Panel>
      </Tabs>

      {/* Resolve Security Event Modal */}
      <Modal
        opened={resolveModalOpen}
        onClose={() => {
          setResolveModalOpen(false)
          setResolution('')
          setSelectedEvent(null)
        }}
        title="Resolve Security Event"
        size="lg"
      >
        {selectedEvent && (
          <Stack spacing="md">
            <div>
              <Text size="sm" color="dimmed">Event Details</Text>
              <Paper p="sm" withBorder>
                <Stack spacing="xs">
                  <Group>
                    <Badge color={getSeverityColor(selectedEvent.severity)}>
                      {selectedEvent.severity.toUpperCase()}
                    </Badge>
                    <Text size="sm">{selectedEvent.eventType.replace(/_/g, ' ')}</Text>
                  </Group>
                  <Text size="sm">{selectedEvent.description}</Text>
                  <Text size="xs" color="dimmed">IP: {selectedEvent.ipAddress}</Text>
                  <Text size="xs" color="dimmed">Created: {formatDate(selectedEvent.createdAt)}</Text>
                </Stack>
              </Paper>
            </div>

            <Textarea
              label="Resolution Notes"
              placeholder="Describe how this security event was resolved..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              minRows={4}
              required
            />

            <Group position="right">
              <Button
                variant="light"
                onClick={() => {
                  setResolveModalOpen(false)
                  setResolution('')
                  setSelectedEvent(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResolveEvent}
                loading={resolveEventMutation.isLoading}
                disabled={!resolution.trim()}
              >
                Resolve Event
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  )
}

export default SecurityLogs
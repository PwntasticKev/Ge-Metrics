import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Group,
  Text,
  Badge,
  Button,
  Switch,
  Stack,
  Title,
  Alert,
  Modal,
  Textarea,
  ActionIcon,
  Tooltip,
  Progress,
  Timeline,
  Code,
  Divider
} from '@mantine/core'
import {
  IconClock,
  IconPlayerPlay,
  IconPlayerPause,
  IconRefresh,
  IconEye,
  IconSettings,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconInfoCircle,
  IconCalendar,
  IconActivity
} from '@tabler/icons-react'

// Mock cron job data - in real app this would come from API
const MOCK_CRON_JOBS = [
  {
    id: 'profit-opportunities',
    name: 'Profit Opportunities Monitor',
    description: 'Monitors Reddit, Wiki, and other sources for profit opportunities',
    schedule: '0 8,12,16,20 * * *',
    scheduleDescription: 'Daily at 8am, 12pm, 4pm, 8pm UTC',
    status: 'active',
    lastRun: '2024-01-15T16:00:00Z',
    nextRun: '2024-01-15T20:00:00Z',
    duration: 45000, // 45 seconds
    successRate: 95,
    enabled: true,
    sources: ['Reddit', 'OSRS Wiki'],
    actions: ['Monitor sources', 'Analyze content', 'Save opportunities', 'Update AI predictions'],
    logs: [
      { timestamp: '2024-01-15T16:00:00Z', level: 'info', message: 'Started monitoring Reddit' },
      { timestamp: '2024-01-15T16:00:15Z', level: 'info', message: 'Found 3 new opportunities' },
      { timestamp: '2024-01-15T16:00:30Z', level: 'info', message: 'Updated AI predictions' },
      { timestamp: '2024-01-15T16:00:45Z', level: 'success', message: 'Completed successfully' }
    ]
  },
  {
    id: 'price-data-cache',
    name: 'Price Data Caching',
    description: 'Fetches and caches OSRS Grand Exchange price data every 2.5 minutes',
    schedule: '*/2.5 * * * *',
    scheduleDescription: 'Every 2.5 minutes',
    status: 'active',
    lastRun: '2024-01-15T16:02:30Z',
    nextRun: '2024-01-15T16:05:00Z',
    duration: 8000, // 8 seconds
    successRate: 99,
    enabled: true,
    sources: ['OSRS GE API'],
    actions: ['Fetch prices', 'Update cache', 'Serve requests'],
    logs: [
      { timestamp: '2024-01-15T16:02:30Z', level: 'info', message: 'Fetching price data' },
      { timestamp: '2024-01-15T16:02:35Z', level: 'info', message: 'Updated 15,000+ items' },
      { timestamp: '2024-01-15T16:02:38Z', level: 'success', message: 'Cache updated successfully' }
    ]
  },
  {
    id: 'whale-activity',
    name: 'Whale Activity Monitor',
    description: 'Tracks high-volume trades and whale movements in the GE',
    schedule: '0 */10 * * * *',
    scheduleDescription: 'Every 10 minutes',
    status: 'active',
    lastRun: '2024-01-15T16:00:00Z',
    nextRun: '2024-01-15T16:10:00Z',
    duration: 12000, // 12 seconds
    successRate: 92,
    enabled: true,
    sources: ['GE Transaction Logs'],
    actions: ['Analyze transactions', 'Detect whales', 'Generate alerts'],
    logs: [
      { timestamp: '2024-01-15T16:00:00Z', level: 'info', message: 'Analyzing transaction logs' },
      { timestamp: '2024-01-15T16:00:08Z', level: 'warning', message: 'Detected whale activity: 1000 Dragon Scimitars' },
      { timestamp: '2024-01-15T16:00:12Z', level: 'success', message: 'Whale report generated' }
    ]
  },
  {
    id: 'volume-alerts',
    name: 'Volume Alert System',
    description: 'Monitors item volumes and sends alerts for unusual activity',
    schedule: '0 */5 * * * *',
    scheduleDescription: 'Every 5 minutes',
    status: 'active',
    lastRun: '2024-01-15T16:00:00Z',
    nextRun: '2024-01-15T16:05:00Z',
    duration: 6000, // 6 seconds
    successRate: 98,
    enabled: true,
    sources: ['GE Volume Data'],
    actions: ['Check volumes', 'Compare thresholds', 'Send alerts'],
    logs: [
      { timestamp: '2024-01-15T16:00:00Z', level: 'info', message: 'Checking volume thresholds' },
      { timestamp: '2024-01-15T16:00:04Z', level: 'info', message: 'No alerts triggered' },
      { timestamp: '2024-01-15T16:00:06Z', level: 'success', message: 'Volume check complete' }
    ]
  },
  {
    id: 'historical-data',
    name: 'Historical Data Collection',
    description: 'Collects and stores historical price and volume data',
    schedule: '0 0 * * *',
    scheduleDescription: 'Daily at midnight UTC',
    status: 'idle',
    lastRun: '2024-01-15T00:00:00Z',
    nextRun: '2024-01-16T00:00:00Z',
    duration: 180000, // 3 minutes
    successRate: 100,
    enabled: true,
    sources: ['GE Historical API'],
    actions: ['Collect daily data', 'Store in database', 'Generate reports'],
    logs: [
      { timestamp: '2024-01-15T00:00:00Z', level: 'info', message: 'Starting daily data collection' },
      { timestamp: '2024-01-15T00:02:30Z', level: 'info', message: 'Collected data for 15,000+ items' },
      { timestamp: '2024-01-15T00:03:00Z', level: 'success', message: 'Historical data collection complete' }
    ]
  },
  {
    id: 'ai-predictions',
    name: 'AI Predictions Update',
    description: 'Updates AI prediction models with new market data',
    schedule: '0 */30 * * * *',
    scheduleDescription: 'Every 30 minutes',
    status: 'running',
    lastRun: '2024-01-15T16:00:00Z',
    nextRun: '2024-01-15T16:30:00Z',
    duration: 45000, // 45 seconds
    successRate: 88,
    enabled: true,
    sources: ['Market Data', 'User Feedback'],
    actions: ['Train models', 'Update predictions', 'Validate accuracy'],
    logs: [
      { timestamp: '2024-01-15T16:00:00Z', level: 'info', message: 'Starting AI model update' },
      { timestamp: '2024-01-15T16:00:30Z', level: 'info', message: 'Training on new data' },
      { timestamp: '2024-01-15T16:00:45Z', level: 'success', message: 'AI predictions updated' }
    ]
  }
]

export default function CronJobs () {
  const [cronJobs, setCronJobs] = useState(MOCK_CRON_JOBS)
  const [selectedJob, setSelectedJob] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [logsModalOpen, setLogsModalOpen] = useState(false)

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green'
      case 'running': return 'blue'
      case 'idle': return 'gray'
      case 'error': return 'red'
      default: return 'gray'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <IconCheck size={16} />
      case 'running': return <IconActivity size={16} />
      case 'idle': return <IconClock size={16} />
      case 'error': return <IconX size={16} />
      default: return <IconClock size={16} />
    }
  }

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getTimeUntilNext = (nextRun) => {
    const now = new Date()
    const next = new Date(nextRun)
    const diff = next - now

    if (diff <= 0) return 'Due now'

    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)

    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  const toggleJob = (jobId) => {
    setCronJobs(prev => prev.map(job =>
      job.id === jobId
        ? { ...job, enabled: !job.enabled }
        : job
    ))
  }

  const runJobNow = (jobId) => {
    console.log(`Manually running job: ${jobId}`)
    // This would trigger the actual cron job
    setCronJobs(prev => prev.map(job =>
      job.id === jobId
        ? {
            ...job,
            status: 'running',
            lastRun: new Date().toISOString()
          }
        : job
    ))
  }

  const stats = {
    total: cronJobs.length,
    active: cronJobs.filter(job => job.status === 'active').length,
    running: cronJobs.filter(job => job.status === 'running').length,
    enabled: cronJobs.filter(job => job.enabled).length,
    avgSuccessRate: Math.round(cronJobs.reduce((sum, job) => sum + job.successRate, 0) / cronJobs.length)
  }

  return (
    <div>
      <Title order={2} mb="lg">Cron Jobs Management</Title>

      {/* Stats Cards */}
      <Group mb="lg">
        <Card withBorder p="md" style={{ flex: 1 }}>
          <Text size="sm" color="dimmed">Total Jobs</Text>
          <Text size="xl" weight={700}>{stats.total}</Text>
        </Card>
        <Card withBorder p="md" style={{ flex: 1 }}>
          <Text size="sm" color="dimmed">Active</Text>
          <Text size="xl" weight={700} color="green">{stats.active}</Text>
        </Card>
        <Card withBorder p="md" style={{ flex: 1 }}>
          <Text size="sm" color="dimmed">Running</Text>
          <Text size="xl" weight={700} color="blue">{stats.running}</Text>
        </Card>
        <Card withBorder p="md" style={{ flex: 1 }}>
          <Text size="sm" color="dimmed">Enabled</Text>
          <Text size="xl" weight={700} color="blue">{stats.enabled}</Text>
        </Card>
        <Card withBorder p="md" style={{ flex: 1 }}>
          <Text size="sm" color="dimmed">Avg Success Rate</Text>
          <Text size="xl" weight={700} color="green">{stats.avgSuccessRate}%</Text>
        </Card>
      </Group>

      {/* Cron Jobs Table */}
      <Card withBorder>
        <Table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Schedule</th>
              <th>Status</th>
              <th>Last Run</th>
              <th>Next Run</th>
              <th>Duration</th>
              <th>Success Rate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cronJobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <div>
                    <Text weight={500}>{job.name}</Text>
                    <Text size="xs" color="dimmed">{job.description}</Text>
                  </div>
                </td>
                <td>
                  <Group spacing="xs">
                    <IconCalendar size={14} />
                    <div>
                      <Text size="sm" weight={500}>{job.scheduleDescription}</Text>
                      <Code size="xs">{job.schedule}</Code>
                    </div>
                  </Group>
                </td>
                <td>
                  <Group spacing="xs">
                    {getStatusIcon(job.status)}
                    <Badge color={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                  </Group>
                </td>
                <td>
                  <Text size="sm">{formatDate(job.lastRun)}</Text>
                </td>
                <td>
                  <Text size="sm" weight={500}>{formatDate(job.nextRun)}</Text>
                  <Text size="xs" color="dimmed">in {getTimeUntilNext(job.nextRun)}</Text>
                </td>
                <td>
                  <Text size="sm">{formatDuration(job.duration)}</Text>
                </td>
                <td>
                  <Group spacing="xs">
                    <Progress
                      value={job.successRate}
                      size="sm"
                      style={{ width: 60 }}
                      color={job.successRate >= 90 ? 'green' : job.successRate >= 70 ? 'yellow' : 'red'}
                    />
                    <Text size="sm">{job.successRate}%</Text>
                  </Group>
                </td>
                <td>
                  <Group spacing="xs">
                    <Tooltip label="View Details">
                      <ActionIcon
                        size="sm"
                        onClick={() => {
                          setSelectedJob(job)
                          setDetailModalOpen(true)
                        }}
                      >
                        <IconEye size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="View Logs">
                      <ActionIcon
                        size="sm"
                        onClick={() => {
                          setSelectedJob(job)
                          setLogsModalOpen(true)
                        }}
                      >
                        <IconSettings size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Run Now">
                      <ActionIcon
                        size="sm"
                        color="blue"
                        onClick={() => runJobNow(job.id)}
                      >
                        <IconPlayerPlay size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Switch
                      size="sm"
                      checked={job.enabled}
                      onChange={() => toggleJob(job.id)}
                      onLabel={<IconPlayerPlay size={10} />}
                      offLabel={<IconPlayerPause size={10} />}
                    />
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Job Details Modal */}
      <Modal
        opened={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedJob?.name}
        size="lg"
      >
        {selectedJob && (
          <Stack spacing="md">
            <div>
              <Text weight={500} mb="xs">Description</Text>
              <Text size="sm">{selectedJob.description}</Text>
            </div>

            <div>
              <Text weight={500} mb="xs">Schedule</Text>
              <Group spacing="xs">
                <IconClock size={16} />
                <Text size="sm">{selectedJob.scheduleDescription}</Text>
              </Group>
              <Code size="sm" mt="xs">{selectedJob.schedule}</Code>
            </div>

            <div>
              <Text weight={500} mb="xs">Data Sources</Text>
              <Group spacing="xs">
                {selectedJob.sources.map((source, index) => (
                  <Badge key={index} variant="light">{source}</Badge>
                ))}
              </Group>
            </div>

            <div>
              <Text weight={500} mb="xs">Actions Performed</Text>
              <Timeline>
                {selectedJob.actions.map((action, index) => (
                  <Timeline.Item key={index} bullet={<IconCheck size={12} />}>
                    <Text size="sm">{action}</Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>

            <Divider />

            <Group position="apart">
              <div>
                <Text size="sm" color="dimmed">Last Run</Text>
                <Text size="sm">{formatDate(selectedJob.lastRun)}</Text>
              </div>
              <div>
                <Text size="sm" color="dimmed">Next Run</Text>
                <Text size="sm">{formatDate(selectedJob.nextRun)}</Text>
              </div>
              <div>
                <Text size="sm" color="dimmed">Duration</Text>
                <Text size="sm">{formatDuration(selectedJob.duration)}</Text>
              </div>
            </Group>

            <Group position="apart">
              <div>
                <Text size="sm" color="dimmed">Success Rate</Text>
                <Text size="sm" weight={500}>{selectedJob.successRate}%</Text>
              </div>
              <div>
                <Text size="sm" color="dimmed">Status</Text>
                <Badge color={getStatusColor(selectedJob.status)}>
                  {selectedJob.status}
                </Badge>
              </div>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Logs Modal */}
      <Modal
        opened={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
        title={`${selectedJob?.name} - Recent Logs`}
        size="lg"
      >
        {selectedJob && (
          <Stack spacing="md">
            <Alert icon={<IconInfoCircle size={16} />} color="blue">
              Showing the most recent logs for this job. Logs are automatically rotated to prevent storage issues.
            </Alert>

            <Timeline>
              {selectedJob.logs.map((log, index) => (
                <Timeline.Item
                  key={index}
                  bullet={
                    log.level === 'success'
                      ? <IconCheck size={12} color="green" />
                      : log.level === 'warning'
                        ? <IconAlertTriangle size={12} color="orange" />
                        : log.level === 'error'
                          ? <IconX size={12} color="red" />
                          : <IconInfoCircle size={12} color="blue" />
                  }
                >
                  <Text size="sm" weight={500}>
                    {formatDate(log.timestamp)}
                  </Text>
                  <Text size="sm" color={log.level === 'error' ? 'red' : 'dimmed'}>
                    {log.message}
                  </Text>
                </Timeline.Item>
              ))}
            </Timeline>
          </Stack>
        )}
      </Modal>
    </div>
  )
}

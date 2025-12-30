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
  Modal,
  Textarea,
  Switch,
  ActionIcon,
  Tooltip,
  Progress,
  Alert,
  Paper,
  NumberInput,
  Tabs,
  ScrollArea,
  Code,
  Divider,
  Timeline,
  Loader,
  Anchor
} from '@mantine/core'
import {
  IconClock,
  IconPlayerPlay,
  IconPlayerPause,
  IconRefresh,
  IconSettings,
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconCalendar,
  IconActivity,
  IconServer,
  IconDatabase,
  IconApi,
  IconMail,
  IconChartLine,
  IconCode,
  IconBug,
  IconCloudUpload
} from '@tabler/icons-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { notifications } from '@mantine/notifications'
import { trpc } from '../../utils/trpc'

const CronJobs = () => {
  const [activeTab, setActiveTab] = useState('jobs')
  const [selectedJob, setSelectedJob] = useState(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [liveLogModalOpen, setLiveLogModalOpen] = useState(false)
  const [runningJobId, setRunningJobId] = useState(null)
  const [liveLogs, setLiveLogs] = useState([])
  const [jobStartTime, setJobStartTime] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schedule: '',
    command: '',
    category: '',
    enabled: true,
    timeout: 300,
    retries: 3,
    notifications: true
  })

  // Real TRPC data queries
  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } = trpc.adminCronJobs.getAllJobs.useQuery()

  const { data: executionData, isLoading: executionsLoading, refetch: refetchExecutions } = trpc.adminCronJobs.getExecutionHistory.useQuery({
    limit: 50,
    page: 1
  })

  // Mutations
  const createJobMutation = trpc.adminCronJobs.createJob.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Cron job created successfully',
        color: 'green'
      })
      setCreateModalOpen(false)
      resetFormData()
      refetchJobs()
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  })

  const updateJobMutation = trpc.adminCronJobs.updateJob.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Cron job updated successfully',
        color: 'green'
      })
      setEditModalOpen(false)
      resetFormData()
      setSelectedJob(null)
      refetchJobs()
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  })

  const deleteJobMutation = trpc.adminCronJobs.deleteJob.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Cron job deleted successfully',
        color: 'green'
      })
      setDeleteModalOpen(false)
      setSelectedJob(null)
      refetchJobs()
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  })

  const toggleJobMutation = trpc.adminCronJobs.toggleJob.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Job status updated successfully',
        color: 'blue'
      })
      refetchJobs()
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  })

  const runJobMutation = trpc.adminCronJobs.runJob.useMutation({
    onSuccess: (result) => {
      setLiveLogs(prev => [...prev, {
        timestamp: new Date(),
        type: 'success',
        message: `Job completed successfully in ${formatDuration(Math.floor(result.duration / 1000))}`
      }])
      
      setTimeout(() => {
        setLiveLogModalOpen(false)
        setRunningJobId(null)
        setLiveLogs([])
        setJobStartTime(null)
        refetchJobs()
        refetchExecutions()
        
        notifications.show({
          title: 'Job Completed',
          message: `Job "${result.jobName}" completed successfully`,
          color: 'green'
        })
      }, 2000) // Show completion message for 2 seconds before closing
    },
    onError: (error) => {
      setLiveLogs(prev => [...prev, {
        timestamp: new Date(),
        type: 'error',
        message: `Job failed: ${error.message}`
      }])
      
      setTimeout(() => {
        setLiveLogModalOpen(false)
        setRunningJobId(null)
        setLiveLogs([])
        setJobStartTime(null)
        refetchJobs()
        refetchExecutions()
      }, 3000) // Show error longer before closing
      
      notifications.show({
        title: 'Job Failed',
        message: error.message,
        color: 'red'
      })
    }
  })

  // Data from TRPC queries
  const jobs = jobsData?.jobs || []
  const jobStats = jobsData?.stats || { totalJobs: 0, activeJobs: 0, runningJobs: 0, failedJobs: 0 }
  const executions = executionData?.executions || []
  const executionTrend = executionData?.executionTrend || []

  // Update elapsed time every second for live logs
  useEffect(() => {
    let interval
    if (runJobMutation.isLoading && jobStartTime) {
      interval = setInterval(() => {
        // Force re-render to update elapsed time
        setJobStartTime(prev => prev)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [runJobMutation.isLoading, jobStartTime])

  const categories = [
    { value: 'data-sync', label: 'Data Synchronization', icon: <IconDatabase size={16} /> },
    { value: 'reporting', label: 'Reports & Analytics', icon: <IconChartLine size={16} /> },
    { value: 'maintenance', label: 'System Maintenance', icon: <IconServer size={16} /> },
    { value: 'backup', label: 'Backup & Recovery', icon: <IconCloudUpload size={16} /> },
    { value: 'notifications', label: 'Notifications', icon: <IconMail size={16} /> }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'green'
      case 'running': return 'blue'
      case 'failed': return 'red'
      case 'disabled': return 'gray'
      default: return 'gray'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <IconCheck size={16} />
      case 'running': return <IconActivity size={16} />
      case 'failed': return <IconX size={16} />
      case 'disabled': return <IconPlayerPause size={16} />
      default: return <IconClock size={16} />
    }
  }

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.value === category)
    return cat ? cat.icon : <IconCode size={16} />
  }

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const resetFormData = () => {
    setFormData({
      name: '',
      description: '',
      schedule: '',
      command: '',
      category: '',
      enabled: true,
      timeout: 300,
      retries: 3,
      notifications: true
    })
  }

  const handleCreate = () => {
    resetFormData()
    setCreateModalOpen(true)
  }

  const handleEdit = (job) => {
    setFormData({
      name: job.name,
      description: job.description,
      schedule: job.schedule,
      command: job.command,
      category: job.category,
      enabled: job.enabled,
      timeout: job.timeout,
      retries: job.retries,
      notifications: job.notifications
    })
    setSelectedJob(job)
    setEditModalOpen(true)
  }

  const handleDelete = (job) => {
    setSelectedJob(job)
    setDeleteModalOpen(true)
  }

  const handleSave = () => {
    if (selectedJob) {
      // Update existing job
      updateJobMutation.mutate({
        jobId: selectedJob.id,
        ...formData
      })
    } else {
      // Create new job
      createJobMutation.mutate(formData)
    }
  }

  const handleDeleteConfirm = () => {
    deleteJobMutation.mutate({ jobId: selectedJob.id })
  }

  const handleToggleJob = (job) => {
    toggleJobMutation.mutate({ jobId: job.id })
  }

  const handleRunJob = (job) => {
    // Set up live log modal
    setSelectedJob(job)
    setRunningJobId(job.id)
    setJobStartTime(new Date())
    setLiveLogs([{
      timestamp: new Date(),
      type: 'info',
      message: `Starting job "${job.name}" manually...`
    }])
    setLiveLogModalOpen(true)
    
    // Add simulated progress messages
    setTimeout(() => {
      setLiveLogs(prev => [...prev, {
        timestamp: new Date(),
        type: 'info',
        message: `Executing command: ${job.command}`
      }])
    }, 500)
    
    setTimeout(() => {
      setLiveLogs(prev => [...prev, {
        timestamp: new Date(),
        type: 'info', 
        message: job.name.includes('scrape') ? 'Fetching data from external sources...' : 'Processing data...'
      }])
    }, 1500)
    
    // Execute the job
    runJobMutation.mutate({ jobId: job.id })
  }

  const getJobExecutionHistory = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split('T')[0]
    })

    return last7Days.map(date => {
      const dayExecutions = executions.filter(e =>
        e.startTime.startsWith(date)
      )
      return {
        date,
        total: dayExecutions.length,
        success: dayExecutions.filter(e => e.status === 'success').length,
        failed: dayExecutions.filter(e => e.status === 'failed').length
      }
    })
  }

  // Jobs Tab
  const JobsTab = () => (
    <Stack spacing="lg">
      {/* Summary Cards */}
      <Grid>
        <Grid.Col md={3}>
          <Card withBorder>
            <Group position="apart">
              <div>
                <Text size="sm" color="dimmed">Total Jobs</Text>
                <Text size="xl" weight={700}>{jobStats.totalJobs}</Text>
              </div>
              <IconClock size={24} color="blue" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col md={3}>
          <Card withBorder>
            <Group position="apart">
              <div>
                <Text size="sm" color="dimmed">Active Jobs</Text>
                <Text size="xl" weight={700}>{jobStats.activeJobs}</Text>
              </div>
              <IconPlayerPlay size={24} color="green" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col md={3}>
          <Card withBorder>
            <Group position="apart">
              <div>
                <Text size="sm" color="dimmed">Running Now</Text>
                <Text size="xl" weight={700}>{jobStats.runningJobs}</Text>
              </div>
              <IconActivity size={24} color="orange" />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col md={3}>
          <Card withBorder>
            <Group position="apart">
              <div>
                <Text size="sm" color="dimmed">Failed Today</Text>
                <Text size="xl" weight={700}>{jobStats.failedJobs}</Text>
              </div>
              <IconAlertTriangle size={24} color="red" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Jobs Table */}
      <Card withBorder>
        <Card.Section withBorder inheritPadding py="xs">
          <Group position="apart">
            <Title order={4}>Cron Jobs</Title>
            <Button onClick={handleCreate} leftIcon={<IconPlus size={16} />}>
              Add Job
            </Button>
          </Group>
        </Card.Section>
        <Card.Section>
          <ScrollArea>
            {jobsLoading
              ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Loader />
              </div>
                )
              : (
              <Table striped highlightOnHover>
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Last Run</th>
                    <th>Next Run</th>
                    <th>Success Rate</th>
                    <th>Avg Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <Group spacing="sm">
                        {getCategoryIcon(job.category)}
                        <div>
                          <Text size="sm" weight={500}>{job.name}</Text>
                          <Text size="xs" color="dimmed">{job.description}</Text>
                        </div>
                      </Group>
                    </td>
                    <td>
                      <div>
                        <Code size="xs">{job.schedule}</Code>
                        <Text size="xs" color="dimmed">{job.scheduleDescription}</Text>
                      </div>
                    </td>
                    <td>
                      <Group spacing="xs">
                        <Badge color={getStatusColor(job.status)} leftSection={getStatusIcon(job.status)}>
                          {job.status}
                        </Badge>
                        {!job.enabled && (
                          <Badge size="xs" color="gray">Disabled</Badge>
                        )}
                      </Group>
                    </td>
                    <td>
                      <Text size="sm">
                        {job.lastRun ? formatDateTime(job.lastRun) : 'Never'}
                      </Text>
                      {job.duration > 0 && (
                        <Text size="xs" color="dimmed">{formatDuration(job.duration)}</Text>
                      )}
                    </td>
                    <td>
                      <Text size="sm">
                        {job.nextRun ? formatDateTime(job.nextRun) : 'Not scheduled'}
                      </Text>
                    </td>
                    <td>
                      <div>
                        <Text size="sm" weight={500}>{job.successRate.toFixed(1)}%</Text>
                        <Text size="xs" color="dimmed">
                          {job.totalRuns - job.failedRuns}/{job.totalRuns} runs
                        </Text>
                      </div>
                    </td>
                    <td>
                      <Text size="sm">{formatDuration(job.avgDuration)}</Text>
                    </td>
                    <td>
                      <Group spacing="xs">
                        <Tooltip label={job.enabled ? 'Disable' : 'Enable'}>
                          <ActionIcon
                            color={job.enabled ? 'red' : 'green'}
                            onClick={() => handleToggleJob(job)}
                            loading={toggleJobMutation.isLoading}
                          >
                            {job.enabled ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Run Now">
                          <ActionIcon
                            color="blue"
                            onClick={() => handleRunJob(job)}
                            disabled={!job.enabled || job.status === 'running'}
                            loading={runJobMutation.isLoading}
                          >
                            <IconRefresh size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="View Logs">
                          <ActionIcon
                            onClick={() => {
                              setSelectedJob(job)
                              setLogModalOpen(true)
                            }}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Edit">
                          <ActionIcon onClick={() => handleEdit(job)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon color="red" onClick={() => handleDelete(job)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </td>
                  </tr>
                  ))}
                </tbody>
              </Table>
                )}
          </ScrollArea>
        </Card.Section>
      </Card>
    </Stack>
  )

  // Execution History Tab
  const ExecutionHistoryTab = () => (
    <Stack spacing="lg">
      {/* Execution Trend Chart */}
      <Card withBorder>
        <Card.Section withBorder inheritPadding py="xs">
          <Title order={4}>Execution History (Last 7 Days)</Title>
        </Card.Section>
        <Card.Section inheritPadding py="md">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={executionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip />
              <Area type="monotone" dataKey="success" stackId="1" stroke="#51cf66" fill="#51cf66" />
              <Area type="monotone" dataKey="failed" stackId="1" stroke="#ff6b6b" fill="#ff6b6b" />
            </AreaChart>
          </ResponsiveContainer>
        </Card.Section>
      </Card>

      {/* Recent Executions */}
      <Card withBorder>
        <Card.Section withBorder inheritPadding py="xs">
          <Title order={4}>Recent Executions</Title>
        </Card.Section>
        <Card.Section>
          {executionsLoading
            ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader />
            </div>
              )
            : (
            <Table striped highlightOnHover>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Status</th>
                  <th>Start Time</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {executions.slice(0, 10).map((execution) => (
                <tr key={execution.id}>
                  <td>
                    <Text size="sm" weight={500}>{execution.jobName}</Text>
                  </td>
                  <td>
                    <Badge color={getStatusColor(execution.status)} leftSection={getStatusIcon(execution.status)}>
                      {execution.status}
                    </Badge>
                  </td>
                  <td>
                    <Text size="sm">{formatDateTime(execution.startTime)}</Text>
                  </td>
                  <td>
                    <Text size="sm">{formatDuration(execution.duration)}</Text>
                  </td>
                  <td>
                    <ActionIcon
                      onClick={() => {
                        setSelectedJob(execution)
                        setLogModalOpen(true)
                      }}
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                  </td>
                </tr>
                ))}
              </tbody>
            </Table>
              )}
        </Card.Section>
      </Card>
    </Stack>
  )

  // Form Modal Content
  const FormModalContent = () => (
    <Stack spacing="md">
      <Grid>
        <Grid.Col md={8}>
          <TextInput
            label="Job Name"
            placeholder="Enter job name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </Grid.Col>
        <Grid.Col md={4}>
          <Select
            label="Category"
            placeholder="Select category"
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value })}
            data={categories}
            required
          />
        </Grid.Col>
      </Grid>

      <Textarea
        label="Description"
        placeholder="Describe what this job does"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        minRows={3}
        required
      />

      <Grid>
        <Grid.Col md={6}>
          <TextInput
            label="Cron Schedule"
            placeholder="* * * * * (minute hour day month weekday)"
            value={formData.schedule}
            onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
            required
            description="Use cron format: minute hour day month weekday"
          />
        </Grid.Col>
        <Grid.Col md={6}>
          <TextInput
            label="Command"
            placeholder="npm run command-name"
            value={formData.command}
            onChange={(e) => setFormData({ ...formData, command: e.target.value })}
            required
            description="Command to execute"
          />
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col md={4}>
          <NumberInput
            label="Timeout (seconds)"
            value={formData.timeout}
            onChange={(value) => setFormData({ ...formData, timeout: value })}
            min={1}
            description="Maximum execution time"
          />
        </Grid.Col>
        <Grid.Col md={4}>
          <NumberInput
            label="Max Retries"
            value={formData.retries}
            onChange={(value) => setFormData({ ...formData, retries: value })}
            min={0}
            max={10}
            description="Retry attempts on failure"
          />
        </Grid.Col>
        <Grid.Col md={4}>
          <div style={{ marginTop: '25px' }}>
            <Switch
              label="Enable notifications"
              checked={formData.notifications}
              onChange={(e) => setFormData({ ...formData, notifications: e.currentTarget.checked })}
              description="Send alerts on failure"
            />
            <Switch
              label="Enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.currentTarget.checked })}
              description="Job is active"
              mt="sm"
            />
          </div>
        </Grid.Col>
      </Grid>
    </Stack>
  )

  return (
    <Container size="xl">
      <Group position="apart" mb="xl">
        <Title order={2}>Cron Jobs Management</Title>
        <Group>
          <Button
            variant="light"
            leftIcon={<IconRefresh size={16} />}
            onClick={() => {
              refetchJobs()
              refetchExecutions()
            }}
          >
            Refresh Status
          </Button>
        </Group>
      </Group>

      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="jobs" icon={<IconClock size={16} />}>
            Jobs
          </Tabs.Tab>
          <Tabs.Tab value="history" icon={<IconActivity size={16} />}>
            Execution History
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="jobs" pt="md">
          <JobsTab />
        </Tabs.Panel>

        <Tabs.Panel value="history" pt="md">
          <ExecutionHistoryTab />
        </Tabs.Panel>
      </Tabs>

      {/* Create/Edit Modal */}
      <Modal
        opened={createModalOpen || editModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setEditModalOpen(false)
          resetFormData()
          setSelectedJob(null)
        }}
        title={editModalOpen ? 'Edit Cron Job' : 'Create New Cron Job'}
        size="xl"
      >
        <FormModalContent />
        <Group position="right" mt="md">
          <Button
            variant="light"
            onClick={() => {
              setCreateModalOpen(false)
              setEditModalOpen(false)
              resetFormData()
              setSelectedJob(null)
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name || !formData.schedule || !formData.command || !formData.category}
            loading={createJobMutation.isLoading || updateJobMutation.isLoading}
          >
            {editModalOpen ? 'Update' : 'Create'}
          </Button>
        </Group>
      </Modal>

      {/* Execution Log Modal */}
      <Modal
        opened={logModalOpen}
        onClose={() => {
          setLogModalOpen(false)
          setSelectedJob(null)
        }}
        title={`Execution Logs - ${selectedJob?.jobName || selectedJob?.name}`}
        size="xl"
      >
        {selectedJob && (
          <Stack spacing="md">
            {/* Execution Details */}
            {selectedJob.startTime && (
              <Paper p="sm" withBorder>
                <Grid>
                  <Grid.Col md={6}>
                    <Text size="sm" color="dimmed">Status:</Text>
                    <Badge color={getStatusColor(selectedJob.status)} leftSection={getStatusIcon(selectedJob.status)}>
                      {selectedJob.status}
                    </Badge>
                  </Grid.Col>
                  <Grid.Col md={6}>
                    <Text size="sm" color="dimmed">Duration:</Text>
                    <Text size="sm">{formatDuration(selectedJob.duration || 0)}</Text>
                  </Grid.Col>
                  <Grid.Col md={6}>
                    <Text size="sm" color="dimmed">Start Time:</Text>
                    <Text size="sm">{formatDateTime(selectedJob.startTime)}</Text>
                  </Grid.Col>
                  <Grid.Col md={6}>
                    <Text size="sm" color="dimmed">End Time:</Text>
                    <Text size="sm">{selectedJob.endTime ? formatDateTime(selectedJob.endTime) : 'Running...'}</Text>
                  </Grid.Col>
                </Grid>
              </Paper>
            )}

            {/* Error Message */}
            {selectedJob.errorMessage && (
              <Alert icon={<IconAlertTriangle size={16} />} color="red" title="Error">
                {selectedJob.errorMessage}
              </Alert>
            )}

            {/* Output Log */}
            <div>
              <Text size="sm" weight={500} mb="xs">Output Log:</Text>
              <Paper p="md" withBorder style={{ backgroundColor: '#1a1b1e', color: '#c1c2c5' }}>
                <Code
                  block
                  style={{
                    backgroundColor: 'transparent',
                    color: 'inherit',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace'
                  }}
                >
                  {selectedJob.output || 'No output available'}
                </Code>
              </Paper>
            </div>

            {/* Recent Executions for this job */}
            {selectedJob.name && (
              <div>
                <Text size="sm" weight={500} mb="xs">Recent Executions:</Text>
                <Table size="sm">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions
                      .filter(e => e.jobName === selectedJob.name)
                      .slice(0, 5)
                      .map((execution) => (
                        <tr key={execution.id}>
                          <td>{formatDateTime(execution.startTime)}</td>
                          <td>
                            <Badge size="xs" color={getStatusColor(execution.status)}>
                              {execution.status}
                            </Badge>
                          </td>
                          <td>{formatDuration(execution.duration)}</td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Stack>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setSelectedJob(null)
        }}
        title="Delete Cron Job"
        size="sm"
      >
        <Stack spacing="md">
          <Text>
            Are you sure you want to delete the job "{selectedJob?.name}"? This will also remove all execution history.
          </Text>
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
            This action cannot be undone. The job will be permanently removed from the system.
          </Alert>
          <Group position="right">
            <Button
              variant="light"
              onClick={() => {
                setDeleteModalOpen(false)
                setSelectedJob(null)
              }}
            >
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteConfirm} loading={deleteJobMutation.isLoading}>
              Delete Job
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Live Log Modal - Real-time execution logs */}
      <Modal
        opened={liveLogModalOpen}
        onClose={() => {
          if (!runJobMutation.isLoading) {
            setLiveLogModalOpen(false)
            setRunningJobId(null)
            setLiveLogs([])
            setJobStartTime(null)
            setSelectedJob(null)
          }
        }}
        title={
          <Group spacing="xs">
            <IconActivity size={20} />
            <Text>Live Execution - {selectedJob?.name}</Text>
            {runJobMutation.isLoading && <Loader size="sm" />}
          </Group>
        }
        size="xl"
        closeOnClickOutside={false}
        closeOnEscape={!runJobMutation.isLoading}
        withCloseButton={!runJobMutation.isLoading}
      >
        <Stack spacing="md">
          {/* Execution Status Header */}
          <Paper p="md" withBorder style={{ backgroundColor: 'rgba(26,27,30,0.6)' }}>
            <Grid>
              <Grid.Col md={6}>
                <Text size="sm" color="dimmed">Job Status:</Text>
                <Group spacing="xs">
                  <Badge 
                    color={runJobMutation.isLoading ? "blue" : runJobMutation.isSuccess ? "green" : runJobMutation.isError ? "red" : "gray"} 
                    leftSection={runJobMutation.isLoading ? <IconActivity size={16} /> : runJobMutation.isSuccess ? <IconCheck size={16} /> : runJobMutation.isError ? <IconX size={16} /> : <IconClock size={16} />}
                  >
                    {runJobMutation.isLoading ? "Running" : runJobMutation.isSuccess ? "Completed" : runJobMutation.isError ? "Failed" : "Pending"}
                  </Badge>
                </Group>
              </Grid.Col>
              <Grid.Col md={6}>
                <Text size="sm" color="dimmed">Elapsed Time:</Text>
                <Text size="sm" weight={500}>
                  {jobStartTime && formatDuration(Math.floor((new Date() - jobStartTime) / 1000))}
                </Text>
              </Grid.Col>
              <Grid.Col xs={12}>
                <Text size="sm" color="dimmed">Command:</Text>
                <Code size="sm">{selectedJob?.command}</Code>
              </Grid.Col>
            </Grid>
          </Paper>

          {/* Live Log Output */}
          <div>
            <Group position="apart" mb="xs">
              <Text size="sm" weight={500}>Live Output</Text>
              <Text size="xs" color="dimmed">{liveLogs.length} log entries</Text>
            </Group>
            
            <Paper 
              p="md" 
              withBorder 
              style={{ 
                backgroundColor: '#1a1b1e', 
                color: '#c1c2c5',
                maxHeight: '400px',
                overflowY: 'auto'
              }}
            >
              <Stack spacing="xs">
                {liveLogs.length > 0 ? (
                  liveLogs.map((log, index) => (
                    <Group key={index} spacing="xs" align="flex-start" noWrap>
                      <Text 
                        size="xs" 
                        color="dimmed" 
                        style={{ minWidth: '60px', fontFamily: 'monospace' }}
                      >
                        {log.timestamp.toLocaleTimeString()}
                      </Text>
                      <Badge 
                        size="xs" 
                        color={log.type === 'error' ? 'red' : log.type === 'success' ? 'green' : 'blue'}
                        style={{ minWidth: '50px' }}
                      >
                        {log.type.toUpperCase()}
                      </Badge>
                      <Text 
                        size="sm" 
                        style={{ 
                          fontFamily: 'monospace', 
                          lineHeight: 1.4,
                          color: log.type === 'error' ? '#ff6b6b' : log.type === 'success' ? '#51cf66' : '#c1c2c5'
                        }}
                      >
                        {log.message}
                      </Text>
                    </Group>
                  ))
                ) : (
                  <Text size="sm" color="dimmed" style={{ textAlign: 'center', padding: '2rem' }}>
                    Waiting for output...
                  </Text>
                )}
                
                {/* Auto-scroll to bottom */}
                <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
              </Stack>
            </Paper>
          </div>

          {/* Actions */}
          <Group position="right">
            {!runJobMutation.isLoading && (
              <Button
                variant="light"
                onClick={() => {
                  setLiveLogModalOpen(false)
                  setRunningJobId(null)
                  setLiveLogs([])
                  setJobStartTime(null)
                  setSelectedJob(null)
                }}
              >
                Close
              </Button>
            )}
            {runJobMutation.isLoading && (
              <Text size="sm" color="dimmed" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader size="xs" /> Job is running, please wait...
              </Text>
            )}
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}

export default CronJobs

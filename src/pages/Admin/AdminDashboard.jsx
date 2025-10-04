import React from 'react'
import {
  Container,
  Grid,
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Card,
  Badge,
  Progress,
  SimpleGrid,
  ThemeIcon,
  RingProgress,
  Timeline,
  ScrollArea,
  Loader,
  Center
} from '@mantine/core'
import {
  IconUsers,
  IconCreditCard,
  IconApi,
  IconShield,
  IconTool,
  IconTrendingUp,
  IconTrendingDown,
  IconActivity,
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle
} from '@tabler/icons-react'
import { trpc } from '../../utils/trpc'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

const StatCard = ({ title, value, icon, color, trend, trendValue, loading }) => {
  const TrendIcon = trend === 'up' ? IconTrendingUp : trend === 'down' ? IconTrendingDown : IconActivity

  return (
    <Card shadow="sm" radius="md" withBorder h="100%">
      <Group position="apart" align="flex-start">
        <div>
          <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
            {title}
          </Text>
          {loading ? (
            <Loader size="sm" />
          ) : (
            <Text size="xl" fw={900}>
              {value?.toLocaleString() || '0'}
            </Text>
          )}
          {trendValue && (
            <Group spacing={4} mt={5}>
              <TrendIcon size={14} color={trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'gray'} />
              <Text size="xs" color={trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'gray'}>
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

const SystemHealthCard = ({ metrics }) => {
  const getHealthColor = (metricType, value) => {
    switch (metricType) {
      case 'api_response_time':
        return value < 100 ? 'green' : value < 300 ? 'yellow' : 'red'
      case 'memory_usage':
        return value < 80 ? 'green' : value < 90 ? 'yellow' : 'red'
      case 'active_connections':
        return value < 50 ? 'green' : value < 100 ? 'yellow' : 'red'
      default:
        return 'blue'
    }
  }

  return (
    <Card shadow="sm" radius="md" withBorder h="100%">
      <Title order={4} mb="md">System Health</Title>
      <Stack spacing="sm">
        {metrics?.map((metric, index) => (
          <div key={index}>
            <Group position="apart" mb={5}>
              <Text size="sm" tt="capitalize">
                {metric.type.replace('_', ' ')}
              </Text>
              <Badge color={getHealthColor(metric.type, metric.value)} size="sm">
                {metric.value} {metric.unit}
              </Badge>
            </Group>
            <Progress
              value={metric.type === 'memory_usage' ? metric.value : Math.min(metric.value / 100 * 50, 100)}
              color={getHealthColor(metric.type, metric.value)}
              size="sm"
            />
          </div>
        ))}
      </Stack>
    </Card>
  )
}

const RecentActivityFeed = ({ activities, loading }) => {
  const getActivityColor = (type) => {
    switch (type) {
      case 'user_registration': return 'blue'
      case 'admin_action': return 'orange'
      case 'security_event': return 'red'
      default: return 'gray'
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user_registration': return <IconUsers size={16} />
      case 'admin_action': return <IconTool size={16} />
      case 'security_event': return <IconShield size={16} />
      default: return <IconActivity size={16} />
    }
  }

  return (
    <Card shadow="sm" radius="md" withBorder h="100%">
      <Title order={4} mb="md">Recent Activity</Title>
      <ScrollArea h={300}>
        {loading ? (
          <Center>
            <Loader size="sm" />
          </Center>
        ) : (
          <Timeline bulletSize={24} lineWidth={2}>
            {activities?.map((activity, index) => (
              <Timeline.Item
                key={index}
                bullet={getActivityIcon(activity.type)}
                color={getActivityColor(activity.type)}
              >
                <Text size="sm">{activity.description}</Text>
                <Text size="xs" color="dimmed">
                  {new Date(activity.createdAt).toLocaleString()}
                </Text>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </ScrollArea>
    </Card>
  )
}

const CronJobStatus = ({ cronJobs }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'green'
      case 'failed': return 'red'
      case 'running': return 'blue'
      default: return 'gray'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <IconCheck size={16} />
      case 'failed': return <IconX size={16} />
      case 'running': return <IconClock size={16} />
      default: return <IconActivity size={16} />
    }
  }

  return (
    <Card shadow="sm" radius="md" withBorder h="100%">
      <Title order={4} mb="md">Cron Jobs Status</Title>
      <Stack spacing="sm">
        {cronJobs?.map((job, index) => (
          <Group key={index} position="apart">
            <Group spacing="xs">
              <ThemeIcon color={getStatusColor(job.status)} size="sm" variant="light">
                {getStatusIcon(job.status)}
              </ThemeIcon>
              <div>
                <Text size="sm" fw={500}>{job.jobName}</Text>
                <Text size="xs" color="dimmed">
                  {job.duration ? `${job.duration}ms` : 'N/A'} • 
                  {job.recordsProcessed ? ` ${job.recordsProcessed} records` : ''}
                </Text>
              </div>
            </Group>
            <Badge color={getStatusColor(job.status)} size="sm">
              {job.status}
            </Badge>
          </Group>
        ))}
      </Stack>
    </Card>
  )
}

const SubscriptionDistribution = ({ data }) => {
  const COLORS = ['#228be6', '#40c057', '#fab005', '#fd7e14', '#e03131']

  const chartData = data?.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length]
  })) || []

  return (
    <Card shadow="sm" radius="md" withBorder h="100%">
      <Title order={4} mb="md">Subscription Distribution</Title>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={5}
              dataKey="count"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <Stack spacing="xs" mt="md">
        {chartData.map((item, index) => (
          <Group key={index} position="apart">
            <Group spacing="xs">
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: item.color
                }}
              />
              <Text size="sm" tt="capitalize">{item.status}</Text>
            </Group>
            <Text size="sm" fw={500}>{item.count}</Text>
          </Group>
        ))}
      </Stack>
    </Card>
  )
}

export default function AdminDashboard() {
  const { data: overview, isLoading: overviewLoading } = trpc.adminDashboard.getDashboardOverview.useQuery()
  const { data: userAnalytics } = trpc.adminDashboard.getUserAnalytics.useQuery({ days: 30 })
  const { data: apiAnalytics } = trpc.adminDashboard.getApiAnalytics.useQuery({ days: 7 })
  const { data: subscriptionAnalytics } = trpc.adminDashboard.getSubscriptionAnalytics.useQuery({ days: 30 })
  const { data: recentActivities, isLoading: activitiesLoading } = trpc.adminDashboard.getRecentActivities.useQuery({ limit: 15 })
  const { data: systemHealth } = trpc.adminDashboard.getSystemHealth.useQuery()

  return (
    <Container size="xl" py="md">
      <Title order={1} mb="xl">Admin Dashboard</Title>
      
      {/* Overview Stats */}
      <SimpleGrid cols={5} spacing="lg" mb="xl" breakpoints={[
        { maxWidth: 'lg', cols: 3 },
        { maxWidth: 'md', cols: 2 },
        { maxWidth: 'sm', cols: 1 }
      ]}>
        <StatCard
          title="Total Users"
          value={overview?.users.total}
          icon={<IconUsers size={22} />}
          color="blue"
          trend="up"
          trendValue={`+${overview?.users.newToday || 0} today`}
          loading={overviewLoading}
        />
        <StatCard
          title="Active Subscriptions"
          value={overview?.subscriptions.active}
          icon={<IconCreditCard size={22} />}
          color="green"
          trend="up"
          trendValue={`${overview?.subscriptions.total} total`}
          loading={overviewLoading}
        />
        <StatCard
          title="API Calls Today"
          value={overview?.api.callsToday}
          icon={<IconApi size={22} />}
          color="violet"
          trend="up"
          trendValue={`${overview?.api.avgResponseTime}ms avg`}
          loading={overviewLoading}
        />
        <StatCard
          title="Security Events"
          value={overview?.security.eventsToday}
          icon={<IconShield size={22} />}
          color={overview?.security.criticalEventsThisWeek > 0 ? "red" : "green"}
          trend={overview?.security.criticalEventsThisWeek > 0 ? "up" : "neutral"}
          trendValue={`${overview?.security.criticalEventsThisWeek} critical`}
          loading={overviewLoading}
        />
        <StatCard
          title="Admin Actions"
          value={overview?.admin.actionsToday}
          icon={<IconTool size={22} />}
          color="orange"
          loading={overviewLoading}
        />
      </SimpleGrid>

      {/* Charts and Analytics */}
      <Grid mb="xl">
        <Grid.Col span={8}>
          <Paper shadow="sm" radius="md" p="md" h="100%">
            <Title order={4} mb="md">User Registrations (Last 30 Days)</Title>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userAnalytics?.registrationTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#228be6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Paper>
        </Grid.Col>
        <Grid.Col span={4}>
          <SubscriptionDistribution data={subscriptionAnalytics?.statusDistribution} />
        </Grid.Col>
      </Grid>

      {/* API Analytics */}
      <Grid mb="xl">
        <Grid.Col span={6}>
          <Paper shadow="sm" radius="md" p="md" h="100%">
            <Title order={4} mb="md">API Calls (Last 7 Days)</Title>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={apiAnalytics?.dailyApiCalls || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#40c057" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Paper>
        </Grid.Col>
        <Grid.Col span={6}>
          <Paper shadow="sm" radius="md" p="md" h="100%">
            <Title order={4} mb="md">Top API Endpoints</Title>
            <ScrollArea h={250}>
              <Stack spacing="sm">
                {apiAnalytics?.topEndpoints?.slice(0, 8).map((endpoint, index) => (
                  <Group key={index} position="apart">
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={500} truncate>
                        {endpoint.endpoint}
                      </Text>
                      <Progress 
                        value={(endpoint.count / (apiAnalytics.topEndpoints[0]?.count || 1)) * 100} 
                        size="xs" 
                        color="blue"
                        mt={4}
                      />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Text size="sm" fw={600}>{endpoint.count}</Text>
                      <Text size="xs" color="dimmed">
                        {Math.round(endpoint.avgResponseTime || 0)}ms
                      </Text>
                    </div>
                  </Group>
                ))}
              </Stack>
            </ScrollArea>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* System Status */}
      <Grid>
        <Grid.Col span={3}>
          <SystemHealthCard metrics={systemHealth?.metrics} />
        </Grid.Col>
        <Grid.Col span={4}>
          <CronJobStatus cronJobs={[
            { jobName: 'data_scraper', status: 'completed', duration: 1250, recordsProcessed: 1500 },
            { jobName: 'price_updater', status: 'completed', duration: 890, recordsProcessed: 892 },
            { jobName: 'email_notifications', status: 'running', duration: null, recordsProcessed: null },
            { jobName: 'cleanup_task', status: 'completed', duration: 450, recordsProcessed: 150 }
          ]} />
        </Grid.Col>
        <Grid.Col span={5}>
          <RecentActivityFeed activities={recentActivities} loading={activitiesLoading} />
        </Grid.Col>
      </Grid>
    </Container>
  )
}
import React, { useState } from 'react'
import {
  Container,
  Title,
  Paper,
  Table,
  Group,
  Text,
  Badge,
  Button,
  TextInput,
  Select,
  Pagination,
  Modal,
  Stack,
  Grid,
  Card,
  ActionIcon,
  Tooltip,
  Avatar,
  ScrollArea,
  NumberInput,
  Textarea,
  Alert,
  Tabs,
  Timeline,
  Loader,
  Center,
  SimpleGrid,
  ThemeIcon,
  Progress,
  RingProgress
} from '@mantine/core'
import {
  IconSearch,
  IconEye,
  IconRefresh,
  IconCurrencyDollar,
  IconTrendingUp,
  IconTrendingDown,
  IconUsers,
  IconCreditCard,
  IconX,
  IconCheck,
  IconClock,
  IconAlertTriangle,
  IconBan,
  IconPlayerPlay,
  IconEdit,
  IconReceipt,
  IconChartLine,
  IconCalendar
} from '@tabler/icons-react'
import { trpc } from '../../utils/trpc'
import { notifications } from '@mantine/notifications'
import { DatePickerInput } from '@mantine/dates'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

const StatCard = ({ title, value, icon, color, trend, trendValue, prefix = '', suffix = '' }) => {
  const TrendIcon = trend === 'up' ? IconTrendingUp : trend === 'down' ? IconTrendingDown : null

  return (
    <Card shadow="sm" radius="md" withBorder h="100%">
      <Group position="apart" align="flex-start">
        <div>
          <Text size="xs" color="dimmed" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text size="xl" fw={900}>
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </Text>
          {trendValue && TrendIcon && (
            <Group spacing={4} mt={5}>
              <TrendIcon size={14} color={trend === 'up' ? 'green' : 'red'} />
              <Text size="xs" color={trend === 'up' ? 'green' : 'red'}>
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

const SubscriptionStatusBadge = ({ status }) => {
  const getStatusProps = (status) => {
    switch (status) {
      case 'active': return { color: 'green', label: 'Active' }
      case 'trialing': return { color: 'blue', label: 'Trial' }
      case 'canceled': return { color: 'red', label: 'Canceled' }
      case 'past_due': return { color: 'orange', label: 'Past Due' }
      case 'incomplete': return { color: 'yellow', label: 'Incomplete' }
      default: return { color: 'gray', label: status }
    }
  }
  
  const props = getStatusProps(status)
  return <Badge color={props.color} size="sm">{props.label}</Badge>
}

const RefundModal = ({ opened, onClose, subscription, onSuccess }) => {
  const [refundType, setRefundType] = useState('full')
  const [amount, setAmount] = useState(0)
  const [reason, setReason] = useState('')
  
  const refundMutation = trpc.adminBilling.issueRefund.useMutation()

  const handleSubmit = async () => {
    if (!reason.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please provide a reason for the refund',
        color: 'red'
      })
      return
    }

    try {
      await refundMutation.mutateAsync({
        subscriptionId: subscription.id,
        amount: refundType === 'partial' ? amount * 100 : undefined, // Convert to cents
        reason,
        refundType
      })
      
      notifications.show({
        title: 'Success',
        message: 'Refund processed successfully',
        color: 'green'
      })
      onSuccess()
      onClose()
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Issue Refund" size="md">
      <Stack spacing="md">
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
          This will process a refund through Stripe. This action cannot be undone.
        </Alert>
        
        <Select
          label="Refund Type"
          value={refundType}
          onChange={setRefundType}
          data={[
            { value: 'full', label: 'Full Refund' },
            { value: 'partial', label: 'Partial Refund' }
          ]}
        />
        
        {refundType === 'partial' && (
          <NumberInput
            label="Refund Amount ($)"
            value={amount}
            onChange={setAmount}
            precision={2}
            min={0.01}
            placeholder="0.00"
          />
        )}
        
        <Textarea
          label="Reason for Refund"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why this refund is being issued..."
          required
          minRows={3}
        />
        
        <Group position="right">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            color="red"
            onClick={handleSubmit} 
            loading={refundMutation.isLoading}
          >
            Process Refund
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

const CancelSubscriptionModal = ({ opened, onClose, subscription, onSuccess }) => {
  const [immediately, setImmediately] = useState(false)
  const [reason, setReason] = useState('')
  
  const cancelMutation = trpc.adminBilling.cancelSubscription.useMutation()

  const handleSubmit = async () => {
    if (!reason.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please provide a reason for cancellation',
        color: 'red'
      })
      return
    }

    try {
      await cancelMutation.mutateAsync({
        subscriptionId: subscription.id,
        immediately,
        reason
      })
      
      notifications.show({
        title: 'Success',
        message: immediately ? 'Subscription canceled immediately' : 'Subscription will cancel at period end',
        color: 'green'
      })
      onSuccess()
      onClose()
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Cancel Subscription" size="md">
      <Stack spacing="md">
        <Alert color="red" icon={<IconAlertTriangle size={16} />}>
          This will cancel the user's subscription in Stripe.
        </Alert>
        
        <Select
          label="Cancellation Type"
          value={immediately ? 'immediate' : 'end_of_period'}
          onChange={(value) => setImmediately(value === 'immediate')}
          data={[
            { value: 'end_of_period', label: 'Cancel at end of billing period' },
            { value: 'immediate', label: 'Cancel immediately' }
          ]}
        />
        
        <Textarea
          label="Reason for Cancellation"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why this subscription is being canceled..."
          required
          minRows={3}
        />
        
        <Group position="right">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            color="red"
            onClick={handleSubmit} 
            loading={cancelMutation.isLoading}
          >
            {immediately ? 'Cancel Immediately' : 'Cancel at Period End'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

const RevenueChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <RechartsTooltip formatter={(value) => [`$${(value / 100).toFixed(2)}`, 'Revenue']} />
      <Area type="monotone" dataKey="revenue" stroke="#228be6" fill="#228be6" fillOpacity={0.1} />
    </AreaChart>
  </ResponsiveContainer>
)

const SubscriptionTrendChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={250}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <RechartsTooltip />
      <Line type="monotone" dataKey="count" stroke="#40c057" strokeWidth={2} name="New Subscriptions" />
    </LineChart>
  </ResponsiveContainer>
)

const PlanDistributionChart = ({ data }) => {
  const COLORS = ['#228be6', '#40c057', '#fab005', '#fd7e14']

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={80}
          paddingAngle={5}
          dataKey="count"
        >
          {data?.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default function BillingDashboard() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedSubscription, setSelectedSubscription] = useState(null)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [reactivateModalOpen, setReactivateModalOpen] = useState(false)

  const { data: billingOverview, isLoading: overviewLoading } = trpc.adminBilling.getBillingOverview.useQuery()
  const { data: subscriptionsData, isLoading: subscriptionsLoading, refetch } = trpc.adminBilling.getAllSubscriptions.useQuery({
    page,
    limit: 25,
    status: statusFilter || undefined,
    plan: planFilter || undefined,
    search: search || undefined
  })
  const { data: revenueAnalytics } = trpc.adminBilling.getRevenueAnalytics.useQuery({})

  const reactivateMutation = trpc.adminBilling.reactivateSubscription.useMutation()

  const handleReactivateSubscription = async (subscription) => {
    setSelectedSubscription(subscription)
    setReactivateModalOpen(true)
  }

  const confirmReactivation = async () => {
    if (!selectedSubscription) return

    try {
      await reactivateMutation.mutateAsync({
        subscriptionId: selectedSubscription.id,
        reason: 'Admin reactivation'
      })
      notifications.show({
        title: 'Success',
        message: 'Subscription reactivated successfully',
        color: 'green'
      })
      refetch()
      setReactivateModalOpen(false)
      setSelectedSubscription(null)
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  return (
    <Container size="xl" py="md">
      <Title order={1} mb="xl">Billing Dashboard</Title>

      {/* Overview Stats */}
      <SimpleGrid cols={5} spacing="lg" mb="xl" breakpoints={[
        { maxWidth: 'lg', cols: 3 },
        { maxWidth: 'md', cols: 2 },
        { maxWidth: 'sm', cols: 1 }
      ]}>
        <StatCard
          title="Monthly Revenue"
          value={revenueAnalytics?.metrics.monthlyRecurringRevenue}
          icon={<IconCurrencyDollar size={22} />}
          color="green"
          trend="up"
          trendValue="+12.5%"
          prefix="$"
          suffix=""
        />
        <StatCard
          title="Active Subscriptions"
          value={billingOverview?.subscriptions.active}
          icon={<IconUsers size={22} />}
          color="blue"
          trend="up"
          trendValue={`+${billingOverview?.subscriptions.newThisMonth} this month`}
        />
        <StatCard
          title="Average Revenue Per User"
          value={revenueAnalytics?.metrics.averageRevenuePerUser}
          icon={<IconChartLine size={22} />}
          color="violet"
          prefix="$"
        />
        <StatCard
          title="Churn Rate"
          value={revenueAnalytics?.metrics.churnRate}
          icon={<IconTrendingDown size={22} />}
          color="orange"
          suffix="%"
        />
        <StatCard
          title="Trial Subscriptions"
          value={billingOverview?.subscriptions.trialing}
          icon={<IconClock size={22} />}
          color="cyan"
        />
      </SimpleGrid>

      {/* Charts */}
      <Grid mb="xl">
        <Grid.Col span={8}>
          <Paper shadow="sm" radius="md" p="md" h="100%">
            <Title order={4} mb="md">Revenue Trend</Title>
            <RevenueChart data={revenueAnalytics?.revenueByDay || []} />
          </Paper>
        </Grid.Col>
        <Grid.Col span={4}>
          <Paper shadow="sm" radius="md" p="md" h="100%">
            <Title order={4} mb="md">Plan Distribution</Title>
            <PlanDistributionChart data={billingOverview?.trends.planDistribution || []} />
            <Stack spacing="xs" mt="md">
              {billingOverview?.trends.planDistribution?.map((plan, index) => (
                <Group key={index} position="apart">
                  <Text size="sm" tt="capitalize">{plan.plan}</Text>
                  <Text size="sm" fw={500}>{plan.count}</Text>
                </Group>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      <Grid mb="xl">
        <Grid.Col span={6}>
          <Paper shadow="sm" radius="md" p="md" h="100%">
            <Title order={4} mb="md">Subscription Growth</Title>
            <SubscriptionTrendChart data={billingOverview?.trends.subscriptionTrend || []} />
          </Paper>
        </Grid.Col>
        <Grid.Col span={6}>
          <Paper shadow="sm" radius="md" p="md" h="100%">
            <Title order={4} mb="md">Revenue by Plan</Title>
            <Stack spacing="md">
              {revenueAnalytics?.revenueByPlan?.map((plan, index) => (
                <div key={index}>
                  <Group position="apart" mb={4}>
                    <Text size="sm" tt="capitalize" fw={500}>{plan.plan}</Text>
                    <Text size="sm" fw={600}>${(plan.revenue / 100).toFixed(2)}</Text>
                  </Group>
                  <Progress
                    value={(plan.revenue / revenueAnalytics.totalRevenue) * 100}
                    size="md"
                    color={index === 0 ? 'blue' : 'green'}
                  />
                  <Text size="xs" color="dimmed" mt={2}>
                    {plan.subscriptions} subscriptions
                  </Text>
                </div>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Subscriptions Table */}
      <Paper shadow="sm" radius="md" withBorder>
        <Group p="md" position="apart">
          <Title order={3}>All Subscriptions</Title>
          <Group>
            <TextInput
              placeholder="Search subscriptions..."
              icon={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              placeholder="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              data={[
                { value: '', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'trialing', label: 'Trial' },
                { value: 'canceled', label: 'Canceled' },
                { value: 'past_due', label: 'Past Due' }
              ]}
              clearable
            />
            <Select
              placeholder="Filter by plan"
              value={planFilter}
              onChange={setPlanFilter}
              data={[
                { value: '', label: 'All Plans' },
                { value: 'premium', label: 'Premium' },
                { value: 'pro', label: 'Pro' },
                { value: 'trial', label: 'Trial' }
              ]}
              clearable
            />
            <ActionIcon onClick={() => refetch()}>
              <IconRefresh size={16} />
            </ActionIcon>
          </Group>
        </Group>

        <ScrollArea>
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Current Period</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptionsLoading ? (
                <tr>
                  <td colSpan={6}>
                    <Center><Loader /></Center>
                  </td>
                </tr>
              ) : (
                subscriptionsData?.subscriptions?.map((subscription) => (
                  <tr key={subscription.id}>
                    <td>
                      <Group spacing="sm">
                        <Avatar src={subscription.userAvatar} size="sm" radius="xl" />
                        <div>
                          <Text size="sm" fw={500}>{subscription.userName}</Text>
                          <Text size="xs" color="dimmed">{subscription.userEmail}</Text>
                        </div>
                      </Group>
                    </td>
                    <td>
                      <Badge color="purple" tt="capitalize">{subscription.plan}</Badge>
                    </td>
                    <td>
                      <Group spacing="xs">
                        <SubscriptionStatusBadge status={subscription.status} />
                        {subscription.cancelAtPeriodEnd && (
                          <Tooltip label="Will cancel at period end">
                            <IconAlertTriangle size={16} color="orange" />
                          </Tooltip>
                        )}
                      </Group>
                    </td>
                    <td>
                      <Text size="sm">
                        {subscription.currentPeriodStart ? 
                          `${new Date(subscription.currentPeriodStart).toLocaleDateString()} - ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` 
                          : 'N/A'
                        }
                      </Text>
                    </td>
                    <td>
                      <Text size="sm">{new Date(subscription.createdAt).toLocaleDateString()}</Text>
                    </td>
                    <td>
                      <Group spacing={4}>
                        <Tooltip label="Issue refund">
                          <ActionIcon 
                            variant="subtle" 
                            color="orange"
                            onClick={() => {
                              setSelectedSubscription(subscription)
                              setRefundModalOpen(true)
                            }}
                          >
                            <IconReceipt size={16} />
                          </ActionIcon>
                        </Tooltip>
                        
                        {subscription.status === 'active' && (
                          <Tooltip label="Cancel subscription">
                            <ActionIcon 
                              variant="subtle" 
                              color="red"
                              onClick={() => {
                                setSelectedSubscription(subscription)
                                setCancelModalOpen(true)
                              }}
                            >
                              <IconBan size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        
                        {(subscription.status === 'canceled' || subscription.cancelAtPeriodEnd) && (
                          <Tooltip label="Reactivate subscription">
                            <ActionIcon 
                              variant="subtle" 
                              color="green"
                              onClick={() => handleReactivateSubscription(subscription)}
                            >
                              <IconPlayerPlay size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </ScrollArea>
        
        {subscriptionsData?.pagination && (
          <Group position="center" p="md">
            <Pagination
              value={page}
              onChange={setPage}
              total={subscriptionsData.pagination.totalPages}
            />
          </Group>
        )}
      </Paper>

      {/* Modals */}
      <RefundModal
        opened={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        subscription={selectedSubscription}
        onSuccess={refetch}
      />
      
      <CancelSubscriptionModal
        opened={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        subscription={selectedSubscription}
        onSuccess={refetch}
      />
      
      <Modal 
        opened={reactivateModalOpen} 
        onClose={() => setReactivateModalOpen(false)} 
        title="Reactivate Subscription" 
        size="md"
      >
        <Stack spacing="md">
          <Text size="sm">
            Are you sure you want to reactivate this subscription for {selectedSubscription?.userEmail}?
          </Text>
          <Group position="right">
            <Button variant="outline" onClick={() => setReactivateModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              color="green"
              onClick={confirmReactivation}
              loading={reactivateMutation.isLoading}
            >
              Reactivate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}
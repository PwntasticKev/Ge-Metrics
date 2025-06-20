import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  Text,
  Group,
  Stack,
  Badge,
  Table,
  Button,
  Modal,
  TextInput,
  Select,
  NumberInput,
  Textarea,
  SimpleGrid,
  Paper,
  Center,
  Loader,
  Tabs,
  ActionIcon,
  Alert,
  ScrollArea,
  Progress,
  Tooltip,
  Container,
  Title,
  Grid,
  Divider,
  Notification,
  Switch,
  Menu,
  LoadingOverlay
} from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import {
  IconUsers,
  IconTrendingUp,
  IconTrendingDown,
  IconRefresh,
  IconEdit,
  IconTrash,
  IconGift,
  IconReceipt,
  IconCreditCard,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconDownload,
  IconSearch,
  IconFilter,
  IconDots,
  IconBan,
  IconPlayerPlay,
  IconPlayerPause,
  IconQuestionMark,
  IconInfoCircle,
  IconCash,
  IconCurrencyDollar
} from '@tabler/icons-react'
import billingService from '../../../services/billingService'
import { formatPrice, formatPercentage } from '../../../utils/utils'
import { notifications } from '@mantine/notifications'

export default function BillingDashboard () {
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [subscriptionStats, setSubscriptionStats] = useState({})
  const [revenueMetrics, setRevenueMetrics] = useState({})
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Modal states
  const [refundModalOpened, setRefundModalOpened] = useState(false)
  const [trialModalOpened, setTrialModalOpened] = useState(false)
  const [editSubscriptionModalOpened, setEditSubscriptionModalOpened] = useState(false)

  // Form states
  const [refundForm, setRefundForm] = useState({ paymentId: '', amount: 0, reason: '' })
  const [trialForm, setTrialForm] = useState({ userId: '', adminNote: '' })
  const [subscriptionForm, setSubscriptionForm] = useState({ subscriptionId: '', newPlanId: '' })

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const customersData = billingService.getAllCustomers()
      const stats = billingService.getSubscriptionStats()
      const revenue = billingService.getRevenueMetrics()

      setCustomers(customersData)
      setSubscriptionStats(stats)
      setRevenueMetrics(revenue)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async () => {
    try {
      const result = await billingService.processRefund(
        refundForm.paymentId,
        refundForm.amount ? parseFloat(refundForm.amount) : null,
        refundForm.reason
      )

      if (result.success) {
        setRefundModalOpened(false)
        setRefundForm({ paymentId: '', amount: 0, reason: '' })
        loadDashboardData()
        alert('Refund processed successfully')
      } else {
        alert(`Refund failed: ${result.error}`)
      }
    } catch (error) {
      alert(`Refund failed: ${error.message}`)
    }
  }

  const handleGrantTrial = async () => {
    try {
      const result = await billingService.grantFreeTrial(trialForm.userId, 'admin_user')

      if (result.success) {
        setTrialModalOpened(false)
        setTrialForm({ userId: '', adminNote: '' })
        loadDashboardData()
        alert('Free trial granted successfully')
      } else {
        alert(`Failed to grant trial: ${result.error}`)
      }
    } catch (error) {
      alert(`Failed to grant trial: ${error.message}`)
    }
  }

  const handleCancelSubscription = async (subscriptionId, immediate = false) => {
    if (!confirm(`Are you sure you want to ${immediate ? 'immediately cancel' : 'schedule cancellation for'} this subscription?`)) {
      return
    }

    try {
      const result = await billingService.cancelSubscription(subscriptionId, immediate)

      if (result.success) {
        loadDashboardData()
        alert('Subscription updated successfully')
      } else {
        alert(`Failed to cancel subscription: ${result.error}`)
      }
    } catch (error) {
      alert(`Failed to cancel subscription: ${error.message}`)
    }
  }

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && customer.subscription?.status === 'active') ||
                         (statusFilter === 'canceled' && customer.subscription?.status === 'canceled') ||
                         (statusFilter === 'trial' && customer.subscription?.planId === 'trial')

    const matchesPlan = planFilter === 'all' || customer.subscription?.planId === planFilter

    return matchesSearch && matchesStatus && matchesPlan
  })

  const MetricCard = ({ title, value, icon, color, change, subtitle }) => (
    <Card withBorder p="md">
      <Group justify="space-between">
        <div>
          <Text size="xs" color="dimmed" weight={500}>{title}</Text>
          <Text size="xl" weight={700} color={color}>
            {value}
          </Text>
          {subtitle && (
            <Text size="xs" color="dimmed">{subtitle}</Text>
          )}
          {change && (
            <Group spacing="xs" mt="xs">
              {React.cloneElement(icon, { size: 16, color: change >= 0 ? 'green' : 'red' })}
              <Text size="sm" color={change >= 0 ? 'green' : 'red'}>
                {change >= 0 ? '+' : ''}{change}%
              </Text>
            </Group>
          )}
        </div>
        {React.cloneElement(icon, { size: 24, color })}
      </Group>
    </Card>
  )

  const CustomerRow = ({ customer }) => {
    const subscription = customer.subscription
    const billing = customer.billing

    return (
      <tr>
        <td>
          <Stack spacing="xs">
            <Text weight={500}>{customer.name || 'Unknown'}</Text>
            <Text size="sm" color="dimmed">{customer.email}</Text>
          </Stack>
        </td>
        <td>
          {subscription
            ? (
            <Stack spacing="xs">
              <Badge color={subscription.status === 'active' ? 'green' : 'red'}>
                {subscription.status}
              </Badge>
              <Text size="sm">{subscription.plan.name}</Text>
              <Text size="xs" color="dimmed">
                {subscription.planId === 'trial' && subscription.trialEnd
                  ? `Trial ends: ${new Date(subscription.trialEnd).toLocaleDateString()}`
                  : `Next billing: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                }
              </Text>
            </Stack>
              )
            : (
            <Badge color="gray">No subscription</Badge>
              )}
        </td>
        <td>
          <Stack spacing="xs">
            <Text weight={500}>${billing.totalSpent.toFixed(2)}</Text>
            <Text size="sm" color="dimmed">{billing.paymentCount} payments</Text>
            {billing.totalRefunded > 0 && (
              <Text size="xs" color="red">
                ${billing.totalRefunded.toFixed(2)} refunded
              </Text>
            )}
          </Stack>
        </td>
        <td>
          <Text size="sm" color="dimmed">
            {new Date(customer.createdAt).toLocaleDateString()}
          </Text>
        </td>
        <td>
          <Group spacing="xs">
            <Tooltip label="View Details">
              <ActionIcon
                variant="light"
                onClick={() => setSelectedCustomer(customer)}
              >
                <IconSearch size={16} />
              </ActionIcon>
            </Tooltip>

            {!customer.subscription && (
              <Tooltip label="Grant Free Trial">
                <ActionIcon
                  variant="light"
                  color="green"
                  onClick={() => {
                    setTrialForm({ userId: customer.id, adminNote: '' })
                    setTrialModalOpened(true)
                  }}
                >
                  <IconGift size={16} />
                </ActionIcon>
              </Tooltip>
            )}

            {customer.subscription?.status === 'active' && (
              <>
                <Tooltip label="Cancel at Period End">
                  <ActionIcon
                    variant="light"
                    color="orange"
                    onClick={() => handleCancelSubscription(customer.subscription.id, false)}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label="Cancel Immediately">
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => handleCancelSubscription(customer.subscription.id, true)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </>
            )}
          </Group>
        </td>
      </tr>
    )
  }

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    )
  }

  return (
    <Container size="xl" py="md">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="lg">
        <Title order={2}>Billing Dashboard</Title>
        <Group>
          <Button
            leftIcon={<IconRefresh size={16} />}
            variant="light"
            onClick={loadDashboardData}
          >
            Refresh
          </Button>
          <Button
            leftIcon={<IconDownload size={16} />}
            variant="light"
          >
            Export Report
          </Button>
        </Group>
      </Group>

      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftIcon={<IconTrendingUp size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="customers" leftIcon={<IconUsers size={16} />}>
            Customers ({filteredCustomers.length})
          </Tabs.Tab>
          <Tabs.Tab value="subscriptions" leftIcon={<IconCreditCard size={16} />}>
            Subscriptions
          </Tabs.Tab>
          <Tabs.Tab value="payments" leftIcon={<IconReceipt size={16} />}>
            Payments & Refunds
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <SimpleGrid cols={4} spacing="md" mb="xl">
            <MetricCard
              title="Monthly Recurring Revenue"
              value={`$${revenueMetrics.monthlyRevenue?.toFixed(2) || '0.00'}`}
              icon={<IconCurrencyDollar />}
              color="green"
              change={12.5}
            />
            <MetricCard
              title="Active Subscriptions"
              value={subscriptionStats.active}
              icon={<IconUsers />}
              color="blue"
              subtitle={`${subscriptionStats.trials} trials`}
            />
            <MetricCard
              title="Total Revenue"
              value={`$${revenueMetrics.totalRevenue?.toFixed(2) || '0.00'}`}
              icon={<IconTrendingUp />}
              color="violet"
              change={8.3}
            />
            <MetricCard
              title="Churn Rate"
              value="2.1%"
              icon={<IconTrendingDown />}
              color="red"
              change={-0.5}
            />
          </SimpleGrid>

          <SimpleGrid cols={2} spacing="md">
            <Card withBorder p="md">
              <Text weight={500} mb="md">Subscription Breakdown</Text>
              <Stack spacing="sm">
                <Group justify="space-between">
                  <Text size="sm">Monthly Plans</Text>
                  <Badge variant="light">{subscriptionStats.monthly}</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Yearly Plans</Text>
                  <Badge variant="light">{subscriptionStats.yearly}</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Free Trials</Text>
                  <Badge variant="light">{subscriptionStats.trials}</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Canceled</Text>
                  <Badge color="red" variant="light">{subscriptionStats.canceled}</Badge>
                </Group>
              </Stack>
            </Card>

            <Card withBorder p="md">
              <Text weight={500} mb="md">Revenue Metrics</Text>
              <Stack spacing="sm">
                <Group justify="space-between">
                  <Text size="sm">This Month</Text>
                  <Text weight={500}>${revenueMetrics.monthlyRevenue?.toFixed(2)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">This Year</Text>
                  <Text weight={500}>${revenueMetrics.yearlyRevenue?.toFixed(2)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Refunds (Month)</Text>
                  <Text color="red">${revenueMetrics.monthlyRefunds?.toFixed(2)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Net Revenue</Text>
                  <Text weight={500} color="green">
                    ${revenueMetrics.netMonthlyRevenue?.toFixed(2)}
                  </Text>
                </Group>
              </Stack>
            </Card>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="customers" pt="md">
          {/* Filters */}
          <Card withBorder p="md" mb="md">
            <Group>
              <TextInput
                placeholder="Search customers..."
                leftIcon={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <Select
                placeholder="Status"
                data={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'canceled', label: 'Canceled' },
                  { value: 'trial', label: 'Trial' }
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <Select
                placeholder="Plan"
                data={[
                  { value: 'all', label: 'All Plans' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' },
                  { value: 'trial', label: 'Trial' }
                ]}
                value={planFilter}
                onChange={setPlanFilter}
              />
            </Group>
          </Card>

          {/* Customer Table */}
          <Card withBorder p="md">
            <ScrollArea>
              <Table highlightOnHover>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Subscription</th>
                    <th>Billing</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <CustomerRow key={customer.id} customer={customer} />
                  ))}
                </tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="subscriptions" pt="md">
          <Group mb="md">
            <Button
              leftIcon={<IconEdit size={16} />}
              variant="light"
              onClick={() => setEditSubscriptionModalOpened(true)}
            >
              Modify Subscription
            </Button>
          </Group>

          {/* Subscription management content */}
          <Alert icon={<IconAlertTriangle size={16} />} title="Subscription Management">
            Use the customer table to grant free trials to individual users, or use the button above for bulk subscription modifications.
          </Alert>
        </Tabs.Panel>

        <Tabs.Panel value="payments" pt="md">
          <Group mb="md">
            <Button
              leftIcon={<IconReceipt size={16} />}
              color="red"
              onClick={() => setRefundModalOpened(true)}
            >
              Process Refund
            </Button>
          </Group>

          {/* Payment and refund management content */}
          <Alert icon={<IconAlertTriangle size={16} />} title="Payment Management">
            Select a customer from the customers tab to view their payment history and process refunds.
          </Alert>
        </Tabs.Panel>
      </Tabs>

      {/* Refund Modal */}
      <Modal
        opened={refundModalOpened}
        onClose={() => setRefundModalOpened(false)}
        title="Process Refund"
      >
        <Stack spacing="md">
          <TextInput
            label="Payment ID"
            placeholder="pay_..."
            value={refundForm.paymentId}
            onChange={(e) => setRefundForm({ ...refundForm, paymentId: e.target.value })}
            required
            rightSection={
              <Tooltip
                label="Payment Intent ID from Stripe Dashboard. Format: pay_1234567890abcdef or pi_1234567890abcdef"
                multiline
                width={300}
                withArrow
                position="top-end"
              >
                <ActionIcon size="sm" variant="subtle">
                  <IconQuestionMark size={16} />
                </ActionIcon>
              </Tooltip>
            }
            description="Find this in your Stripe Dashboard under Payments → [Payment] → Payment Intent ID"
          />
          <NumberInput
            label="Refund Amount"
            placeholder="Leave empty for full refund"
            value={refundForm.amount}
            defaultValue={0}
            onChange={(value) => setRefundForm({ ...refundForm, amount: value })}
            precision={2}
            min={0}
            parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '0'}
            formatter={(value) => value ? `$${Number(value).toFixed(2)}` : '$0.00'}
          />
          <Textarea
            label="Reason"
            placeholder="Reason for refund..."
            value={refundForm.reason}
            onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
            required
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setRefundModalOpened(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleRefund}>
              Process Refund
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Grant Trial Modal */}
      <Modal
        opened={trialModalOpened}
        onClose={() => setTrialModalOpened(false)}
        title="Grant Free Trial"
      >
        <Stack spacing="md">
          {trialForm.userId && (
            <Alert color="blue">
              Granting free trial to user: <strong>{trialForm.userId}</strong>
            </Alert>
          )}
          <NumberInput
            label="Trial Duration (Days)"
            placeholder="30"
            value={30}
            min={1}
            max={365}
            defaultValue={30}
          />
          <Textarea
            label="Admin Note"
            placeholder="Reason for granting trial..."
            value={trialForm.adminNote}
            onChange={(e) => setTrialForm({ ...trialForm, adminNote: e.target.value })}
            required
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setTrialModalOpened(false)}>
              Cancel
            </Button>
            <Button
              color="green"
              onClick={handleGrantTrial}
              disabled={!trialForm.userId || !trialForm.adminNote.trim()}
            >
              Grant Trial
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <Modal
          opened={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={`Customer Details - ${selectedCustomer.name}`}
          size="lg"
        >
          <Stack spacing="md">
            <SimpleGrid cols={2} spacing="md">
              <div>
                <Text size="sm" weight={500}>Email</Text>
                <Text size="sm" color="dimmed">{selectedCustomer.email}</Text>
              </div>
              <div>
                <Text size="sm" weight={500}>Customer Since</Text>
                <Text size="sm" color="dimmed">
                  {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                </Text>
              </div>
              <div>
                <Text size="sm" weight={500}>Total Spent</Text>
                <Text size="sm" weight={600} color="green">
                  ${selectedCustomer.billing.totalSpent.toFixed(2)}
                </Text>
              </div>
              <div>
                <Text size="sm" weight={500}>Payment Count</Text>
                <Text size="sm">{selectedCustomer.billing.paymentCount}</Text>
              </div>
            </SimpleGrid>

            {selectedCustomer.subscription && (
              <Card withBorder p="md">
                <Text weight={500} mb="sm">Current Subscription</Text>
                <SimpleGrid cols={2} spacing="sm">
                  <div>
                    <Text size="sm" weight={500}>Plan</Text>
                    <Text size="sm">{selectedCustomer.subscription.plan.name}</Text>
                  </div>
                  <div>
                    <Text size="sm" weight={500}>Status</Text>
                    <Badge color={selectedCustomer.subscription.status === 'active' ? 'green' : 'red'}>
                      {selectedCustomer.subscription.status}
                    </Badge>
                  </div>
                  <div>
                    <Text size="sm" weight={500}>Next Billing</Text>
                    <Text size="sm">
                      {new Date(selectedCustomer.subscription.currentPeriodEnd).toLocaleDateString()}
                    </Text>
                  </div>
                  <div>
                    <Text size="sm" weight={500}>Price</Text>
                    <Text size="sm" weight={600}>
                      ${selectedCustomer.subscription.plan.price}/
                      {selectedCustomer.subscription.plan.interval}
                    </Text>
                  </div>
                </SimpleGrid>
              </Card>
            )}
          </Stack>
        </Modal>
      )}
    </Container>
  )
}

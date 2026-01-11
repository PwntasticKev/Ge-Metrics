import React, { useState, useEffect } from 'react'
import {
  Container,
  Title,
  Text,
  Button,
  Badge,
  Alert,
  Loader,
  Center,
  Stack,
  Card,
  Divider,
  ActionIcon,
  Table,
  Box,
  Group,
  SimpleGrid,
  Paper,
  ThemeIcon,
  Grid
} from '@mantine/core'
import { 
  IconCrown, 
  IconCheck, 
  IconAlertCircle, 
  IconSettings, 
  IconShield,
  IconCreditCard,
  IconReceipt,
  IconDownload,
  IconCalendar,
  IconClock,
  IconCurrencyDollar,
  IconBolt
} from '@tabler/icons-react'
import { trpc } from '../../utils/trpc.jsx'
import { useAuth } from '../../hooks/useAuth'
import { Link, useSearchParams } from 'react-router-dom'

const BillingPage = () => {
  const { user, isLoading: isUserLoading } = useAuth()
  const { data: subscription, isLoading: isSubscriptionLoading } = trpc.billing.getSubscription.useQuery()
  const { data: paymentMethod, isLoading: isPaymentMethodLoading } = trpc.billing.getPaymentMethod.useQuery()
  const { data: invoices, isLoading: isInvoicesLoading } = trpc.billing.getInvoices.useQuery()
  const createCheckoutSession = trpc.billing.createCheckoutSession.useMutation()
  const downloadInvoice = trpc.billing.downloadInvoice.useMutation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const isSuccess = searchParams.get('success') === 'true'

  // Pricing IDs
  const MONTHLY = import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY

  const handleSubscribe = async () => {
    setIsLoading(true)
    setError('')
    if (!MONTHLY) {
      setError('Stripe is not configured correctly. Please contact support.')
      setIsLoading(false)
      return
    }
    try {
      const { url } = await createCheckoutSession.mutateAsync({ priceId: MONTHLY })
      window.location.href = url
    } catch (err) {
      setError(err.message || 'Failed to create checkout session. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setIsLoading(true)
    try {
      const { url } = await createCheckoutSession.mutateAsync({})
      window.location.href = url
    } catch (err) {
      setError(err.message || 'Failed to open billing portal. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const result = await downloadInvoice.mutateAsync({ invoiceId })
      if (result.url) {
        window.open(result.url, '_blank')
      }
    } catch (err) {
      setError('Failed to download invoice. Please try again.')
    }
  }

  if (isUserLoading || isSubscriptionLoading) {
    return (
      <Center h={300}><Loader /></Center>
    )
  }

  // --- State Logic Refactor ---
  // 1. Subscription Active: 'active' status from Stripe
  const isSubscribed = subscription && subscription.status === 'active'
  
  // 2. Trial Status: 'trialing' or isTrialing flag
  const isTrial = subscription && (subscription.status === 'trialing' || subscription.isTrialing)
  const trialEndDate = subscription?.trialEnd ? new Date(subscription.trialEnd) : null
  const daysRemaining = trialEndDate ? Math.ceil((trialEndDate - new Date()) / (1000 * 60 * 60 * 24)) : 0
  
  // 3. Trial Expired: Is trial but time is up
  const isTrialExpired = isTrial && daysRemaining <= 0
  
  // 4. Trial Active: Is trial and time remains
  const isTrialActive = isTrial && !isTrialExpired

  // Determine user state for UI
  let userState = 'unknown'
  if (user?.role === 'admin') userState = 'admin'
  else if (isSubscribed) userState = 'subscribed'
  else if (isTrialActive) userState = 'trial_active'
  else if (isTrialExpired) userState = 'trial_expired'
  else userState = 'inactive' // Should not typically happen with auto-trial

  // Formatters
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount, currency = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100)
  }

  const getCardBrandName = (brand) => {
    const brands = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      jcb: 'JCB',
      diners: 'Diners Club'
    }
    return brands[brand?.toLowerCase()] || brand || 'Card'
  }

  const formatPaymentMethod = () => {
    if (!paymentMethod) return 'No payment method'
    const brand = getCardBrandName(paymentMethod.brand)
    const last4 = paymentMethod.last4 || '****'
    const expMonth = paymentMethod.expMonth?.toString().padStart(2, '0') || '**'
    const expYear = paymentMethod.expYear?.toString().slice(-2) || '**'
    return `${brand} •••• ${last4} (Expires ${expMonth}/${expYear})`
  }

  // UI Components
  const StatusBadge = () => {
    switch (userState) {
      case 'admin':
        return <Badge size="lg" color="blue" variant="filled">Admin Access</Badge>
      case 'subscribed':
        return <Badge size="lg" color="green" variant="filled">Active Premium</Badge>
      case 'trial_active':
        return <Badge size="lg" color="orange" variant="filled">Free Trial ({daysRemaining} days left)</Badge>
      case 'trial_expired':
        return <Badge size="lg" color="red" variant="filled">Trial Expired</Badge>
      default:
        return <Badge size="lg" color="gray" variant="filled">Inactive</Badge>
    }
  }

  return (
    <Container size="xl" py="xl">
      <Stack spacing="xl">
        {/* Header Section */}
        <Box>
          <Title order={2} mb="xs" style={{ color: 'var(--mantine-color-gray-0)' }}>Subscription & Billing</Title>
          <Text color="dimmed">Manage your plan, payment methods, and view invoices.</Text>
        </Box>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" withCloseButton onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {isSuccess && (
          <Alert icon={<IconCheck size={16} />} color="green" title="Subscription Active">
            Your subscription has been successfully activated. Thank you for supporting Ge-Metrics!
          </Alert>
        )}

        {/* Overview Grid */}
        <SimpleGrid cols={3} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
          {/* Status Card */}
          <Paper withBorder p="md" radius="md">
            <Group position="apart" mb="xs">
              <Text size="xs" color="dimmed" transform="uppercase" weight={700}>Current Status</Text>
              <ThemeIcon color={userState === 'subscribed' ? 'green' : userState === 'trial_active' ? 'orange' : 'gray'} variant="light" size="sm">
                <IconShield size={14} />
              </ThemeIcon>
            </Group>
            <Group spacing="xs" mb="xs">
              <Text weight={700} size="xl">{userState === 'trial_active' ? 'Free Trial' : 'Premium Plan'}</Text>
              <StatusBadge />
            </Group>
            {userState === 'trial_active' && (
              <Text size="sm" color="dimmed">
                Enjoy full access to all features during your trial period.
              </Text>
            )}
            {userState === 'trial_expired' && (
              <Text size="sm" color="red">
                Your trial has ended. Please subscribe to restore access.
              </Text>
            )}
          </Paper>

          {/* Billing Cycle Card */}
          <Paper withBorder p="md" radius="md">
            <Group position="apart" mb="xs">
              <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                {userState === 'subscribed' ? 'Next Billing' : 'Expiration'}
              </Text>
              <ThemeIcon color="blue" variant="light" size="sm">
                <IconCalendar size={14} />
              </ThemeIcon>
            </Group>
            <Text weight={700} size="xl">
              {formatDate(subscription?.nextBillingDate || subscription?.currentPeriodEnd || trialEndDate)}
            </Text>
            <Text size="sm" color="dimmed">
              {userState === 'subscribed' ? 'Your card will be charged on this date.' : 'Your access ends on this date.'}
            </Text>
          </Paper>

          {/* Price Card */}
          <Paper withBorder p="md" radius="md">
            <Group position="apart" mb="xs">
              <Text size="xs" color="dimmed" transform="uppercase" weight={700}>Plan Cost</Text>
              <ThemeIcon color="green" variant="light" size="sm">
                <IconCurrencyDollar size={14} />
              </ThemeIcon>
            </Group>
            <Group align="baseline" spacing={4}>
              <Text weight={700} size="xl">$3.00</Text>
              <Text size="sm" color="dimmed">/ month</Text>
            </Group>
            <Text size="sm" color="dimmed">
              Simple, transparent pricing.
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Main Content Grid */}
        <Grid gutter="xl">
          <Grid.Col md={8}>
            <Stack spacing="xl">
              {/* Plan Details & Actions */}
              <Paper withBorder p="lg" radius="md">
                <Group position="apart" mb="md">
                  <Title order={4}>Plan Management</Title>
                  {userState !== 'admin' && (
                    <Group>
                      {(userState === 'trial_active' || userState === 'trial_expired' || userState === 'inactive') && (
                        <Button 
                          leftIcon={<IconCrown size={16} />} 
                          color={userState === 'trial_active' ? 'blue' : 'green'}
                          onClick={handleSubscribe}
                          loading={isLoading}
                        >
                          {userState === 'trial_active' ? 'Upgrade to Premium' : 'Subscribe Now'}
                        </Button>
                      )}
                      {userState === 'subscribed' && (
                        <Button 
                          variant="light" 
                          leftIcon={<IconSettings size={16} />} 
                          onClick={handleManageSubscription}
                          loading={isLoading}
                        >
                          Manage Subscription
                        </Button>
                      )}
                    </Group>
                  )}
                </Group>
                
                <Divider mb="md" />
                
                <Stack spacing="md">
                  <Group position="apart">
                    <Text size="sm" color="dimmed">Current Plan</Text>
                    <Text weight={500}>Ge-Metrics Premium</Text>
                  </Group>
                  <Group position="apart">
                    <Text size="sm" color="dimmed">Billing Interval</Text>
                    <Text weight={500}>Monthly</Text>
                  </Group>
                  <Group position="apart">
                    <Text size="sm" color="dimmed">Payment Method</Text>
                    {isPaymentMethodLoading ? <Loader size="xs" /> : <Text weight={500}>{formatPaymentMethod()}</Text>}
                  </Group>
                </Stack>
              </Paper>

              {/* Invoice History */}
              <Paper withBorder p="lg" radius="md">
                <Group position="apart" mb="md">
                  <Title order={4}>Billing History</Title>
                  <ActionIcon variant="subtle" color="gray"><IconDownload size={16} /></ActionIcon>
                </Group>
                
                {isInvoicesLoading ? (
                  <Center p="xl"><Loader /></Center>
                ) : ( invoices && invoices.length > 0 ? (
                  <Table verticalSpacing="sm" highlightOnHover>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td>{formatDate(invoice.date)}</td>
                          <td>{formatCurrency(invoice.amount, invoice.currency)}</td>
                          <td>
                            <Badge 
                              color={invoice.status === 'paid' ? 'green' : 'gray'} 
                              size="sm" 
                              variant="dot"
                            >
                              {invoice.status}
                            </Badge>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Button 
                              variant="subtle" 
                              size="xs" 
                              compact 
                              leftIcon={<IconDownload size={12} />}
                              onClick={() => handleDownloadInvoice(invoice.id)}
                              loading={downloadInvoice.isLoading && downloadInvoice.variables?.invoiceId === invoice.id}
                            >
                              Download
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <Center p="xl">
                    <Stack align="center" spacing="xs">
                      <ThemeIcon color="gray" variant="light" size="xl" radius="xl">
                        <IconReceipt size={24} />
                      </ThemeIcon>
                      <Text color="dimmed" size="sm">No invoices found</Text>
                    </Stack>
                  </Center>
                ))}
              </Paper>
            </Stack>
          </Grid.Col>

          {/* Sidebar / Features */}
          <Grid.Col md={4}>
            <Paper withBorder p="lg" radius="md" h="100%">
              <Title order={4} mb="md">Premium Features</Title>
              <Stack spacing="sm">
                {[
                  'Advanced Flip Tracking',
                  'Real-time Profit Calculator',
                  'Unlimited Watchlist',
                  'Whale Activity Tracking',
                  'AI Price Predictions',
                  'Priority Support'
                ].map((feature, i) => (
                  <Group key={i} spacing="sm" noWrap>
                    <ThemeIcon color="green" variant="light" size="sm" radius="xl">
                      <IconCheck size={12} />
                    </ThemeIcon>
                    <Text size="sm">{feature}</Text>
                  </Group>
                ))}
              </Stack>
              
              <Divider my="xl" />
              
              <Alert icon={<IconBolt size={16} />} color="blue" variant="light">
                <Text size="xs">
                  Need help with your subscription? Contact our support team for assistance.
                </Text>
              </Alert>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  )
}

export default BillingPage
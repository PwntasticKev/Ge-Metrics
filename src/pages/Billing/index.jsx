import React, { useState } from 'react'
import {
  Container,
  Title,
  Text,
  Button,
  Paper,
  Group,
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
  SegmentedControl
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
  IconUserCheck
} from '@tabler/icons-react'
import { trpc } from '../../utils/trpc.jsx'
import { useAuth } from '../../hooks/useAuth'
import { Link, useSearchParams } from 'react-router-dom'

const BillingPage = () => {
  const { user, isLoading: isUserLoading } = useAuth()
  const { data: subscription, isLoading: isSubscriptionLoading } = trpc.billing.getSubscription.useQuery()
  const { data: invoices, isLoading: isInvoicesLoading } = trpc.billing.getInvoices.useQuery()
  const createCheckoutSession = trpc.billing.createCheckoutSession.useMutation()
  const downloadInvoice = trpc.billing.downloadInvoice.useMutation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const isSuccess = searchParams.get('success') === 'true'
  const [activeTab, setActiveTab] = useState('overview')

  // Pricing IDs
  const MONTHLY = import.meta.env.VITE_STRIPE_PRICE_ID || import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY
  const YEARLY = import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY
  const hasYearly = Boolean(YEARLY)
  const [plan, setPlan] = useState('monthly')

  const selectedPriceId = plan === 'yearly' && hasYearly ? YEARLY : MONTHLY

  const handleSubscribe = async () => {
    setIsLoading(true)
    setError('')
    if (!selectedPriceId) {
      setError('Stripe is not configured correctly. Please contact support.')
      setIsLoading(false)
      return
    }
    try {
      const { url } = await createCheckoutSession.mutateAsync({ priceId: selectedPriceId })
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

  if (isUserLoading || isSubscriptionLoading) {
    return (
      <Center h={300}><Loader /></Center>
    )
  }

  const isSubscribed = subscription && subscription.status === 'active'
  const isTrial = subscription && subscription.status === 'trialing'
  const hasStripeCustomer = subscription && subscription.stripeCustomerId
  const isPremiumUser = user?.role === 'premium' || user?.role === 'admin'
  
  const formatDate = (dateString) => {
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
    }).format(amount / 100) // Stripe amounts are in cents
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

  const renderSubscriberContent = () => (
    <Stack spacing="lg">
      {/* Current Plan Status */}
      <Card withBorder p="lg" radius="md">
        <Group position="apart" mb="md">
          <Group spacing="sm">
            <IconShield size={24} color="#228be6" />
            <div>
              <Text weight={700} size="lg">
                Premium Plan
              </Text>
              <Text size="sm" color="dimmed">
                Full access to all features
              </Text>
            </div>
          </Group>
          <Badge color="green" variant="light" size="lg">
            {isSubscribed ? 'Active' : isTrial ? 'Trial' : 'Inactive'}
          </Badge>
        </Group>
        
        {subscription?.stripeCurrentPeriodEnd && (
          <Group spacing="xs" mb="md">
            <IconCalendar size={16} color="#868e96" />
            <Text size="sm" color="dimmed">
              {isSubscribed ? 'Renews on' : 'Expires on'} {formatDate(subscription.stripeCurrentPeriodEnd)}
            </Text>
          </Group>
        )}
        
        <Group spacing="md">
          <Button
            leftIcon={<IconSettings size={16} />}
            onClick={handleManageSubscription}
            loading={isLoading}
          >
            Manage Subscription
          </Button>
          <Button
            variant="light"
            leftIcon={<IconCreditCard size={16} />}
            onClick={handleManageSubscription}
            loading={isLoading}
          >
            Update Payment Method
          </Button>
        </Group>
      </Card>
      
      {/* Billing Information */}
      <Card withBorder p="lg" radius="md">
        <Group spacing="sm" mb="md">
          <IconCreditCard size={20} />
          <Text weight={600} size="md">
            Billing Information
          </Text>
        </Group>
        
        <Stack spacing="xs">
          <Group position="apart">
            <Text size="sm" color="dimmed">Email</Text>
            <Text size="sm">{user?.email}</Text>
          </Group>
          <Group position="apart">
            <Text size="sm" color="dimmed">Plan Price</Text>
            <Text size="sm" weight={500}>$4.00 / month</Text>
          </Group>
          <Group position="apart">
            <Text size="sm" color="dimmed">Payment Method</Text>
            <Text size="sm">•••• •••• •••• 4242</Text>
          </Group>
        </Stack>
      </Card>
      
      {/* Invoice History */}
      <Card withBorder p="lg" radius="md">
        <Group spacing="sm" mb="md">
          <IconReceipt size={20} />
          <Text weight={600} size="md">
            Invoice History
          </Text>
        </Group>
        
        {isInvoicesLoading ? (
          <Center p="xl">
            <Loader size="sm" />
          </Center>
        ) : (
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(invoices || []).map((invoice) => (
                <tr key={invoice.id}>
                  <td>{formatDate(invoice.date)}</td>
                  <td>{invoice.description}</td>
                  <td>{formatCurrency(invoice.amount, invoice.currency)}</td>
                  <td>
                    <Badge color={invoice.status === 'paid' ? 'green' : 'orange'} size="sm">
                      {invoice.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td>
                    <ActionIcon 
                      variant="light" 
                      size="sm"
                      onClick={() => handleDownloadInvoice(invoice.id)}
                      loading={downloadInvoice.isLoading}
                    >
                      <IconDownload size={14} />
                    </ActionIcon>
                  </td>
                </tr>
              ))}
              {(!invoices || invoices.length === 0) && (
                <tr>
                  <td colSpan={5}>
                    <Center p="md">
                      <Text color="dimmed">No invoices found</Text>
                    </Center>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </Stack>
  )
  
  const renderNonSubscriberContent = () => (
    <Stack spacing="lg">
      {/* Pricing Card */}
      <Card withBorder p="xl" radius="md" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Stack align="center" spacing="md">
          <IconCrown size={48} color="#ffd43b" />
          <div style={{ textAlign: 'center' }}>
            <Text size="xl" weight={700} color="white">
              Upgrade to Premium
            </Text>
            <Text size="md" color="rgba(255, 255, 255, 0.8)">
              Unlock all features and start maximizing your profits
            </Text>
          </div>
        </Stack>
        
        <Divider my="xl" color="rgba(255, 255, 255, 0.2)" />
        
        <Group position="center" mb="xl">
          <Text size="3rem" weight={700} color="white">
            $4
          </Text>
          <div>
            <Text size="md" color="rgba(255, 255, 255, 0.8)">
              per month
            </Text>
            <Text size="xs" color="rgba(255, 255, 255, 0.6)">
              Cancel anytime
            </Text>
          </div>
        </Group>
        
        <Button
          fullWidth
          size="lg"
          color="yellow"
          leftIcon={<IconCrown size={18} />}
          onClick={handleSubscribe}
          loading={isLoading}
        >
          Start Your Premium Journey
        </Button>
      </Card>
      
      {/* Features List */}
      <Card withBorder p="lg" radius="md">
        <Text weight={600} size="lg" mb="md">
          What's Included
        </Text>
        
        <Stack spacing="sm">
          {[
            'Advanced flip tracking and analytics',
            'Real-time profit calculations',
            'Unlimited watchlist items',
            'Priority data updates',
            'Export trading history',
            'Advanced filtering and search',
            'Email notifications for opportunities',
            'Mobile app access'
          ].map((feature, index) => (
            <Group key={index} spacing="sm">
              <IconCheck size={16} color="#51cf66" />
              <Text size="sm">{feature}</Text>
            </Group>
          ))}
        </Stack>
      </Card>
      
      {/* Previous Billing History for Former Subscribers */}
      {invoices && invoices.length > 0 && (
        <Card withBorder p="lg" radius="md">
          <Text weight={600} size="md" mb="md">
            Previous Billing History
          </Text>
          
          {isInvoicesLoading ? (
            <Center p="xl">
              <Loader size="sm" />
            </Center>
          ) : (
            <Table striped>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 3).map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{formatDate(invoice.date)}</td>
                    <td>{invoice.description}</td>
                    <td>{formatCurrency(invoice.amount, invoice.currency)}</td>
                    <td>
                      <ActionIcon 
                        variant="light" 
                        size="sm"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        loading={downloadInvoice.isLoading}
                      >
                        <IconDownload size={14} />
                      </ActionIcon>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </Stack>
  )
  
  return (
    <Container size="md" py="xl">
      <Box mb="xl">
        <Group spacing="sm" mb="sm">
          {isPremiumUser ? (
            <IconShield size={28} color="#228be6" />
          ) : (
            <IconCrown size={28} color="#ffd43b" />
          )}
          <Title order={1}>
            {isPremiumUser ? 'Billing & Subscription' : 'Upgrade to Premium'}
          </Title>
        </Group>
        
        <Text color="dimmed" size="md">
          {isPremiumUser 
            ? 'Manage your subscription, view invoices, and update billing information.'
            : 'Join thousands of traders maximizing their profits with our premium features.'}
        </Text>
      </Box>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="lg">
          {error}
        </Alert>
      )}

      {isSuccess && (
        <Alert icon={<IconCheck size={16} />} color="green" title="Welcome to Premium!" mb="lg">
          Your subscription is now active. You can access all premium features.
          <Button component={Link} to="/all-items" fullWidth mt="md">
            Explore Premium Features
          </Button>
        </Alert>
      )}
      
      {isPremiumUser ? renderSubscriberContent() : renderNonSubscriberContent()}
    </Container>
  )
}

export default BillingPage

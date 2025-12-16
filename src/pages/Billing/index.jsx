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
  Group
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
  IconCalendar
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
  const [plan, setPlan] = useState('monthly')

  useEffect(() => {
    // Add entrance animations
    const cards = document.querySelectorAll('.billing-card')
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.style.opacity = '1'
        card.style.transform = 'translateY(0)'
      }, index * 100)
    })
  }, [subscription])

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

  if (isUserLoading || isSubscriptionLoading) {
    return (
      <Center h={300}><Loader /></Center>
    )
  }

  const isSubscribed = subscription && subscription.status === 'active'
  const isTrial = subscription && subscription.status === 'trialing'
  const isPremiumUser = user?.role === 'premium' || user?.role === 'admin'
  
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
    }).format(amount / 100) // Stripe amounts are in cents
  }

  const formatPrice = (amount, currency = 'usd') => {
    if (!amount) return '$3.00'
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
    if (!paymentMethod) return 'No payment method on file'
    const brand = getCardBrandName(paymentMethod.brand)
    const last4 = paymentMethod.last4 || '****'
    const expMonth = paymentMethod.expMonth?.toString().padStart(2, '0') || '**'
    const expYear = paymentMethod.expYear?.toString().slice(-2) || '**'
    return `${brand} •••• ${last4} (Expires ${expMonth}/${expYear})`
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
      <Card 
        className="billing-card"
        withBorder 
        p="xl" 
        radius="md"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          opacity: 0,
          transform: 'translateY(20px)',
          transition: 'all 0.6s ease-out',
          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
        }}
      >
        <Group position="apart" mb="md">
          <Group spacing="sm">
            <IconShield size={32} color="#ffd700" />
            <div>
              <Text weight={700} size="xl" color="white">
                Premium Plan
              </Text>
              <Text size="sm" color="rgba(255, 255, 255, 0.8)">
                You're all set, bro! Full access unlocked
              </Text>
            </div>
          </Group>
          <Badge 
            size="lg" 
            variant="filled"
            style={{
              background: 'rgba(255, 215, 0, 0.2)',
              color: '#ffd700',
              border: '1px solid rgba(255, 215, 0, 0.3)'
            }}
          >
            {isSubscribed ? 'Active' : isTrial ? 'Trial' : 'Inactive'}
          </Badge>
        </Group>
        
        {(subscription?.nextBillingDate || subscription?.currentPeriodEnd) && (
          <Group spacing="xs" mb="md">
            <IconCalendar size={18} color="rgba(255, 255, 255, 0.9)" />
            <Text size="sm" color="rgba(255, 255, 255, 0.9)">
              {isSubscribed ? 'Renews on' : 'Expires on'} {formatDate(subscription.nextBillingDate || subscription.currentPeriodEnd)}
            </Text>
          </Group>
        )}
        
        <Group spacing="md">
          <Button
            leftIcon={<IconSettings size={18} />}
            onClick={handleManageSubscription}
            loading={isLoading}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Manage your plan
          </Button>
          <Button
            variant="light"
            leftIcon={<IconCreditCard size={18} />}
            onClick={handleManageSubscription}
            loading={isLoading}
            style={{
              background: 'rgba(255, 215, 0, 0.2)',
              color: '#ffd700',
              border: '1px solid rgba(255, 215, 0, 0.3)'
            }}
          >
            Update payment method
          </Button>
        </Group>
      </Card>
      
      {/* Billing Information */}
      <Card 
        className="billing-card"
        withBorder 
        p="lg" 
        radius="md"
        style={{
          opacity: 0,
          transform: 'translateY(20px)',
          transition: 'all 0.6s ease-out 0.1s',
          border: '1px solid #e9ecef'
        }}
      >
        <Group spacing="sm" mb="md">
          <IconCreditCard size={20} color="#667eea" />
          <Text weight={600} size="md" style={{ color: 'var(--mantine-color-gray-0)' }}>
            Your billing deets
          </Text>
        </Group>
        
        <Stack spacing="md">
          <Group position="apart">
            <Text size="sm" style={{ color: 'var(--mantine-color-gray-4)' }}>Email</Text>
            <Text size="sm" weight={500} style={{ color: 'var(--mantine-color-gray-0)' }}>{user?.email}</Text>
          </Group>
          <Group position="apart">
            <Text size="sm" style={{ color: 'var(--mantine-color-gray-4)' }}>Plan Price</Text>
            <Text size="sm" weight={600} color="#667eea">
              {subscription?.currentPrice 
                ? `${formatPrice(subscription.currentPrice, subscription.currency)} / ${subscription.billingCycle || 'month'}`
                : '$3.00 / month'}
            </Text>
          </Group>
          <Group position="apart">
            <Text size="sm" style={{ color: 'var(--mantine-color-gray-4)' }}>Payment Method</Text>
            {isPaymentMethodLoading ? (
              <Loader size="xs" />
            ) : (
              <Text size="sm" weight={500} style={{ color: 'var(--mantine-color-gray-0)' }}>
                {formatPaymentMethod()}
              </Text>
            )}
          </Group>
        </Stack>
      </Card>
      
      {/* Invoice History */}
      <Card 
        className="billing-card"
        withBorder 
        p="lg" 
        radius="md"
        style={{
          opacity: 0,
          transform: 'translateY(20px)',
          transition: 'all 0.6s ease-out 0.2s',
          border: '1px solid #e9ecef'
        }}
      >
        <Group spacing="sm" mb="md">
          <IconReceipt size={20} color="#667eea" />
          <Text weight={600} size="md" style={{ color: 'var(--mantine-color-gray-0)' }}>
            Your payment history
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
                    <Badge 
                      color={invoice.status === 'paid' ? 'green' : 'orange'} 
                      size="sm"
                      variant="light"
                    >
                      {invoice.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td>
                    <ActionIcon 
                      variant="light" 
                      size="sm"
                      onClick={() => handleDownloadInvoice(invoice.id)}
                      loading={downloadInvoice.isLoading}
                      color="blue"
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
      <Card 
        className="billing-card"
        withBorder 
        p="xl" 
        radius="md" 
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          opacity: 0,
          transform: 'translateY(20px)',
          transition: 'all 0.6s ease-out',
          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Shimmer effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
          animation: 'shimmer 3s infinite'
        }} />
        <style>{`
          @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
          }
        `}</style>

        <Stack align="center" spacing="md">
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(255, 215, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(255, 215, 0, 0.4)',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <IconCrown size={48} color="#ffd700" />
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.8; }
              50% { transform: scale(1.05); opacity: 1; }
            }
          `}</style>
          
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <Text size="xl" weight={700} color="white" mb="xs">
              Let's get you premium, bro
            </Text>
            <Text size="md" color="rgba(255, 255, 255, 0.9)">
              Unlock all features and start maximizing those profits
            </Text>
          </div>
        </Stack>
        
        <Divider my="xl" color="rgba(255, 255, 255, 0.2)" style={{ position: 'relative', zIndex: 1 }} />
        
        <Group position="center" mb="xl" style={{ position: 'relative', zIndex: 1 }}>
          <Text 
            size="4rem" 
            weight={700} 
            color="white"
            style={{
              background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1
            }}
          >
            $3
          </Text>
          <div>
            <Text size="lg" color="rgba(255, 255, 255, 0.9)" weight={500}>
              per month
            </Text>
            <Text size="xs" color="rgba(255, 255, 255, 0.7)">
              Cancel anytime, no questions asked
            </Text>
          </div>
        </Group>
        
        <Button
          fullWidth
          size="lg"
          leftIcon={<IconCrown size={20} />}
          onClick={handleSubscribe}
          loading={isLoading}
          style={{
            background: 'rgba(255, 215, 0, 0.9)',
            color: '#1a1b1e',
            border: 'none',
            fontWeight: 600,
            fontSize: '16px',
            position: 'relative',
            zIndex: 1,
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ffd700'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 215, 0, 0.9)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.4)'
          }}
        >
          Start Your Premium Journey
        </Button>
      </Card>
      
      {/* Features List */}
      <Card 
        className="billing-card"
        withBorder 
        p="lg" 
        radius="md"
        style={{
          opacity: 0,
          transform: 'translateY(20px)',
          transition: 'all 0.6s ease-out 0.1s',
          border: '1px solid #e9ecef'
        }}
      >
        <Text weight={600} size="lg" mb="md" style={{ color: 'var(--mantine-color-gray-0)' }}>
          What you get
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
              <IconCheck size={18} color="#51cf66" />
              <Text size="sm" color="#495057">{feature}</Text>
            </Group>
          ))}
        </Stack>
      </Card>
      
      {/* Previous Billing History for Former Subscribers */}
      {invoices && invoices.length > 0 && (
        <Card 
          className="billing-card"
          withBorder 
          p="lg" 
          radius="md"
          style={{
            opacity: 0,
            transform: 'translateY(20px)',
            transition: 'all 0.6s ease-out 0.2s',
            border: '1px solid #e9ecef'
          }}
        >
          <Text weight={600} size="md" mb="md" style={{ color: 'var(--mantine-color-gray-0)' }}>
            Previous payment history
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
                        color="blue"
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
            <IconShield size={32} color="#667eea" />
          ) : (
            <IconCrown size={32} color="#ffd700" />
          )}
          <Title order={1} style={{ color: 'var(--mantine-color-gray-0)' }}>
            {isPremiumUser ? 'Billing & Subscription' : 'Upgrade to Premium'}
          </Title>
        </Group>
        
        <Text style={{ color: 'var(--mantine-color-gray-4)' }} size="md">
          {isPremiumUser 
            ? 'Manage your subscription, view invoices, and update your billing info.'
            : 'Join thousands of traders maximizing their profits with our premium features.'}
        </Text>
      </Box>

      {error && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          color="red" 
          mb="lg"
          style={{
            borderRadius: '8px',
            border: '1px solid #fa5252'
          }}
        >
          {error}
        </Alert>
      )}

      {isSuccess && (
        <Alert 
          icon={<IconCheck size={16} />} 
          color="green" 
          title="Welcome to Premium!" 
          mb="lg"
          style={{
            borderRadius: '8px',
            border: '1px solid #51cf66'
          }}
        >
          Your subscription is now active. You can access all premium features.
          <Button 
            component={Link} 
            to="/all-items" 
            fullWidth 
            mt="md"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none'
            }}
          >
            Explore Premium Features
          </Button>
        </Alert>
      )}
      
      {isPremiumUser ? renderSubscriberContent() : renderNonSubscriberContent()}
    </Container>
  )
}

export default BillingPage

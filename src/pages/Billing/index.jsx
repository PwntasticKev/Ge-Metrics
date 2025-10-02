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
  Center
} from '@mantine/core'
import { IconCrown, IconCheck, IconAlertCircle, IconSettings } from '@tabler/icons-react'
import { trpc } from '../../utils/trpc.jsx'
import { useAuth } from '../../hooks/useAuth'
import { Link, useSearchParams } from 'react-router-dom'

const BillingPage = () => {
  const { user, isLoading: isUserLoading } = useAuth()
  const { data: subscription, isLoading: isSubscriptionLoading } = trpc.billing.getSubscription.useQuery()
  const createCheckoutSession = trpc.billing.createCheckoutSession.useMutation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const isSuccess = searchParams.get('success') === 'true'

  const handleSubscribe = async () => {
    setIsLoading(true)
    setError('')
    const priceId = import.meta.env.VITE_STRIPE_PRICE_ID
    if (!priceId) {
      setError('Stripe is not configured correctly. Please contact support.')
      setIsLoading(false)
      return
    }
    try {
      const { url } = await createCheckoutSession.mutateAsync({
        priceId
      })
      window.location.href = url
    } catch (err) {
      setError(err.message || 'Failed to create checkout session. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setIsLoading(true)
    setError('')
    try {
      const { url } = await createCheckoutSession.mutateAsync({})
      window.location.href = url
    } catch (err) {
      setError(err.message || 'Failed to create portal session. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isUserLoading || isSubscriptionLoading) {
    return <Center style={{ height: '100vh' }} data-testid="loading-spinner"><Loader /></Center>
  }

  const isSubscribed = subscription && subscription.status === 'active'
  const isTrial = subscription && subscription.status === 'trialing'
  const hasStripeCustomer = subscription && subscription.stripeCustomerId

  return (
    <Container size="sm" py="xl">
      <Title order={1} align="center" mb="lg">
        Subscription
      </Title>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="lg">
          {error}
        </Alert>
      )}

      {isSuccess && (
      <Alert icon={<IconCheck size={16} />} color="green" title="Subscription successful!" mb="lg">
          Welcome to Premium! You can now access all features.
          <Button component={Link} to="/all-items" fullWidth mt="md">
            Go to Dashboard
          </Button>
        </Alert>
      )}

      <Paper withBorder shadow="md" p="xl" radius="md">
        <Group position="apart" mb="md">
          <Title order={2}>
            {isSubscribed ? 'Current Plan' : 'Choose Your Plan'}
          </Title>
          {isSubscribed && (
            <Badge color="green" variant="light" size="lg">
              Active
            </Badge>
          )}
          {isTrial && (
            <Badge color="blue" variant="light" size="lg">
              Trial
            </Badge>
          )}
        </Group>

        <Text color="dimmed" mb="xl">
          {isSubscribed
            ? 'You are currently subscribed to the Premium Plan.'
            : isTrial
              ? 'You are currently on a trial of the Premium Plan.'
              : 'Unlock all features with our Premium Plan.'}
        </Text>

        <Paper withBorder p="lg" radius="md" mb="xl">
          <Group position="apart">
            <div>
              <Text weight={700} size="lg">
                Premium Plan
              </Text>
              <Text color="dimmed" size="sm">
                Full access to all features
              </Text>
            </div>
            <Text weight={700} size="xl">
              $4.00 / month
            </Text>
          </Group>
        </Paper>

        {hasStripeCustomer
          ? (
          <>
            <Text size="sm" mb="md">
              Your subscription will renew on{' '}
              {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString()}.
            </Text>
            <Button
              fullWidth
              size="lg"
              leftIcon={<IconSettings size={18} />}
              onClick={handleManageSubscription}
              loading={isLoading}
            >
              Manage Subscription
            </Button>
          </>
            )
          : (
          <Button
            fullWidth
            size="lg"
            leftIcon={<IconCrown size={18} />}
            onClick={handleSubscribe}
            loading={isLoading}
          >
            {isTrial ? 'Activate Subscription' : 'Upgrade to Premium'}
          </Button>
            )}
              </Paper>
            </Container>
  )
}

export default BillingPage

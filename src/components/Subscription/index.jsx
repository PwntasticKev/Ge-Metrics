import React, { useState } from 'react'
import {
  Modal,
  Card,
  Text,
  Button,
  Group,
  Stack,
  List,
  Badge,
  Divider,
  Alert,
  Center,
  Loader
} from '@mantine/core'
import {
  IconCrown,
  IconCheck,
  IconAlertCircle,
  IconCreditCard,
  IconShield,
  IconTrendingUp,
  IconBolt
} from '@tabler/icons-react'

const plans = [
  {
    id: 'free',
    name: 'Free Tier',
    price: 0,
    priceText: 'Free',
    description: 'Basic market data access',
    features: [
      'View current item prices',
      'Basic search functionality',
      'Limited high volume alerts',
      'Standard refresh rates'
    ],
    limitations: [
      'No historical data',
      'Limited market watch access',
      'No arbitrage tracker',
      'Basic support only'
    ],
    color: 'gray',
    popular: false
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 3,
    priceText: '$3/month',
    description: 'Full access to all premium features',
    features: [
      '🚀 Real-time data updates',
      '📊 Complete market watch indexes',
      '⚡ Advanced arbitrage tracking',
      '🔔 Custom price alerts & notifications',
      '📈 Historical price charts & analysis',
      '🎯 Profit tracking & portfolio management',
      '💎 Priority customer support',
      '🔮 Future item predictions',
      '🤖 Advanced flipping algorithms',
      '📱 Mobile app access',
      '🎨 Premium themes & customization'
    ],
    color: 'gold',
    popular: true
  }
]

export default function SubscriptionModal ({ opened, onClose, currentPlan = 'free' }) {
  const [selectedPlan, setSelectedPlan] = useState('premium')
  const [isLoading, setIsLoading] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const handleSubscribe = async (planId) => {
    if (planId === 'free') return

    setIsLoading(true)

    // Simulate Stripe integration
    try {
      // In real implementation, you would:
      // 1. Create Stripe checkout session
      // 2. Redirect to Stripe checkout
      // 3. Handle webhooks for subscription updates

      // Mock successful payment
      await new Promise(resolve => setTimeout(resolve, 2000))

      setPaymentSuccess(true)
      setIsLoading(false)

      setTimeout(() => {
        onClose()
        // In real app, redirect to dashboard or show success
      }, 2000)
    } catch (error) {
      setIsLoading(false)
      console.error('Payment failed:', error)
    }
  }

  if (paymentSuccess) {
    return (
      <Modal opened={opened} onClose={onClose} size="md" centered>
        <Center p="xl">
          <Stack align="center" spacing="lg">
            <IconCheck size={64} color="green" />
            <Text size="xl" weight={700} color="green">
              Welcome to Premium! 🎉
            </Text>
            <Text align="center" color="dimmed">
              Your subscription is now active. Enjoy all premium features!
            </Text>
            <Button onClick={onClose}>Continue to Dashboard</Button>
          </Stack>
        </Center>
      </Modal>
    )
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      centered
      title={
        <Group>
          <IconCrown size={24} color="gold" />
          <Text size="lg" weight={700}>Upgrade to Premium</Text>
        </Group>
      }
    >
      <Stack spacing="md">
        <Text color="dimmed" mb="md">
          Unlock the full potential of GE Metrics with our premium subscription
        </Text>

        <Group grow spacing="md" align="stretch">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              withBorder
              p="lg"
              style={{
                cursor: plan.id !== 'free' ? 'pointer' : 'default',
                borderColor: selectedPlan === plan.id ? `var(--mantine-color-${plan.color}-5)` : undefined,
                backgroundColor: plan.popular ? 'rgba(255, 215, 0, 0.05)' : undefined,
                position: 'relative'
              }}
              onClick={() => plan.id !== 'free' && setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <Badge
                  color="yellow"
                  variant="filled"
                  style={{ position: 'absolute', top: -10, right: 10 }}
                >
                  Most Popular
                </Badge>
              )}

              <Stack spacing="md">
                <Group position="apart">
                  <Text size="lg" weight={700}>{plan.name}</Text>
                  <Badge color={plan.color} variant="light">
                    {plan.priceText}
                  </Badge>
                </Group>

                <Text size="sm" color="dimmed">
                  {plan.description}
                </Text>

                <Divider />

                <Stack spacing="xs">
                  {plan.features.map((feature, idx) => (
                    <Group key={idx} spacing="xs" align="flex-start">
                      <IconCheck size={16} color="green" style={{ marginTop: 2 }} />
                      <Text size="sm">{feature}</Text>
                    </Group>
                  ))}

                  {plan.limitations && (
                    <>
                      <Divider variant="dashed" />
                      {plan.limitations.map((limitation, idx) => (
                        <Group key={idx} spacing="xs" align="flex-start">
                          <Text size="sm" color="red">✗</Text>
                          <Text size="sm" color="dimmed">{limitation}</Text>
                        </Group>
                      ))}
                    </>
                  )}
                </Stack>
              </Stack>
            </Card>
          ))}
        </Group>

        {selectedPlan === 'premium' && (
          <Alert icon={<IconShield size={16} />} color="blue">
            <Text size="sm">
              <strong>Secure Payment:</strong> Your payment is processed securely through Stripe.
              Cancel anytime. No hidden fees.
            </Text>
          </Alert>
        )}

        <Group position="right" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Maybe Later
          </Button>

          {selectedPlan === 'premium' && (
            <Button
              leftIcon={isLoading ? <Loader size={16} /> : <IconCreditCard size={16} />}
              loading={isLoading}
              onClick={() => handleSubscribe(selectedPlan)}
              gradient={{ from: 'yellow', to: 'orange' }}
              variant="gradient"
              size="md"
            >
              {isLoading ? 'Processing...' : 'Subscribe Now - $3/month'}
            </Button>
          )}
        </Group>

        <Text size="xs" color="dimmed" align="center">
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          You can cancel your subscription at any time.
        </Text>
      </Stack>
    </Modal>
  )
}

// Hook for managing subscription state
export function useSubscription () {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [plan, setPlan] = useState('free')

  // In real app, this would check with your backend/database
  const checkSubscriptionStatus = async () => {
    // Mock check - in real app, verify with Stripe and your backend
    const mockSubscribed = localStorage.getItem('premium_subscribed') === 'true'
    setIsSubscribed(mockSubscribed)
    setPlan(mockSubscribed ? 'premium' : 'free')
  }

  const subscribe = () => {
    localStorage.setItem('premium_subscribed', 'true')
    setIsSubscribed(true)
    setPlan('premium')
  }

  const unsubscribe = () => {
    localStorage.removeItem('premium_subscribed')
    setIsSubscribed(false)
    setPlan('free')
  }

  return {
    isSubscribed,
    plan,
    checkSubscriptionStatus,
    subscribe,
    unsubscribe
  }
}

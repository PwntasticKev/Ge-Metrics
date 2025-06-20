import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  ThemeIcon,
  Card,
  Badge,
  List,
  Divider,
  Alert,
  Center,
  Progress
} from '@mantine/core'
import {
  IconCheck,
  IconStar,
  IconBell,
  IconChartLine,
  IconDatabase,
  IconHeadphones,
  IconGift,
  IconArrowRight,
  IconInfoCircle,
  IconClock,
  IconTrendingUp,
  IconBrain,
  IconShield,
  IconSparkles
} from '@tabler/icons-react'
import { useTrialContext } from '../../contexts/TrialContext'
import bg from '../../assets/gehd.png'

const SignupSuccess = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(5)
  const { trialStatus } = useTrialContext()

  const isTrial = searchParams.get('trial') === 'true'
  const planType = searchParams.get('plan') || 'yearly'
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Countdown timer for auto-redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  const trialFeatures = [
    {
      icon: <IconBrain size={16} />,
      title: 'AI-Powered Predictions',
      description: 'Advanced algorithms analyzing market trends',
      available: true
    },
    {
      icon: <IconTrendingUp size={16} />,
      title: 'Whale Tracking',
      description: 'Monitor large trader movements and patterns',
      available: true
    },
    {
      icon: <IconSparkles size={16} />,
      title: 'Future Items Analysis',
      description: 'Early access to upcoming OSRS content predictions',
      available: true
    },
    {
      icon: <IconBell size={16} />,
      title: 'Price Alerts',
      description: 'Up to 10 price alerts during trial',
      available: true,
      limitation: '10 max'
    },
    {
      icon: <IconChartLine size={16} />,
      title: 'Watchlist',
      description: 'Track up to 25 items during trial',
      available: true,
      limitation: '25 items max'
    },
    {
      icon: <IconDatabase size={16} />,
      title: 'API Access',
      description: 'Limited API calls for data access',
      available: true,
      limitation: '100 calls/day'
    }
  ]

  const premiumFeatures = [
    {
      icon: <IconBell size={16} />,
      title: 'Unlimited Price Alerts',
      description: 'Set alerts for any item price changes'
    },
    {
      icon: <IconChartLine size={16} />,
      title: 'Unlimited Watchlist',
      description: 'Track as many items as you want'
    },
    {
      icon: <IconDatabase size={16} />,
      title: 'Unlimited API Access',
      description: 'No daily limits on data requests'
    },
    {
      icon: <IconHeadphones size={16} />,
      title: 'Priority Support',
      description: '24/7 customer support with priority queue'
    },
    {
      icon: <IconStar size={16} />,
      title: 'Early Access',
      description: 'Get new features before general release'
    }
  ]

  const nextSteps = [
    {
      title: 'Explore AI Predictions',
      description: 'See which items are trending',
      action: 'View Predictions',
      path: '/ai-predictions'
    },
    {
      title: 'Track Whale Activity',
      description: 'Monitor large trader movements',
      action: 'View Whales',
      path: '/ai-predictions?tab=whales'
    },
    {
      title: 'Set Up Your Watchlist',
      description: 'Add items you want to track',
      action: 'Create Watchlist',
      path: '/watchlist'
    },
    {
      title: 'Check Future Items',
      description: 'See upcoming OSRS content',
      action: 'View Future Items',
      path: '/future-items'
    }
  ]

  return (
    <Container size="md" py="xl" style={{
      minHeight: '100vh',
      backgroundImage: `url(${bg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      <Paper shadow="xl" p="xl" radius="md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
        <Center mb="xl">
          <ThemeIcon color={isTrial ? 'blue' : 'green'} size={80} radius="xl">
            {isTrial ? <IconClock size={40} /> : <IconCheck size={40} />}
          </ThemeIcon>
        </Center>

        <Title order={1} align="center" mb="md">
          {isTrial ? '🎉 Your 14-Day Free Trial Has Started!' : 'Welcome to GE Metrics Premium!'}
        </Title>

        <Text size="lg" align="center" color="dimmed" mb="xl">
          {isTrial
            ? 'Enjoy full access to all premium features for 14 days, completely free!'
            : 'Thank you for subscribing! Your premium account is now active.'
          }
        </Text>

        {/* Trial Status */}
        {isTrial && trialStatus && (
          <Card withBorder p="md" mb="xl" style={{
            backgroundColor: '#e7f5ff',
            borderColor: '#339af0'
          }}>
            <Group justify="space-between" align="center" mb="md">
              <div>
                <Text weight={600} size="lg" color="blue">
                  Free Trial Active
                </Text>
                <Text size="sm" color="dimmed">
                  Started: {new Date(trialStatus.startDate).toLocaleDateString()}
                </Text>
              </div>
              <Badge color="blue" variant="filled" size="lg">
                {trialStatus.daysRemaining} days left
              </Badge>
            </Group>

            <Progress
              value={((14 - trialStatus.daysRemaining) / 14) * 100}
              size="sm"
              color="blue"
              mb="sm"
            />

            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              <Text size="sm">
                Your trial ends on {new Date(trialStatus.endDate).toLocaleDateString()}.
                You can upgrade to premium anytime to continue using all features.
              </Text>
            </Alert>
          </Card>
        )}

        {/* Subscription Details for paid plans */}
        {!isTrial && (
          <Card withBorder p="md" mb="xl" style={{ backgroundColor: '#f8f9fa' }}>
            <Group justify="space-between" align="center" mb="md">
              <div>
                <Text weight={500} size="lg">
                  Premium {planType === 'yearly' ? 'Yearly' : 'Monthly'}
                </Text>
                <Text size="sm" color="dimmed">
                  {planType === 'yearly'
                    ? '$33.00/year (Save 31%)'
                    : '$4.00/month'
                  }
                </Text>
              </div>
              <Badge color="green" variant="filled" size="lg">
                Premium Active
              </Badge>
            </Group>
          </Card>
        )}

        {/* Trial Features */}
        {isTrial && (
          <Card withBorder p="md" mb="xl">
            <Title order={3} mb="md">
              <Group spacing="xs">
                <IconSparkles size={20} color="#339af0" />
                <Text>Trial Features Available</Text>
              </Group>
            </Title>

            <Stack spacing="md">
              {trialFeatures.map((feature, index) => (
                <Group key={index} spacing="md">
                  <ThemeIcon
                    color={feature.available ? 'blue' : 'gray'}
                    size={32}
                    radius="xl"
                  >
                    {feature.icon}
                  </ThemeIcon>
                  <div style={{ flex: 1 }}>
                    <Group justify="space-between">
                      <Text weight={500}>{feature.title}</Text>
                      {feature.limitation && (
                        <Badge size="sm" color="orange" variant="light">
                          {feature.limitation}
                        </Badge>
                      )}
                    </Group>
                    <Text size="sm" color="dimmed">{feature.description}</Text>
                  </div>
                </Group>
              ))}
            </Stack>

            <Divider my="md" />

            <Alert icon={<IconGift size={16} />} color="blue" variant="light">
              <Text size="sm" weight={500} mb="xs">
                💎 Upgrade to Premium for:
              </Text>
              <List size="sm" spacing={2}>
                <List.Item>Unlimited watchlist items & price alerts</List.Item>
                <List.Item>Unlimited API access & data exports</List.Item>
                <List.Item>Priority support & early feature access</List.Item>
                <List.Item>Advanced analytics & historical data</List.Item>
              </List>
            </Alert>
          </Card>
        )}

        {/* Premium Features for paid plans */}
        {!isTrial && (
          <Card withBorder p="md" mb="xl">
            <Title order={3} mb="md">
              <Group spacing="xs">
                <IconStar size={20} color="#FFD700" />
                <Text>Premium Features Now Available</Text>
              </Group>
            </Title>

            <Stack spacing="md">
              {premiumFeatures.map((feature, index) => (
                <Group key={index} spacing="md">
                  <ThemeIcon color="green" size={32} radius="xl">
                    {feature.icon}
                  </ThemeIcon>
                  <div>
                    <Text weight={500}>{feature.title}</Text>
                    <Text size="sm" color="dimmed">{feature.description}</Text>
                  </div>
                </Group>
              ))}
            </Stack>
          </Card>
        )}

        {/* Next Steps */}
        <Card withBorder p="md" mb="xl">
          <Title order={3} mb="md">
            🚀 Ready to Start Trading?
          </Title>

          <Stack spacing="md">
            {nextSteps.map((step, index) => (
              <Group key={index} justify="space-between" align="center">
                <div>
                  <Text weight={500}>{step.title}</Text>
                  <Text size="sm" color="dimmed">{step.description}</Text>
                </div>
                <Button
                  variant="light"
                  size="sm"
                  rightIcon={<IconArrowRight size={14} />}
                  onClick={() => navigate(step.path)}
                >
                  {step.action}
                </Button>
              </Group>
            ))}
          </Stack>
        </Card>

        {/* Actions */}
        <Group justify="center" spacing="md">
          <Button
            size="lg"
            onClick={() => navigate('/')}
            leftIcon={<IconArrowRight size={18} />}
          >
            Start Exploring ({countdown}s)
          </Button>

          {isTrial && (
            <Button
              variant="light"
              size="lg"
              onClick={() => navigate('/billing')}
              leftIcon={<IconStar size={18} />}
            >
              Upgrade to Premium
            </Button>
          )}
        </Group>

        <Text size="xs" color="dimmed" align="center" mt="xl">
          {isTrial
            ? 'No credit card required • Cancel anytime • Full feature access'
            : 'Thank you for choosing GE Metrics Premium!'
          }
        </Text>
      </Paper>
    </Container>
  )
}

export default SignupSuccess

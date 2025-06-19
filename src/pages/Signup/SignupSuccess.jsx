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
  Center
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
  IconInfoCircle
} from '@tabler/icons-react'
import bg from '../../assets/gehd.png'

const SignupSuccess = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(5)

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

  const premiumFeatures = [
    {
      icon: <IconBell size={16} />,
      title: 'Unlimited Price Alerts',
      description: 'Set alerts for any item price changes'
    },
    {
      icon: <IconChartLine size={16} />,
      title: 'Advanced Analytics',
      description: 'Detailed market trends and predictions'
    },
    {
      icon: <IconDatabase size={16} />,
      title: 'Historical Data Export',
      description: 'Download price history for analysis'
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
      title: 'Explore the Dashboard',
      description: 'Check out all items and market trends',
      action: 'View All Items'
    },
    {
      title: 'Set Up Your Watchlist',
      description: 'Add items you want to track',
      action: 'Create Watchlist'
    },
    {
      title: 'Configure Price Alerts',
      description: 'Get notified when prices change',
      action: 'Set Alerts'
    },
    {
      title: 'Join the Community',
      description: 'Connect with other traders',
      action: 'View Community'
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
          <ThemeIcon color="green" size={80} radius="xl">
            <IconCheck size={40} />
          </ThemeIcon>
        </Center>

        <Title order={1} align="center" mb="md">
          {isTrial ? 'Welcome to Your Free Trial!' : 'Welcome to GE Metrics Premium!'}
        </Title>

        <Text size="lg" align="center" color="dimmed" mb="xl">
          {isTrial
            ? 'Your 30-day free trial has started. Explore all premium features!'
            : 'Thank you for subscribing! Your premium account is now active.'
          }
        </Text>

        {/* Subscription Details */}
        <Card withBorder p="md" mb="xl" style={{ backgroundColor: '#f8f9fa' }}>
          <Group position="apart" align="center" mb="md">
            <div>
              <Text weight={500} size="lg">
                {isTrial ? 'Free Trial' : `Premium ${planType === 'yearly' ? 'Yearly' : 'Monthly'}`}
              </Text>
              <Text size="sm" color="dimmed">
                {isTrial
                  ? '30 days free, then $2.75/month'
                  : planType === 'yearly'
                    ? '$33.00/year (Save 31%)'
                    : '$4.00/month'
                }
              </Text>
            </div>
            <Badge
              color={isTrial ? 'blue' : 'green'}
              variant="filled"
              size="lg"
            >
              {isTrial ? 'Trial Active' : 'Premium Active'}
            </Badge>
          </Group>

          {isTrial && (
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              <Text size="sm">
                Your trial will automatically convert to a yearly subscription at $33.00/year
                unless you cancel before the trial ends. You can cancel anytime from your settings.
              </Text>
            </Alert>
          )}
        </Card>

        {/* Premium Features */}
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

        {/* Next Steps */}
        <Card withBorder p="md" mb="xl">
          <Title order={3} mb="md">What's Next?</Title>

          <Stack spacing="md">
            {nextSteps.map((step, index) => (
              <Group key={index} position="apart" align="center">
                <div>
                  <Text weight={500}>{step.title}</Text>
                  <Text size="sm" color="dimmed">{step.description}</Text>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  rightIcon={<IconArrowRight size={14} />}
                  onClick={() => {
                    switch (index) {
                      case 0: navigate('/'); break
                      case 1: navigate('/watchlist'); break
                      case 2: navigate('/settings'); break
                      case 3: navigate('/community'); break
                      default: navigate('/')
                    }
                  }}
                >
                  {step.action}
                </Button>
              </Group>
            ))}
          </Stack>
        </Card>

        {/* Action Buttons */}
        <Group position="center" spacing="md" mb="md">
          <Button
            size="lg"
            onClick={() => navigate('/')}
            leftIcon={<IconChartLine size={20} />}
          >
            Start Trading
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/settings')}
          >
            Account Settings
          </Button>
        </Group>

        {/* Auto-redirect notice */}
        <Text size="sm" align="center" color="dimmed">
          Redirecting to dashboard in {countdown} seconds...
        </Text>

        {/* Support Information */}
        <Divider my="xl" />

        <Card variant="light" p="md" style={{ backgroundColor: '#e3f2fd' }}>
          <Group position="apart" align="center">
            <div>
              <Text weight={500} color="blue">Need Help Getting Started?</Text>
              <Text size="sm" color="dimmed">
                Our support team is here to help you make the most of GE Metrics
              </Text>
            </div>
            <Button variant="light" color="blue" size="sm">
              Contact Support
            </Button>
          </Group>
        </Card>
      </Paper>
    </Container>
  )
}

export default SignupSuccess

import React from 'react'
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  ThemeIcon,
  Alert,
  List,
  Badge,
  Divider,
  Box
} from '@mantine/core'
import {
  IconLock,
  IconCrown,
  IconSparkles,
  IconTrendingUp,
  IconShield,
  IconBrain,
  IconAlertTriangle
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'

const TrialExpiredModal = ({ opened, onClose, trialData }) => {
  const premiumFeatures = [
    {
      icon: IconBrain,
      title: 'AI Predictions',
      description: 'Advanced algorithms analyzing market trends'
    },
    {
      icon: IconTrendingUp,
      title: 'Whale Tracking',
      description: 'Monitor large trader movements and patterns'
    },
    {
      icon: IconSparkles,
      title: 'Future Items',
      description: 'Early access to upcoming OSRS content predictions'
    },
    {
      icon: IconShield,
      title: 'Risk Analysis',
      description: 'Comprehensive risk assessment tools'
    }
  ]

  const handleUpgrade = () => {
    // Track upgrade attempt
    if (window.gtag) {
      window.gtag('event', 'trial_expired_upgrade_click', {
        event_category: 'trial',
        event_label: 'modal'
      })
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <ThemeIcon color="orange" size="lg" variant="light">
            <IconLock size={20} />
          </ThemeIcon>
          <Text size="lg" weight={600}>Trial Expired</Text>
        </Group>
      }
      size="md"
      centered
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
    >
      <Stack spacing="md">
        <Alert icon={<IconAlertTriangle size={16} />} color="orange" variant="light">
          <Text size="sm" weight={500}>
            Your 14-day free trial has ended
          </Text>
          <Text size="sm" color="dimmed">
            Upgrade to continue accessing premium trading features
          </Text>
        </Alert>

        {trialData && (
          <Box>
            <Text size="sm" color="dimmed" mb="xs">
              Trial Summary:
            </Text>
            <Group spacing="sm">
              <Badge color="blue" variant="light">
                Started: {new Date(trialData.startDate).toLocaleDateString()}
              </Badge>
              <Badge color="green" variant="light">
                Duration: 14 days
              </Badge>
              <Badge color="orange" variant="light">
                Prompts shown: {trialData.upgradePrompts || 0}
              </Badge>
            </Group>
          </Box>
        )}

        <Divider />

        <div>
          <Group mb="sm">
            <ThemeIcon color="gold" variant="light">
              <IconCrown size={18} />
            </ThemeIcon>
            <Text weight={600} color="dark">
              Unlock Premium Features
            </Text>
          </Group>

          <List
            spacing="xs"
            size="sm"
            icon={
              <ThemeIcon color="blue" size={20} radius="xl">
                <IconSparkles size={12} />
              </ThemeIcon>
            }
          >
            {premiumFeatures.map((feature, index) => (
              <List.Item key={index}>
                <Group spacing="xs">
                  <feature.icon size={16} color="var(--mantine-color-blue-6)" />
                  <div>
                    <Text size="sm" weight={500}>{feature.title}</Text>
                    <Text size="xs" color="dimmed">{feature.description}</Text>
                  </div>
                </Group>
              </List.Item>
            ))}
          </List>
        </div>

        <Alert color="blue" variant="light">
          <Text size="sm" weight={500} mb="xs">
            🎯 Why Upgrade Now?
          </Text>
          <List size="xs" spacing={4}>
            <List.Item>Unlimited access to all premium features</List.Item>
            <List.Item>Advanced market analysis and predictions</List.Item>
            <List.Item>Priority customer support</List.Item>
            <List.Item>No daily limits or restrictions</List.Item>
            <List.Item>Early access to new features</List.Item>
          </List>
        </Alert>

        <Group justify="center" mt="md">
          <Button
            component={Link}
            to="/billing"
            size="lg"
            leftIcon={<IconCrown size={18} />}
            onClick={handleUpgrade}
            styles={{
              root: {
                background: 'linear-gradient(45deg, #228be6, #339af0)',
                border: 0,
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(45deg, #1c7ed6, #228be6)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 20px rgba(34, 139, 230, 0.3)'
                }
              }
            }}
          >
            Upgrade to Premium
          </Button>
        </Group>

        <Text size="xs" color="dimmed" align="center">
          Secure payment • Cancel anytime • 30-day money-back guarantee
        </Text>
      </Stack>
    </Modal>
  )
}

export default TrialExpiredModal

import React, { useState, useEffect } from 'react'
import {
  Alert,
  Group,
  Text,
  Button,
  Progress,
  Badge,
  ActionIcon,
  Notification,
  Box
} from '@mantine/core'
import {
  IconCrown,
  IconClock,
  IconX,
  IconSparkles,
  IconAlertTriangle,
  IconCheck
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import trialService from '../../services/trialService'

const TrialBanner = ({ onUpgrade, onDismiss }) => {
  const [trialStatus, setTrialStatus] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const updateTrialStatus = () => {
      const status = trialService.getTrialStatus()
      setTrialStatus(status)
    }

    updateTrialStatus()

    // Update every minute to keep countdown accurate
    const interval = setInterval(updateTrialStatus, 60000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Check if we should show upgrade prompt
    if (trialStatus && trialService.shouldShowUpgradePrompt()) {
      trialService.recordUpgradePrompt()
    }
  }, [trialStatus])

  if (!trialStatus || !trialStatus.isActive || dismissed) {
    return null
  }

  const urgency = trialService.getUpgradeUrgency()
  const message = trialService.getUpgradeMessage()
  const progressPercentage = ((14 - trialStatus.daysRemaining) / 14) * 100

  const handleDismiss = () => {
    setDismissed(true)
    if (onDismiss) onDismiss()
  }

  const handleUpgrade = () => {
    trialService.logTrialEvent('upgrade_clicked', {
      userId: trialStatus.userId,
      daysRemaining: trialStatus.daysRemaining,
      urgency
    })
    if (onUpgrade) onUpgrade()
  }

  const getUrgencyColor = () => {
    switch (urgency) {
      case 'critical': return 'red'
      case 'urgent': return 'orange'
      case 'moderate': return 'yellow'
      default: return 'blue'
    }
  }

  const getUrgencyIcon = () => {
    switch (urgency) {
      case 'critical': return <IconAlertTriangle size={20} />
      case 'urgent': return <IconClock size={20} />
      case 'moderate': return <IconSparkles size={20} />
      default: return <IconCrown size={20} />
    }
  }

  return (
    <Box mb="md">
      <Alert
        icon={getUrgencyIcon()}
        title={message.title}
        color={getUrgencyColor()}
        variant="filled"
        styles={{
          root: {
            background: urgency === 'critical'
              ? 'linear-gradient(45deg, #fa5252, #e03131)'
              : urgency === 'urgent'
                ? 'linear-gradient(45deg, #fd7e14, #e8590c)'
                : urgency === 'moderate'
                  ? 'linear-gradient(45deg, #fab005, #f59f00)'
                  : 'linear-gradient(45deg, #339af0, #228be6)'
          }
        }}
      >
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Text size="sm" mb="xs">
              {message.message}
            </Text>

            <Group spacing="md" mb="sm">
              <Badge
                color="white"
                variant="filled"
                size="lg"
                styles={{ root: { color: getUrgencyColor() } }}
              >
                {trialStatus.daysRemaining === 0
                  ? `${trialStatus.hoursRemaining} hours left`
                  : `${trialStatus.daysRemaining} days left`
                }
              </Badge>

              <Text size="xs" color="white" opacity={0.9}>
                Trial started: {new Date(trialStatus.startDate).toLocaleDateString()}
              </Text>
            </Group>

            <Progress
              value={progressPercentage}
              size="sm"
              color="white"
              mb="sm"
              styles={{
                bar: { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
                root: { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
              }}
            />

            <Group spacing="sm">
              <Button
                component={Link}
                to="/billing"
                variant="white"
                color={getUrgencyColor()}
                leftIcon={<IconCrown size={16} />}
                size="sm"
                onClick={handleUpgrade}
                styles={{
                  root: {
                    fontWeight: 600,
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }
                  }
                }}
              >
                {message.action}
              </Button>

              <Button
                variant="subtle"
                color="white"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide Details' : 'Trial Details'}
              </Button>
            </Group>

            {showDetails && (
              <Box mt="md" p="sm" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px'
              }}>
                <Text size="xs" color="white" mb="xs" weight={500}>
                  Trial Features Available:
                </Text>
                <Group spacing="xs" mb="sm">
                  {Object.entries(trialStatus.features).map(([feature, available]) => (
                    available && (
                      <Badge
                        key={feature}
                        size="xs"
                        color="white"
                        variant="outline"
                        leftSection={<IconCheck size={10} />}
                      >
                        {feature.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </Badge>
                    )
                  ))}
                </Group>

                <Text size="xs" color="white" mb="xs" weight={500}>
                  Trial Limits:
                </Text>
                <Group spacing="xs">
                  <Text size="xs" color="white">
                    • Watchlist: {trialStatus.restrictions.maxWatchlistItems} items
                  </Text>
                  <Text size="xs" color="white">
                    • Price Alerts: {trialStatus.restrictions.maxPriceAlerts} alerts
                  </Text>
                  <Text size="xs" color="white">
                    • API Calls: {trialStatus.restrictions.dailyApiCalls}/day
                  </Text>
                </Group>
              </Box>
            )}
          </Box>

          <ActionIcon
            variant="subtle"
            color="white"
            onClick={handleDismiss}
            size="sm"
          >
            <IconX size={16} />
          </ActionIcon>
        </Group>
      </Alert>
    </Box>
  )
}

export default TrialBanner

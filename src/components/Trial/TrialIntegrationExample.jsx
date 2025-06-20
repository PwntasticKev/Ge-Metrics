import React, { useState } from 'react'
import {
  Card,
  Text,
  Button,
  Group,
  Badge,
  Alert,
  Stack,
  Progress,
  Loader
} from '@mantine/core'
import {
  IconPlus,
  IconAlertCircle,
  IconCrown,
  IconLock
} from '@tabler/icons-react'
import { useTrialContext } from '../../contexts/TrialContext'

/**
 * Example component showing how to integrate trial restrictions
 * into existing features like watchlist management
 */
const TrialIntegrationExample = () => {
  const [watchlistItems, setWatchlistItems] = useState([
    'Dragon bones',
    'Rune scimitar',
    'Magic logs'
  ])
  const [isLoading, setIsLoading] = useState(false)

  const {
    trialStatus,
    isFeatureAvailable,
    checkRestriction,
    makeApiCall,
    isTrialExpired,
    daysRemaining
  } = useTrialContext()

  // Example: Adding item to watchlist with trial restrictions
  const handleAddToWatchlist = async (itemName) => {
    try {
      setIsLoading(true)

      // Check if watchlist feature is available
      if (!isFeatureAvailable('watchlist')) {
        throw new Error('Watchlist feature not available in your plan')
      }

      // Check watchlist restrictions
      const restriction = checkRestriction('maxWatchlistItems', watchlistItems.length)
      if (!restriction.allowed) {
        throw new Error(`Watchlist limit reached (${restriction.limit} items). Upgrade for unlimited watchlist!`)
      }

      // Make API call with trial rate limiting
      await makeApiCall(async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        return { success: true }
      })

      // Add item to watchlist
      setWatchlistItems(prev => [...prev, itemName])
    } catch (error) {
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Example: Feature availability check
  const handlePremiumFeature = () => {
    if (!isFeatureAvailable('aiPredictions')) {
      alert('AI Predictions require an active trial or premium subscription!')
      return
    }

    alert('AI Predictions feature accessed!')
  }

  if (isTrialExpired) {
    return (
      <Card withBorder p="md">
        <Stack align="center" spacing="md">
          <IconLock size={48} color="orange" />
          <Text size="lg" weight={600} align="center">
            Trial Expired
          </Text>
          <Text color="dimmed" align="center">
            This feature requires an active subscription
          </Text>
          <Button leftIcon={<IconCrown size={16} />}>
            Upgrade to Premium
          </Button>
        </Stack>
      </Card>
    )
  }

  const watchlistRestriction = checkRestriction('maxWatchlistItems', watchlistItems.length)

  return (
    <Card withBorder p="md">
      <Stack spacing="md">
        <Group justify="space-between">
          <Text size="lg" weight={600}>
            Watchlist Management
          </Text>
          {trialStatus && (
            <Badge color="blue" variant="light">
              Trial: {daysRemaining} days left
            </Badge>
          )}
        </Group>

        {/* Trial restrictions display */}
        {trialStatus && (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
            <Text size="sm" weight={500} mb="xs">
              Trial Limitations:
            </Text>
            <Text size="sm">
              Watchlist: {watchlistItems.length}/{watchlistRestriction.limit} items
            </Text>
            <Progress
              value={watchlistRestriction.percentage}
              size="sm"
              mt="xs"
              color={watchlistRestriction.percentage > 80 ? 'orange' : 'blue'}
            />
            {watchlistRestriction.percentage > 80 && (
              <Text size="xs" color="orange" mt="xs">
                Approaching limit! Upgrade for unlimited watchlist items.
              </Text>
            )}
          </Alert>
        )}

        {/* Watchlist items */}
        <div>
          <Text size="sm" weight={500} mb="xs">
            Current Watchlist:
          </Text>
          <Stack spacing="xs">
            {watchlistItems.map((item, index) => (
              <Group key={index} justify="space-between">
                <Text size="sm">{item}</Text>
                <Badge size="sm" color="green">
                  Watching
                </Badge>
              </Group>
            ))}
          </Stack>
        </div>

        {/* Add item buttons */}
        <Group>
          <Button
            leftIcon={<IconPlus size={16} />}
            onClick={() => handleAddToWatchlist('Abyssal whip')}
            disabled={!watchlistRestriction.allowed || isLoading}
            loading={isLoading}
          >
            Add Abyssal Whip
          </Button>

          <Button
            variant="light"
            onClick={handlePremiumFeature}
          >
            Access AI Predictions
          </Button>
        </Group>

        {/* Upgrade prompt when approaching limits */}
        {watchlistRestriction.percentage > 70 && (
          <Alert color="orange" variant="light">
            <Group justify="space-between">
              <div>
                <Text size="sm" weight={500}>
                  Running out of watchlist space?
                </Text>
                <Text size="xs">
                  Upgrade to get unlimited watchlist items and more features!
                </Text>
              </div>
              <Button size="xs" leftIcon={<IconCrown size={14} />}>
                Upgrade
              </Button>
            </Group>
          </Alert>
        )}

        {/* API usage indicator */}
        {trialStatus && (
          <Text size="xs" color="dimmed">
            💡 API calls are limited to {trialStatus.restrictions.dailyApiCalls} per day during trial
          </Text>
        )}
      </Stack>
    </Card>
  )
}

export default TrialIntegrationExample

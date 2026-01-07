import {
  Box,
  Center,
  Loader,
  Group,
  Text,
  Badge,
  Card,
  Alert,
  ActionIcon,
  Tooltip
} from '@mantine/core'
import { IconClock, IconRefresh, IconInfoCircle } from '@tabler/icons-react'
import React, { useState } from 'react'
import { trpc } from '../../utils/trpc.jsx'
import PremiumPageWrapper from '../../components/PremiumPageWrapper'
import { getRelativeTime, formatNumber } from '../../utils/utils.jsx'
import ItemData from '../../utils/item-data.jsx'
import GlobalRecipesTable from './components/GlobalRecipesTable.jsx'
import GraphModal from '../../shared/modals/graph-modal.jsx'

export default function GlobalRecipes() {
  const { items, mapStatus, priceStatus } = ItemData()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [graphInfo, setGraphInfo] = useState({ open: false, item: null })
  
  // Fetch global recipes
  const { 
    data: globalRecipes, 
    isLoading, 
    error, 
    refetch: refetchRecipes 
  } = trpc.recipes.getGlobalRecipes.useQuery({
    limit: 100,
    offset: 0
  })

  // Update current time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <PremiumPageWrapper>
        <Center maw={400} h={300} mx="auto">
          <Loader />
        </Center>
      </PremiumPageWrapper>
    )
  }

  if (error) {
    return (
      <PremiumPageWrapper>
        <Alert color="red" icon={<IconInfoCircle size={16} />}>
          Error loading global recipes: {error.message}
        </Alert>
      </PremiumPageWrapper>
    )
  }

  return (
    <PremiumPageWrapper>
      <Box sx={{ py: 4 }}>
        <Group position="apart" mb="md">
          <div>
            <Text size="xl" weight={700} color="white">Global Recipes</Text>
            <Text size="sm" color="rgba(255, 255, 255, 0.7)">
              Explore all community-created item combinations. Discover profitable recipes from other users.
            </Text>
          </div>
          <Group spacing="md">
            <Badge color="blue" size="lg">
              <Group spacing="xs">
                <IconClock size={14} />
                <span>{getRelativeTime(new Date(), currentTime)}</span>
              </Group>
            </Badge>
            <Badge
              color={globalRecipes?.length > 0 ? 'green' : 'orange'}
              size="lg"
            >
              {globalRecipes?.length || 0} Community Recipes
            </Badge>
          </Group>
        </Group>

        <Card withBorder p="md" mb="md" style={{ backgroundColor: 'rgba(25, 113, 194, 0.1)' }}>
          <Group position="apart">
            <div>
              <Text weight={500} size="sm" color="white">Community Recipes</Text>
              <Text size="xs" color="rgba(255, 255, 255, 0.7)">
                {globalRecipes?.length || 0} recipes shared by the community •
                Sorted by newest first
              </Text>
            </div>
            <Badge color="green">
              <Group spacing="xs">
                <IconRefresh size={12} />
                <span>Live Pricing</span>
              </Group>
            </Badge>
          </Group>
        </Card>

        {globalRecipes && globalRecipes.length > 0 ? (
          <GlobalRecipesTable
            data={globalRecipes}
            items={items}
            setGraphInfo={setGraphInfo}
            onEdit={undefined}
          />
        ) : (
          <Card withBorder p="xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
            <Center>
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" weight={600} color="white" mb="sm">
                  No Community Recipes
                </Text>
                <Text size="sm" color="rgba(255, 255, 255, 0.7)" mb="lg">
                  No recipes have been shared by the community yet.
                </Text>
              </div>
            </Center>
          </Card>
        )}
      </Box>

      {/* Graph Modal */}
      <GraphModal
        opened={graphInfo.open}
        onClose={() => setGraphInfo({ open: false, item: null })}
        item={graphInfo.item}
      />
    </PremiumPageWrapper>
  )
}
import React from 'react'
import { Container, Title, SimpleGrid, Loader, Center, Alert, Text, Badge, Group } from '@mantine/core'
import { IconInfoCircle, IconClock, IconDatabase, IconRefresh } from '@tabler/icons-react'
import { useQuery } from 'react-query'
import { getVolumesCacheStatus } from '../../services/potionVolumeApi'
import { PotionCard } from './PotionCard'
import { usePotionRecipes } from '../../utils/potion-recipes'
import { CalculationExplainer } from './CalculationExplainer'

export default function PotionCombinations () {
  const { recipes, isLoading, error } = usePotionRecipes()
  const { data: cacheStatus } = useQuery('potionVolumeStatus', getVolumesCacheStatus, {
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000 // 1 minute
  })

  console.log('PotionCombinations component - recipes:', recipes.length, recipes.map(r => r.name))
  console.log('Full recipes data:', recipes)

  // Helper to format cache timestamp
  const formatCacheTime = (timestamp) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  if (isLoading) {
    return (
      <Center style={{ height: '80vh' }}>
        <Loader size="xl" />
      </Center>
    )
  }

  if (error) {
    return (
      <Container>
        <Title order={2} align="center" mt="lg" color="red">
          Error loading potion recipes
        </Title>
      </Container>
    )
  }

  return (
    <Container size="xl">
      <Title order={1} align="center" my="xl">
        Potion Combination Profits
      </Title>

      {/* Volume Cache Status */}
      {cacheStatus && (
        <Alert
          icon={cacheStatus.isStale ? <IconClock /> : <IconDatabase />}
          color={cacheStatus.isStale ? 'yellow' : 'green'}
          mb="md"
        >
          <Group position="apart">
            <div>
              <Text weight={500}>
                Volume Data Cache Status
              </Text>
              <Text size="sm">
                {cacheStatus.totalCachedPotions} potions cached •
                Last updated: {formatCacheTime(cacheStatus.lastUpdated)}
                {cacheStatus.isStale && ' (updating...)'}
              </Text>
            </div>
            <Badge
              color={cacheStatus.isStale ? 'yellow' : 'green'}
              leftIcon={<IconRefresh size={12} />}
            >
              {cacheStatus.isStale ? 'Refreshing' : 'Fresh'}
            </Badge>
          </Group>
        </Alert>
      )}

      <CalculationExplainer />
      <SimpleGrid
        cols={4}
        spacing="xl"
        breakpoints={[
          { maxWidth: 'md', cols: 3, spacing: 'md' },
          { maxWidth: 'sm', cols: 2, spacing: 'sm' },
          { maxWidth: 'xs', cols: 1, spacing: 'sm' }
        ]}
      >
        {recipes.map(recipe => (
          <PotionCard key={recipe.name} recipe={recipe} />
        ))}
      </SimpleGrid>
    </Container>
  )
}

import React, { useState, useMemo } from 'react'
import { Container, Title, SimpleGrid, Loader, Center, Alert, Text, Badge, Group, TextInput, Select, Stack } from '@mantine/core'
import { IconClock, IconDatabase, IconRefresh, IconSearch, IconFilter } from '@tabler/icons-react'
import { useQuery } from 'react-query'
import { useDebouncedValue } from '@mantine/hooks'
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

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState('volume+profit') // 'profit' or 'volume+profit'
  const [formulaExpanded, setFormulaExpanded] = useState(false)

  // Debounced search for performance
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300)

  // Filter and sort recipes based on search and filter mode
  const filteredRecipes = useMemo(() => {
    let filtered = recipes

    // Apply search filter
    if (debouncedSearch.trim()) {
      filtered = filtered.filter(recipe =>
        recipe.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    }

    // Sort based on filter mode
    if (filterMode === 'profit') {
      filtered = [...filtered].sort((a, b) => (b.bestProfitPerPotion || 0) - (a.bestProfitPerPotion || 0))
    } else {
      filtered = [...filtered].sort((a, b) => (b.normalizedScore || 0) - (a.normalizedScore || 0))
    }

    return filtered
  }, [recipes, debouncedSearch, filterMode])

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

      {/* Search and Filter Controls */}
      <Stack spacing="md" mb="xl">
        <TextInput
          placeholder="Search potions..."
          icon={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          size="md"
          styles={{
            input: {
              borderRadius: '8px',
              backgroundColor: '#f8f9fa'
            }
          }}
        />

        <Group position="apart">
          <Select
            placeholder="Filter by..."
            icon={<IconFilter size={16} />}
            value={filterMode}
            onChange={setFilterMode}
            data={[
              { value: 'volume+profit', label: 'Best Volume + Profit' },
              { value: 'profit', label: 'Best Profit Only' }
            ]}
            size="sm"
            style={{ maxWidth: 200 }}
          />

          <Text size="sm" color="dimmed">
            {filteredRecipes.length} of {recipes.length} potions
          </Text>
        </Group>
      </Stack>

      <CalculationExplainer
        expanded={formulaExpanded}
        onToggle={() => setFormulaExpanded(!formulaExpanded)}
      />

      <SimpleGrid
        cols={4}
        spacing="xl"
        breakpoints={[
          { maxWidth: 'md', cols: 3, spacing: 'md' },
          { maxWidth: 'sm', cols: 2, spacing: 'sm' },
          { maxWidth: 'xs', cols: 1, spacing: 'sm' }
        ]}
      >
        {filteredRecipes.map(recipe => (
          <PotionCard
            key={recipe.name}
            recipe={recipe}
            filterMode={filterMode}
          />
        ))}
      </SimpleGrid>
    </Container>
  )
}

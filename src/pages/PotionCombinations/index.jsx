import React, { useState, useMemo, useEffect } from 'react'
import { Container, Title, SimpleGrid, Loader, Center, Alert, Text, Group, TextInput, Select, Stack, Tabs, NumberInput, Badge, Grid, Accordion, Button } from '@mantine/core'
import { IconSearch, IconFilter, IconHeart, IconList, IconPigMoney, IconGraph, IconClock, IconInfoCircle, IconRefresh } from '@tabler/icons-react'
import { useDebouncedValue } from '@mantine/hooks'
import { PotionCard } from './PotionCard'
import { CalculationExplainer } from './CalculationExplainer'
import { useFavorites } from '../../hooks/useFavorites.js'
import { trpc } from '../../utils/trpc'
import { processPotionData } from '../../utils/potion-calculation'
import { getRelativeTime } from '../../utils/utils'

export default function PotionCombinations () {
  // TRPC Data Fetching.
  const { data: itemMapping, isLoading: isLoadingMapping, error: errorMapping, refetch: refetchItemMapping } = trpc.items.getItemMapping.useQuery()
  const { data: allItems, isLoading: isLoadingAllItems, error: errorItems } = trpc.items.getAllItems.useQuery()
  const { data: volumeData, isLoading: isLoadingVolumes, error: errorVolumes, refetch: refetchVolumes } = trpc.items.getAllVolumes.useQuery()
  const { data: lastUpdatedData, isLoading: isLoadingLastUpdated } = trpc.items.getVolumesLastUpdated.useQuery(undefined, {
    refetchInterval: 30000 // Check every 30 seconds if volumes need updating
  })

  // Manual population mutations
  const populateMappingMutation = trpc.items.populateItemMapping.useMutation({
    onSuccess: (data) => {
      console.log('[PotionCombinations] Item mapping population successful:', data)
      // Refetch item mapping after successful population
      setTimeout(() => {
        refetchItemMapping()
      }, 1000)
    },
    onError: (error) => {
      console.error('[PotionCombinations] Item mapping population failed:', error)
    }
  })

  const populateVolumesMutation = trpc.items.populateItemVolumes.useMutation({
    onSuccess: (data) => {
      console.log('[PotionCombinations] Volume population successful:', data)
      // Refetch volumes after successful population instead of full reload
      setTimeout(() => {
        refetchVolumes()
      }, 2000)
    },
    onError: (error) => {
      console.error('[PotionCombinations] Volume population failed:', error)
    }
  })

  // Auto-update volumes if stale (older than 5 minutes) - runs after mutations are defined
  useEffect(() => {
    // Only check once volumes have loaded
    if (isLoadingLastUpdated) return
    
    // Don't trigger if mutation is already in progress
    if (populateVolumesMutation.isLoading) return
    
    if (lastUpdatedData?.lastUpdatedAt) {
      const lastUpdated = new Date(lastUpdatedData.lastUpdatedAt)
      const now = new Date()
      const minutesSinceUpdate = (now - lastUpdated) / (1000 * 60)
      
      // If volumes are older than 5 minutes, trigger update
      if (minutesSinceUpdate > 5) {
        console.log(`[PotionCombinations] Volumes are stale (${Math.round(minutesSinceUpdate)} minutes old), triggering update...`)
        populateVolumesMutation.mutate()
      } else {
        console.log(`[PotionCombinations] Volumes are fresh (${Math.round(minutesSinceUpdate)} minutes old)`)
      }
    } else if (!lastUpdatedData && volumeData && Object.keys(volumeData).length === 0) {
      // No volume data at all - trigger initial population
      console.log('[PotionCombinations] No volume data found, triggering initial population...')
      populateVolumesMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdatedData, isLoadingLastUpdated]) // Only depend on lastUpdatedData, not mutation

  // Client-side State
  const { favoriteItems, toggleFavorite, isLoadingFavorites } = useFavorites()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('dose3') // Default to Best (3) Dose
  const [minProfit, setMinProfit] = useState(0)
  const [minVolume, setMinVolume] = useState(0)
  const [minHourlyVolume, setMinHourlyVolume] = useState(0)
  const [formulaExpanded, setFormulaExpanded] = useState(false)
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300)

  // Memoized Potion Processing
  const recipes = useMemo(() => {
    // Check if we have actual data (not just empty objects)
    const hasItemMapping = itemMapping && Object.keys(itemMapping).length > 0
    const hasAllItems = allItems && Object.keys(allItems).length > 0
    const hasVolumeData = volumeData !== undefined // volumeData can be empty object, that's OK
    
    // Debug volume data for potion items
    if (volumeData && Object.keys(volumeData).length > 0 && itemMapping) {
      const potionItemIds = Object.values(itemMapping)
        .filter(item => item.name && item.name.toLowerCase().includes('potion'))
        .map(item => item.id)
      
      const potionVolumesFound = potionItemIds.filter(id => volumeData[id])
      console.log('[PotionCombinations] Volume data check:', {
        totalVolumes: Object.keys(volumeData).length,
        potionItems: potionItemIds.length,
        potionVolumesFound: potionVolumesFound.length,
        samplePotionIds: potionItemIds.slice(0, 5),
        sampleVolumeKeys: Object.keys(volumeData).slice(0, 5).map(Number)
      })
    }
    
    console.log('[PotionCombinations] Data check:', {
      hasItemMapping,
      hasAllItems,
      hasVolumeData,
      itemMappingCount: itemMapping ? Object.keys(itemMapping).length : 0,
      allItemsCount: allItems ? Object.keys(allItems).length : 0,
      volumeDataCount: volumeData ? Object.keys(volumeData).length : 0
    })
    
    if (hasItemMapping && hasAllItems) {
      const recipes = processPotionData(itemMapping, allItems, volumeData || {})
      console.log('[PotionCombinations] Processed recipes:', recipes.length)
      return recipes
    }
    return []
  }, [itemMapping, allItems, volumeData])

  // Memoized Filtering and Sorting
  const filteredRecipes = useMemo(() => {
    let filtered = recipes
    // ... (filtering and sorting logic remains the same)
    // ... This will now work because `recipes` is correctly populated.
    // Apply tab filter
    if (activeTab === 'favorites' && favoriteItems) {
      const favoriteIds = new Set(favoriteItems.filter(f => f.itemType === 'potion').map(f => f.itemId))
      filtered = filtered.filter(recipe => favoriteIds.has(recipe.item4?.id))
    }

    // Apply search and data-driven filters
    if (debouncedSearch.trim() || minProfit > 0 || minVolume > 0) {
      filtered = filtered.filter(recipe => {
        const nameMatch = recipe.name.toLowerCase().includes(debouncedSearch.toLowerCase())
        if (!nameMatch) return false
        if (recipe.bestProfitPerPotion < minProfit) return false
        if (volumeData) {
          const bestProfitCombination = recipe.combinations.find(c => c.dose === recipe.bestMethodDose)
          if (bestProfitCombination) {
            const volumeInfo = volumeData[bestProfitCombination.itemId]
            if (!volumeInfo || (volumeInfo.highPriceVolume + volumeInfo.lowPriceVolume) < minVolume) {
              return false
            }
          }
        } else if (minVolume > 0) {
          return false
        }
        return true
      })
    }

    // 4. Filter by minimum hourly volume
    if (minHourlyVolume > 0) {
      filtered = filtered.filter(recipe => {
        const bestMethod = recipe.combinations.find(c => c.dose === recipe.bestMethodDose)
        if (!bestMethod) return false
        const volumeInfo = volumeData[bestMethod.itemId]
        return volumeInfo && (volumeInfo.hourlyHighPriceVolume + volumeInfo.hourlyLowPriceVolume) >= minHourlyVolume
      })
    }

    // Sort based on the unified sortOrder state
    if (sortOrder === 'dose1') {
      filtered = [...filtered].sort((a, b) => {
        const profitA = a.combinations.find(c => c.dose === '1')?.profitPerPotion || -Infinity
        const profitB = b.combinations.find(c => c.dose === '1')?.profitPerPotion || -Infinity
        return profitB - profitA
      })
    } else if (sortOrder === 'dose2') {
      filtered = [...filtered].sort((a, b) => {
        const profitA = a.combinations.find(c => c.dose === '2')?.profitPerPotion || -Infinity
        const profitB = b.combinations.find(c => c.dose === '2')?.profitPerPotion || -Infinity
        return profitB - profitA
      })
    } else if (sortOrder === 'dose3') {
      filtered = [...filtered].sort((a, b) => {
        const profitA = a.combinations.find(c => c.dose === '3')?.profitPerPotion || -Infinity
        const profitB = b.combinations.find(c => c.dose === '3')?.profitPerPotion || -Infinity
        return profitB - profitA
      })
    } else if (sortOrder === 'bestProfitPerPotion') {
      filtered = [...filtered].sort((a, b) => (b.bestProfitPerPotion || 0) - (a.bestProfitPerPotion || 0))
    } else if (sortOrder === 'bestVolumeProfit24h') {
      filtered = [...filtered].sort((a, b) => (b.normalizedScore24h || 0) - (a.normalizedScore24h || 0))
    } else if (sortOrder === 'bestVolumeProfit1h') {
      filtered = [...filtered].sort((a, b) => (b.normalizedScore1h || 0) - (a.normalizedScore1h || 0))
    }

    // --- START DEBUG LOGS ---
    console.log('Final filteredRecipes to render:', filtered)
    // --- END DEBUG LOGS ---

    return filtered
  }, [recipes, debouncedSearch, sortOrder, activeTab, favoriteItems, minProfit, minVolume, volumeData, minHourlyVolume])

  const isLoading = isLoadingMapping || isLoadingAllItems || isLoadingVolumes || isLoadingLastUpdated || isLoadingFavorites
  const error = errorMapping || errorItems || errorVolumes

  if (isLoading) {
    return <Center style={{ height: '80vh' }}><Loader size="xl" /></Center>
  }

  if (!itemMapping || Object.keys(itemMapping).length === 0 || !allItems || Object.keys(allItems).length === 0) {
    console.error('Potion Combinations - Missing essential data:', {
      itemMapping: !!itemMapping,
      itemMappingCount: itemMapping ? Object.keys(itemMapping).length : 0,
      allItems: !!allItems,
      allItemsCount: allItems ? Object.keys(allItems).length : 0,
      volumeData: !!volumeData,
      volumeDataCount: volumeData ? Object.keys(volumeData).length : 0,
      errorMapping,
      errorItems,
      errorVolumes
    })
    
    return (
      <Container>
        <Title order={2} align="center" mt="lg" color="red">
          Error loading essential item data.
        </Title>
        {error && (
          <Alert color="red" mt="md">
            <Text size="sm">
              Debug info: {error.message || 'Unknown error'}
            </Text>
          </Alert>
        )}
        <Text align="center" mt="md" color="dimmed">
          Missing: {(!itemMapping || Object.keys(itemMapping).length === 0) && 'Item Mapping'} {(!itemMapping || Object.keys(itemMapping).length === 0) && (!allItems || Object.keys(allItems).length === 0) && ', '} {(!allItems || Object.keys(allItems).length === 0) && 'Price Data'}
        </Text>
        {(!itemMapping || Object.keys(itemMapping).length === 0) && (
          <Alert color="yellow" mt="md" icon={<IconInfoCircle size={16} />}>
            <Text size="sm" mb="md">
              Item Mapping table is empty. This usually happens after database migrations.
            </Text>
            <Center>
              <Button
                leftIcon={<IconRefresh size={16} />}
                onClick={() => populateMappingMutation.mutate()}
                loading={populateMappingMutation.isLoading}
                color="blue"
              >
                {populateMappingMutation.isLoading ? 'Populating...' : 'Populate Item Mapping'}
              </Button>
            </Center>
            {populateMappingMutation.isError && (
              <Text size="sm" color="red" mt="sm">
                Error: {populateMappingMutation.error?.message || 'Failed to populate'}
              </Text>
            )}
            {populateMappingMutation.isSuccess && (
              <Text size="sm" color="green" mt="sm">
                {populateMappingMutation.data?.message || 'Successfully populated!'}
              </Text>
            )}
          </Alert>
        )}
        
        {(!volumeData || Object.keys(volumeData).length === 0) && itemMapping && Object.keys(itemMapping).length > 0 && (
          <Alert color="yellow" mt="md" icon={<IconInfoCircle size={16} />}>
            <Text size="sm" mb="md">
              Item Volumes cache is empty. This contains trading volume data for potions. Click below to populate it.
            </Text>
            <Center>
              <Button
                leftIcon={<IconRefresh size={16} />}
                onClick={() => populateVolumesMutation.mutate()}
                loading={populateVolumesMutation.isLoading}
                color="blue"
              >
                {populateVolumesMutation.isLoading ? 'Populating Volumes...' : 'Populate Volume Cache'}
              </Button>
            </Center>
            {populateVolumesMutation.isError && (
              <Text size="sm" color="red" mt="sm">
                Error: {populateVolumesMutation.error?.message || 'Failed to populate volumes'}
              </Text>
            )}
            {populateVolumesMutation.isSuccess && (
              <Text size="sm" color="green" mt="sm">
                {populateVolumesMutation.data?.message || 'Successfully populated volumes!'}
              </Text>
            )}
          </Alert>
        )}
      </Container>
    )
  }

  return (
    <Container size="xl">
       <Group position="apart" mb="md">
        <Text size="xl" weight={700}>Potion Combination Profits</Text>
        <Badge
          color={isLoadingLastUpdated ? 'gray' : 'teal'}
          variant="light"
          leftSection={<IconClock size={14} />}
        >
          {lastUpdatedData?.lastUpdatedAt ? `Live Data: Updated ${getRelativeTime(new Date(lastUpdatedData.lastUpdatedAt))}` : 'Updating cache...'}
        </Badge>
      </Group>

      <Tabs value={activeTab} onTabChange={setActiveTab} mb="lg">
        <Tabs.List>
          <Tabs.Tab value="all" icon={<IconList size={16} />}>All Potions</Tabs.Tab>
          <Tabs.Tab value="favorites" icon={<IconHeart size={16} />}>Favorites ({favoriteItems ? favoriteItems.filter(f => f.itemType === 'potion').length : 0})</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* Filter and Sort Controls */}
      <Grid align="flex-end" gutter="md" mb="md">
        <Grid.Col span={6}>
          <TextInput
            icon={<IconSearch size={16} />}
            placeholder="Search potions..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <Select
            label="Sort by"
            value={sortOrder}
            onChange={setSortOrder}
            data={[
              { value: 'dose3', label: 'Best (3) Dose' },
              { value: 'dose2', label: 'Best (2) Dose' },
              { value: 'dose1', label: 'Best (1) Dose' },
              { value: 'bestVolumeProfit24h', label: 'Best Volume + Profit (24h)' },
              { value: 'bestVolumeProfit1h', label: 'Best Volume + Profit (1h)' },
              { value: 'bestProfitPerPotion', label: 'Best Profit Only' }
            ]}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            placeholder="Min Profit"
            icon={<IconPigMoney size={16} />}
            value={minProfit}
            onChange={setMinProfit}
            min={0}
            step={100}
            style={{ flex: 1 }}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            label="Min Volume (24h)"
            value={minVolume}
            onChange={setMinVolume}
            min={0}
            step={1000}
            style={{ flex: 1 }}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            label="Min Volume (1h)"
            value={minHourlyVolume}
            onChange={setMinHourlyVolume}
            min={0}
            step={10}
            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
            formatter={(value) =>
              !Number.isNaN(parseFloat(value))
                ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                : ''
            }
          />
        </Grid.Col>
      </Grid>

      <CalculationExplainer
        expanded={formulaExpanded}
        onToggle={() => setFormulaExpanded(!formulaExpanded)}
      />

      {filteredRecipes.length === 0 && recipes.length === 0 && (
        <Alert color="yellow" mt="md" icon={<IconInfoCircle size={16} />}>
          <Text size="sm">
            No potion combinations found. This could mean:
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              <li>Item mapping data is still being populated (check server logs)</li>
              <li>No potions have valid price data yet</li>
              <li>All potions were filtered out by your search/filter criteria</li>
            </ul>
            Check the browser console for detailed data counts.
          </Text>
        </Alert>
      )}

      {filteredRecipes.length === 0 && recipes.length > 0 && (
        <Alert color="blue" mt="md">
          <Text size="sm">
            No potions match your current filter criteria. Try adjusting your search or filters.
          </Text>
        </Alert>
      )}

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
            item={recipe}
            allItems={allItems}
            filterMode={sortOrder}
            volumeData={volumeData}
            isFavorite={favoriteItems && recipe.item4?.id && favoriteItems.some(f => f.itemId === recipe.item4.id && f.itemType === 'potion')}
            onToggleFavorite={() => {
              const itemId = recipe.item4?.id
              if (itemId) {
                toggleFavorite(itemId, 'potion')
              } else {
                console.error('[PotionCard] Cannot favorite: recipe.item4.id is undefined', recipe)
              }
            }}
          />
        ))}
      </SimpleGrid>
    </Container>
  )
}

import React, { useState, useMemo, useEffect } from 'react'
import { Container, Title, SimpleGrid, Loader, Center, Alert, Text, Group, TextInput, Select, Stack, Tabs, NumberInput, Badge, Grid, Accordion, Button, Card } from '@mantine/core'
import { IconSearch, IconFilter, IconHeart, IconList, IconPigMoney, IconGraph, IconClock, IconInfoCircle, IconRefresh } from '@tabler/icons-react'
import { useDebouncedValue } from '@mantine/hooks'
import { PotionCard } from './PotionCard'
import { CalculationExplainer } from './CalculationExplainer'
import { useFavorites } from '../../hooks/useFavorites.js'
import { trpc } from '../../utils/trpc'
import { processPotionData } from '../../utils/potion-calculation'
import { getRelativeTime, calculateGETax } from '../../utils/utils'

export default function PotionCombinations () {
  // TRPC Data Fetching.
  const { data: itemMapping, isLoading: isLoadingMapping, error: errorMapping, refetch: refetchItemMapping } = trpc.items.getItemMapping.useQuery()
  // Fetch live price data every 60 seconds (same as All Items page)
  const { data: allItems, isLoading: isLoadingAllItems, error: errorItems, refetch: refetchAllItems } = trpc.items.getAllItems.useQuery(undefined, {
    refetchInterval: 60000, // Refetch every 60 seconds for live data
    staleTime: 0, // Always consider data stale to force fresh fetches
    cacheTime: 30000 // Keep in cache for 30 seconds only
  })
  const { data: volumeData, isLoading: isLoadingVolumes, error: errorVolumes, refetch: refetchVolumes } = trpc.items.getAllVolumes.useQuery()
  const { data: lastUpdatedData, isLoading: isLoadingLastUpdated } = trpc.items.getVolumesLastUpdated.useQuery(undefined, {
    refetchInterval: 30000 // Check every 30 seconds if volumes need updating
  })

  // Track when prices were last fetched for live data indicator
  const [lastPriceFetchTime, setLastPriceFetchTime] = useState(new Date())
  
  // Update last fetch time when allItems data changes
  useEffect(() => {
    if (allItems && Object.keys(allItems).length > 0 && !isLoadingAllItems) {
      setLastPriceFetchTime(new Date())
    }
  }, [allItems, isLoadingAllItems])

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

  // Reverse-decant recipes: Buy (4) dose at low, decant to (3)/(2)/(1) and sell at high (taxed)
  const decantRecipes = useMemo(() => {
    console.log('[PotionCombinations] decantRecipes useMemo running, recipes:', recipes?.length)
    
    if (!recipes || recipes.length === 0) {
      console.log('[PotionCombinations] decantRecipes: recipes is empty')
      return []
    }

    let skippedNoItem4 = 0
    let skippedNoItem3 = 0
    let skippedNoItem2 = 0
    let skippedNoItem1 = 0
    let skippedNoPrices = 0

    const result = recipes.map((r) => {
      // item4 is at top level, but item3/item2/item1 are in doses
      const item4 = r.item4 || r.doses?.['4']
      const item3 = r.item3 || r.doses?.['3']
      const item2 = r.item2 || r.doses?.['2']
      const item1 = r.item1 || r.doses?.['1']
      
      if (!item4) {
        skippedNoItem4++
        return null
      }

      const low4 = item4.low != null ? Number(String(item4.low).replace(/,/g, '')) : null
      if (low4 == null) {
        skippedNoPrices++
        return null
      }

      const combinations = []
      let bestProfitPerPotion = -Infinity
      let bestMethodDose = null

      // (4) → (3): Buy 3×(4) at low, decant to 4×(3), sell at high
      // Profit per single (4) dose: (4/3 × high3 × 0.98) - low4
      if (item3 && item3.high != null) {
        const high3 = Number(String(item3.high).replace(/,/g, ''))
        // For each (4) bought, you get (4/3) × (3) doses = 1.333... × (3) potions
        // Revenue per (4): (4/3) × (high3 - tax)
        // Cost per (4): low4
        const revenuePer4 = (4 / 3) * Math.floor(high3 - calculateGETax(high3))
        const profitPerPotion = Math.floor(revenuePer4 - low4)
        
        combinations.push({
          dose: '3',
          itemId: item3.id,
          low: item4.low,
          high: item3.high,
          profitPerPotion
        })
        
        if (profitPerPotion > bestProfitPerPotion) {
          bestProfitPerPotion = profitPerPotion
          bestMethodDose = '3'
        }
      } else {
        skippedNoItem3++
      }

      // (4) → (2): Buy 2×(4) at low, decant to 4×(2), sell at high
      // Profit per single (4) dose: (4/2 × high2 × 0.98) - low4 = (2 × high2 × 0.98) - low4
      if (item2 && item2.high != null) {
        const high2 = Number(String(item2.high).replace(/,/g, ''))
        // For each (4) bought, you get (4/2) × (2) doses = 2 × (2) potions
        // Revenue per (4): 2 × (high2 - tax)
        // Cost per (4): low4
        const revenuePer4 = 2 * Math.floor(high2 - calculateGETax(high2))
        const profitPerPotion = Math.floor(revenuePer4 - low4)
        
        combinations.push({
          dose: '2',
          itemId: item2.id,
          low: item4.low,
          high: item2.high,
          profitPerPotion
        })
        
        if (profitPerPotion > bestProfitPerPotion) {
          bestProfitPerPotion = profitPerPotion
          bestMethodDose = '2'
        }
      } else {
        skippedNoItem2++
      }

      // (4) → (1): Buy 1×(4) at low, decant to 4×(1), sell at high
      // Profit per single (4) dose: (4/1 × high1 × 0.98) - low4 = (4 × high1 × 0.98) - low4
      if (item1 && item1.high != null) {
        const high1 = Number(String(item1.high).replace(/,/g, ''))
        // For each (4) bought, you get (4/1) × (1) doses = 4 × (1) potions
        // Revenue per (4): 4 × (high1 - tax)
        // Cost per (4): low4
        const revenuePer4 = 4 * Math.floor(high1 - calculateGETax(high1))
        const profitPerPotion = Math.floor(revenuePer4 - low4)
        
        combinations.push({
          dose: '1',
          itemId: item1.id,
          low: item4.low,
          high: item1.high,
          profitPerPotion
        })
        
        if (profitPerPotion > bestProfitPerPotion) {
          bestProfitPerPotion = profitPerPotion
          bestMethodDose = '1'
        }
      } else {
        skippedNoItem1++
      }

      // Only return if we have at least one valid combination
      if (combinations.length === 0) {
        return null
      }

      return {
        name: r.name,
        item4,
        item3,
        item2,
        item1,
        combinations,
        bestProfitPerPotion,
        bestMethodDose,
        normalizedScore: bestProfitPerPotion > 0 ? Math.min(10, Math.max(1, Math.ceil((bestProfitPerPotion / 1000) * 10))) : 1
      }
    }).filter(Boolean)
    
    console.log('[PotionCombinations] decantRecipes created:', {
      inputRecipes: recipes.length,
      outputDecantRecipes: result.length,
      skippedNoItem4,
      skippedNoItem3,
      skippedNoItem2,
      skippedNoItem1,
      skippedNoPrices
    })
    
    return result
  }, [recipes])

  // Memoized Filtering and Sorting
  const filteredRecipes = useMemo(() => {
    const base = activeTab === 'decant-4-3' ? decantRecipes : recipes
    let filtered = base
    
    console.log('[PotionCombinations] Filtering:', {
      activeTab,
      baseCount: base.length,
      decantRecipesCount: decantRecipes.length,
      recipesCount: recipes.length,
      debouncedSearch: debouncedSearch.trim(),
      minProfit,
      minVolume,
      minHourlyVolume,
      sortOrder
    })
    
    // ... (filtering and sorting logic remains the same)
    // ... This will now work because `recipes` is correctly populated.
    // Apply tab filter
    if (activeTab === 'favorites' && favoriteItems) {
      const favoriteIds = new Set(favoriteItems.filter(f => f.itemType === 'potion').map(f => f.itemId))
      filtered = filtered.filter(recipe => favoriteIds.has(recipe.item4?.id))
      console.log('[PotionCombinations] After favorites filter:', filtered.length)
    }

    // Apply search and data-driven filters
    if (debouncedSearch.trim() || minProfit > 0 || minVolume > 0) {
      const beforeFilter = filtered.length
      filtered = filtered.filter(recipe => {
        const nameMatch = recipe.name.toLowerCase().includes(debouncedSearch.toLowerCase())
        if (!nameMatch) return false
        if (recipe.bestProfitPerPotion < minProfit) return false
        // Only check volume if minVolume filter is actually set (> 0)
        if (minVolume > 0 && volumeData) {
          const bestProfitCombination = recipe.combinations.find(c => c.dose === recipe.bestMethodDose)
          if (bestProfitCombination) {
            const volumeInfo = volumeData[bestProfitCombination.itemId]
            if (!volumeInfo || (volumeInfo.highPriceVolume + volumeInfo.lowPriceVolume) < minVolume) {
              return false
            }
          } else {
            return false
          }
        }
        return true
      })
      console.log('[PotionCombinations] After search/profit/volume filter:', { before: beforeFilter, after: filtered.length })
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
  }, [recipes, decantRecipes, debouncedSearch, sortOrder, activeTab, favoriteItems, minProfit, minVolume, volumeData, minHourlyVolume])

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
      {/* Status Card - Similar to All Items page */}
      <Card withBorder radius="md" mb="md" sx={(theme) => ({
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[1]
      })}>
        <Group position="apart">
          <Group>
            <IconClock size={16} />
            <Text size="sm">
              Potion Prices - {getRelativeTime(lastPriceFetchTime)}
            </Text>
            <Text size="sm" color="dimmed">
              ({allItems ? Object.keys(allItems).length : 0} items loaded)
            </Text>
          </Group>
          <Group>
            <Button 
              variant="light" 
              size="xs" 
              onClick={() => refetchAllItems()} 
              disabled={isLoadingAllItems}
              leftIcon={<IconRefresh size={14} />}
            >
              Refresh Prices
            </Button>
            <Badge color="green" variant="light">Live Data</Badge>
          </Group>
        </Group>
        {lastUpdatedData?.lastUpdatedAt && (
          <Text size="xs" color="dimmed" mt="xs">
            Volume data updated {getRelativeTime(new Date(lastUpdatedData.lastUpdatedAt))}
          </Text>
        )}
      </Card>

      <Group position="apart" mb="md">
        <Text size="xl" weight={700}>Potion Combination Profits</Text>
      </Group>

      <Tabs value={activeTab} onTabChange={setActiveTab} mb="lg">
        <Tabs.List>
          <Tabs.Tab value="all" icon={<IconList size={16} />}>All Potions</Tabs.Tab>
          <Tabs.Tab value="decant-4-3" icon={<IconGraph size={16} />}>Decant 4→3/2/1</Tabs.Tab>
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
            isDecantMode={activeTab === 'decant-4-3'}
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

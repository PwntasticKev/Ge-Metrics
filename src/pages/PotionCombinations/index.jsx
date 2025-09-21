import React, { useState, useMemo, useEffect } from 'react'
import { Container, Title, SimpleGrid, Loader, Center, Alert, Text, Group, TextInput, Select, Stack, Tabs, NumberInput, Badge } from '@mantine/core'
import { IconSearch, IconFilter, IconHeart, IconList, IconPigMoney, IconGraph, IconClock, IconInfoCircle } from '@tabler/icons-react'
import { useDebouncedValue } from '@mantine/hooks'
import { PotionCard } from './PotionCard'
import { CalculationExplainer } from './CalculationExplainer'
import { useFavorites } from '../../contexts/FavoritesContext'
import { trpc } from '../../utils/trpc'
import { processPotionData } from '../../utils/potion-calculation'
import { getRelativeTime } from '../../utils/utils'

export default function PotionCombinations () {
  // TRPC Data Fetching
  const { data: itemMapping, isLoading: isLoadingMapping, error: errorMapping } = trpc.items.getItemMapping.useQuery()
  const { data: allItems, isLoading: isLoadingAllItems, error: errorItems } = trpc.items.getAllItems.useQuery()
  const { data: volumeData, isLoading: isLoadingVolumes, error: errorVolumes } = trpc.items.getAllVolumes.useQuery()
  const { data: lastUpdatedData, isLoading: isLoadingLastUpdated } = trpc.items.getVolumesLastUpdated.useQuery(undefined, {
    refetchInterval: 30000 // Refetch every 30 seconds to keep the timer current
  })

  // Client-side State
  const { favorites } = useFavorites()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState('dose3')
  const [minProfit, setMinProfit] = useState(0)
  const [minVolume, setMinVolume] = useState(0)
  const [formulaExpanded, setFormulaExpanded] = useState(false)
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300)

  // Memoized Potion Processing
  const recipes = useMemo(() => {
    console.log('--- RAW DATA ---')
    console.log('itemMappingData:', itemMapping)
    console.log('allItemsData:', allItems)
    console.log('volumeData:', volumeData)

    if (itemMapping && allItems && volumeData) {
      const recipes = processPotionData(itemMapping, allItems, volumeData)
      console.log('--- PROCESSED RECIPES ---', recipes)
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
    if (activeTab === 'favorites') {
      filtered = filtered.filter(recipe => favorites.includes(recipe.name))
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

    // Sort based on filter mode
    // ... sorting logic ...
    if (filterMode === 'dose1') {
      // Sort by (1) dose method profit
      filtered = [...filtered].sort((a, b) => {
        const profitA = a.combinations.find(c => c.dose === '1')?.profitPerPotion || -Infinity
        const profitB = b.combinations.find(c => c.dose === '1')?.profitPerPotion || -Infinity
        return profitB - profitA
      })
    } else if (filterMode === 'dose2') {
      // Sort by (2) dose method profit
      filtered = [...filtered].sort((a, b) => {
        const profitA = a.combinations.find(c => c.dose === '2')?.profitPerPotion || -Infinity
        const profitB = b.combinations.find(c => c.dose === '2')?.profitPerPotion || -Infinity
        return profitB - profitA
      })
    } else if (filterMode === 'dose3') {
      // Sort by (3) dose method profit
      filtered = [...filtered].sort((a, b) => {
        const profitA = a.combinations.find(c => c.dose === '3')?.profitPerPotion || -Infinity
        const profitB = b.combinations.find(c => c.dose === '3')?.profitPerPotion || -Infinity
        return profitB - profitA
      })
    } else if (filterMode === 'profit') {
      // Sort by best profit only (ignore volume)
      filtered = [...filtered].sort((a, b) => (b.bestProfitPerPotion || 0) - (a.bestProfitPerPotion || 0))
    } else if (filterMode === 'volume_profit') {
      // Sort by normalized score (volume + profit)
      filtered = [...filtered].sort((a, b) => (b.normalizedScore || 0) - (a.normalizedScore || 0))
    } else {
      // Default fallback (best score)
      filtered = [...filtered].sort((a, b) => (b.normalizedScore || 0) - (a.normalizedScore || 0))
    }

    // --- START DEBUG LOGS ---
    console.log('Final filteredRecipes to render:', filtered)
    // --- END DEBUG LOGS ---

    return filtered
  }, [recipes, debouncedSearch, filterMode, activeTab, favorites, minProfit, minVolume, volumeData])

  const isLoading = isLoadingMapping || isLoadingAllItems || isLoadingVolumes || isLoadingLastUpdated
  const error = errorMapping || errorItems || errorVolumes

  if (isLoading) {
    return <Center style={{ height: '80vh' }}><Loader size="xl" /></Center>
  }

  if (!itemMapping || !allItems) {
    return (
      <Container>
        <Title order={2} align="center" mt="lg" color="red">
          Error loading essential item data.
        </Title>
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
          <Tabs.Tab value="favorites" icon={<IconHeart size={16} />}>Favorites ({favorites.length})</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* Search and Filter Controls */}
      <Stack spacing="md" mb="xl">
        <TextInput
          placeholder="Search potions..."
          icon={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />
        <Group position="apart">
          <Select
            placeholder="Filter by..."
            icon={<IconFilter size={16} />}
            value={filterMode}
            onChange={setFilterMode}
            data={[
              { value: 'dose3', label: 'Best (3) Dose' },
              { value: 'dose2', label: 'Best (2) Dose' },
              { value: 'dose1', label: 'Best (1) Dose' },
              { value: 'profit', label: 'Best Profit' },
              { value: 'volume_profit', label: 'Best Volume + Profit' }
            ]}
            style={{ flex: 1 }}
          />
          <NumberInput
            placeholder="Min Profit"
            icon={<IconPigMoney size={16} />}
            value={minProfit}
            onChange={setMinProfit}
            min={0}
            step={100}
            style={{ flex: 1 }}
          />
          <NumberInput
            placeholder="Min Volume"
            icon={<IconGraph size={16} />}
            value={minVolume}
            onChange={setMinVolume}
            min={0}
            step={1000}
            style={{ flex: 1 }}
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
            volumeData={volumeData}
          />
        ))}
      </SimpleGrid>
    </Container>
  )
}

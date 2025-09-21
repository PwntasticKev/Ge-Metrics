import React, { useState, useMemo, useEffect } from 'react'
import { Container, Title, SimpleGrid, Loader, Center, Alert, Text, Group, TextInput, Select, Stack, Tabs, NumberInput, Badge, Grid, Accordion } from '@mantine/core'
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
  const [sortOrder, setSortOrder] = useState('dose3') // Default to Best (3) Dose
  const [minProfit, setMinProfit] = useState(0)
  const [minVolume, setMinVolume] = useState(0)
  const [minHourlyVolume, setMinHourlyVolume] = useState(0)
  const [formulaExpanded, setFormulaExpanded] = useState(false)
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300)

  // Memoized Potion Processing
  const recipes = useMemo(() => {
    if (itemMapping && allItems && volumeData) {
      const recipes = processPotionData(itemMapping, allItems, volumeData)
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
  }, [recipes, debouncedSearch, sortOrder, activeTab, favorites, minProfit, minVolume, volumeData, minHourlyVolume])

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
            filterMode={sortOrder}
            volumeData={volumeData}
          />
        ))}
      </SimpleGrid>
    </Container>
  )
}

import {
  Box,
  Center,
  Loader,
  Group,
  Text,
  Badge
} from '@mantine/core'
import { IconClock } from '@tabler/icons-react'
import React, { useState, useEffect } from 'react'
import ItemSetsTable from '../../components/Table/item-sets-table.jsx'
import ItemData from '../../utils/item-data.jsx'
import { getRelativeTime, getItemSetProfit } from '../../utils/utils.jsx'
import { herbCleaningRecipes } from '../../components/Table/data/herb-cleaning-filters.jsx'
import { useFavorites } from '../../hooks/useFavorites.js'

export default function HerbCleaning () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [herbSets, setHerbSets] = useState([])
  const { favoriteItems, toggleFavorite, isLoadingFavorites } = useFavorites()

  const favoriteItemIds = new Set(
    favoriteItems
      .filter(fav => fav.itemType === 'herb')
      .map(fav => fav.itemId)
  )

  useEffect(() => {
    if (priceStatus === 'success' && items.length > 0) {
      setLastFetchTime(new Date())
      const processedHerbs = herbCleaningRecipes
        .map(recipe => getItemSetProfit(recipe, items))
        .filter(item => item)
        .sort((a, b) => b.profit - a.profit)
      setHerbSets(processedHerbs)
    }
  }, [priceStatus, items])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const isLoading = mapStatus === 'loading' || priceStatus === 'loading' || isLoadingFavorites

  return (
    <React.Fragment>
      {(mapStatus === 'error' || priceStatus === 'error') && <p>Error fetching data</p>}
      {
        isLoading &&
        <Center maw={400} h={300} mx="auto">
          <Loader/>
        </Center>
      }
      {priceStatus === 'success' && items.length > 0 && (
        <Box sx={{ py: 4 }}>
          <Group position="apart" mb="md">
            <div>
              <Text size="xl" weight={700} color="white">Herb Cleaning Profit</Text>
              <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                Monitor profit from cleaning grimy herbs.
              </Text>
            </div>
            <Group spacing="md">
              <Badge
                color="blue"
                size="lg"
              >
                <Group spacing="xs">
                  <IconClock size={14} />
                  <span>{getRelativeTime(lastFetchTime, currentTime)}</span>
                </Group>
              </Badge>
              <Badge
                color={herbSets.length > 0 ? 'green' : 'orange'}
                size="lg"
              >
                {herbSets.length} Herbs Tracked
              </Badge>
            </Group>
          </Group>

          {priceStatus === 'success' && herbSets && herbSets.length > 0 && (
            <ItemSetsTable
              data={herbSets}
              favoriteItems={favoriteItemIds}
              onToggleFavorite={(itemId) => toggleFavorite(itemId, 'herb')}
            />
          )}
        </Box>
      )}
    </React.Fragment>
  )
}

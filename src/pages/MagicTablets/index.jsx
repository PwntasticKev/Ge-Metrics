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
import { magicTabletRecipes } from '../../components/Table/data/magic-tablets-filters.jsx'
import { useFavorites } from '../../hooks/useFavorites.js'
import GraphModal from '../../shared/modals/graph-modal.jsx'
import PremiumPageWrapper from '../../components/PremiumPageWrapper'

export default function MagicTablets () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [tabletSets, setTabletSets] = useState([])
  const [graphInfo, setGraphInfo] = useState({ open: false, item: null })
  const { favoriteItems, toggleFavorite, isLoadingFavorites } = useFavorites()

  const favoriteItemIds = new Set(
    (favoriteItems || [])
      .filter(fav => fav.itemType === 'tablet')
      .map(fav => fav.itemId)
  )

  useEffect(() => {
    if (priceStatus === 'success' && items.length > 0) {
      setLastFetchTime(new Date())
      const processedTablets = magicTabletRecipes
        .map(recipe => getItemSetProfit(recipe, items))
        .filter(item => {
          // Only show tradable items (items with valid prices)
          // Items without prices are likely untradable (scrolls, etc.)
          if (!item) return false
          const hasPrice = item.sellPrice && item.sellPrice > 0
          // Also filter out items with "scroll" in the name just to be safe
          const isScroll = item.name && item.name.toLowerCase().includes('scroll')
          return hasPrice && !isScroll
        })
        .sort((a, b) => b.profit - a.profit)
      setTabletSets(processedTablets)
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
    <PremiumPageWrapper>
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
              <Text size="xl" weight={700} color="white">Magic Tablets Profit</Text>
              <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                Monitor profit from creating magic tablets at lecterns using soft clay and runes.
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
                color={tabletSets.length > 0 ? 'green' : 'orange'}
                size="lg"
              >
                {tabletSets.length} Tablets Tracked
              </Badge>
            </Group>
          </Group>

          {priceStatus === 'success' && tabletSets && tabletSets.length > 0 && (
            <ItemSetsTable
              data={tabletSets}
              items={items}
              favoriteItems={favoriteItemIds}
              onToggleFavorite={(itemId) => toggleFavorite(itemId, 'tablet')}
              setGraphInfo={(info) => setGraphInfo({ ...info, item: { ...info.item, items } })}
            />
          )}
        </Box>
      )}
      <GraphModal
        opened={graphInfo.open}
        onClose={() => setGraphInfo({ open: false, item: null })}
        item={graphInfo.item}
      />
    </React.Fragment>
    </PremiumPageWrapper>
  )
}


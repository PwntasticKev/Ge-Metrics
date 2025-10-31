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
import { enchantingJewelryRecipes } from '../../components/Table/data/enchanting-jewelry-filters.jsx'
import { useFavorites } from '../../hooks/useFavorites.js'
import GraphModal from '../../shared/modals/graph-modal.jsx'
import PremiumPageWrapper from '../../components/PremiumPageWrapper'

export default function EnchantingJewelry () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [jewelrySets, setJewelrySets] = useState([])
  const [graphInfo, setGraphInfo] = useState({ open: false, item: null })
  const { favoriteItems, toggleFavorite, isLoadingFavorites } = useFavorites()

  const favoriteItemIds = new Set(
    (favoriteItems || [])
      .filter(fav => fav.itemType === 'jewelry')
      .map(fav => fav.itemId)
  )

  useEffect(() => {
    if (priceStatus === 'success' && items.length > 0) {
      setLastFetchTime(new Date())
      const processedJewelry = enchantingJewelryRecipes
        .map(recipe => getItemSetProfit(recipe, items))
        .filter(item => {
          // Only show tradable items (items with valid prices)
          if (!item) return false
          return item.sellPrice && item.sellPrice > 0
        })
        .sort((a, b) => b.profit - a.profit)
      setJewelrySets(processedJewelry)
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
              <Text size="xl" weight={700} color="white">Enchanting Jewellery</Text>
              <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                Monitor profit from enchanting gold and silver jewellery.
                <br />
                Includes all enchantment spells from Lvl-1 (Sapphire/Opal) through Lvl-7 (Zenyte).
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
                color={jewelrySets.length > 0 ? 'green' : 'orange'}
                size="lg"
              >
                {jewelrySets.length} Items Tracked
              </Badge>
            </Group>
          </Group>

          {priceStatus === 'success' && jewelrySets && jewelrySets.length > 0 && (
            <ItemSetsTable
              data={jewelrySets}
              items={items}
              favoriteItems={favoriteItemIds}
              onToggleFavorite={(itemId) => toggleFavorite(itemId, 'jewelry')}
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


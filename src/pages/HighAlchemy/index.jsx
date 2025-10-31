import {
  Box,
  Center,
  Loader,
  Group,
  Text,
  Badge
} from '@mantine/core'
import { IconClock } from '@tabler/icons-react'
import React, { useState, useEffect, useMemo } from 'react'
import ItemSetsTable from '../../components/Table/item-sets-table.jsx'
import ItemData from '../../utils/item-data.jsx'
import { getRelativeTime, safeParseFloat, getItemSetProfit } from '../../utils/utils.jsx'
import { useFavorites } from '../../hooks/useFavorites.js'
import GraphModal from '../../shared/modals/graph-modal.jsx'
import PremiumPageWrapper from '../../components/PremiumPageWrapper'

// Nature rune ID for high alchemy
const NATURE_RUNE_ID = 561

export default function HighAlchemy () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [alchSets, setAlchSets] = useState([])
  const [graphInfo, setGraphInfo] = useState({ open: false, item: null })
  const { favoriteItems, toggleFavorite, isLoadingFavorites } = useFavorites()

  const favoriteItemIds = new Set(
    (favoriteItems || [])
      .filter(fav => fav.itemType === 'item')
      .map(fav => fav.itemId)
  )

  // Get nature rune price
  const natureRunePrice = useMemo(() => {
    if (priceStatus !== 'success' || !items || items.length === 0) {
      return 0
    }
    const natureRune = items.find(item => item.id === NATURE_RUNE_ID)
    return safeParseFloat(natureRune?.low, 0)
  }, [items, priceStatus])

  useEffect(() => {
    if (priceStatus === 'success' && items.length > 0) {
      setLastFetchTime(new Date())
      
      // Filter items that have highalch values and create combination recipes
      const alchableItems = items
        .filter(item => item.highalch && item.highalch > 0 && item.low)
        .map(item => {
          // Create a recipe format: itemSet = item itself, itemsToCreateSet = [natureRuneId]
          // We only include nature rune in itemsToCreateSet since the item is already the itemSet
          return {
            itemSet: item.id,
            itemsToCreateSet: [NATURE_RUNE_ID], // Only nature rune needed
            conversionCost: safeParseFloat(item.low, 0), // Item buy price goes in conversionCost
            itemQuantities: {
              [NATURE_RUNE_ID]: 1
            }
          }
        })

      // Process each item as a combination set
      const processedAlchs = alchableItems
        .map(recipe => {
          const item = items.find(i => i.id === recipe.itemSet)
          if (!item) return null
          
          // Calculate profit: High Alchemy value - (Buy price + Nature rune cost)
          const buyPrice = safeParseFloat(item.low, 0)
          const highalchValue = safeParseFloat(item.highalch, 0)
          const totalCost = buyPrice + natureRunePrice
          const profit = highalchValue - totalCost
          
          // Use getItemSetProfit to get the structure
          const result = getItemSetProfit(recipe, items)
          if (result) {
            // Override profit with correct high alchemy calculation
            result.profit = Math.floor(profit)
            result.sellPrice = highalchValue // Use high alch value instead of high price (this will show as "High Alch Value")
            
            // Add the item itself to the items array for display (so it shows in combination items)
            const itemForDisplay = {
              ...item,
              img: `https://oldschool.runescape.wiki/images/${item.icon}`.replace(/ /g, '_'),
              qty: 1
            }
            result.items = [itemForDisplay, ...result.items] // Item first, then nature rune
          }
          return result
        })
        .filter(item => item)
        .sort((a, b) => b.profit - a.profit)
      
      setAlchSets(processedAlchs)
    }
  }, [priceStatus, items, natureRunePrice])

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
              <Text size="xl" weight={700} color="white">High Alchemy Profit</Text>
              <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                Monitor profit from high alchemy. Profit = High Alchemy value - (Buy price + Nature rune cost).
                <br />
                Nature Rune Cost: {natureRunePrice.toLocaleString()} gp per alch.
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
                color={alchSets.length > 0 ? 'green' : 'orange'}
                size="lg"
              >
                {alchSets.length} Items Tracked
              </Badge>
            </Group>
          </Group>

          {priceStatus === 'success' && alchSets && alchSets.length > 0 && (
            <ItemSetsTable
              data={alchSets}
              items={items}
              favoriteItems={favoriteItemIds}
              onToggleFavorite={(itemId) => toggleFavorite(itemId, 'item')}
              setGraphInfo={(info) => setGraphInfo({ ...info, item: { ...info.item, items } })}
              sellPriceLabel="High Alch Value"
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


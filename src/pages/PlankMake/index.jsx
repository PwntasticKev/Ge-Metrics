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
import { getRelativeTime, getItemSetProfit, safeParseFloat } from '../../utils/utils.jsx'
import { plankMakeRecipes, PLANK_MAKE_RUNES } from '../../components/Table/data/plank-make-filters.jsx'
import { useFavorites } from '../../hooks/useFavorites.js'
import GraphModal from '../../shared/modals/graph-modal.jsx'
import PremiumPageWrapper from '../../components/PremiumPageWrapper'

export default function PlankMake () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [plankSets, setPlankSets] = useState([])
  const [graphInfo, setGraphInfo] = useState({ open: false, item: null })
  const { favoriteItems, toggleFavorite, isLoadingFavorites } = useFavorites()

  const favoriteItemIds = new Set(
    (favoriteItems || [])
      .filter(fav => fav.itemType === 'plank')
      .map(fav => fav.itemId)
  )

  // Get rune prices for display
  const runePrices = useMemo(() => {
    if (priceStatus !== 'success' || !items || items.length === 0) {
      return { nature: 0, astral: 0 }
    }
    const natureRune = items.find(item => item.id === PLANK_MAKE_RUNES.NATURE_RUNE_ID)
    const astralRune = items.find(item => item.id === PLANK_MAKE_RUNES.ASTRAL_RUNE_ID)
    return {
      nature: safeParseFloat(natureRune?.low, 0),
      astral: safeParseFloat(astralRune?.low, 0)
    }
  }, [items, priceStatus])

  useEffect(() => {
    if (priceStatus === 'success' && items.length > 0) {
      setLastFetchTime(new Date())
      
      // Filter out non-plank items and validate log-to-plank mappings
      const validPlankRecipes = plankMakeRecipes.filter(recipe => {
        const plankItem = items.find(item => item.id === recipe.itemSet)
        const logItem = items.find(item => item.id === recipe.itemsToCreateSet[0])
        
        // Check if items exist in API data
        if (!plankItem || !logItem) {
          console.warn(`[PlankMake] Item not found:`, {
            plankId: recipe.itemSet,
            plankFound: !!plankItem,
            logId: recipe.itemsToCreateSet[0],
            logFound: !!logItem
          })
          return false
        }
        
        const plankName = plankItem.name.toLowerCase()
        const logName = logItem.name.toLowerCase()
        
        // Check if plank name contains "plank" and is not magic stone, gold leaf, or gold block
        const isValidPlank = plankName.includes('plank') && 
                             !plankName.includes('magic stone') && 
                             !plankName.includes('gold leaf') && 
                             !plankName.includes('gold block')
        
        if (!isValidPlank) {
          console.warn(`[PlankMake] Invalid plank name: ${plankName}`)
          return false
        }
        
        // Validate that log and plank match (e.g., "oak log" matches "oak plank")
        // Extract the wood type from both names
        const plankType = plankName.replace(' plank', '').replace('plank', '').trim()
        const logType = logName.replace(' logs', '').replace(' log', '').replace('logs', '').trim()
        
        // Handle special cases: regular plank/log, mahogany, and teak
        // Always allow mahogany and teak through (they're commonly used)
        const isMahogany = plankName.includes('mahogany') && logName.includes('mahogany')
        const isTeak = plankName.includes('teak') && logName.includes('teak')
        
        if (isMahogany || isTeak) {
          return true
        }
        
        // Handle other wood types
        const matchesType = plankType === logType || 
                           (plankType === 'regular' && logType === 'log') ||
                           (plankType === '' && logType === 'log') ||
                           (plankType === 'log' && logType === 'log')
        
        if (!matchesType) {
          console.warn(`[PlankMake] Type mismatch: plankType="${plankType}" (${plankName}) vs logType="${logType}" (${logName})`)
          return false
        }
        
        return matchesType
      })
      
      console.log(`[PlankMake] Valid recipes: ${validPlankRecipes.length}/${plankMakeRecipes.length}`)

      // Calculate rune cost per plank
      // Plank Make requires: 1 Nature rune + 2 Astral runes + coins per plank
      const processedPlanks = validPlankRecipes
        .map(recipe => {
          // Get coin cost from recipe (already set in the data file)
          const coinCost = recipe.conversionCost || 0
          
          // Create itemQuantities map for display (Astral runes x2)
          // This will be used by totalPriceConverted to calculate rune costs
          const itemQuantities = {
            [PLANK_MAKE_RUNES.NATURE_RUNE_ID]: 1,
            [PLANK_MAKE_RUNES.ASTRAL_RUNE_ID]: 2
          }
          
          // Create recipe with coin cost in conversionCost
          // totalPriceConverted will calculate: log cost + (nature * 1) + (astral * 2) + coinCost
          const recipeWithRunes = {
            ...recipe,
            conversionCost: coinCost, // Only coin cost, runes calculated via itemQuantities
            itemQuantities
          }
          
          return getItemSetProfit(recipeWithRunes, items)
        })
        .filter(item => item)
        .sort((a, b) => b.profit - a.profit)
      setPlankSets(processedPlanks)
    }
  }, [priceStatus, items, runePrices])

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
              <Text size="xl" weight={700} color="white">Plank Make Profit</Text>
              <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                Monitor profit from converting logs to planks using the Plank Make spell.
                <br />
                Spell Cost: 1 Nature rune ({runePrices.nature.toLocaleString()} gp) + 2 Astral runes ({runePrices.astral.toLocaleString()} gp each) + coins per plank.
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
                color={plankSets.length > 0 ? 'green' : 'orange'}
                size="lg"
              >
                {plankSets.length} Planks Tracked
              </Badge>
            </Group>
          </Group>

          {priceStatus === 'success' && plankSets && plankSets.length > 0 && (
            <ItemSetsTable
              data={plankSets}
              items={items}
              favoriteItems={favoriteItemIds}
              onToggleFavorite={(itemId) => toggleFavorite(itemId, 'plank')}
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


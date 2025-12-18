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
import { plankMakeRecipes, PLANK_MAKE_RUNES, PLANK_LOG_MAPPINGS } from '../../components/Table/data/plank-make-filters.jsx'
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
      return { earth: 0, astral: 0, nature: 0 }
    }
    const earthRune = items.find(item => item.id === PLANK_MAKE_RUNES.EARTH_RUNE_ID)
    const astralRune = items.find(item => item.id === PLANK_MAKE_RUNES.ASTRAL_RUNE_ID)
    const natureRune = items.find(item => item.id === PLANK_MAKE_RUNES.NATURE_RUNE_ID)
    return {
      earth: safeParseFloat(earthRune?.low, 0),
      astral: safeParseFloat(astralRune?.low, 0),
      nature: safeParseFloat(natureRune?.low, 0)
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
        
        // Explicitly handle mahogany: Mahogany plank (8782) <- Mahogany logs (1517)
        const expectedMahoganyPlank = PLANK_LOG_MAPPINGS[1517] // Should be 8782
        const isMahogany = (plankName.includes('mahogany') && logName.includes('mahogany')) ||
                          (recipe.itemSet === expectedMahoganyPlank && recipe.itemsToCreateSet[0] === 1517)
        
        // Explicitly handle teak: Teak plank (8780) <- Teak logs (1519)
        const expectedTeakPlank = PLANK_LOG_MAPPINGS[1519] // Should be 8780
        const isTeak = (plankName.includes('teak') && logName.includes('teak')) ||
                      (recipe.itemSet === expectedTeakPlank && recipe.itemsToCreateSet[0] === 1519)
        
        if (isMahogany || isTeak) {
          console.log(`[PlankMake] Validated ${isMahogany ? 'mahogany' : 'teak'} recipe: plank="${plankName}" (${recipe.itemSet}) <- log="${logName}" (${recipe.itemsToCreateSet[0]})`)
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
      // Plank Make requires: 15 Earth runes + 2 Astral runes + 1 Nature rune + coins per plank
      // Reference: https://oldschool.runescape.wiki/w/Plank_Make
      const processedPlanks = validPlankRecipes
        .map(recipe => {
          // Get coin cost from recipe (already set in the data file)
          const coinCost = recipe.conversionCost || 0
          
          // Create itemQuantities map for display
          // This will be used by totalPriceConverted to calculate rune costs
          const itemQuantities = {
            [PLANK_MAKE_RUNES.EARTH_RUNE_ID]: 15, // 15 Earth runes
            [PLANK_MAKE_RUNES.ASTRAL_RUNE_ID]: 2, // 2 Astral runes
            [PLANK_MAKE_RUNES.NATURE_RUNE_ID]: 1  // 1 Nature rune
          }
          
          // Create recipe with coin cost in conversionCost
          // totalPriceConverted will calculate: log cost + (earth * 15) + (astral * 2) + (nature * 1) + coinCost
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
                Spell Cost: 15 Earth runes ({runePrices.earth.toLocaleString()} gp each) + 2 Astral runes ({runePrices.astral.toLocaleString()} gp each) + 1 Nature rune ({runePrices.nature.toLocaleString()} gp) + coins per plank.
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


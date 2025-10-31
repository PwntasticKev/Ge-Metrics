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
import { barrowsRepairRecipes } from '../../components/Table/data/barrows-repair-filters.jsx'
import { useFavorites } from '../../hooks/useFavorites.js'
import GraphModal from '../../shared/modals/graph-modal.jsx'
import PremiumPageWrapper from '../../components/PremiumPageWrapper'

export default function BarrowsRepair () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [repairSets, setRepairSets] = useState([])
  const [graphInfo, setGraphInfo] = useState({ open: false, item: null })
  const { favoriteItems, toggleFavorite, isLoadingFavorites } = useFavorites()

  const favoriteItemIds = new Set(
    (favoriteItems || [])
      .filter(fav => fav.itemType === 'barrows')
      .map(fav => fav.itemId)
  )

  useEffect(() => {
    if (priceStatus === 'success' && items.length > 0) {
      setLastFetchTime(new Date())
      
      // Find all barrows items by name pattern
      // Repaired items: names without numbers (e.g., "Dharok's platebody")
      // Broken items: names ending with " 0" (e.g., "Dharok's platebody 0")
      
      // First, find all barrows items that end with " 0" (degraded)
      const degradedItems = items.filter(item => {
        const name = item.name.toLowerCase()
        // Match barrows items ending with " 0" or " 0)" for degradation
        return name.includes("'") && name.match(/\s0\)?$/)
      })
      
      console.log(`[BarrowsRepair] Found ${degradedItems.length} degraded barrows items`)
      
      // Match degraded items to their repaired versions
      const validRecipes = []
      
      degradedItems.forEach(degradedItem => {
        // Remove " 0" or " 0)" from the end to get the repaired item name
        const repairedName = degradedItem.name.replace(/\s0\)?$/, '').trim()
        
        // Find the repaired version (same name without the "0")
        const repairedItem = items.find(item => 
          item.name.toLowerCase() === repairedName.toLowerCase() &&
          item.id !== degradedItem.id // Make sure it's not the same item
        )
        
        if (repairedItem) {
          // Determine repair cost based on item type
          let repairCost = 0
          const itemName = repairedItem.name.toLowerCase()
          
          if (itemName.includes('helm') || itemName.includes('coif')) {
            repairCost = 60000 // Helmets
          } else if (itemName.includes('body') || itemName.includes('top') || itemName.includes('brassard')) {
            repairCost = 90000 // Bodies
          } else if (itemName.includes('legs') || itemName.includes('skirt')) {
            repairCost = 80000 // Legs
          } else if (itemName.includes('weapon') || itemName.includes('staff') || itemName.includes('axe') || 
                     itemName.includes('spear') || itemName.includes('crossbow') || itemName.includes('hammers') || 
                     itemName.includes('flail')) {
            repairCost = 100000 // Weapons
          }
          
          if (repairCost > 0) {
            validRecipes.push({
              itemSet: repairedItem.id,
              itemsToCreateSet: [degradedItem.id],
              conversionCost: repairCost
            })
          }
        }
      })
      
      console.log(`[BarrowsRepair] Created ${validRecipes.length} repair recipes from degraded items`)
      
      // Also include recipes from the static list if items are found by ID (fallback)
      barrowsRepairRecipes.forEach(recipe => {
        const repairedItem = items.find(item => item.id === recipe.itemSet)
        const brokenItem = items.find(item => item.id === recipe.itemsToCreateSet[0])
        
        // Only add if not already in validRecipes
        if (repairedItem && !validRecipes.some(r => r.itemSet === recipe.itemSet)) {
          validRecipes.push(recipe)
        }
      })
      
      console.log(`[BarrowsRepair] Total valid recipes: ${validRecipes.length}`)
      
      const processedRepairs = validRecipes
        .map(recipe => getItemSetProfit(recipe, items))
        .filter(item => item)
        .sort((a, b) => b.profit - a.profit)
      setRepairSets(processedRepairs)
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
              <Text size="xl" weight={700} color="white">Barrows Repair Profit</Text>
              <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                Monitor profit from repairing degraded Barrows equipment.
                <br />
                Costs shown are for fully degraded items (100% degradation).
                Repair costs scale proportionally with degradation level.
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
                color={repairSets.length > 0 ? 'green' : 'orange'}
                size="lg"
              >
                {repairSets.length} Items Tracked
              </Badge>
            </Group>
          </Group>

          {priceStatus === 'success' && repairSets && repairSets.length > 0 && (
            <ItemSetsTable
              data={repairSets}
              items={items}
              favoriteItems={favoriteItemIds}
              onToggleFavorite={(itemId) => toggleFavorite(itemId, 'barrows')}
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


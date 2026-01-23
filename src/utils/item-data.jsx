import { useEffect, useState } from 'react'
import {
  getPricingData,
  getMappingData,
  getVolumeData
} from '../api/rs-wiki-api'
import { allItems, getItemSetProfit, safeParseFloat, calculateGETax } from '../utils/utils.jsx'
import { itemRecipes } from '../components/Table/data/item-set-filters.jsx'
import { saplingRecipes } from '../components/Table/data/sapling-filters.jsx'
import { herbCleaningRecipes } from '../components/Table/data/herb-cleaning-filters.jsx'
import { useTrashScoring } from '../hooks/useTrashScoring.js'

const ItemData = () => {
  const [items, setItems] = useState([])
  const [itemSets, setItemSets] = useState([])
  const [mapStatus, setMapStatus] = useState('idle')
  const [priceStatus, setPriceStatus] = useState('idle')
  
  // Get trash scoring data
  const { getTrashWeight, getTrashPercentage, getTrashCount, hasUserVoted, isLoading: isTrashLoading } = useTrashScoring()

  useEffect(() => {
    const fetchAllData = async () => {
      setMapStatus('loading')
      setPriceStatus('loading')
      try {
        const [pricingResponse, mappingData, volumeResponse] = await Promise.all([
          getPricingData(),
          getMappingData(),
          getVolumeData()
        ])

        // Check if API calls were successful
        if (!pricingResponse.success || !volumeResponse.success) {
          throw new Error('API calls failed')
        }
        
        const pricesById = pricingResponse.data.data || {}
        const volumesById = volumeResponse.data.data || {}

        const enrichedItems = mappingData.map(item => {
          const priceData = pricesById[item.id]
          const highPrice = safeParseFloat(priceData?.high, 0)
          const lowPrice = safeParseFloat(priceData?.low, 0)
          const volumeData = volumesById[item.id]
          
          // Get trash scoring data
          const trashWeight = getTrashWeight(item.id)
          const trashPercentage = getTrashPercentage(item.id)
          const trashCount = getTrashCount(item.id)
          const userVoted = hasUserVoted(item.id)
          
          // Calculate base profit
          const baseProfit = Math.floor(highPrice - lowPrice - calculateGETax(highPrice))
          
          // Apply trash weight to profit for sorting
          const adjustedProfit = Math.floor(baseProfit * trashWeight)

          return {
            ...item,
            img: `https://oldschool.runescape.wiki/images/${item.icon.replace(/ /g, '_')}`,
            high: highPrice,
            highTime: priceData ? priceData.highTime : null,
            low: lowPrice,
            lowTime: priceData ? priceData.lowTime : null,
            volume: volumeData || 0,
            
            // Trash data
            trashWeight,
            trashPercentage,
            trashCount,
            userVoted,
            isTrash: trashPercentage > 25,
            
            // Profit calculations
            baseProfit, // Original profit for display
            profit: adjustedProfit, // Trash-weighted profit for sorting
            adjustedProfit, // Alias for clarity
            
            examine: item.examine || 'No examine text available.'
          }
        })

        setItems(enrichedItems)

        const allRecipes = [
          ...itemRecipes,
          ...saplingRecipes,
          ...herbCleaningRecipes
        ]

        const processedItemSets = allRecipes
          .map(recipe => {
            const itemSet = getItemSetProfit(recipe, enrichedItems)
            if (!itemSet) return null
            
            // Apply trash weight to item sets based on their main item ID
            const trashWeight = getTrashWeight(itemSet.id)
            const trashPercentage = getTrashPercentage(itemSet.id)
            const trashCount = getTrashCount(itemSet.id)
            const userVoted = hasUserVoted(itemSet.id)
            
            return {
              ...itemSet,
              // Trash data
              trashWeight,
              trashPercentage,
              trashCount,
              userVoted,
              isTrash: trashPercentage > 25,
              
              // Apply trash weight to profit for sorting
              baseProfit: itemSet.profit,
              profit: Math.floor(itemSet.profit * trashWeight),
              adjustedProfit: Math.floor(itemSet.profit * trashWeight)
            }
          })
          .filter(item => item)
          .sort((a, b) => b.profit - a.profit) // Sort by trash-adjusted profit
        setItemSets(processedItemSets)

        setMapStatus('success')
        setPriceStatus('success')
      } catch (error) {
        console.error('Error fetching all item data:', error)
        setMapStatus('error')
        setPriceStatus('error')
      }
    }

    fetchAllData()
    const interval = setInterval(fetchAllData, 60 * 1000)
    return () => clearInterval(interval)
  }, [getTrashWeight, getTrashPercentage, getTrashCount, hasUserVoted])

  return {
    priceStatus,
    mapStatus,
    items,
    itemSets,
    deathsCofferItems: [],
    isTrashLoading
  }
}
export default ItemData

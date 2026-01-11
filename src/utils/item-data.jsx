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

const ItemData = () => {
  const [items, setItems] = useState([])
  const [itemSets, setItemSets] = useState([])
  const [mapStatus, setMapStatus] = useState('idle')
  const [priceStatus, setPriceStatus] = useState('idle')

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

          return {
            ...item,
            img: `https://oldschool.runescape.wiki/images/${item.icon.replace(/ /g, '_')}`,
            high: highPrice,
            highTime: priceData ? priceData.highTime : null,
            low: lowPrice,
            lowTime: priceData ? priceData.lowTime : null,
            volume: volumeData || 0,
            profit: Math.floor(highPrice - lowPrice - calculateGETax(highPrice)),
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
          .map(recipe => getItemSetProfit(recipe, enrichedItems))
          .filter(item => item)
          .sort((a, b) => b.profit - a.profit)
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
  }, [])

  return {
    priceStatus,
    mapStatus,
    items,
    itemSets,
    deathsCofferItems: []
  }
}
export default ItemData

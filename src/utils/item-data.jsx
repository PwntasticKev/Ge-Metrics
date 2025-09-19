import { useEffect, useState } from 'react'
import {
  getPricingData,
  getMappingData
} from '../api/rs-wiki-api'
import { allItems, getItemSetProfit } from '../utils/utils.jsx'
import { itemRecipes } from '../components/Table/data/item-set-filters.jsx'

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
        // Fetch all data sources in parallel
        const [pricingResponse, mappingData] = await Promise.all([
          getPricingData(),
          getMappingData()
        ])

        const pricesAndVolumesById = pricingResponse.data.data

        // Create a comprehensive items array with pricing and volume
        const enrichedItems = mappingData.map(item => {
          const itemData = pricesAndVolumesById[item.id]

          return {
            ...item,
            high: itemData ? itemData.high : null,
            highTime: itemData ? itemData.highTime : null,
            low: itemData ? itemData.low : null,
            lowTime: itemData ? itemData.lowTime : null,
            volume: itemData ? itemData.highPriceVolume || itemData.lowPriceVolume || itemData.volume || null : null,
            examine: item.examine || 'No examine text available.'
          }
        })

        setItems(enrichedItems)

        const processedItemSets = itemRecipes
          .map(recipe => getItemSetProfit(recipe, enrichedItems))
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

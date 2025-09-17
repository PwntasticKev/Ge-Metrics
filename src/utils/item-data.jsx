import { useEffect, useState } from 'react'
import { getMappingData, getPricingData } from '../api/rs-wiki-api.jsx'
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
        const [mappingData, pricingData] = await Promise.all([
          getMappingData(),
          getPricingData()
        ])

        const pricesById = pricingData.data.data || {}
        const processedItems = allItems(mappingData, pricesById, pricesById)
        setItems(processedItems)

        const processedItemSets = itemRecipes
          .map(recipe => getItemSetProfit(recipe, processedItems))
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

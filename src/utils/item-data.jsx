import { useEffect, useState } from 'react'
import { getDmmPricingData, getMappingData, getPricingData, getVolumeData } from '../api/rs-wiki-api.jsx'
import { allItems, getItemSetProfit } from '../utils/utils.jsx'
import { itemRecipes } from '../components/Table/data/item-set-filters.jsx'

const ItemData = () => {
  const storedData = localStorage.getItem('mappingData')
  const gameMode = localStorage.getItem('gameMode')

  // Use direct API calls instead of react-query since authentication is bypassed
  const [priceData, setPriceData] = useState(null)
  const [mapData, setMapData] = useState(null)
  const [volumeData, setVolumeData] = useState(null)
  const [priceStatus, setPriceStatus] = useState('idle')
  const [mapStatus, setMapStatus] = useState('idle')
  const [volumeStatus, setVolumeStatus] = useState('idle')

  // Fetch price data
  useEffect(() => {
    const fetchPriceData = async () => {
      console.log('🔄 Fetching price data...')
      setPriceStatus('loading')
      try {
        const data = JSON.parse(gameMode || 'false') === 'dmm'
          ? await getDmmPricingData()
          : await getPricingData()
        console.log('✅ Price data fetched successfully:', data)
        setPriceData(data)
        setPriceStatus('success')
      } catch (error) {
        console.error('❌ Error fetching price data:', error)
        setPriceStatus('error')
      }
    }

    // Always fetch price data, even if gameMode is not set
    fetchPriceData()
    const interval = setInterval(fetchPriceData, 60 * 1000)
    return () => clearInterval(interval)
  }, [gameMode])

  // Fetch mapping data
  useEffect(() => {
    const fetchMapData = async () => {
      console.log('🔄 Fetching mapping data...')
      setMapStatus('loading')
      try {
        const data = await getMappingData()
        console.log('✅ Mapping data fetched successfully:', data)
        setMapData(data)
        setMapStatus('success')
        localStorage.setItem('mappingData', JSON.stringify(data))
      } catch (error) {
        console.error('❌ Error fetching mapping data:', error)
        setMapStatus('error')
      }
    }

    fetchMapData()
  }, [])

  // Fetch volume data
  useEffect(() => {
    const fetchVolumeData = async () => {
      console.log('🔄 Fetching volume data...')
      setVolumeStatus('loading')
      try {
        const data = JSON.parse(gameMode || 'false') === 'dmm'
          ? await getPricingData()
          : await getVolumeData()
        console.log('✅ Volume data fetched successfully:', data)
        setVolumeData(data)
        setVolumeStatus('success')
      } catch (error) {
        console.error('❌ Error fetching volume data:', error)
        setVolumeStatus('error')
      }
    }

    // Always fetch volume data, even if gameMode is not set
    fetchVolumeData()
    const interval = setInterval(fetchVolumeData, 60 * 1000)
    return () => clearInterval(interval)
  }, [gameMode])

  const [mapItems, setMapItems] = useState([])
  const [pricesById, setPricesById] = useState({})
  const [volumesById, setVolumesById] = useState({})
  const [items, setAllItems] = useState([])
  const [itemSets, setItemSets] = useState([])
  const [deathsCofferItems, setDeathsCofferItems] = useState([])

  useEffect(() => {
    if (mapStatus === 'success' && mapData) {
      setMapItems(mapData)
    }
  }, [mapData, mapStatus])

  useEffect(() => {
    if (priceStatus === 'success' && priceData && priceData.data) {
      setPricesById(priceData.data)
    }
  }, [priceData, priceStatus])

  useEffect(() => {
    if (volumeStatus === 'success' && volumeData && volumeData.data) {
      setVolumesById(volumeData.data.data || volumeData.data)
    }
  }, [volumeData, volumeStatus])

  useEffect(() => {
    console.log('🔍 Data processing check:', {
      mapItemsLength: mapItems.length,
      priceStatus,
      priceDataExists: !!priceData,
      priceDataDataExists: !!(priceData && priceData.data),
      volumeStatus,
      volumeDataExists: !!volumeData,
      volumeDataDataExists: !!(volumeData && volumeData.data),
      pricesByIdKeys: Object.keys(pricesById).length,
      volumesByIdKeys: Object.keys(volumesById).length
    })

    // More flexible conditions - allow processing with partial data
    const hasMapData = mapItems.length > 0
    const hasPriceData = priceStatus === 'success' && priceData && priceData.data
    const hasVolumeData = volumeStatus === 'success' && volumeData && volumeData.data

    console.log('📊 Data availability:', {
      hasMapData,
      hasPriceData,
      hasVolumeData,
      canProcess: hasMapData && (hasPriceData || hasVolumeData)
    })

    if (hasMapData && (hasPriceData || hasVolumeData)) {
      console.log('✅ Data conditions met, processing items...')

      // Use available data, with fallbacks
      const priceDataToUse = pricesById.data || pricesById || {}
      const volumeDataToUse = volumesById || {}

      console.log('🔧 Processing with:', {
        mapItemsCount: mapItems.length,
        priceDataKeys: Object.keys(priceDataToUse).length,
        volumeDataKeys: Object.keys(volumeDataToUse).length
      })

      const processedItems = allItems(mapItems, priceDataToUse, volumeDataToUse)
      console.log('✅ Processed items:', processedItems.length)
      setAllItems(processedItems)

      // Only process item sets if we have price data
      if (hasPriceData) {
        const itemSets = itemRecipes
          .map(recipe => getItemSetProfit(recipe))
          .sort((a, b) => {
            const profitA = parseFloat(a.profit.replace(/,/g, '')) || 0
            const profitB = parseFloat(b.profit.replace(/,/g, '')) || 0
            return profitB - profitA // Descending order
          })

        setItemSets([...itemSets])
      }
    } else {
      console.log('❌ Data conditions not met, items not processed')
      console.log('   - Map data:', hasMapData ? '✅' : '❌')
      console.log('   - Price data:', hasPriceData ? '✅' : '❌')
      console.log('   - Volume data:', hasVolumeData ? '✅' : '❌')
    }
  }, [priceData, pricesById, volumeData, volumesById, mapItems])

  return {
    priceStatus,
    mapStatus,
    items,
    itemSets,
    deathsCofferItems
  }
}

export default ItemData

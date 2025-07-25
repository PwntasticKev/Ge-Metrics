import { useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { getDmmPricingData, getMappingData, getPricingData, getVolumeData } from '../api/rs-wiki-api.jsx'
import { allItems, getItemSetProfit } from '../utils/utils.jsx'
import { itemRecipes } from '../components/Table/data/item-set-filters.jsx'

const ItemData = () => {
  const storedData = localStorage.getItem('mappingData')
  const gameMode = localStorage.getItem('gameMode')

  const { data: priceData, status: priceStatus } = useQuery({
    queryKey: ['priceData', gameMode],
    queryFn: async () => JSON.parse(gameMode) === 'dmm' ? await getDmmPricingData() : await getPricingData(),
    refetchInterval: 60 * 1000
  })

  const { data: mapData, status: mapStatus } = useQuery(
    'mapData',
    getMappingData,
    {
      initialData: storedData ? JSON.parse(storedData) : undefined,
      onSuccess: (data) => {
        localStorage.setItem('mappingData', JSON.stringify(data))
      }
    }
  )

  const { data: volumeData, status: volumeStatus } = useQuery({
    queryKey: ['volumeData', gameMode],
    queryFn: async () => JSON.parse(gameMode) === 'dmm' ? await getPricingData() : await getVolumeData(),
    refetchInterval: 60 * 1000
  })

  const [mapItems, setMapItems] = useState([])
  const [pricesById, setPricesById] = useState({})
  const [volumesById, setVolumesById] = useState({})
  const [items, setAllItems] = useState([])
  const [itemSets, setItemSets] = useState([])
  const [deathsCofferItems, setDeathsCofferItems] = useState([])

  useEffect(() => {
    if (mapStatus === 'success') {
      setMapItems(mapData || [])
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
    if (
      mapItems.length &&
            priceStatus === 'success' &&
            priceData &&
            priceData.data &&
            volumeStatus === 'success' &&
            volumeData &&
            volumeData.data
    ) {
      setAllItems(allItems(mapItems, pricesById.data || pricesById, volumesById))

      const itemSets = itemRecipes
        .map(recipe => getItemSetProfit(recipe))
        .sort((a, b) => {
          const profitA = parseFloat(a.profit.replace(/,/g, '')) || 0
          const profitB = parseFloat(b.profit.replace(/,/g, '')) || 0
          return profitB - profitA // Descending order
        })

      setItemSets([...itemSets])
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

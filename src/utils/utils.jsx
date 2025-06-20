let items = []

// Utility functions for safe number operations
export const safeToFixed = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return '0'
  return Number(value).toFixed(decimals)
}

export const safeParseInt = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue
  const parsed = parseInt(String(value).replace(/[^0-9.-]/g, ''), 10)
  return isNaN(parsed) ? defaultValue : parsed
}

export const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue
  const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  return isNaN(parsed) ? defaultValue : parsed
}

export const formatNumber = (num) => {
  if (num === null || num === undefined) return 'N/A'
  if (typeof num !== 'number') return 'N/A'
  return num.toLocaleString()
}

export const formatPrice = (price) => {
  if (price === null || price === undefined) return 'N/A'
  if (typeof price !== 'number') return 'N/A'
  return `${price.toLocaleString()} GP`
}

export const formatPercentage = (value) => {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value !== 'number') return 'N/A'
  return `${value.toFixed(2)}%`
}

export const allItems = (mapItems, pricesById, volumesById = {}) => {
  const allItems = mapItems.reduce((accumulated, item) => {
    const priceById = pricesById?.[item.id] || {}
    const volumeById = volumesById?.[item.id] || {}

    const highPrice = safeParseFloat(priceById.high, 0)
    const lowPrice = safeParseFloat(priceById.low, 0)

    const profit = (highPrice && lowPrice)
      ? new Intl.NumberFormat().format(
        Math.floor(highPrice * 0.98 - lowPrice)
      )
      : '0'

    const low = priceById.low !== undefined
      ? new Intl.NumberFormat().format(safeParseInt(priceById.low))
      : '0'

    const high = priceById.high !== undefined
      ? new Intl.NumberFormat().format(safeParseInt(priceById.high))
      : '0'

    const newItem = {
      ...item,
      ...priceById,
      volume: volumeById.volume || null,
      profit,
      low,
      high
    }

    accumulated.push(newItem)
    return accumulated
  }, []).sort((a, b) => {
    const has3rdInNameA = a.name?.includes('3rd') || false
    const has3rdInNameB = b.name?.includes('3rd') || false

    if (has3rdInNameA && has3rdInNameB) return 0
    if (has3rdInNameA) return 1
    if (has3rdInNameB) return -1

    const profitA = safeParseInt(a.profit, 0)
    const profitB = safeParseInt(b.profit, 0)
    return profitB - profitA
  })
  items = allItems
  return items
}

const getItemsById = (itemIds) => {
  return itemIds.map(itemId => items.find(item => item.id === itemId))
}

export const getItemById = (itemId) => {
  return items.find(item => item.id === itemId)
}

export const getItemSetProfit = (
  {
    itemSet,
    itemsToCreateSet,
    conversionCost = 0,
    qty = { id: null, qty: 0 }
  }) => {
  const totalPrice = totalPriceConverted(
    itemSet,
    itemsToCreateSet,
    conversionCost,
    qty
  )
  if (qty.qty) {
    const item = getItemById(qty.id)
    item.qty = qty.qty
  }

  const originalItem = items.find(item => item.id === itemSet)
  //
  const itemAsSet = getModifiedItem(originalItem, totalPrice, itemsToCreateSet)
  //

  return itemAsSet
}

export const getModifiedItem = (item, totalPrice, itemsToCreateSet) => {
  const highPriceWithoutCommas = item?.high
    ? parseInt(item.high.replace(/,/g, ''), 10)
    : 0
  const formatter = new Intl.NumberFormat()
  const convertedItems = itemsToCreateSet.map(itemId => items.find(item => item.id === itemId))
  if (item) {
    return {
      id: item.id,
      background: true,
      name: `${item.name} (set)`,
      items: convertedItems,
      img: item.img,
      high: formatter.format(highPriceWithoutCommas),
      profit: formatter.format(
        Math.floor(highPriceWithoutCommas * 0.98 - totalPrice)
      )
    }
  }

  return undefined
}

export const totalPriceConverted = (itemSet, itemIdsToCreate, conversionCost, qty = null) => {
  let total = 0
  const qtyItemLow =
        qty && getItemById(qty.id)
          ? String(getItemById(qty.id).low).replace(/,/g, '')
          : '0'

  const qtyItemNoCommas =
        parseInt(qtyItemLow, 10) * (qty && qty.qty ? qty.qty - 1 : 0)

  // console.log(itemIdsToCreate, 'itemIdsToCreate')
  itemIdsToCreate.forEach(itemId => {
    const lowPriceNoCommas = String(getItemById(itemId)?.low).replace(/,/g, '')
    const price = lowPriceNoCommas ? parseInt(lowPriceNoCommas, 10) : 0

    total += price
  })
  return total + qtyItemNoCommas + conversionCost
}

export const getRelativeTime = (timestamp) => {
  const now = new Date()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) {
    return `pulled ${seconds} second${seconds !== 1 ? 's' : ''} ago`
  } else if (minutes < 60) {
    return `pulled ${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  } else if (hours < 24) {
    return `pulled ${hours} hour${hours !== 1 ? 's' : ''} ago`
  } else {
    return `pulled ${days} day${days !== 1 ? 's' : ''} ago`
  }
}

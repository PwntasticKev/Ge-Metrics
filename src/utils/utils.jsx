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

export const calculateGETax = (price) => {
  if (price === null || price === undefined || isNaN(price)) return 0
  const tax = Math.floor(price * 0.02) // 2% tax
  return Math.min(tax, 5000000)
}

export const allItems = (mapItems, pricesById, volumesById = {}) => {
  const allItems = mapItems.reduce((accumulated, item) => {
    const priceById = pricesById?.[item.id] || {}
    const volumeById = volumesById?.[item.id] || {}

    const highPrice = safeParseFloat(priceById.high, 0)
    const lowPrice = safeParseFloat(priceById.low, 0)

    const tax = calculateGETax(highPrice)
    const profit = (highPrice && lowPrice)
      ? new Intl.NumberFormat().format(
        Math.floor(highPrice - lowPrice - tax)
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
      img: `https://oldschool.runescape.wiki/images/${item.icon}`.replace(/ /g, '_'),
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

export const getItemsById = (itemIds, allItems) => {
  return itemIds.map(itemId => allItems.find(item => item.id === itemId))
}

export const getItemById = (itemId, allItems) => {
  if (!Array.isArray(allItems)) {
    return undefined // or null, depending on how you want to handle it
  }
  return allItems.find(item => item.id === itemId)
}

export const getItemSetProfit = (
  {
    itemSet,
    itemsToCreateSet,
    conversionCost = 0,
    qty = { id: null, qty: 0 },
    itemQuantities = {} // Object mapping itemId to quantity
  },
  allItems
) => {
  const totalPrice = totalPriceConverted(
    itemSet,
    itemsToCreateSet,
    conversionCost,
    qty,
    allItems,
    itemQuantities
  )
  if (qty && qty.qty) {
    const item = getItemById(qty.id, allItems)
    if (item) {
      item.qty = qty.qty
    }
  }

  const originalItem = allItems.find(item => item.id === itemSet)
  //
  const itemAsSet = getModifiedItem(originalItem, totalPrice, itemsToCreateSet, allItems, itemQuantities)
  //

  return itemAsSet
}

export const getModifiedItem = (item, totalPrice, itemsToCreateSet, allItems, itemQuantities = {}) => {
  const highPrice = safeParseFloat(item?.high, 0)
  const formatter = new Intl.NumberFormat()
  const convertedItems = itemsToCreateSet.map(itemId => {
    const foundItem = allItems.find(item => item.id === itemId)
    if (foundItem) {
      return {
        ...foundItem,
        img: `https://oldschool.runescape.wiki/images/${foundItem.icon}`.replace(/ /g, '_'),
        qty: itemQuantities[itemId] || undefined // Add quantity if specified
      }
    }
    return null
  }).filter(Boolean)

  if (item) {
    const setName = itemsToCreateSet.length > 1 ? `${item.name} (set)` : item.name

    const tax = calculateGETax(highPrice)
    return {
      id: item.id,
      background: true,
      name: setName,
      items: convertedItems,
      img: `https://oldschool.runescape.wiki/images/${item.icon}`.replace(/ /g, '_'),
      high: formatter.format(highPrice),
      sellPrice: highPrice, // Use the highest price for the item set
      profit: Math.floor(highPrice - totalPrice - tax)
    }
  }

  return undefined
}

export const totalPriceConverted = (itemSet, itemIdsToCreate, conversionCost, qty = null, allItems, itemQuantities = {}) => {
  let total = 0
  const itemForQty = qty && getItemById(qty.id, allItems)
  const qtyItemLow = safeParseFloat(itemForQty?.low, 0)

  const qtyCost = qtyItemLow * (qty && qty.qty ? qty.qty - 1 : 0)

  itemIdsToCreate.forEach(itemId => {
    const item = getItemById(itemId, allItems)
    const lowPrice = safeParseFloat(item?.low, 0)
    const quantity = itemQuantities[itemId] || 1 // Use quantity from map, default to 1
    total += lowPrice * quantity
  })
  return total + qtyCost + conversionCost
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

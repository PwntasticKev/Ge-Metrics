/**
 * Trade Service
 * Handles trade recording, management, and analytics
 */

class TradeService {
  constructor () {
    this.trades = new Map()
    this.nextId = 1
    this.initializeMockData()
  }

  /**
   * Initialize mock trade data
   */
  initializeMockData () {
    const mockTrades = [
      {
        id: 1,
        user_id: 1,
        item_id: 4151,
        item_name: 'Abyssal whip',
        trade_type: 'buy',
        quantity: 1,
        price_per_item: 2500000,
        total_value: 2500000,
        ge_limit: 8,
        profit_loss: null,
        notes: 'Good flip opportunity',
        trade_date: new Date('2024-03-15'),
        created_at: new Date('2024-03-15'),
        updated_at: new Date('2024-03-15')
      },
      {
        id: 2,
        user_id: 1,
        item_id: 4151,
        item_name: 'Abyssal whip',
        trade_type: 'sell',
        quantity: 1,
        price_per_item: 2600000,
        total_value: 2600000,
        ge_limit: 8,
        profit_loss: 100000,
        notes: 'Sold for profit',
        trade_date: new Date('2024-03-16'),
        created_at: new Date('2024-03-16'),
        updated_at: new Date('2024-03-16')
      },
      {
        id: 3,
        user_id: 1,
        item_id: 1515,
        item_name: 'Yew logs',
        trade_type: 'buy',
        quantity: 1000,
        price_per_item: 180,
        total_value: 180000,
        ge_limit: 25000,
        profit_loss: null,
        notes: 'Bulk purchase for processing',
        trade_date: new Date('2024-03-17'),
        created_at: new Date('2024-03-17'),
        updated_at: new Date('2024-03-17')
      }
    ]

    mockTrades.forEach(trade => {
      this.trades.set(trade.id, trade)
    })

    this.nextId = mockTrades.length + 1
  }

  /**
   * Get all trades for a user
   */
  getUserTrades (userId = 1, filters = {}) {
    let trades = Array.from(this.trades.values())
      .filter(trade => trade.user_id === userId)

    // Apply filters
    if (filters.item_id) {
      trades = trades.filter(trade => trade.item_id === filters.item_id)
    }

    if (filters.trade_type) {
      trades = trades.filter(trade => trade.trade_type === filters.trade_type)
    }

    if (filters.date_from) {
      trades = trades.filter(trade => new Date(trade.trade_date) >= new Date(filters.date_from))
    }

    if (filters.date_to) {
      trades = trades.filter(trade => new Date(trade.trade_date) <= new Date(filters.date_to))
    }

    if (filters.search) {
      const query = filters.search.toLowerCase()
      trades = trades.filter(trade =>
        trade.item_name.toLowerCase().includes(query) ||
        trade.notes?.toLowerCase().includes(query)
      )
    }

    // Sort by date (newest first)
    return trades.sort((a, b) => new Date(b.trade_date) - new Date(a.trade_date))
  }

  /**
   * Add a new trade record
   */
  addTrade (userId, tradeData) {
    try {
      const trade = {
        id: this.nextId++,
        user_id: userId,
        item_id: tradeData.item_id,
        item_name: tradeData.item_name,
        trade_type: tradeData.trade_type,
        quantity: tradeData.quantity,
        price_per_item: tradeData.price_per_item,
        total_value: tradeData.quantity * tradeData.price_per_item,
        ge_limit: tradeData.ge_limit || null,
        profit_loss: tradeData.profit_loss || null,
        notes: tradeData.notes || '',
        trade_date: tradeData.trade_date || new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }

      this.trades.set(trade.id, trade)

      return { success: true, trade }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Update a trade record
   */
  updateTrade (tradeId, updates) {
    try {
      const trade = this.trades.get(tradeId)
      if (!trade) {
        return { success: false, error: 'Trade not found' }
      }

      // Update fields
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          trade[key] = updates[key]
        }
      })

      // Recalculate total value if quantity or price changed
      if (updates.quantity !== undefined || updates.price_per_item !== undefined) {
        trade.total_value = trade.quantity * trade.price_per_item
      }

      trade.updated_at = new Date()
      this.trades.set(tradeId, trade)

      return { success: true, trade }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete a trade record
   */
  deleteTrade (tradeId) {
    try {
      const trade = this.trades.get(tradeId)
      if (!trade) {
        return { success: false, error: 'Trade not found' }
      }

      this.trades.delete(tradeId)

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get trade by ID
   */
  getTrade (tradeId) {
    return this.trades.get(tradeId)
  }

  /**
   * Calculate profit/loss for matched buy/sell pairs
   */
  calculateProfitLoss (userId, itemId) {
    const trades = this.getUserTrades(userId, { item_id: itemId })
    const buys = trades.filter(t => t.trade_type === 'buy').sort((a, b) => new Date(a.trade_date) - new Date(b.trade_date))
    const sells = trades.filter(t => t.trade_type === 'sell').sort((a, b) => new Date(a.trade_date) - new Date(b.trade_date))

    let totalProfit = 0
    const matchedTrades = []

    // Simple FIFO matching
    let buyIndex = 0
    let sellIndex = 0
    let buyQuantityRemaining = buys[buyIndex]?.quantity || 0
    let sellQuantityRemaining = sells[sellIndex]?.quantity || 0

    while (buyIndex < buys.length && sellIndex < sells.length) {
      const buy = buys[buyIndex]
      const sell = sells[sellIndex]

      const matchedQuantity = Math.min(buyQuantityRemaining, sellQuantityRemaining)
      const profit = matchedQuantity * (sell.price_per_item - buy.price_per_item)

      totalProfit += profit
      matchedTrades.push({
        buy_trade_id: buy.id,
        sell_trade_id: sell.id,
        quantity: matchedQuantity,
        buy_price: buy.price_per_item,
        sell_price: sell.price_per_item,
        profit
      })

      buyQuantityRemaining -= matchedQuantity
      sellQuantityRemaining -= matchedQuantity

      if (buyQuantityRemaining === 0) {
        buyIndex++
        buyQuantityRemaining = buys[buyIndex]?.quantity || 0
      }

      if (sellQuantityRemaining === 0) {
        sellIndex++
        sellQuantityRemaining = sells[sellIndex]?.quantity || 0
      }
    }

    return {
      totalProfit,
      matchedTrades,
      unmatchedBuys: buys.slice(buyIndex).concat(buyQuantityRemaining > 0 ? [{ ...buys[buyIndex - 1], quantity: buyQuantityRemaining }] : []),
      unmatchedSells: sells.slice(sellIndex).concat(sellQuantityRemaining > 0 ? [{ ...sells[sellIndex - 1], quantity: sellQuantityRemaining }] : [])
    }
  }

  /**
   * Get trade statistics
   */
  getTradeStats (userId = 1) {
    const trades = this.getUserTrades(userId)

    const totalTrades = trades.length
    const totalBuys = trades.filter(t => t.trade_type === 'buy').length
    const totalSells = trades.filter(t => t.trade_type === 'sell').length

    const totalBuyValue = trades
      .filter(t => t.trade_type === 'buy')
      .reduce((sum, t) => sum + t.total_value, 0)

    const totalSellValue = trades
      .filter(t => t.trade_type === 'sell')
      .reduce((sum, t) => sum + t.total_value, 0)

    const totalProfitLoss = trades
      .filter(t => t.profit_loss !== null)
      .reduce((sum, t) => sum + t.profit_loss, 0)

    // Get unique items traded
    const uniqueItems = [...new Set(trades.map(t => t.item_id))].length

    // Most traded item
    const itemCounts = {}
    trades.forEach(trade => {
      itemCounts[trade.item_id] = (itemCounts[trade.item_id] || 0) + 1
    })
    const mostTradedItemId = Object.keys(itemCounts).reduce((a, b) => itemCounts[a] > itemCounts[b] ? a : b, null)
    const mostTradedItem = mostTradedItemId ? trades.find(t => t.item_id === parseInt(mostTradedItemId)) : null

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentTrades = trades.filter(t => new Date(t.trade_date) >= sevenDaysAgo)

    return {
      totalTrades,
      totalBuys,
      totalSells,
      totalBuyValue,
      totalSellValue,
      totalProfitLoss,
      uniqueItems,
      mostTradedItem: mostTradedItem
        ? {
            id: mostTradedItem.item_id,
            name: mostTradedItem.item_name,
            count: itemCounts[mostTradedItemId]
          }
        : null,
      recentActivity: {
        count: recentTrades.length,
        value: recentTrades.reduce((sum, t) => sum + t.total_value, 0)
      },
      averageTradeValue: totalTrades > 0 ? (totalBuyValue + totalSellValue) / totalTrades : 0
    }
  }

  /**
   * Get popular items for trading (most frequently traded)
   */
  getPopularItems (userId = 1, limit = 10) {
    const trades = this.getUserTrades(userId)
    const itemCounts = {}
    const itemDetails = {}

    trades.forEach(trade => {
      if (!itemCounts[trade.item_id]) {
        itemCounts[trade.item_id] = 0
        itemDetails[trade.item_id] = {
          id: trade.item_id,
          name: trade.item_name,
          lastTraded: trade.trade_date
        }
      }
      itemCounts[trade.item_id]++

      // Update last traded date if this trade is more recent
      if (new Date(trade.trade_date) > new Date(itemDetails[trade.item_id].lastTraded)) {
        itemDetails[trade.item_id].lastTraded = trade.trade_date
      }
    })

    return Object.keys(itemCounts)
      .map(itemId => ({
        ...itemDetails[itemId],
        tradeCount: itemCounts[itemId]
      }))
      .sort((a, b) => b.tradeCount - a.tradeCount)
      .slice(0, limit)
  }

  /**
   * Export trade data
   */
  exportTrades (userId, format = 'json') {
    const trades = this.getUserTrades(userId)
    const stats = this.getTradeStats(userId)

    if (format === 'csv') {
      const headers = ['Date', 'Item', 'Type', 'Quantity', 'Price per Item', 'Total Value', 'Profit/Loss', 'Notes']
      const rows = trades.map(trade => [
        new Date(trade.trade_date).toLocaleDateString(),
        trade.item_name,
        trade.trade_type,
        trade.quantity,
        trade.price_per_item,
        trade.total_value,
        trade.profit_loss || '',
        trade.notes || ''
      ])

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    }

    return JSON.stringify({
      trades,
      stats,
      exported_at: new Date(),
      user_id: userId
    }, null, 2)
  }

  /**
   * Search trades
   */
  searchTrades (userId, query) {
    return this.getUserTrades(userId, { search: query })
  }

  /**
   * Get trade history for a specific item
   */
  getItemTradeHistory (userId, itemId) {
    const trades = this.getUserTrades(userId, { item_id: itemId })
    const profitLoss = this.calculateProfitLoss(userId, itemId)

    return {
      trades,
      profitLoss,
      totalQuantityBought: trades.filter(t => t.trade_type === 'buy').reduce((sum, t) => sum + t.quantity, 0),
      totalQuantitySold: trades.filter(t => t.trade_type === 'sell').reduce((sum, t) => sum + t.quantity, 0),
      averageBuyPrice: this.calculateAveragePrice(trades.filter(t => t.trade_type === 'buy')),
      averageSellPrice: this.calculateAveragePrice(trades.filter(t => t.trade_type === 'sell'))
    }
  }

  /**
   * Calculate average price from trades
   */
  calculateAveragePrice (trades) {
    if (trades.length === 0) return 0

    const totalValue = trades.reduce((sum, t) => sum + t.total_value, 0)
    const totalQuantity = trades.reduce((sum, t) => sum + t.quantity, 0)

    return totalQuantity > 0 ? totalValue / totalQuantity : 0
  }
}

// Create singleton instance
const tradeService = new TradeService()

export default tradeService

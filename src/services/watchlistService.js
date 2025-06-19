/**
 * Watchlist Service
 * Handles watchlist operations including adding, removing, and managing items
 */

class WatchlistService {
  constructor () {
    this.watchlistItems = new Map()
    this.nextId = 1
    this.initializeMockData()
  }

  /**
   * Initialize mock watchlist data
   */
  initializeMockData () {
    const mockItems = [
      {
        id: 1,
        user_id: 1,
        item_id: 4151,
        item_name: 'Abyssal whip',
        volume_threshold: 10000,
        price_drop_threshold: 15.0,
        price_change_percentage: null,
        abnormal_activity: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        user_id: 1,
        item_id: 1515,
        item_name: 'Yew logs',
        volume_threshold: null,
        price_drop_threshold: null,
        price_change_percentage: null,
        abnormal_activity: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 3,
        user_id: 1,
        item_id: 2,
        item_name: 'Cannonball',
        volume_threshold: 80000,
        price_drop_threshold: 20.0,
        price_change_percentage: 30.0,
        abnormal_activity: false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]

    mockItems.forEach(item => {
      this.watchlistItems.set(item.id, item)
    })

    this.nextId = mockItems.length + 1
  }

  /**
   * Get all watchlist items for a user
   */
  getUserWatchlist (userId = 1) {
    return Array.from(this.watchlistItems.values())
      .filter(item => item.user_id === userId && item.is_active)
  }

  /**
   * Add item to watchlist
   */
  addToWatchlist (userId, itemData) {
    try {
      // Check if item already exists in watchlist
      const existingItem = Array.from(this.watchlistItems.values())
        .find(item => item.user_id === userId && item.item_id === itemData.item_id && item.is_active)

      if (existingItem) {
        return { success: false, error: 'Item already in watchlist' }
      }

      const watchlistItem = {
        id: this.nextId++,
        user_id: userId,
        item_id: itemData.item_id,
        item_name: itemData.item_name || `Item ${itemData.item_id}`,
        volume_threshold: itemData.volume_threshold,
        price_drop_threshold: itemData.price_drop_threshold,
        price_change_percentage: itemData.price_change_percentage,
        abnormal_activity: itemData.abnormal_activity || false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }

      this.watchlistItems.set(watchlistItem.id, watchlistItem)

      return { success: true, item: watchlistItem }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Remove item from watchlist
   */
  removeFromWatchlist (watchlistId) {
    try {
      const item = this.watchlistItems.get(watchlistId)
      if (!item) {
        return { success: false, error: 'Watchlist item not found' }
      }

      // Soft delete - mark as inactive
      item.is_active = false
      item.updated_at = new Date()
      this.watchlistItems.set(watchlistId, item)

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Update watchlist item thresholds
   */
  updateThresholds (watchlistId, thresholds) {
    try {
      const item = this.watchlistItems.get(watchlistId)
      if (!item) {
        return { success: false, error: 'Watchlist item not found' }
      }

      // Update thresholds
      if (thresholds.volume_threshold !== undefined) {
        item.volume_threshold = thresholds.volume_threshold
      }
      if (thresholds.price_drop_threshold !== undefined) {
        item.price_drop_threshold = thresholds.price_drop_threshold
      }
      if (thresholds.price_change_percentage !== undefined) {
        item.price_change_percentage = thresholds.price_change_percentage
      }
      if (thresholds.abnormal_activity !== undefined) {
        item.abnormal_activity = thresholds.abnormal_activity
      }

      item.updated_at = new Date()
      this.watchlistItems.set(watchlistId, item)

      return { success: true, item }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get watchlist item by ID
   */
  getWatchlistItem (watchlistId) {
    return this.watchlistItems.get(watchlistId)
  }

  /**
   * Check if item is in user's watchlist
   */
  isItemInWatchlist (userId, itemId) {
    return Array.from(this.watchlistItems.values())
      .some(item => item.user_id === userId && item.item_id === itemId && item.is_active)
  }

  /**
   * Get watchlist statistics
   */
  getWatchlistStats (userId = 1) {
    const userItems = this.getUserWatchlist(userId)

    return {
      total: userItems.length,
      withVolumeThreshold: userItems.filter(item => item.volume_threshold).length,
      withPriceThreshold: userItems.filter(item => item.price_drop_threshold || item.price_change_percentage).length,
      withSmartDetection: userItems.filter(item => item.abnormal_activity).length,
      mostRecent: userItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    }
  }

  /**
   * Search watchlist items
   */
  searchWatchlist (userId, query) {
    const userItems = this.getUserWatchlist(userId)
    const searchQuery = query.toLowerCase()

    return userItems.filter(item =>
      item.item_name.toLowerCase().includes(searchQuery) ||
      item.item_id.toString().includes(searchQuery)
    )
  }

  /**
   * Export watchlist data
   */
  exportWatchlist (userId, format = 'json') {
    const userItems = this.getUserWatchlist(userId)

    if (format === 'csv') {
      const headers = ['Item ID', 'Item Name', 'Volume Threshold', 'Price Drop Threshold', 'Price Change %', 'Smart Detection', 'Created']
      const rows = userItems.map(item => [
        item.item_id,
        item.item_name,
        item.volume_threshold || '',
        item.price_drop_threshold || '',
        item.price_change_percentage || '',
        item.abnormal_activity ? 'Yes' : 'No',
        item.created_at.toLocaleDateString()
      ])

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    }

    return JSON.stringify({
      watchlist: userItems,
      exported_at: new Date(),
      user_id: userId,
      stats: this.getWatchlistStats(userId)
    }, null, 2)
  }
}

// Create singleton instance
const watchlistService = new WatchlistService()

export default watchlistService

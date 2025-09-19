const API_BASE_URL = 'http://localhost:4000/api/favorites'

/**
 * Get all favorites for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of favorite objects
 */
export const getUserFavorites = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${userId}`)
    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to get favorites')
    }

    return data.data
  } catch (error) {
    console.error('Error getting user favorites:', error)
    throw error
  }
}

/**
 * Get favorites by type for a user
 * @param {string} userId - User ID
 * @param {'item'|'combination'} favoriteType - Type of favorite
 * @returns {Promise<Array>} Array of favorite objects
 */
export const getUserFavoritesByType = async (userId, favoriteType) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${userId}/${favoriteType}`)
    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to get favorites')
    }

    return data.data
  } catch (error) {
    console.error('Error getting user favorites by type:', error)
    throw error
  }
}

/**
 * Add item to favorites
 * @param {string} userId - User ID
 * @param {'item'|'combination'} favoriteType - Type of favorite
 * @param {string} favoriteId - ID of the item/combination
 * @returns {Promise<Object>} Created favorite object
 */
export const addFavorite = async (userId, favoriteType, favoriteId) => {
  try {
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        favoriteType,
        favoriteId
      })
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to add favorite')
    }

    return data.data
  } catch (error) {
    console.error('Error adding favorite:', error)
    throw error
  }
}

/**
 * Remove item from favorites
 * @param {string} userId - User ID
 * @param {'item'|'combination'} favoriteType - Type of favorite
 * @param {string} favoriteId - ID of the item/combination
 * @returns {Promise<boolean>} Success status
 */
export const removeFavorite = async (userId, favoriteType, favoriteId) => {
  try {
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        favoriteType,
        favoriteId
      })
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to remove favorite')
    }

    return true
  } catch (error) {
    console.error('Error removing favorite:', error)
    throw error
  }
}

/**
 * Toggle favorite status
 * @param {string} userId - User ID
 * @param {'item'|'combination'} favoriteType - Type of favorite
 * @param {string} favoriteId - ID of the item/combination
 * @returns {Promise<Object>} Result with isFavorited status and favorite data
 */
export const toggleFavorite = async (userId, favoriteType, favoriteId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        favoriteType,
        favoriteId
      })
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to toggle favorite')
    }

    return data.data
  } catch (error) {
    console.error('Error toggling favorite:', error)
    throw error
  }
}

/**
 * Check if item is favorited
 * @param {string} userId - User ID
 * @param {'item'|'combination'} favoriteType - Type of favorite
 * @param {string} favoriteId - ID of the item/combination
 * @returns {Promise<boolean>} Whether item is favorited
 */
export const isFavorited = async (userId, favoriteType, favoriteId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/check/${userId}/${favoriteType}/${favoriteId}`)
    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to check favorite status')
    }

    return data.data.isFavorited
  } catch (error) {
    console.error('Error checking favorite status:', error)
    throw error
  }
}

/**
 * Get potion combination favorites for a user (convenience function)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of potion combination names
 */
export const getPotionFavorites = async (userId) => {
  try {
    const favorites = await getUserFavoritesByType(userId, 'combination')
    return favorites.map(fav => fav.favoriteId) // Return just the potion names
  } catch (error) {
    console.error('Error getting potion favorites:', error)
    return [] // Return empty array on error
  }
}

/**
 * Toggle potion combination favorite (convenience function)
 * @param {string} userId - User ID
 * @param {string} potionName - Name of the potion combination
 * @returns {Promise<boolean>} New favorite status
 */
export const togglePotionFavorite = async (userId, potionName) => {
  try {
    const result = await toggleFavorite(userId, 'combination', potionName)
    return result.isFavorited
  } catch (error) {
    console.error('Error toggling potion favorite:', error)
    throw error
  }
}

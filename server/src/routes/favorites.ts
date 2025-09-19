import { Router } from 'express'
import FavoritesService from '../services/favoritesService.js'

const router = Router()
const favoritesService = new FavoritesService()

/**
 * @route GET /api/favorites/:userId
 * @desc Get all favorites for a user
 * @access Protected (should validate userId matches authenticated user)
 */
router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      })
    }

    const favorites = await favoritesService.getUserFavorites(userId)

    res.json({
      success: true,
      data: favorites
    })
  } catch (error) {
    console.error('Error getting user favorites:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get favorites'
    })
  }
})

/**
 * @route GET /api/favorites/:userId/:favoriteType
 * @desc Get favorites by type for a user
 * @access Protected
 */
router.get('/:userId/:favoriteType', async (req, res) => {
  try {
    const { userId, favoriteType } = req.params

    if (!userId || !favoriteType) {
      return res.status(400).json({
        success: false,
        error: 'User ID and favorite type are required'
      })
    }

    if (favoriteType !== 'item' && favoriteType !== 'combination') {
      return res.status(400).json({
        success: false,
        error: 'Favorite type must be "item" or "combination"'
      })
    }

    const favorites = await favoritesService.getUserFavoritesByType(userId, favoriteType as 'item' | 'combination')

    res.json({
      success: true,
      data: favorites
    })
  } catch (error) {
    console.error('Error getting user favorites by type:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get favorites'
    })
  }
})

/**
 * @route POST /api/favorites
 * @desc Add item to favorites
 * @access Protected
 */
router.post('/', async (req, res) => {
  try {
    const { userId, favoriteType, favoriteId } = req.body

    if (!userId || !favoriteType || !favoriteId) {
      return res.status(400).json({
        success: false,
        error: 'userId, favoriteType, and favoriteId are required'
      })
    }

    if (favoriteType !== 'item' && favoriteType !== 'combination') {
      return res.status(400).json({
        success: false,
        error: 'Favorite type must be "item" or "combination"'
      })
    }

    const favorite = await favoritesService.addFavorite(userId, favoriteType, favoriteId)

    res.status(201).json({
      success: true,
      data: favorite
    })
  } catch (error) {
    console.error('Error adding favorite:', error)

    if (error.message === 'Item is already in favorites') {
      return res.status(409).json({
        success: false,
        error: 'Item is already in favorites'
      })
    }

    res.status(500).json({
      success: false,
      error: 'Failed to add favorite'
    })
  }
})

/**
 * @route DELETE /api/favorites
 * @desc Remove item from favorites
 * @access Protected
 */
router.delete('/', async (req, res) => {
  try {
    const { userId, favoriteType, favoriteId } = req.body

    if (!userId || !favoriteType || !favoriteId) {
      return res.status(400).json({
        success: false,
        error: 'userId, favoriteType, and favoriteId are required'
      })
    }

    if (favoriteType !== 'item' && favoriteType !== 'combination') {
      return res.status(400).json({
        success: false,
        error: 'Favorite type must be "item" or "combination"'
      })
    }

    const removed = await favoritesService.removeFavorite(userId, favoriteType, favoriteId)

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Favorite not found'
      })
    }

    res.json({
      success: true,
      message: 'Favorite removed successfully'
    })
  } catch (error) {
    console.error('Error removing favorite:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to remove favorite'
    })
  }
})

/**
 * @route POST /api/favorites/toggle
 * @desc Toggle favorite status
 * @access Protected
 */
router.post('/toggle', async (req, res) => {
  try {
    const { userId, favoriteType, favoriteId } = req.body

    if (!userId || !favoriteType || !favoriteId) {
      return res.status(400).json({
        success: false,
        error: 'userId, favoriteType, and favoriteId are required'
      })
    }

    if (favoriteType !== 'item' && favoriteType !== 'combination') {
      return res.status(400).json({
        success: false,
        error: 'Favorite type must be "item" or "combination"'
      })
    }

    const result = await favoritesService.toggleFavorite(userId, favoriteType, favoriteId)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error toggling favorite:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to toggle favorite'
    })
  }
})

/**
 * @route GET /api/favorites/check/:userId/:favoriteType/:favoriteId
 * @desc Check if item is favorited
 * @access Protected
 */
router.get('/check/:userId/:favoriteType/:favoriteId', async (req, res) => {
  try {
    const { userId, favoriteType, favoriteId } = req.params

    if (!userId || !favoriteType || !favoriteId) {
      return res.status(400).json({
        success: false,
        error: 'userId, favoriteType, and favoriteId are required'
      })
    }

    if (favoriteType !== 'item' && favoriteType !== 'combination') {
      return res.status(400).json({
        success: false,
        error: 'Favorite type must be "item" or "combination"'
      })
    }

    const isFavorited = await favoritesService.isFavorited(userId, favoriteType as 'item' | 'combination', favoriteId)

    res.json({
      success: true,
      data: { isFavorited }
    })
  } catch (error) {
    console.error('Error checking favorite status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check favorite status'
    })
  }
})

export default router

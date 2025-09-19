import { Router } from 'express'
import HistoricalDataService from '../services/historicalDataService.js'

const router = Router()
const historicalDataService = new HistoricalDataService()

/**
 * @route GET /api/historical/:itemId
 * @desc Get cached historical data for an item
 * @access Public
 */
router.get('/:itemId', async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId)
    const timestep = req.query.timestep as string || '24h'

    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid item ID'
      })
    }

    // Validate timestep
    const validTimesteps = ['5m', '1h', '6h', '24h']
    if (!validTimesteps.includes(timestep)) {
      return res.status(400).json({
        success: false,
        error: `Invalid timestep. Must be one of: ${validTimesteps.join(', ')}`
      })
    }

    const data = await historicalDataService.getHistoricalData(itemId, timestep)

    res.json({
      success: true,
      data: {
        data // Match OSRS Wiki API format
      }
    })
  } catch (error) {
    console.error('Error getting historical data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get historical data'
    })
  }
})

/**
 * @route POST /api/historical/clear-cache
 * @desc Clear old cached historical data
 * @access Public (should be protected in production)
 */
router.post('/clear-cache', async (req, res) => {
  try {
    await historicalDataService.clearOldCache()

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    })
  } catch (error) {
    console.error('Error clearing cache:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    })
  }
})

export default router

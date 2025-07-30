import { Router } from 'express'
import gameUpdatesScraper from '../services/gameUpdatesScraper.js'

const router = Router()

/**
 * @route GET /api/game-updates
 * @desc Get cached game updates
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const updates = await gameUpdatesScraper.getCachedUpdates(limit)
    
    res.json({
      success: true,
      data: updates,
      count: updates.length
    })
  } catch (error) {
    console.error('Error getting game updates:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve game updates'
    })
  }
})

/**
 * @route GET /api/game-updates/type/:type
 * @desc Get game updates by type
 * @access Public
 */
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params
    const limit = parseInt(req.query.limit as string) || 20
    const updates = await gameUpdatesScraper.getUpdatesByType(type, limit)
    
    res.json({
      success: true,
      data: updates,
      count: updates.length,
      type
    })
  } catch (error) {
    console.error('Error getting game updates by type:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve game updates by type'
    })
  }
})

/**
 * @route POST /api/game-updates/scrape
 * @desc Manually trigger game updates scraping
 * @access Public (should be protected in production)
 */
router.post('/scrape', async (req, res) => {
  try {
    console.log('🔄 Manual scraping triggered')
    
    // Run scraping in background
    gameUpdatesScraper.scrapeAndSaveUpdates()
      .then(() => console.log('✅ Manual scraping completed'))
      .catch(error => console.error('❌ Manual scraping failed:', error))
    
    res.json({
      success: true,
      message: 'Game updates scraping started'
    })
  } catch (error) {
    console.error('Error starting manual scraping:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to start scraping'
    })
  }
})

/**
 * @route GET /api/game-updates/types
 * @desc Get available update types
 * @access Public
 */
router.get('/types', (req, res) => {
  const types = [
    { value: 'general', label: 'General', color: '#9E9E9E' },
    { value: 'quest', label: 'Quest', color: '#4CAF50' },
    { value: 'event', label: 'Event', color: '#FF9800' },
    { value: 'holiday', label: 'Holiday', color: '#E91E63' },
    { value: 'poll', label: 'Poll', color: '#2196F3' },
    { value: 'beta', label: 'Beta', color: '#9C27B0' },
    { value: 'hotfix', label: 'Hotfix', color: '#F44336' },
    { value: 'qol', label: 'Quality of Life', color: '#00BCD4' },
    { value: 'deadman', label: 'Deadman Mode', color: '#795548' },
    { value: 'leagues', label: 'Leagues', color: '#FF5722' },
    { value: 'mobile', label: 'Mobile', color: '#607D8B' },
    { value: 'pvp', label: 'PvP', color: '#F44336' },
    { value: 'pvm', label: 'PvM', color: '#4CAF50' },
    { value: 'skilling', label: 'Skilling', color: '#FFC107' }
  ]
  
  res.json({
    success: true,
    data: types
  })
})

export default router

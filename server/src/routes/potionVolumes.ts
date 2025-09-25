import { Router } from 'express'
import {
  getAllPotionVolumes,
  getPotionVolumeById,
  getPotionVolumesByBaseName,
  getVolumesCacheStatus,
  updateAllItemVolumes
} from '../services/itemVolumeService.js'

const router = Router()

// GET /api/potion-volumes - Get all cached potion volumes
router.get('/', async (req, res) => {
  try {
    const volumes = await getAllPotionVolumes()
    res.json({
      success: true,
      data: volumes
    })
  } catch (error) {
    console.error('Error fetching potion volumes:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch potion volumes'
    })
  }
})

// GET /api/potion-volumes/status - Get cache status
router.get('/status', async (req, res) => {
  try {
    const status = await getVolumesCacheStatus()
    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    console.error('Error fetching cache status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache status'
    })
  }
})

// GET /api/potion-volumes/item/:id - Get volume for specific item
router.get('/item/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id)
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid item ID'
      })
    }

    const volume = await getPotionVolumeById(itemId)
    res.json({
      success: true,
      data: volume
    })
  } catch (error) {
    console.error('Error fetching potion volume by ID:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch potion volume'
    })
  }
})

// GET /api/potion-volumes/potion/:baseName - Get all doses for a potion family
router.get('/potion/:baseName', async (req, res) => {
  try {
    const baseName = decodeURIComponent(req.params.baseName)
    const volumes = await getPotionVolumesByBaseName(baseName)
    res.json({
      success: true,
      data: volumes
    })
  } catch (error) {
    console.error('Error fetching potion volumes by base name:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch potion volumes'
    })
  }
})

// POST /api/potion-volumes/refresh - Manually trigger cache refresh
router.post('/refresh', async (req, res) => {
  try {
    // Run the update in the background
    updateAllItemVolumes().catch((error: Error) => {
      console.error('Background volume update failed:', error)
    })

    res.json({
      success: true,
      message: 'Volume cache refresh started'
    })
  } catch (error) {
    console.error('Error starting volume refresh:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to start volume refresh'
    })
  }
})

export default router

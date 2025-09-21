import cron from 'node-cron'
import { updateAllItemVolumes } from '../services/itemVolumeService.js'

export function scheduleVolumeUpdates () {
  // Schedule to run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    console.log('🕒 [Cron] Running scheduled item volume update...')
    updateAllItemVolumes().catch(error => {
      console.error('💥 [Cron] Error during scheduled volume update:', error)
    })
  })

  console.log('✅ [Cron] Scheduled volume updates to run every 5 minutes.')
}

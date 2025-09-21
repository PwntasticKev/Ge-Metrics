import cron from 'node-cron'
import { updateAllItemVolumes, updateHourlyItemVolumes } from '../services/itemVolumeService'

export function scheduleVolumeUpdates () {
  // Schedule the 24-hour volume update to run every 5 minutes
  console.log('🕒 Scheduling 24h volume updates (every 5 minutes)...')
  cron.schedule('*/5 * * * *', () => {
    console.log('🚀 Running scheduled 24h volume update...')
    updateAllItemVolumes()
  })

  // Schedule the 1-hour volume update to run every minute
  console.log('🕒 Scheduling 1h volume updates (every 1 minute)...')
  cron.schedule('* * * * *', () => {
    console.log('🚀 Running scheduled 1h volume update...')
    updateHourlyItemVolumes()
  })
}

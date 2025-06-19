#!/usr/bin/env node

/**
 * Volume Alert Monitoring Script
 *
 * This script monitors watchlist items for volume dumps and sends email alerts.
 * It should be run periodically (e.g., every 5-10 minutes) via cron job.
 *
 * Usage:
 *   node scripts/monitorVolumeAlerts.js
 *
 * Cron example (every 5 minutes):
 *   0,5,10,15,20,25,30,35,40,45,50,55 * * * * cd /path/to/ge-metrics && node scripts/monitorVolumeAlerts.js
 */

import volumeAlertService from '../src/services/volumeAlertService.js'

async function main () {
  console.log('🚀 Starting Volume Alert Monitor...')
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`)

  try {
    const result = await volumeAlertService.monitorWatchlists()

    if (result.success) {
      console.log('✅ Monitoring completed successfully')
      console.log(`📊 Stats: ${result.alertsProcessed} alerts processed, ${result.alertsSent} emails sent`)
    } else {
      console.error('❌ Monitoring failed:', result.error)
      process.exit(1)
    }
  } catch (error) {
    console.error('💥 Fatal error during monitoring:', error)
    process.exit(1)
  }

  console.log('🏁 Volume Alert Monitor finished')
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️ Received SIGINT, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n⚠️ Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

// Run the monitoring
main().catch(error => {
  console.error('💥 Unhandled error:', error)
  process.exit(1)
})

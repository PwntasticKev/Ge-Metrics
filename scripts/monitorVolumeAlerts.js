#!/usr/bin/env node

/**
 * Volume Alerts Monitoring Script
 *
 * This script monitors trading volume spikes and generates alerts for unusual
 * trading activity that could indicate market opportunities or manipulation.
 *
 * Usage:
 *   node scripts/monitorVolumeAlerts.js
 *
 * Cron example (every 5 minutes):
 *   */5 * * * * cd /path/to/ge-metrics && node scripts/monitorVolumeAlerts.js
 */

import fs from 'fs/promises'
import path from 'path'

class VolumeAlertsMonitor {
  constructor() {
    this.dataFile = path.join(process.cwd(), 'data', 'volume-alerts.json')
    this.logFile = path.join(process.cwd(), 'logs', 'volume-alerts.log')
    this.volumeSpikeThreshold = 3.0 // 300% of normal volume
    this.priceChangeThreshold = 10.0 // 10% price change
  }

  async log(message) {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}\n`
    
    console.log(logMessage.trim())
    
    try {
      await fs.appendFile(this.logFile, logMessage)
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  async ensureDirectories() {
    const dataDir = path.dirname(this.dataFile)
    const logDir = path.dirname(this.logFile)
    
    await fs.mkdir(dataDir, { recursive: true })
    await fs.mkdir(logDir, { recursive: true })
  }

  async fetchCurrentVolumes() {
    try {
      // In a real implementation, this would fetch from OSRS API
      // For now, we'll simulate volume monitoring
      const mockData = {
        items: [
          {
            id: 4151,
            name: 'Abyssal whip',
            currentVolume: 2500,
            normalVolume: 800,
            price: 3200000,
            priceChange: 5.2,
            timestamp: new Date().toISOString()
          },
          {
            id: 554,
            name: 'Fire rune',
            currentVolume: 150000,
            normalVolume: 45000,
            price: 5,
            priceChange: 15.7,
            timestamp: new Date().toISOString()
          },
          {
            id: 385,
            name: 'Shark',
            currentVolume: 85000,
            normalVolume: 25000,
            price: 892,
            priceChange: -8.3,
            timestamp: new Date().toISOString()
          },
          {
            id: 11802,
            name: "Ahrim's robetop",
            currentVolume: 450,
            normalVolume: 120,
            price: 2800000,
            priceChange: 12.1,
            timestamp: new Date().toISOString()
          }
        ]
      }

      return mockData
    } catch (error) {
      await this.log(`Error fetching volume data: ${error.message}`)
      return null
    }
  }

  analyzeVolumeSpikes(data) {
    const alerts = []
    const spikes = []

    data.items.forEach(item => {
      const volumeMultiplier = item.currentVolume / item.normalVolume
      const priceChangeAbs = Math.abs(item.priceChange)

      // Check for volume spikes
      if (volumeMultiplier >= this.volumeSpikeThreshold) {
        const spike = {
          itemId: item.id,
          itemName: item.name,
          volumeMultiplier: volumeMultiplier.toFixed(1),
          currentVolume: item.currentVolume,
          normalVolume: item.normalVolume,
          priceChange: item.priceChange,
          price: item.price,
          timestamp: item.timestamp,
          severity: this.calculateSeverity(volumeMultiplier, priceChangeAbs)
        }

        spikes.push(spike)

        // Generate alert
        const alert = {
          type: 'volume_spike',
          severity: spike.severity,
          itemId: item.id,
          itemName: item.name,
          message: this.generateSpikeMessage(spike),
          volumeMultiplier,
          priceChange: item.priceChange,
          timestamp: item.timestamp
        }

        alerts.push(alert)
      }

      // Check for unusual price movements with moderate volume increases
      if (volumeMultiplier >= 1.5 && priceChangeAbs >= this.priceChangeThreshold) {
        const alert = {
          type: 'price_volume_anomaly',
          severity: priceChangeAbs > 20 ? 'high' : 'medium',
          itemId: item.id,
          itemName: item.name,
          message: `${item.name}: ${item.priceChange > 0 ? '+' : ''}${item.priceChange.toFixed(1)}% price change with ${volumeMultiplier.toFixed(1)}x volume increase`,
          volumeMultiplier,
          priceChange: item.priceChange,
          timestamp: item.timestamp
        }

        alerts.push(alert)
      }
    })

    return { alerts, spikes }
  }

  calculateSeverity(volumeMultiplier, priceChange) {
    if (volumeMultiplier >= 5.0 || priceChange >= 25) return 'critical'
    if (volumeMultiplier >= 4.0 || priceChange >= 15) return 'high'
    if (volumeMultiplier >= 3.0 || priceChange >= 10) return 'medium'
    return 'low'
  }

  generateSpikeMessage(spike) {
    const direction = spike.priceChange > 0 ? 'up' : 'down'
    const priceEmoji = spike.priceChange > 0 ? '📈' : '📉'
    
    return `${priceEmoji} ${spike.itemName}: ${spike.volumeMultiplier}x volume spike (${spike.currentVolume.toLocaleString()} vs normal ${spike.normalVolume.toLocaleString()}) with ${Math.abs(spike.priceChange).toFixed(1)}% price movement ${direction}`
  }

  async generateRecommendations(alerts, spikes) {
    const recommendations = []

    // Sort spikes by severity and volume multiplier
    const sortedSpikes = spikes.sort((a, b) => {
      const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff
      return parseFloat(b.volumeMultiplier) - parseFloat(a.volumeMultiplier)
    })

    sortedSpikes.forEach(spike => {
      let recommendation = {
        itemId: spike.itemId,
        itemName: spike.itemName,
        action: 'monitor',
        reasoning: '',
        confidence: 'medium',
        timeframe: '1-2 hours'
      }

      if (spike.severity === 'critical') {
        if (spike.priceChange > 15) {
          recommendation.action = 'consider_sell'
          recommendation.reasoning = 'Massive volume spike with high price increase - potential pump, consider taking profits'
          recommendation.confidence = 'high'
        } else if (spike.priceChange < -15) {
          recommendation.action = 'wait_and_watch'
          recommendation.reasoning = 'Massive volume spike with price drop - potential dump, wait for stabilization'
          recommendation.confidence = 'high'
        } else {
          recommendation.action = 'investigate'
          recommendation.reasoning = 'Unusual volume activity without major price movement - investigate cause'
          recommendation.confidence = 'medium'
        }
      } else if (spike.severity === 'high') {
        if (spike.priceChange > 10) {
          recommendation.action = 'consider_buy'
          recommendation.reasoning = 'Strong volume with price increase - potential breakout'
          recommendation.confidence = 'medium'
          recommendation.timeframe = '2-4 hours'
        } else if (spike.priceChange < -10) {
          recommendation.action = 'consider_buy_dip'
          recommendation.reasoning = 'High volume selling - potential buying opportunity on dip'
          recommendation.confidence = 'medium'
          recommendation.timeframe = '1-3 hours'
        }
      }

      recommendations.push(recommendation)
    })

    return recommendations
  }

  async saveAlertData(alerts, spikes, recommendations) {
    try {
      const alertData = {
        alerts,
        volumeSpikes: spikes,
        recommendations,
        summary: {
          totalAlerts: alerts.length,
          criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
          highAlerts: alerts.filter(a => a.severity === 'high').length,
          mediumAlerts: alerts.filter(a => a.severity === 'medium').length,
          topSpike: spikes.length > 0 ? spikes[0] : null
        },
        metadata: {
          timestamp: new Date().toISOString(),
          volumeSpikeThreshold: this.volumeSpikeThreshold,
          priceChangeThreshold: this.priceChangeThreshold
        }
      }

      await fs.writeFile(this.dataFile, JSON.stringify(alertData, null, 2))
      await this.log(`Saved ${alerts.length} alerts and ${spikes.length} volume spikes`)
      
      return true
    } catch (error) {
      await this.log(`Error saving alert data: ${error.message}`)
      return false
    }
  }

  async run() {
    await this.log('📊 Starting Volume Alerts Monitor...')
    
    try {
      await this.ensureDirectories()
      
      // Fetch current volume data
      await this.log('📈 Fetching current volume data...')
      const volumeData = await this.fetchCurrentVolumes()
      
      if (!volumeData) {
        await this.log('❌ Failed to fetch volume data')
        return false
      }
      
      // Analyze volume spikes
      await this.log('🔍 Analyzing volume spikes...')
      const { alerts, spikes } = this.analyzeVolumeSpikes(volumeData)
      
      if (spikes.length > 0) {
        await this.log(`🚨 Detected ${spikes.length} volume spikes:`)
        spikes.forEach(spike => {
          await this.log(`  ${spike.severity.toUpperCase()}: ${spike.itemName} - ${spike.volumeMultiplier}x volume`)
        })
      } else {
        await this.log('✅ No significant volume spikes detected')
      }
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(alerts, spikes)
      
      if (recommendations.length > 0) {
        await this.log(`💡 Generated ${recommendations.length} trading recommendations`)
      }
      
      // Save data
      const saved = await this.saveAlertData(alerts, spikes, recommendations)
      
      if (saved) {
        await this.log('✅ Volume alerts monitoring completed successfully!')
        return true
      } else {
        await this.log('❌ Failed to save alert data')
        return false
      }
      
    } catch (error) {
      await this.log(`💥 Fatal error during volume monitoring: ${error.message}`)
      return false
    }
  }
}

// Run the monitor
async function main() {
  const monitor = new VolumeAlertsMonitor()
  const success = await monitor.run()
  
  if (!success) {
    process.exit(1)
  }
  
  console.log('🏁 Volume Alerts Monitor finished successfully')
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
}

export default VolumeAlertsMonitor

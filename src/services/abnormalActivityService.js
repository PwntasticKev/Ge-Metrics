import historyDataService from './historyDataService.js'

class AbnormalActivityService {
  constructor () {
    this.thresholds = {
      VOLUME_SPIKE_MULTIPLIER: 3.0, // 3x normal volume
      PRICE_SPIKE_PERCENTAGE: 20.0, // 20% price change
      VOLATILITY_THRESHOLD: 0.15, // 15% volatility
      MIN_VOLUME_FOR_ANALYSIS: 1000, // Minimum volume to consider
      ANALYSIS_WINDOW_HOURS: 24 // Hours to look back for patterns
    }
  }

  // Calculate statistical measures for an item
  async calculateItemStatistics (itemId, hoursBack = 24) {
    try {
      // Get historical data for the item
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - (hoursBack * 60 * 60 * 1000))

      // This would fetch from your database
      // const historicalData = await db.item_price_history.findMany({
      //   where: {
      //     item_id: itemId,
      //     timestamp: {
      //       gte: startTime,
      //       lte: endTime
      //     }
      //   },
      //   orderBy: { timestamp: 'asc' }
      // })

      // Mock data for demonstration
      const mockData = this.generateMockHistoricalData(itemId, hoursBack)

      if (mockData.length < 2) {
        return null // Not enough data
      }

      const volumes = mockData.map(d => Number(d.volume || 0)).filter(v => v > 0)
      const prices = mockData.map(d => Number(d.high_price || d.low_price || 0)).filter(p => p > 0)

      if (volumes.length === 0 || prices.length === 0) {
        return null
      }

      const stats = {
        avgVolume: this.calculateMean(volumes),
        medianVolume: this.calculateMedian(volumes),
        volumeStdDev: this.calculateStandardDeviation(volumes),
        avgPrice: this.calculateMean(prices),
        priceStdDev: this.calculateStandardDeviation(prices),
        priceVolatility: this.calculateVolatility(prices),
        maxVolume: Math.max(...volumes),
        minVolume: Math.min(...volumes),
        maxPrice: Math.max(...prices),
        minPrice: Math.min(...prices),
        dataPoints: mockData.length,
        timeWindow: hoursBack
      }

      // Calculate dynamic thresholds
      stats.volumeSpikeThreshold = stats.avgVolume * this.thresholds.VOLUME_SPIKE_MULTIPLIER
      stats.priceChangeThreshold = stats.avgPrice * (this.thresholds.PRICE_SPIKE_PERCENTAGE / 100)

      return stats
    } catch (error) {
      console.error('Error calculating item statistics:', error)
      return null
    }
  }

  // Detect abnormal activity for an item
  async detectAbnormalActivity (itemId, currentData) {
    try {
      const stats = await this.calculateItemStatistics(itemId, this.thresholds.ANALYSIS_WINDOW_HOURS)

      if (!stats || !currentData) {
        return {
          isAbnormal: false,
          reason: 'Insufficient data for analysis',
          confidence: 0
        }
      }

      const currentVolume = Number(currentData.volume || 0)
      const currentPrice = Number(currentData.high || currentData.low || 0)

      const alerts = []
      let maxConfidence = 0

      // Check for volume spike
      if (currentVolume > stats.volumeSpikeThreshold && currentVolume > this.thresholds.MIN_VOLUME_FOR_ANALYSIS) {
        const volumeMultiplier = currentVolume / stats.avgVolume
        const confidence = Math.min(volumeMultiplier / this.thresholds.VOLUME_SPIKE_MULTIPLIER, 1.0)

        alerts.push({
          type: 'volume_spike',
          message: `Volume spike detected: ${currentVolume.toLocaleString()} (${volumeMultiplier.toFixed(1)}x normal)`,
          confidence,
          severity: volumeMultiplier > 5 ? 'high' : volumeMultiplier > 3 ? 'medium' : 'low'
        })

        maxConfidence = Math.max(maxConfidence, confidence)
      }

      // Check for price spike (up or down)
      if (stats.avgPrice > 0) {
        const priceChange = Math.abs(currentPrice - stats.avgPrice)
        const priceChangePercent = (priceChange / stats.avgPrice) * 100

        if (priceChangePercent > this.thresholds.PRICE_SPIKE_PERCENTAGE) {
          const direction = currentPrice > stats.avgPrice ? 'increase' : 'decrease'
          const confidence = Math.min(priceChangePercent / this.thresholds.PRICE_SPIKE_PERCENTAGE, 1.0)

          alerts.push({
            type: 'price_spike',
            message: `Significant price ${direction}: ${priceChangePercent.toFixed(1)}% change`,
            confidence,
            severity: priceChangePercent > 50 ? 'high' : priceChangePercent > 30 ? 'medium' : 'low'
          })

          maxConfidence = Math.max(maxConfidence, confidence)
        }
      }

      // Check for unusual volatility
      if (stats.priceVolatility > this.thresholds.VOLATILITY_THRESHOLD) {
        const confidence = Math.min(stats.priceVolatility / this.thresholds.VOLATILITY_THRESHOLD, 1.0)

        alerts.push({
          type: 'high_volatility',
          message: `High price volatility detected: ${(stats.priceVolatility * 100).toFixed(1)}%`,
          confidence,
          severity: stats.priceVolatility > 0.3 ? 'high' : stats.priceVolatility > 0.2 ? 'medium' : 'low'
        })

        maxConfidence = Math.max(maxConfidence, confidence)
      }

      // Check for volume pattern anomalies
      const volumeZScore = Math.abs((currentVolume - stats.avgVolume) / (stats.volumeStdDev || 1))
      if (volumeZScore > 2.5) { // More than 2.5 standard deviations
        const confidence = Math.min(volumeZScore / 3.0, 1.0)

        alerts.push({
          type: 'volume_anomaly',
          message: `Volume anomaly detected: ${volumeZScore.toFixed(1)} standard deviations from normal`,
          confidence,
          severity: volumeZScore > 4 ? 'high' : volumeZScore > 3 ? 'medium' : 'low'
        })

        maxConfidence = Math.max(maxConfidence, confidence)
      }

      return {
        isAbnormal: alerts.length > 0,
        alerts,
        confidence: maxConfidence,
        statistics: stats,
        currentData: {
          volume: currentVolume,
          price: currentPrice,
          timestamp: new Date()
        }
      }
    } catch (error) {
      console.error('Error detecting abnormal activity:', error)
      return {
        isAbnormal: false,
        reason: 'Error during analysis',
        error: error.message,
        confidence: 0
      }
    }
  }

  // Monitor multiple items for abnormal activity
  async monitorAbnormalActivity (itemIds) {
    try {
      const results = []
      const latestData = await historyDataService.fetchLatestPrices()

      for (const itemId of itemIds) {
        const currentData = latestData[itemId]
        if (!currentData) continue

        const analysis = await this.detectAbnormalActivity(itemId, currentData)

        if (analysis.isAbnormal) {
          results.push({
            itemId,
            itemName: currentData.name || `Item ${itemId}`,
            analysis
          })
        }
      }

      return {
        timestamp: new Date(),
        itemsAnalyzed: itemIds.length,
        abnormalItems: results.length,
        results
      }
    } catch (error) {
      console.error('Error monitoring abnormal activity:', error)
      throw error
    }
  }

  // Save abnormal activity patterns to database
  async saveActivityPattern (itemId, statistics) {
    try {
      // This would save to your database
      // await db.abnormal_activity_patterns.upsert({
      //   where: { item_id: itemId },
      //   update: {
      //     avg_volume_24h: BigInt(Math.round(statistics.avgVolume)),
      //     avg_volume_7d: BigInt(Math.round(statistics.avgVolume)), // Would calculate 7d separately
      //     avg_price_change_24h: statistics.priceVolatility,
      //     price_volatility: statistics.priceVolatility,
      //     volume_spike_threshold: BigInt(Math.round(statistics.volumeSpikeThreshold)),
      //     last_calculated: new Date()
      //   },
      //   create: {
      //     item_id: itemId,
      //     avg_volume_24h: BigInt(Math.round(statistics.avgVolume)),
      //     avg_volume_7d: BigInt(Math.round(statistics.avgVolume)),
      //     avg_price_change_24h: statistics.priceVolatility,
      //     price_volatility: statistics.priceVolatility,
      //     volume_spike_threshold: BigInt(Math.round(statistics.volumeSpikeThreshold)),
      //     last_calculated: new Date()
      //   }
      // })

      console.log(`💾 Activity pattern saved for item ${itemId}`)
    } catch (error) {
      console.error('Error saving activity pattern:', error)
    }
  }

  // Utility functions
  calculateMean (values) {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
  }

  calculateMedian (values) {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]
  }

  calculateStandardDeviation (values) {
    const mean = this.calculateMean(values)
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2))
    const avgSquaredDiff = this.calculateMean(squaredDiffs)
    return Math.sqrt(avgSquaredDiff)
  }

  calculateVolatility (prices) {
    if (prices.length < 2) return 0

    const returns = []
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] > 0) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
      }
    }

    return returns.length > 0 ? this.calculateStandardDeviation(returns) : 0
  }

  // Generate mock historical data for testing
  generateMockHistoricalData (itemId, hoursBack) {
    const data = []
    const baseVolume = 10000 + (itemId % 1000) * 100
    const basePrice = 1000 + (itemId % 10000) * 10

    for (let i = hoursBack; i >= 0; i--) {
      const timestamp = new Date(Date.now() - (i * 60 * 60 * 1000))

      // Add some randomness to simulate real data
      const volumeVariation = 0.5 + Math.random()
      const priceVariation = 0.9 + (Math.random() * 0.2)

      data.push({
        item_id: itemId,
        timestamp,
        volume: Math.round(baseVolume * volumeVariation),
        high_price: Math.round(basePrice * priceVariation),
        low_price: Math.round(basePrice * priceVariation * 0.95)
      })
    }

    return data
  }

  // Get abnormal activity summary for an item
  getActivitySummary (analysis) {
    if (!analysis.isAbnormal) {
      return {
        status: 'normal',
        message: 'No abnormal activity detected',
        badge: { color: 'green', text: 'Normal' }
      }
    }

    const highSeverityAlerts = analysis.alerts.filter(a => a.severity === 'high')
    const mediumSeverityAlerts = analysis.alerts.filter(a => a.severity === 'medium')

    if (highSeverityAlerts.length > 0) {
      return {
        status: 'high_alert',
        message: `${highSeverityAlerts.length} high-severity alerts`,
        badge: { color: 'red', text: 'HIGH ALERT' }
      }
    }

    if (mediumSeverityAlerts.length > 0) {
      return {
        status: 'medium_alert',
        message: `${mediumSeverityAlerts.length} medium-severity alerts`,
        badge: { color: 'orange', text: 'ALERT' }
      }
    }

    return {
      status: 'low_alert',
      message: `${analysis.alerts.length} low-severity alerts`,
      badge: { color: 'yellow', text: 'Watch' }
    }
  }
}

export default new AbnormalActivityService()

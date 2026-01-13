import { describe, test, expect, beforeEach, vi } from 'vitest'

/**
 * @component AbnormalActivityService
 * @description Test suite for Abnormal Activity Service
 */
describe('AbnormalActivityService Service', () => {
  // Activity detection utility tests
  test('should detect abnormal price spikes', () => {
    const detectPriceSpike = (currentPrice, averagePrice, threshold = 0.2) => {
      if (!averagePrice || averagePrice === 0) return false
      const percentChange = Math.abs((currentPrice - averagePrice) / averagePrice)
      return percentChange > threshold
    }
    
    expect(detectPriceSpike(1500, 1000)).toBe(true)  // 50% spike
    expect(detectPriceSpike(1100, 1000)).toBe(false) // 10% spike
    expect(detectPriceSpike(800, 1000)).toBe(false)  // 20% drop (exactly at threshold)
    expect(detectPriceSpike(1000, 0)).toBe(false)    // Invalid average
  })
  
  test('should detect unusual trading volume', () => {
    const detectVolumeAnomaly = (currentVolume, averageVolume, multiplier = 2) => {
      if (!averageVolume || averageVolume === 0) return false
      return currentVolume > averageVolume * multiplier
    }
    
    expect(detectVolumeAnomaly(5000, 1000)).toBe(true)   // 5x volume
    expect(detectVolumeAnomaly(1500, 1000)).toBe(false)  // 1.5x volume
    expect(detectVolumeAnomaly(2500, 1000, 2)).toBe(true) // 2.5x > 2x threshold
  })
  
  test('should calculate volatility score', () => {
    const calculateVolatility = (prices) => {
      if (!prices || prices.length < 2) return 0
      
      const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
      const stdDev = Math.sqrt(variance)
      
      return Math.round((stdDev / mean) * 100) // Coefficient of variation as percentage
    }
    
    expect(calculateVolatility([100, 100, 100])).toBe(0) // No volatility
    expect(calculateVolatility([100, 110, 90, 100])).toBe(7) // Some volatility
    expect(calculateVolatility([100])).toBe(0) // Single price
  })
  
  test('should identify market manipulation patterns', () => {
    const detectManipulation = (trades) => {
      const patterns = {
        pumpAndDump: false,
        washTrading: false,
        spoofing: false
      }
      
      // Check for pump and dump (rapid price increase followed by drop)
      const priceChanges = trades.map((t, i) => 
        i > 0 ? (t.price - trades[i-1].price) / trades[i-1].price : 0
      )
      
      const rapidIncrease = priceChanges.some(c => c > 0.3)
      const rapidDecrease = priceChanges.some(c => c < -0.3)
      patterns.pumpAndDump = rapidIncrease && rapidDecrease
      
      // Check for wash trading (same buyer/seller)
      patterns.washTrading = trades.some((t, i) => 
        trades.some((t2, j) => i !== j && t.buyer === t2.seller && t.seller === t2.buyer)
      )
      
      return patterns
    }
    
    const suspiciousTrades = [
      { price: 100, buyer: 'A', seller: 'B' },
      { price: 150, buyer: 'C', seller: 'A' },
      { price: 80, buyer: 'B', seller: 'C' },
      { price: 90, buyer: 'B', seller: 'A' }
    ]
    
    const patterns = detectManipulation(suspiciousTrades)
    expect(patterns.pumpAndDump).toBe(true)
  })
  
  test('should generate activity alerts', () => {
    const generateAlert = (activity, threshold) => {
      const alerts = []
      
      if (activity.priceChange > threshold.price) {
        alerts.push({
          type: 'PRICE_ALERT',
          severity: activity.priceChange > threshold.price * 2 ? 'high' : 'medium',
          message: `Price changed by ${activity.priceChange}%`
        })
      }
      
      if (activity.volumeSpike > threshold.volume) {
        alerts.push({
          type: 'VOLUME_ALERT',
          severity: 'medium',
          message: `Volume spiked by ${activity.volumeSpike}x`
        })
      }
      
      return alerts
    }
    
    const activity = { priceChange: 35, volumeSpike: 3 }
    const threshold = { price: 20, volume: 2 }
    
    const alerts = generateAlert(activity, threshold)
    expect(alerts).toHaveLength(2)
    expect(alerts[0].type).toBe('PRICE_ALERT')
    expect(alerts[0].severity).toBe('medium')
  })
  
  test('should track activity history', () => {
    class ActivityTracker {
      constructor() {
        this.history = []
        this.maxHistory = 100
      }
      
      addActivity(activity) {
        this.history.unshift(activity)
        if (this.history.length > this.maxHistory) {
          this.history.pop()
        }
      }
      
      getRecentActivity(count = 10) {
        return this.history.slice(0, count)
      }
      
      getAbnormalActivities() {
        return this.history.filter(a => a.isAbnormal)
      }
    }
    
    const tracker = new ActivityTracker()
    tracker.addActivity({ id: 1, isAbnormal: true })
    tracker.addActivity({ id: 2, isAbnormal: false })
    tracker.addActivity({ id: 3, isAbnormal: true })
    
    expect(tracker.getRecentActivity(2)).toHaveLength(2)
    expect(tracker.getAbnormalActivities()).toHaveLength(2)
  })
  
  // TODO: Add real-time monitoring tests
  // TODO: Add alert notification tests
  // TODO: Add pattern recognition tests
})
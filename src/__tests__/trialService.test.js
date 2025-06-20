/**
 * Trial Service Tests
 *
 * Comprehensive test suite for 14-day free trial functionality
 */

import trialService from '../services/trialService'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value }),
    removeItem: jest.fn((key) => { delete store[key] }),
    clear: jest.fn(() => { store = {} })
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock console.log to avoid test output clutter
const originalConsoleLog = console.log
beforeAll(() => {
  console.log = jest.fn()
})

afterAll(() => {
  console.log = originalConsoleLog
})

describe('TrialService', () => {
  beforeEach(() => {
    localStorageMock.clear()
    jest.clearAllMocks()

    // Reset the service instance
    trialService.clearTrial()
  })

  describe('Trial Initialization', () => {
    test('should initialize trial for new user', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      const trialData = trialService.initializeTrial(userId, userEmail)

      expect(trialData).toMatchObject({
        userId,
        userEmail,
        isActive: true,
        daysRemaining: 14,
        upgradePrompts: 0,
        features: {
          aiPredictions: true,
          whaleTracking: true,
          futureItems: true,
          priceAlerts: true,
          watchlist: true,
          basicCharts: true,
          limitedApiCalls: true
        },
        restrictions: {
          maxWatchlistItems: 25,
          maxPriceAlerts: 10,
          dailyApiCalls: 100,
          advancedFeatures: false
        }
      })

      expect(trialData.startDate).toBeDefined()
      expect(trialData.endDate).toBeDefined()
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ge_metrics_trial',
        expect.any(String)
      )
    })

    test('should calculate correct trial end date', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      const beforeInit = new Date()
      const trialData = trialService.initializeTrial(userId, userEmail)
      const afterInit = new Date()

      const startDate = new Date(trialData.startDate)
      const endDate = new Date(trialData.endDate)

      expect(startDate.getTime()).toBeGreaterThanOrEqual(beforeInit.getTime())
      expect(startDate.getTime()).toBeLessThanOrEqual(afterInit.getTime())

      const expectedEndTime = startDate.getTime() + (14 * 24 * 60 * 60 * 1000)
      expect(endDate.getTime()).toBe(expectedEndTime)
    })
  })

  describe('Trial Status Management', () => {
    test('should return null when no trial exists', () => {
      const status = trialService.getTrialStatus()
      expect(status).toBeNull()
    })

    test('should return trial status for active trial', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      trialService.initializeTrial(userId, userEmail)
      const status = trialService.getTrialStatus()

      expect(status).toMatchObject({
        userId,
        userEmail,
        isActive: true,
        isExpired: false,
        daysRemaining: 14
      })
    })

    test('should update trial status when expired', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      // Create trial with past end date
      const trialData = trialService.initializeTrial(userId, userEmail)
      trialData.endDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday

      localStorageMock.setItem('ge_metrics_trial', JSON.stringify(trialData))

      const status = trialService.getTrialStatus()

      expect(status.isActive).toBe(false)
      expect(status.isExpired).toBe(true)
      expect(status.daysRemaining).toBe(0)
    })

    test('should calculate remaining hours correctly', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      // Create trial ending in 2 hours
      const trialData = trialService.initializeTrial(userId, userEmail)
      trialData.endDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

      localStorageMock.setItem('ge_metrics_trial', JSON.stringify(trialData))

      const status = trialService.getTrialStatus()

      expect(status.hoursRemaining).toBe(2)
      expect(status.daysRemaining).toBe(1) // Ceiling of 2 hours
    })
  })

  describe('Feature Availability', () => {
    test('should allow features during active trial', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      trialService.initializeTrial(userId, userEmail)

      expect(trialService.isFeatureAvailable('aiPredictions')).toBe(true)
      expect(trialService.isFeatureAvailable('whaleTracking')).toBe(true)
      expect(trialService.isFeatureAvailable('futureItems')).toBe(true)
    })

    test('should deny features when trial expired', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      // Create expired trial
      const trialData = trialService.initializeTrial(userId, userEmail)
      trialData.endDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      localStorageMock.setItem('ge_metrics_trial', JSON.stringify(trialData))

      expect(trialService.isFeatureAvailable('aiPredictions')).toBe(false)
      expect(trialService.isFeatureAvailable('whaleTracking')).toBe(false)
    })

    test('should deny features when no trial exists', () => {
      expect(trialService.isFeatureAvailable('aiPredictions')).toBe(false)
    })
  })

  describe('Restriction Checking', () => {
    test('should enforce trial restrictions', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      trialService.initializeTrial(userId, userEmail)

      // Test watchlist restriction
      const watchlistCheck = trialService.checkRestriction('maxWatchlistItems', 20)
      expect(watchlistCheck).toMatchObject({
        allowed: true,
        limit: 25,
        remaining: 5,
        percentage: 80
      })

      // Test at limit
      const atLimitCheck = trialService.checkRestriction('maxWatchlistItems', 25)
      expect(atLimitCheck.allowed).toBe(false)

      // Test over limit
      const overLimitCheck = trialService.checkRestriction('maxWatchlistItems', 30)
      expect(overLimitCheck.allowed).toBe(false)
    })

    test('should deny restrictions when trial expired', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      // Create expired trial
      const trialData = trialService.initializeTrial(userId, userEmail)
      trialData.endDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      localStorageMock.setItem('ge_metrics_trial', JSON.stringify(trialData))

      const check = trialService.checkRestriction('maxWatchlistItems', 10)
      expect(check.allowed).toBe(false)
      expect(check.limit).toBe(0)
    })
  })

  describe('API Call Limiting', () => {
    test('should allow API calls within daily limit', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      trialService.initializeTrial(userId, userEmail)

      const check = trialService.checkApiCallAllowed()
      expect(check.allowed).toBe(true)
      expect(check.remaining).toBe(100)
      expect(check.limit).toBe(100)
    })

    test('should track API call usage', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      trialService.initializeTrial(userId, userEmail)

      // Record some API calls
      for (let i = 0; i < 50; i++) {
        trialService.recordApiCall()
      }

      const check = trialService.checkApiCallAllowed()
      expect(check.allowed).toBe(true)
      expect(check.remaining).toBe(50)
    })

    test('should deny API calls when daily limit reached', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      trialService.initializeTrial(userId, userEmail)

      // Record 100 API calls (the limit)
      for (let i = 0; i < 100; i++) {
        trialService.recordApiCall()
      }

      const check = trialService.checkApiCallAllowed()
      expect(check.allowed).toBe(false)
      expect(check.reason).toBe('Daily API limit reached')
      expect(check.used).toBe(100)
    })

    test('should deny API calls when trial expired', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      // Create expired trial
      const trialData = trialService.initializeTrial(userId, userEmail)
      trialData.endDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      localStorageMock.setItem('ge_metrics_trial', JSON.stringify(trialData))

      const check = trialService.checkApiCallAllowed()
      expect(check.allowed).toBe(false)
      expect(check.reason).toBe('Trial expired')
    })
  })

  describe('Upgrade Prompts', () => {
    test('should show upgrade prompts based on trial progress', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      // Create trial with 1 day remaining
      const trialData = trialService.initializeTrial(userId, userEmail)
      trialData.daysRemaining = 1
      trialData.lastPromptDate = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago

      localStorageMock.setItem('ge_metrics_trial', JSON.stringify(trialData))

      expect(trialService.shouldShowUpgradePrompt()).toBe(true)
    })

    test('should not show prompts too frequently', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      // Create trial with recent prompt
      const trialData = trialService.initializeTrial(userId, userEmail)
      trialData.daysRemaining = 1
      trialData.lastPromptDate = new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago

      localStorageMock.setItem('ge_metrics_trial', JSON.stringify(trialData))

      expect(trialService.shouldShowUpgradePrompt()).toBe(false)
    })

    test('should record upgrade prompt', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      trialService.initializeTrial(userId, userEmail)
      trialService.recordUpgradePrompt()

      const status = trialService.getTrialStatus()
      expect(status.upgradePrompts).toBe(1)
      expect(status.lastPromptDate).toBeDefined()
    })
  })

  describe('Upgrade Urgency', () => {
    test('should return correct urgency levels', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      // Test expired
      const trialData = trialService.initializeTrial(userId, userEmail)
      trialData.daysRemaining = 0
      localStorageMock.setItem('ge_metrics_trial', JSON.stringify(trialData))
      expect(trialService.getUpgradeUrgency()).toBe('expired')

      // Test critical (1 day)
      trialData.daysRemaining = 1
      localStorageMock.setItem('ge_metrics_trial', JSON.stringify(trialData))
      expect(trialService.getUpgradeUrgency()).toBe('critical')

      // Test urgent (3 days)
      trialData.daysRemaining = 3
      localStorageMock.setItem('ge_metrics_trial', JSON.stringify(trialData))
      expect(trialService.getUpgradeUrgency()).toBe('urgent')

      // Test moderate (7 days)
      trialData.daysRemaining = 7
      localStorageMock.setItem('ge_metrics_trial', JSON.stringify(trialData))
      expect(trialService.getUpgradeUrgency()).toBe('moderate')

      // Test low (10 days)
      trialData.daysRemaining = 10
      localStorageMock.setItem('ge_metrics_trial', JSON.stringify(trialData))
      expect(trialService.getUpgradeUrgency()).toBe('low')
    })

    test('should generate appropriate upgrade messages', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      const trialData = trialService.initializeTrial(userId, userEmail)
      trialData.daysRemaining = 1
      trialData.hoursRemaining = 12
      localStorageMock.setItem('ge_metrics_trial', JSON.stringify(trialData))

      const message = trialService.getUpgradeMessage()
      expect(message).toMatchObject({
        title: '⏰ Trial Ending Soon',
        color: 'red',
        action: 'Upgrade Before It\'s Too Late'
      })
      expect(message.message).toContain('12 hours left')
    })
  })

  describe('Trial Analytics', () => {
    test('should calculate engagement score', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      trialService.initializeTrial(userId, userEmail)

      // Log some events
      trialService.logTrialEvent('user_login', {})
      trialService.logTrialEvent('feature_used', {})
      trialService.logTrialEvent('session_duration', { duration: 600 }) // 10 minutes

      const analytics = trialService.getTrialAnalytics()
      expect(analytics.metrics.engagementScore).toBeGreaterThan(0)
      expect(analytics.events).toHaveLength(4) // 3 manual + 1 trial_started
    })

    test('should provide trial metrics', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      const trialData = trialService.initializeTrial(userId, userEmail)
      trialData.daysRemaining = 10
      trialData.upgradePrompts = 3
      localStorageMock.setItem('ge_metrics_trial', JSON.stringify(trialData))

      const analytics = trialService.getTrialAnalytics()
      expect(analytics.metrics).toMatchObject({
        daysUsed: 4, // 14 - 10
        upgradePrompts: 3
      })
    })
  })

  describe('Trial Termination', () => {
    test('should end trial with reason', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      trialService.initializeTrial(userId, userEmail)
      trialService.endTrial('upgraded')

      const status = trialService.getTrialStatus()
      expect(status.isActive).toBe(false)
      expect(status.endReason).toBe('upgraded')
      expect(status.actualEndDate).toBeDefined()
    })

    test('should clear trial data', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      trialService.initializeTrial(userId, userEmail)
      trialService.clearTrial()

      expect(trialService.getTrialStatus()).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('ge_metrics_trial')
    })
  })

  describe('Edge Cases', () => {
    test('should handle corrupted trial data', () => {
      localStorageMock.setItem('ge_metrics_trial', 'invalid json')

      const status = trialService.getTrialStatus()
      expect(status).toBeNull()
    })

    test('should handle missing trial data gracefully', () => {
      expect(trialService.hasActiveTrial()).toBe(false)
      expect(trialService.isTrialExpired()).toBe(false)
      expect(trialService.getDaysRemaining()).toBe(0)
      expect(trialService.getUpgradeUrgency()).toBe('none')
      expect(trialService.getUpgradeMessage()).toBeNull()
    })

    test('should clean up old API call data', () => {
      const userId = 'user123'
      const userEmail = 'test@example.com'

      trialService.initializeTrial(userId, userEmail)

      // Set old API call data
      const oldApiCalls = {
        [new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toDateString()]: 50 // 10 days ago
      }
      localStorageMock.setItem('trial_api_calls', JSON.stringify(oldApiCalls))

      trialService.recordApiCall()

      const apiCalls = JSON.parse(localStorageMock.getItem('trial_api_calls'))
      const oldDateKeys = Object.keys(apiCalls).filter(date =>
        new Date(date) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      )
      expect(oldDateKeys).toHaveLength(0)
    })
  })
})

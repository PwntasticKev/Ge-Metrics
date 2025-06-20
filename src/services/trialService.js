/**
 * Trial Service
 *
 * Manages 14-day free trial functionality including:
 * - Trial activation for new users
 * - Trial status checking
 * - Trial expiration handling
 * - Upgrade prompts and restrictions
 */

class TrialService {
  constructor () {
    this.TRIAL_DURATION_DAYS = 14
    this.TRIAL_STORAGE_KEY = 'ge_metrics_trial'
    this.USER_STORAGE_KEY = 'ge_metrics_user'
  }

  /**
   * Initialize trial for a new user
   */
  initializeTrial (userId, userEmail) {
    const trialData = {
      userId,
      userEmail,
      startDate: new Date().toISOString(),
      endDate: this.calculateTrialEndDate(),
      isActive: true,
      daysRemaining: this.TRIAL_DURATION_DAYS,
      upgradePrompts: 0,
      lastPromptDate: null,
      features: {
        aiPredictions: true,
        whaleTracking: true,
        futureItems: true,
        priceAlerts: true,
        watchlist: true,
        basicCharts: true,
        limitedApiCalls: true // 100 calls per day during trial
      },
      restrictions: {
        maxWatchlistItems: 25,
        maxPriceAlerts: 10,
        dailyApiCalls: 100,
        advancedFeatures: false
      }
    }

    localStorage.setItem(this.TRIAL_STORAGE_KEY, JSON.stringify(trialData))
    this.logTrialEvent('trial_started', { userId, userEmail })

    return trialData
  }

  /**
   * Get current trial status
   */
  getTrialStatus () {
    try {
      const trialData = localStorage.getItem(this.TRIAL_STORAGE_KEY)
      if (!trialData) return null

      const trial = JSON.parse(trialData)
      const now = new Date()
      const endDate = new Date(trial.endDate)

      // Update days remaining
      const msPerDay = 24 * 60 * 60 * 1000
      const daysRemaining = Math.max(0, Math.ceil((endDate - now) / msPerDay))

      trial.daysRemaining = daysRemaining
      trial.isActive = daysRemaining > 0
      trial.isExpired = daysRemaining <= 0
      trial.hoursRemaining = daysRemaining > 0 ? Math.max(0, Math.ceil((endDate - now) / (60 * 60 * 1000))) : 0

      // Update localStorage with new status
      localStorage.setItem(this.TRIAL_STORAGE_KEY, JSON.stringify(trial))

      return trial
    } catch (error) {
      console.error('Error getting trial status:', error)
      return null
    }
  }

  /**
   * Check if user has an active trial
   */
  hasActiveTrial () {
    const trial = this.getTrialStatus()
    return trial && trial.isActive && !trial.isExpired
  }

  /**
   * Check if trial has expired
   */
  isTrialExpired () {
    const trial = this.getTrialStatus()
    return trial && trial.isExpired
  }

  /**
   * Get days remaining in trial
   */
  getDaysRemaining () {
    const trial = this.getTrialStatus()
    return trial ? trial.daysRemaining : 0
  }

  /**
   * Check if user should see upgrade prompt
   */
  shouldShowUpgradePrompt () {
    const trial = this.getTrialStatus()
    if (!trial) return false

    const now = new Date()
    const lastPrompt = trial.lastPromptDate ? new Date(trial.lastPromptDate) : null
    const hoursSinceLastPrompt = lastPrompt ? (now - lastPrompt) / (1000 * 60 * 60) : 24

    // Show prompts based on trial progress
    if (trial.daysRemaining <= 1) {
      return hoursSinceLastPrompt >= 2 // Every 2 hours in final day
    } else if (trial.daysRemaining <= 3) {
      return hoursSinceLastPrompt >= 6 // Every 6 hours in final 3 days
    } else if (trial.daysRemaining <= 7) {
      return hoursSinceLastPrompt >= 24 // Daily in final week
    } else {
      return hoursSinceLastPrompt >= 72 // Every 3 days early in trial
    }
  }

  /**
   * Record that upgrade prompt was shown
   */
  recordUpgradePrompt () {
    const trial = this.getTrialStatus()
    if (trial) {
      trial.upgradePrompts += 1
      trial.lastPromptDate = new Date().toISOString()
      localStorage.setItem(this.TRIAL_STORAGE_KEY, JSON.stringify(trial))

      this.logTrialEvent('upgrade_prompt_shown', {
        userId: trial.userId,
        daysRemaining: trial.daysRemaining,
        promptCount: trial.upgradePrompts
      })
    }
  }

  /**
   * Check if feature is available during trial
   */
  isFeatureAvailable (featureName) {
    const trial = this.getTrialStatus()
    if (!trial) return false

    if (trial.isExpired) return false

    return trial.features[featureName] || false
  }

  /**
   * Check if user has hit trial restrictions
   */
  checkRestriction (restrictionType, currentValue) {
    const trial = this.getTrialStatus()
    if (!trial || trial.isExpired) return { allowed: false, limit: 0 }

    const limit = trial.restrictions[restrictionType]
    if (limit === undefined) return { allowed: true, limit: null }

    return {
      allowed: currentValue < limit,
      limit,
      remaining: Math.max(0, limit - currentValue),
      percentage: Math.round((currentValue / limit) * 100)
    }
  }

  /**
   * Get trial upgrade urgency level
   */
  getUpgradeUrgency () {
    const trial = this.getTrialStatus()
    if (!trial) return 'none'

    if (trial.daysRemaining <= 0) return 'expired'
    if (trial.daysRemaining <= 1) return 'critical'
    if (trial.daysRemaining <= 3) return 'urgent'
    if (trial.daysRemaining <= 7) return 'moderate'
    return 'low'
  }

  /**
   * Generate upgrade message based on trial status
   */
  getUpgradeMessage () {
    const trial = this.getTrialStatus()
    if (!trial) return null

    const urgency = this.getUpgradeUrgency()

    const messages = {
      expired: {
        title: '🚨 Trial Expired',
        message: 'Your 14-day free trial has ended. Upgrade now to continue using Ge-Metrics!',
        action: 'Upgrade Now',
        color: 'red'
      },
      critical: {
        title: '⏰ Trial Ending Soon',
        message: `Only ${trial.hoursRemaining} hours left in your trial! Don't lose access to your trading edge.`,
        action: 'Upgrade Before It\'s Too Late',
        color: 'red'
      },
      urgent: {
        title: '⚡ Trial Ending This Week',
        message: `${trial.daysRemaining} days left in your trial. Upgrade now to keep your competitive advantage!`,
        action: 'Secure Your Access',
        color: 'orange'
      },
      moderate: {
        title: '📈 Trial Week Remaining',
        message: `${trial.daysRemaining} days left to experience premium features. Upgrade to unlock full potential!`,
        action: 'Upgrade to Premium',
        color: 'yellow'
      },
      low: {
        title: '🎯 Enjoying Your Trial?',
        message: `${trial.daysRemaining} days remaining. Upgrade anytime to keep these powerful trading tools!`,
        action: 'Upgrade to Premium',
        color: 'blue'
      }
    }

    return messages[urgency]
  }

  /**
   * End trial (when user upgrades or trial expires)
   */
  endTrial (reason = 'expired') {
    const trial = this.getTrialStatus()
    if (trial) {
      trial.isActive = false
      trial.endReason = reason
      trial.actualEndDate = new Date().toISOString()

      localStorage.setItem(this.TRIAL_STORAGE_KEY, JSON.stringify(trial))

      this.logTrialEvent('trial_ended', {
        userId: trial.userId,
        reason,
        daysUsed: this.TRIAL_DURATION_DAYS - trial.daysRemaining,
        upgradePrompts: trial.upgradePrompts
      })
    }
  }

  /**
   * Clear trial data (for testing or when user upgrades)
   */
  clearTrial () {
    localStorage.removeItem(this.TRIAL_STORAGE_KEY)
  }

  /**
   * Calculate trial end date
   */
  calculateTrialEndDate () {
    const now = new Date()
    const endDate = new Date(now.getTime() + (this.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000))
    return endDate.toISOString()
  }

  /**
   * Log trial events for analytics
   */
  logTrialEvent (eventType, data) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      data
    }

    // In production, send to analytics service
    console.log('Trial Event:', event)

    // Store locally for debugging
    const events = JSON.parse(localStorage.getItem('trial_events') || '[]')
    events.push(event)

    // Keep only last 100 events
    if (events.length > 100) {
      events.splice(0, events.length - 100)
    }

    localStorage.setItem('trial_events', JSON.stringify(events))
  }

  /**
   * Get trial analytics
   */
  getTrialAnalytics () {
    const trial = this.getTrialStatus()
    const events = JSON.parse(localStorage.getItem('trial_events') || '[]')

    return {
      trial,
      events,
      metrics: {
        daysUsed: trial ? this.TRIAL_DURATION_DAYS - trial.daysRemaining : 0,
        upgradePrompts: trial ? trial.upgradePrompts : 0,
        engagementScore: this.calculateEngagementScore(events)
      }
    }
  }

  /**
   * Calculate user engagement score during trial
   */
  calculateEngagementScore (events) {
    const loginEvents = events.filter(e => e.type === 'user_login').length
    const featureUsage = events.filter(e => e.type === 'feature_used').length
    const timeSpent = events.filter(e => e.type === 'session_duration').reduce((total, e) => total + (e.data.duration || 0), 0)

    // Simple engagement scoring
    return Math.min(100, (loginEvents * 5) + (featureUsage * 2) + Math.min(50, timeSpent / 60))
  }

  /**
   * Check if API call is allowed (rate limiting for trial users)
   */
  checkApiCallAllowed () {
    const trial = this.getTrialStatus()
    if (!trial) return { allowed: false, reason: 'No trial found' }

    if (trial.isExpired) return { allowed: false, reason: 'Trial expired' }

    const today = new Date().toDateString()
    const apiCalls = JSON.parse(localStorage.getItem('trial_api_calls') || '{}')
    const todaysCalls = apiCalls[today] || 0

    if (todaysCalls >= trial.restrictions.dailyApiCalls) {
      return {
        allowed: false,
        reason: 'Daily API limit reached',
        limit: trial.restrictions.dailyApiCalls,
        used: todaysCalls
      }
    }

    return {
      allowed: true,
      remaining: trial.restrictions.dailyApiCalls - todaysCalls,
      limit: trial.restrictions.dailyApiCalls
    }
  }

  /**
   * Record API call usage
   */
  recordApiCall () {
    const today = new Date().toDateString()
    const apiCalls = JSON.parse(localStorage.getItem('trial_api_calls') || '{}')
    apiCalls[today] = (apiCalls[today] || 0) + 1

    // Clean up old entries (keep only last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toDateString()
    Object.keys(apiCalls).forEach(date => {
      if (date < sevenDaysAgo) delete apiCalls[date]
    })

    localStorage.setItem('trial_api_calls', JSON.stringify(apiCalls))
  }
}

export default new TrialService()

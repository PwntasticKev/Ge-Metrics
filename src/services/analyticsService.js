/**
 * Comprehensive Analytics Service for GE-Metrics
 * Tracks user engagement, business metrics, performance, and A/B testing
 */

class AnalyticsService {
  constructor() {
    this.initialized = false
    this.config = {}
    this.eventQueue = []
    this.sessionStartTime = null
    this.experimentCache = new Map()
    this.isOptedOut = false
    this.batchTimer = null
    this.trpcMutation = null
    this.throttleMap = new Map()
    
    this.defaultConfig = {
      apiEndpoint: '/api/analytics',
      batchSize: 10,
      flushInterval: 5000,
      maxRetries: 3,
      retryDelay: 1000,
      respectPrivacy: true,
      trackingConsent: true,
      anonymizeData: false,
      useTRPC: false,
      realTimeMode: false,
      throttleLimit: 100, // max events per minute
      enablePersistence: true
    }
  }

  /**
   * Initialize the analytics service
   */
  init(config = {}) {
    this.config = { ...this.defaultConfig, ...config }
    this.initialized = true

    // Generate session ID if not provided
    if (!this.config.sessionId) {
      this.config.sessionId = this.generateSessionId()
    }

    // Check for saved opt-out preference
    if (this.config.enablePersistence) {
      const optOutStatus = localStorage.getItem('analytics_opt_out')
      this.isOptedOut = optOutStatus === 'true'
    }

    // Start batch timer
    this.startBatchTimer()

    // Load persisted events
    this.loadPersistedEvents()

    // Track initialization
    this.track('analytics_init', {
      config: {
        batchSize: this.config.batchSize,
        flushInterval: this.config.flushInterval,
        respectPrivacy: this.config.respectPrivacy
      }
    })

    console.log('📊 Analytics service initialized')
  }

  /**
   * Check if service is initialized
   */
  isInitialized() {
    return this.initialized
  }

  /**
   * Get current session ID
   */
  getSessionId() {
    return this.config.sessionId
  }

  /**
   * Check if tracking is allowed
   */
  canTrack() {
    if (!this.initialized) return false
    if (this.isOptedOut) return false
    if (this.config.respectPrivacy && !this.config.trackingConsent) return false
    return true
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * Core tracking method
   */
  track(event, data = {}, options = {}) {
    if (!this.canTrack()) {
      console.log('🚫 Analytics tracking blocked')
      return
    }

    // Check throttling for rapid events
    if (this.isThrottled(event)) {
      console.log('⏱️ Event throttled:', event)
      return
    }

    const eventData = this.enrichEventData(event, data)

    // Handle high priority events immediately
    if (options.priority === 'high' || this.config.realTimeMode) {
      this.sendImmediately([eventData])
    } else {
      this.addToQueue(eventData)
    }
  }

  /**
   * Enrich event data with context
   */
  enrichEventData(event, data) {
    const enrichedData = {
      event,
      data,
      timestamp: Date.now(),
      sessionId: this.config.sessionId,
      userId: this.config.anonymizeData ? `anon_${this.hashUserId()}` : this.config.userId,
      url: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      viewport: this.getViewportSize(),
      device: this.getDeviceInfo(),
      performance: this.getPerformanceMetrics()
    }

    return enrichedData
  }

  /**
   * Hash user ID for anonymization
   */
  hashUserId() {
    if (!this.config.userId) return 'unknown'
    
    // Simple hash for demo - in production use crypto.subtle
    let hash = 0
    for (let i = 0; i < this.config.userId.length; i++) {
      const char = this.config.userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Get viewport size
   */
  getViewportSize() {
    if (typeof window === 'undefined') return null
    return {
      width: window.innerWidth,
      height: window.innerHeight
    }
  }

  /**
   * Get device information
   */
  getDeviceInfo() {
    if (typeof navigator === 'undefined') return null
    return {
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    if (typeof performance === 'undefined') return null
    
    return {
      navigationTiming: performance.timing ? {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
      } : null,
      memory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null
    }
  }

  /**
   * Check if event should be throttled
   */
  isThrottled(event) {
    const now = Date.now()
    const windowStart = now - 60000 // 1 minute window
    
    if (!this.throttleMap.has(event)) {
      this.throttleMap.set(event, [])
    }
    
    const events = this.throttleMap.get(event)
    
    // Remove old events outside the window
    while (events.length > 0 && events[0] < windowStart) {
      events.shift()
    }
    
    // Check if we've hit the limit
    if (events.length >= this.config.throttleLimit) {
      return true
    }
    
    // Add current event
    events.push(now)
    return false
  }

  /**
   * Add event to queue
   */
  addToQueue(eventData) {
    this.eventQueue.push(eventData)

    // Auto-flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush()
    }
  }

  /**
   * Start batch timer
   */
  startBatchTimer() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
    }

    this.batchTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush()
      }
    }, this.config.flushInterval)
  }

  /**
   * Flush events immediately
   */
  flush() {
    if (this.eventQueue.length === 0) return

    const events = [...this.eventQueue]
    this.eventQueue = []

    this.send(events)
  }

  /**
   * Send events to server
   */
  async send(events) {
    try {
      if (this.config.useTRPC && this.trpcMutation) {
        // Send via tRPC
        this.trpcMutation({ events })
      } else {
        // Send via fetch
        const response = await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ events })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
      }

      console.log('📊 Analytics events sent:', events.length)
    } catch (error) {
      console.warn('📊 Analytics send failed:', error)
      this.handleSendFailure(events, error)
    }
  }

  /**
   * Send events immediately (bypass queue)
   */
  async sendImmediately(events) {
    await this.send(events)
  }

  /**
   * Handle send failures
   */
  handleSendFailure(events, error) {
    if (this.config.enablePersistence) {
      // Persist failed events for retry
      this.persistEvents(events)
    }

    // Schedule retry if configured
    if (this.config.maxRetries > 0) {
      setTimeout(() => {
        this.retryFailedEvents(events, 1)
      }, this.config.retryDelay)
    }
  }

  /**
   * Retry failed events
   */
  async retryFailedEvents(events, attemptNumber) {
    if (attemptNumber > this.config.maxRetries) {
      console.warn('📊 Analytics retry limit reached, dropping events')
      return
    }

    try {
      await this.send(events)
    } catch (error) {
      const delay = this.config.retryDelay * Math.pow(2, attemptNumber - 1)
      setTimeout(() => {
        this.retryFailedEvents(events, attemptNumber + 1)
      }, delay)
    }
  }

  /**
   * Persist events to localStorage
   */
  persistEvents(events) {
    try {
      const existingEvents = JSON.parse(localStorage.getItem('analytics_queue') || '[]')
      const allEvents = [...existingEvents, ...events]
      
      // Limit stored events to prevent storage overflow
      const maxStoredEvents = 1000
      if (allEvents.length > maxStoredEvents) {
        allEvents.splice(0, allEvents.length - maxStoredEvents)
      }

      localStorage.setItem('analytics_queue', JSON.stringify(allEvents))
    } catch (error) {
      console.warn('📊 Failed to persist analytics events:', error)
    }
  }

  /**
   * Load persisted events
   */
  loadPersistedEvents() {
    try {
      const persistedEvents = JSON.parse(localStorage.getItem('analytics_queue') || '[]')
      if (persistedEvents.length > 0) {
        console.log('📊 Loading persisted analytics events:', persistedEvents.length)
        this.send(persistedEvents)
        localStorage.removeItem('analytics_queue')
      }
    } catch (error) {
      console.warn('📊 Failed to load persisted analytics events:', error)
    }
  }

  /**
   * Set tRPC mutation for sending data
   */
  setTRPCMutation(mutation) {
    this.trpcMutation = mutation
  }

  // === USER ENGAGEMENT TRACKING ===

  /**
   * Track page views
   */
  trackPageView(data = {}) {
    const pageData = {
      page: data.page || (typeof window !== 'undefined' ? window.location.pathname : '/unknown'),
      title: data.title || (typeof document !== 'undefined' ? document.title : 'Unknown'),
      url: typeof window !== 'undefined' ? window.location.href : null,
      referrer: typeof document !== 'undefined' ? document.referrer : null,
      timestamp: Date.now(),
      ...data
    }

    this.track('page_view', pageData)
  }

  /**
   * Track user interactions
   */
  trackInteraction(action, data = {}) {
    this.track('interaction', {
      action,
      timestamp: Date.now(),
      ...data
    })
  }

  /**
   * Start session tracking
   */
  startSession() {
    this.sessionStartTime = Date.now()
    this.track('session_start', {
      timestamp: this.sessionStartTime
    })
  }

  /**
   * End session tracking
   */
  endSession() {
    if (!this.sessionStartTime) return

    const duration = Date.now() - this.sessionStartTime
    this.track('session_end', {
      duration,
      timestamp: Date.now()
    }, { priority: 'high' })
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature, data = {}) {
    this.track('feature_usage', {
      feature,
      timestamp: Date.now(),
      ...data
    })
  }

  // === BUSINESS METRICS TRACKING ===

  /**
   * Track conversion events
   */
  trackConversion(type, data = {}) {
    this.track('conversion', {
      type,
      timestamp: Date.now(),
      ...data
    }, { priority: 'high' })
  }

  /**
   * Track revenue events
   */
  trackRevenue(data = {}) {
    this.track('revenue', {
      timestamp: Date.now(),
      ...data
    }, { priority: 'high' })
  }

  /**
   * Track subscription changes
   */
  trackSubscription(action, data = {}) {
    this.track('subscription_change', {
      action,
      timestamp: Date.now(),
      ...data
    }, { priority: 'high' })
  }

  // === PERFORMANCE MONITORING ===

  /**
   * Track API performance
   */
  trackAPIPerformance(endpoint, data = {}) {
    this.track('api_performance', {
      endpoint,
      timestamp: Date.now(),
      ...data
    })
  }

  /**
   * Track errors
   */
  trackError(type, data = {}) {
    this.track('error', {
      type,
      timestamp: Date.now(),
      ...data
    }, { priority: 'high' })
  }

  /**
   * Track system health
   */
  trackSystemHealth(data = {}) {
    this.track('system_health', {
      timestamp: Date.now(),
      ...data
    })
  }

  // === A/B TESTING FRAMEWORK ===

  /**
   * Get experiment variant for user
   */
  getExperimentVariant(experiment, config = {}) {
    // Use cached result if available
    if (this.experimentCache.has(experiment)) {
      return this.experimentCache.get(experiment)
    }

    const { variants = ['control', 'variant'], weights } = config
    
    // Simple hash-based assignment for consistent results
    const hash = this.hashString(`${this.config.userId}_${experiment}`)
    const bucket = hash % 100
    
    let variant = variants[0] // default to first variant
    
    if (weights && weights.length === variants.length) {
      // Use weighted assignment
      let cumulative = 0
      for (let i = 0; i < variants.length; i++) {
        cumulative += weights[i] * 100
        if (bucket < cumulative) {
          variant = variants[i]
          break
        }
      }
    } else {
      // Use equal distribution
      const bucketSize = 100 / variants.length
      const index = Math.floor(bucket / bucketSize)
      variant = variants[Math.min(index, variants.length - 1)]
    }

    // Cache result
    this.experimentCache.set(experiment, variant)
    return variant
  }

  /**
   * Track experiment exposure
   */
  trackExperimentExposure(experiment, variant) {
    this.track('experiment_exposure', {
      experiment,
      variant,
      timestamp: Date.now()
    })
  }

  /**
   * Track experiment conversion
   */
  trackExperimentConversion(experiment, variant, data = {}) {
    this.track('experiment_conversion', {
      experiment,
      variant,
      timestamp: Date.now(),
      ...data
    }, { priority: 'high' })
  }

  /**
   * Hash string for consistent bucketing
   */
  hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  // === PRIVACY & CONSENT ===

  /**
   * Opt user out of tracking
   */
  optOut() {
    this.isOptedOut = true
    if (this.config.enablePersistence) {
      localStorage.setItem('analytics_opt_out', 'true')
    }
    
    // Send opt-out event before stopping tracking
    this.track('user_opt_out', { timestamp: Date.now() }, { priority: 'high' })
    
    console.log('📊 User opted out of analytics')
  }

  /**
   * Opt user back into tracking
   */
  optIn() {
    this.isOptedOut = false
    if (this.config.enablePersistence) {
      localStorage.removeItem('analytics_opt_out')
    }
    
    this.track('user_opt_in', { timestamp: Date.now() }, { priority: 'high' })
    
    console.log('📊 User opted into analytics')
  }

  /**
   * Reset service state (mainly for testing)
   */
  reset() {
    this.initialized = false
    this.eventQueue = []
    this.sessionStartTime = null
    this.experimentCache.clear()
    this.isOptedOut = false
    this.throttleMap.clear()
    
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
      this.batchTimer = null
    }
  }

  /**
   * Cleanup - call when shutting down
   */
  cleanup() {
    // Flush remaining events
    this.flush()
    
    // End session
    this.endSession()
    
    // Clear timer
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
    }
    
    console.log('📊 Analytics service cleaned up')
  }
}

// Export singleton instance
export default new AnalyticsService()
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import analyticsService from './analyticsService.js'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = mockLocalStorage

// Mock fetch
global.fetch = vi.fn()

// Mock performance API
global.performance = {
  now: vi.fn(() => 1000),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  navigation: { type: 1 }
}

// Mock document
global.document = {
  title: 'Test Page',
  referrer: 'https://example.com',
  location: { href: 'https://test.com/page', pathname: '/page', search: '?param=value', hash: '#section' },
  visibilityState: 'visible',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}

// Mock window
global.window = {
  location: { href: 'https://test.com/page', pathname: '/page', search: '?param=value', hash: '#section' },
  navigator: { userAgent: 'Mozilla/5.0 (Test Browser)', language: 'en-US' },
  screen: { width: 1920, height: 1080, colorDepth: 24 },
  innerWidth: 1200,
  innerHeight: 800,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}

global.navigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)',
  language: 'en-US',
  platform: 'Test Platform',
  cookieEnabled: true
}

describe('Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    analyticsService.reset()
    mockLocalStorage.getItem.mockReturnValue(null)

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(analyticsService.isInitialized()).toBe(false)

      analyticsService.init({
        apiEndpoint: '/api/analytics',
        userId: 'test-user-123',
        sessionId: 'session-456'
      })

      expect(analyticsService.isInitialized()).toBe(true)
    })

    it('should generate session ID if not provided', () => {
      analyticsService.init({
        apiEndpoint: '/api/analytics',
        userId: 'test-user-123'
      })

      // Service generates 'session_<timestamp>_<random>' format
      expect(analyticsService.getSessionId()).toBeTruthy()
      expect(analyticsService.getSessionId()).toMatch(/^session_/)
    })

    it('should respect privacy settings', () => {
      analyticsService.init({
        apiEndpoint: '/api/analytics',
        userId: 'test-user-123',
        respectPrivacy: true,
        trackingConsent: false
      })

      expect(analyticsService.canTrack()).toBe(false)
    })
  })

  describe('User Engagement Tracking', () => {
    beforeEach(() => {
      analyticsService.init({
        apiEndpoint: '/api/analytics',
        userId: 'test-user-123'
      })
    })

    it('should track page views', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackPageView({
        page: '/dashboard',
        title: 'Dashboard'
      })

      expect(spy).toHaveBeenCalledWith('page_view', expect.objectContaining({
        page: '/dashboard',
        title: 'Dashboard'
      }))
    })

    it('should track user interactions', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackInteraction('button_click', {
        element: 'save_flip',
        location: 'profile_page'
      })

      expect(spy).toHaveBeenCalledWith('interaction', expect.objectContaining({
        action: 'button_click',
        element: 'save_flip',
        location: 'profile_page'
      }))
    })

    it('should track session duration', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      const startTime = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(startTime)
      analyticsService.startSession()

      // Simulate 5 seconds later
      vi.spyOn(Date, 'now').mockReturnValue(startTime + 5000)
      analyticsService.endSession()

      expect(spy).toHaveBeenCalledWith(
        'session_end',
        expect.objectContaining({ duration: 5000 }),
        { priority: 'high' }
      )
    })

    it('should track feature usage', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackFeatureUsage('flip_calculator', {
        items_count: 5,
        total_value: 1250000
      })

      expect(spy).toHaveBeenCalledWith('feature_usage', expect.objectContaining({
        feature: 'flip_calculator',
        items_count: 5,
        total_value: 1250000
      }))
    })
  })

  describe('Business Metrics Tracking', () => {
    beforeEach(() => {
      analyticsService.init({
        apiEndpoint: '/api/analytics',
        userId: 'test-user-123'
      })
    })

    it('should track conversion events', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackConversion('subscription', {
        plan: 'premium',
        value: 9.99,
        currency: 'USD'
      })

      expect(spy).toHaveBeenCalledWith(
        'conversion',
        expect.objectContaining({
          type: 'subscription',
          plan: 'premium',
          value: 9.99,
          currency: 'USD'
        }),
        { priority: 'high' }
      )
    })

    it('should track revenue events', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackRevenue({
        amount: 29.99,
        currency: 'USD',
        plan: 'pro',
        billing_cycle: 'monthly'
      })

      expect(spy).toHaveBeenCalledWith(
        'revenue',
        expect.objectContaining({
          amount: 29.99,
          currency: 'USD',
          plan: 'pro',
          billing_cycle: 'monthly'
        }),
        { priority: 'high' }
      )
    })

    it('should track subscription analytics', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackSubscription('upgrade', {
        from_plan: 'free',
        to_plan: 'premium',
        mrr_change: 9.99
      })

      expect(spy).toHaveBeenCalledWith(
        'subscription_change',
        expect.objectContaining({
          action: 'upgrade',
          from_plan: 'free',
          to_plan: 'premium',
          mrr_change: 9.99
        }),
        { priority: 'high' }
      )
    })
  })

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      analyticsService.init({
        apiEndpoint: '/api/analytics',
        userId: 'test-user-123'
      })
    })

    it('should track API response times', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackAPIPerformance('/api/flips', {
        method: 'GET',
        duration: 250,
        status: 200,
        size: 1024
      })

      expect(spy).toHaveBeenCalledWith('api_performance', expect.objectContaining({
        endpoint: '/api/flips',
        method: 'GET',
        duration: 250,
        status: 200,
        size: 1024
      }))
    })

    it('should track error rates', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackError('api_error', {
        endpoint: '/api/items',
        error_code: 500,
        error_message: 'Internal server error'
      })

      expect(spy).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          type: 'api_error',
          endpoint: '/api/items',
          error_code: 500,
          error_message: 'Internal server error'
        }),
        { priority: 'high' }
      )
    })

    it('should track system health metrics', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackSystemHealth({
        cpu_usage: 45.2,
        memory_usage: 67.8,
        response_time_avg: 120,
        error_rate: 0.05
      })

      expect(spy).toHaveBeenCalledWith('system_health', expect.objectContaining({
        cpu_usage: 45.2,
        memory_usage: 67.8,
        response_time_avg: 120,
        error_rate: 0.05
      }))
    })
  })

  describe('A/B Testing Framework', () => {
    beforeEach(() => {
      analyticsService.init({
        apiEndpoint: '/api/analytics',
        userId: 'test-user-123'
      })
    })

    it('should assign user to experiment variant', () => {
      const variant = analyticsService.getExperimentVariant('new_dashboard', {
        variants: ['control', 'variant_a', 'variant_b'],
        weights: [0.33, 0.33, 0.34]
      })

      expect(['control', 'variant_a', 'variant_b']).toContain(variant)
    })

    it('should track experiment exposure', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackExperimentExposure('new_dashboard', 'variant_a')

      expect(spy).toHaveBeenCalledWith('experiment_exposure', expect.objectContaining({
        experiment: 'new_dashboard',
        variant: 'variant_a'
      }))
    })

    it('should track experiment conversion', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackExperimentConversion('new_dashboard', 'variant_a', {
        goal: 'signup',
        value: 1
      })

      expect(spy).toHaveBeenCalledWith(
        'experiment_conversion',
        expect.objectContaining({
          experiment: 'new_dashboard',
          variant: 'variant_a',
          goal: 'signup',
          value: 1
        }),
        { priority: 'high' }
      )
    })
  })

  describe('Data Privacy & Consent', () => {
    it('should respect tracking consent', () => {
      analyticsService.init({
        apiEndpoint: '/api/analytics',
        userId: 'test-user-123',
        trackingConsent: false
      })

      const spy = vi.spyOn(analyticsService, 'send')

      analyticsService.trackPageView({ page: '/test' })

      expect(spy).not.toHaveBeenCalled()
    })

    it('should anonymize user data when required', () => {
      analyticsService.init({
        apiEndpoint: '/api/analytics',
        userId: 'test-user-123',
        anonymizeData: true
      })

      // enrichEventData should produce anon_ prefix in userId field
      const enriched = analyticsService.enrichEventData('test', { data: 1 })
      expect(enriched.userId).toMatch(/^anon_/)
    })

    it('should allow user to opt out', () => {
      analyticsService.init({
        apiEndpoint: '/api/analytics',
        userId: 'test-user-123'
      })

      analyticsService.optOut()

      const spy = vi.spyOn(analyticsService, 'send')
      analyticsService.trackPageView({ page: '/test' })

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('Data Batching & Persistence', () => {
    beforeEach(() => {
      analyticsService.init({
        apiEndpoint: '/api/analytics',
        userId: 'test-user-123',
        batchSize: 3,
        flushInterval: 60000 // long interval so timer doesn't interfere
      })
    })

    it('should batch events before sending', () => {
      const spy = vi.spyOn(analyticsService, 'send')

      // init() already adds analytics_init event to queue
      // Queue currently has 1 event. Add 2 more to hit batchSize=3
      spy.mockClear()

      analyticsService.track('event2', { data: 2 })
      // Queue now has 2 events. Should not have flushed yet
      expect(spy).not.toHaveBeenCalled()

      analyticsService.track('event3', { data: 3 })
      // Queue now has 3 events (analytics_init + event2 + event3) => flush
      expect(spy).toHaveBeenCalledOnce()
    })

    it('should persist events to localStorage on send failure', async () => {
      fetch.mockRejectedValue(new Error('Network error'))

      // Force a flush that will fail
      analyticsService.flush()

      // send() is async — wait for it to complete
      await vi.waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'analytics_queue',
          expect.any(String)
        )
      })
    })

    it('should retry failed events', async () => {
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true })

      // Force a flush that will fail then retry
      analyticsService.track('retry_event', { data: 'test' })
      analyticsService.track('retry_event2', { data: 'test2' })
      // This 3rd event triggers flush (batchSize=3 including init event)

      // Wait for retry mechanism (retryDelay=1000 default)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // First call fails, retry succeeds
      expect(fetch.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Integration with tRPC', () => {
    beforeEach(() => {
      analyticsService.init({
        apiEndpoint: '/api/analytics',
        userId: 'test-user-123',
        useTRPC: true
      })
    })

    it('should send data via tRPC when enabled', () => {
      const mockTRPCMutation = vi.fn()
      analyticsService.setTRPCMutation(mockTRPCMutation)

      analyticsService.track('trpc_event', { data: 'test' })
      analyticsService.flush()

      expect(mockTRPCMutation).toHaveBeenCalledWith({
        events: expect.arrayContaining([
          expect.objectContaining({
            event: 'trpc_event',
            data: { data: 'test' }
          })
        ])
      })
    })
  })

  describe('Real-time Analytics', () => {
    beforeEach(() => {
      analyticsService.init({
        apiEndpoint: '/api/analytics',
        userId: 'test-user-123',
        realTimeMode: true
      })
    })

    it('should send high-priority events immediately', () => {
      const spy = vi.spyOn(analyticsService, 'send')

      analyticsService.track('conversion', { plan: 'premium' }, { priority: 'high' })

      expect(spy).toHaveBeenCalled()
    })

    it('should throttle rapid events', () => {
      const spy = vi.spyOn(analyticsService, 'send')

      for (let i = 0; i < 105; i++) {
        analyticsService.track('rapid_event', { index: i })
      }

      // Default throttleLimit is 100 per minute per event type
      expect(spy.mock.calls.length).toBeLessThan(105)
    })
  })
})

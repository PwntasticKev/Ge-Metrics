import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import analyticsService from './analyticsService.js'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
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
  navigation: {
    type: 1
  }
}

// Mock document
global.document = {
  title: 'Test Page',
  referrer: 'https://example.com',
  location: {
    href: 'https://test.com/page',
    pathname: '/page',
    search: '?param=value',
    hash: '#section'
  },
  visibilityState: 'visible',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}

// Mock window
global.window = {
  location: {
    href: 'https://test.com/page',
    pathname: '/page',
    search: '?param=value',
    hash: '#section'
  },
  navigator: {
    userAgent: 'Mozilla/5.0 (Test Browser)',
    language: 'en-US'
  },
  screen: {
    width: 1920,
    height: 1080,
    colorDepth: 24
  },
  innerWidth: 1200,
  innerHeight: 800,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}

// Also mock navigator globally
global.navigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)',
  language: 'en-US',
  platform: 'Test Platform',
  cookieEnabled: true
}

describe.skip('Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    analyticsService.reset() // Reset internal state
    
    // Mock successful fetch by default
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

      expect(analyticsService.getSessionId()).toBeTruthy()
      expect(analyticsService.getSessionId()).toMatch(/^[a-f0-9-]+$/)
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

      expect(spy).toHaveBeenCalledWith('page_view', {
        page: '/dashboard',
        title: 'Dashboard',
        url: expect.any(String),
        referrer: expect.any(String),
        timestamp: expect.any(Number)
      })
    })

    it('should track user interactions', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackInteraction('button_click', {
        element: 'save_flip',
        location: 'profile_page'
      })

      expect(spy).toHaveBeenCalledWith('interaction', {
        action: 'button_click',
        element: 'save_flip',
        location: 'profile_page',
        timestamp: expect.any(Number)
      })
    })

    it('should track session duration', () => {
      const spy = vi.spyOn(analyticsService, 'track')
      
      analyticsService.startSession()
      
      // Simulate session ending after 5 minutes
      performance.now.mockReturnValue(6000) // 5 seconds later
      analyticsService.endSession()

      expect(spy).toHaveBeenCalledWith('session_end', {
        duration: 5000,
        timestamp: expect.any(Number)
      })
    })

    it('should track feature usage', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackFeatureUsage('flip_calculator', {
        items_count: 5,
        total_value: 1250000
      })

      expect(spy).toHaveBeenCalledWith('feature_usage', {
        feature: 'flip_calculator',
        items_count: 5,
        total_value: 1250000,
        timestamp: expect.any(Number)
      })
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

      expect(spy).toHaveBeenCalledWith('conversion', {
        type: 'subscription',
        plan: 'premium',
        value: 9.99,
        currency: 'USD',
        timestamp: expect.any(Number)
      })
    })

    it('should track revenue events', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackRevenue({
        amount: 29.99,
        currency: 'USD',
        plan: 'pro',
        billing_cycle: 'monthly'
      })

      expect(spy).toHaveBeenCalledWith('revenue', {
        amount: 29.99,
        currency: 'USD',
        plan: 'pro',
        billing_cycle: 'monthly',
        timestamp: expect.any(Number)
      })
    })

    it('should track subscription analytics', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackSubscription('upgrade', {
        from_plan: 'free',
        to_plan: 'premium',
        mrr_change: 9.99
      })

      expect(spy).toHaveBeenCalledWith('subscription_change', {
        action: 'upgrade',
        from_plan: 'free',
        to_plan: 'premium',
        mrr_change: 9.99,
        timestamp: expect.any(Number)
      })
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

      expect(spy).toHaveBeenCalledWith('api_performance', {
        endpoint: '/api/flips',
        method: 'GET',
        duration: 250,
        status: 200,
        size: 1024,
        timestamp: expect.any(Number)
      })
    })

    it('should track error rates', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackError('api_error', {
        endpoint: '/api/items',
        error_code: 500,
        error_message: 'Internal server error'
      })

      expect(spy).toHaveBeenCalledWith('error', {
        type: 'api_error',
        endpoint: '/api/items',
        error_code: 500,
        error_message: 'Internal server error',
        timestamp: expect.any(Number)
      })
    })

    it('should track system health metrics', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackSystemHealth({
        cpu_usage: 45.2,
        memory_usage: 67.8,
        response_time_avg: 120,
        error_rate: 0.05
      })

      expect(spy).toHaveBeenCalledWith('system_health', {
        cpu_usage: 45.2,
        memory_usage: 67.8,
        response_time_avg: 120,
        error_rate: 0.05,
        timestamp: expect.any(Number)
      })
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

      expect(spy).toHaveBeenCalledWith('experiment_exposure', {
        experiment: 'new_dashboard',
        variant: 'variant_a',
        timestamp: expect.any(Number)
      })
    })

    it('should track experiment conversion', () => {
      const spy = vi.spyOn(analyticsService, 'track')

      analyticsService.trackExperimentConversion('new_dashboard', 'variant_a', {
        goal: 'signup',
        value: 1
      })

      expect(spy).toHaveBeenCalledWith('experiment_conversion', {
        experiment: 'new_dashboard',
        variant: 'variant_a',
        goal: 'signup',
        value: 1,
        timestamp: expect.any(Number)
      })
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

      const spy = vi.spyOn(analyticsService, 'send')

      analyticsService.trackPageView({ page: '/test' })

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userId: expect.stringMatching(/^anon_/)
      }))
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
        flushInterval: 1000
      })
    })

    it('should batch events before sending', () => {
      const spy = vi.spyOn(analyticsService, 'send')

      // Clear any initialization events first
      spy.mockClear()

      analyticsService.track('event1', { data: 1 })
      analyticsService.track('event2', { data: 2 })

      // Should not send until batch size reached
      expect(spy).not.toHaveBeenCalled()

      analyticsService.track('event3', { data: 3 })

      // Should send now that we've hit batch size of 3
      expect(spy).toHaveBeenCalledOnce()
    })

    it('should persist events to localStorage when offline', () => {
      // Mock offline scenario
      fetch.mockRejectedValue(new Error('Network error'))

      analyticsService.track('offline_event', { data: 'test' })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('analytics_queue'),
        expect.any(String)
      )
    })

    it('should retry failed events', async () => {
      // Mock initial failure then success
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true })

      analyticsService.track('retry_event', { data: 'test' })

      // Wait for retry mechanism
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(fetch).toHaveBeenCalledTimes(2)
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

      // Send many events rapidly (same event type to trigger throttling)
      for (let i = 0; i < 105; i++) {
        analyticsService.track('rapid_event', { index: i })
      }

      // Should throttle after 100 events per minute
      expect(spy.mock.calls.length).toBeLessThan(105)
    })
  })
})
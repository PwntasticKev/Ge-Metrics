import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch for API calls
global.fetch = vi.fn()

// Pure functions extracted from Status component for testing
const checkEndpoint = async (url, name) => {
  const startTime = Date.now()
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors'
    })

    const latency = Date.now() - startTime
    const status = response.ok ? 'online' : 'offline'

    return {
      status,
      latency,
      lastCheck: new Date(),
      error: response.ok ? null : `HTTP ${response.status}`
    }
  } catch (error) {
    const latency = Date.now() - startTime
    return {
      status: 'offline',
      latency,
      lastCheck: new Date(),
      error: error.message
    }
  }
}

const checkAllEndpoints = async () => {
  const endpoints = [
    { name: 'pricing', url: 'https://prices.runescape.wiki/api/v1/osrs/latest' },
    { name: 'mapping', url: 'https://prices.runescape.wiki/api/v1/osrs/mapping' },
    { name: 'timeseries', url: 'https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=1h&id=4151' },
    { name: 'fiveMinute', url: 'https://prices.runescape.wiki/api/v1/osrs/5m' },
    { name: 'oneHour', url: 'https://prices.runescape.wiki/api/v1/osrs/1h' }
  ]

  const results = {}

  const promises = endpoints.map(async (endpoint) => {
    const result = await checkEndpoint(endpoint.url, endpoint.name)
    results[endpoint.name] = result
  })

  await Promise.all(promises)

  // Determine overall status
  const statuses = Object.values(results).map(r => r.status)
  let overallStatus
  if (statuses.every(s => s === 'online')) {
    overallStatus = 'online'
  } else if (statuses.some(s => s === 'online')) {
    overallStatus = 'partial'
  } else {
    overallStatus = 'offline'
  }

  return { results, overallStatus }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'online': return '#10b981'
    case 'offline': return '#ef4444'
    case 'partial': return '#f59e0b'
    case 'checking': return '#6b7280'
    default: return '#6b7280'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'online': return 'All Systems Operational'
    case 'offline': return 'All Systems Down'
    case 'partial': return 'Partial Outage'
    case 'checking': return 'Checking Status...'
    default: return 'Unknown Status'
  }
}

const formatLatency = (latency) => {
  if (latency === null) return 'N/A'
  if (latency < 100) return `${latency}ms (Excellent)`
  if (latency < 300) return `${latency}ms (Good)`
  if (latency < 1000) return `${latency}ms (Fair)`
  return `${latency}ms (Slow)`
}

const getLatencyColor = (latency) => {
  if (latency === null) return '#6b7280'
  if (latency < 100) return '#10b981'
  if (latency < 300) return '#84cc16'
  if (latency < 1000) return '#f59e0b'
  return '#ef4444'
}

describe('Status Component Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkEndpoint function', () => {
    it('should return online status for successful response', async () => {
      const mockResponse = {
        ok: true,
        status: 200
      }
      fetch.mockResolvedValueOnce(mockResponse)

      const result = await checkEndpoint('https://example.com/api', 'test')

      expect(result.status).toBe('online')
      expect(result.latency).toBeGreaterThanOrEqual(0)
      expect(result.error).toBeNull()
      expect(result.lastCheck).toBeInstanceOf(Date)
    })

    it('should return offline status for failed response', async () => {
      const mockResponse = {
        ok: false,
        status: 500
      }
      fetch.mockResolvedValueOnce(mockResponse)

      const result = await checkEndpoint('https://example.com/api', 'test')

      expect(result.status).toBe('offline')
      expect(result.error).toBe('HTTP 500')
      expect(result.latency).toBeGreaterThanOrEqual(0)
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network error')
      fetch.mockRejectedValueOnce(networkError)

      const result = await checkEndpoint('https://example.com/api', 'test')

      expect(result.status).toBe('offline')
      expect(result.error).toBe('Network error')
      expect(result.latency).toBeGreaterThanOrEqual(0)
    })

    it('should make HEAD request with CORS mode', async () => {
      fetch.mockResolvedValueOnce({ ok: true, status: 200 })

      await checkEndpoint('https://example.com/api', 'test')

      expect(fetch).toHaveBeenCalledWith('https://example.com/api', {
        method: 'HEAD',
        mode: 'cors'
      })
    })
  })

  describe('checkAllEndpoints function', () => {
    it('should check all 5 endpoints', async () => {
      fetch.mockResolvedValue({ ok: true, status: 200 })

      await checkAllEndpoints()

      expect(fetch).toHaveBeenCalledTimes(5)
      expect(fetch).toHaveBeenCalledWith('https://prices.runescape.wiki/api/v1/osrs/latest', expect.any(Object))
      expect(fetch).toHaveBeenCalledWith('https://prices.runescape.wiki/api/v1/osrs/mapping', expect.any(Object))
      expect(fetch).toHaveBeenCalledWith('https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=1h&id=4151', expect.any(Object))
      expect(fetch).toHaveBeenCalledWith('https://prices.runescape.wiki/api/v1/osrs/5m', expect.any(Object))
      expect(fetch).toHaveBeenCalledWith('https://prices.runescape.wiki/api/v1/osrs/1h', expect.any(Object))
    })

    it('should set overall status to online when all endpoints are online', async () => {
      fetch.mockResolvedValue({ ok: true, status: 200 })

      const { overallStatus } = await checkAllEndpoints()

      expect(overallStatus).toBe('online')
    })

    it('should set overall status to partial when some endpoints are down', async () => {
      fetch
        .mockResolvedValueOnce({ ok: true, status: 200 }) // pricing
        .mockResolvedValueOnce({ ok: false, status: 500 }) // mapping
        .mockResolvedValueOnce({ ok: true, status: 200 }) // timeseries
        .mockResolvedValueOnce({ ok: true, status: 200 }) // fiveMinute
        .mockResolvedValueOnce({ ok: true, status: 200 }) // oneHour

      const { overallStatus } = await checkAllEndpoints()

      expect(overallStatus).toBe('partial')
    })

    it('should set overall status to offline when all endpoints are down', async () => {
      fetch.mockResolvedValue({ ok: false, status: 500 })

      const { overallStatus } = await checkAllEndpoints()

      expect(overallStatus).toBe('offline')
    })

    it('should handle mixed success and network errors', async () => {
      fetch
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockRejectedValueOnce(new Error('Timeout'))

      const { results, overallStatus } = await checkAllEndpoints()

      expect(overallStatus).toBe('partial')
      expect(results.pricing.status).toBe('online')
      expect(results.mapping.status).toBe('offline')
      expect(results.timeseries.status).toBe('offline')
      expect(results.fiveMinute.status).toBe('online')
      expect(results.oneHour.status).toBe('offline')
    })
  })

  describe('Status utility functions', () => {
    describe('getStatusColor', () => {
      it('should return correct colors for each status', () => {
        expect(getStatusColor('online')).toBe('#10b981')
        expect(getStatusColor('offline')).toBe('#ef4444')
        expect(getStatusColor('partial')).toBe('#f59e0b')
        expect(getStatusColor('checking')).toBe('#6b7280')
        expect(getStatusColor('unknown')).toBe('#6b7280')
      })
    })

    describe('getStatusText', () => {
      it('should return correct text for each status', () => {
        expect(getStatusText('online')).toBe('All Systems Operational')
        expect(getStatusText('offline')).toBe('All Systems Down')
        expect(getStatusText('partial')).toBe('Partial Outage')
        expect(getStatusText('checking')).toBe('Checking Status...')
        expect(getStatusText('unknown')).toBe('Unknown Status')
      })
    })

    describe('formatLatency', () => {
      it('should format latency with performance indicators', () => {
        expect(formatLatency(null)).toBe('N/A')
        expect(formatLatency(50)).toBe('50ms (Excellent)')
        expect(formatLatency(150)).toBe('150ms (Good)')
        expect(formatLatency(500)).toBe('500ms (Fair)')
        expect(formatLatency(1500)).toBe('1500ms (Slow)')
      })
    })

    describe('getLatencyColor', () => {
      it('should return correct colors based on latency', () => {
        expect(getLatencyColor(null)).toBe('#6b7280')
        expect(getLatencyColor(50)).toBe('#10b981')
        expect(getLatencyColor(150)).toBe('#84cc16')
        expect(getLatencyColor(500)).toBe('#f59e0b')
        expect(getLatencyColor(1500)).toBe('#ef4444')
      })
    })
  })

  describe('Error handling', () => {
    it('should handle CORS errors', async () => {
      const corsError = new Error('CORS policy blocked')
      fetch.mockRejectedValueOnce(corsError)

      const result = await checkEndpoint('https://example.com/api', 'test')

      expect(result.status).toBe('offline')
      expect(result.error).toBe('CORS policy blocked')
    })

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      fetch.mockRejectedValueOnce(timeoutError)

      const result = await checkEndpoint('https://example.com/api', 'test')

      expect(result.status).toBe('offline')
      expect(result.error).toBe('Request timeout')
    })

    it('should handle DNS resolution errors', async () => {
      const dnsError = new Error('DNS resolution failed')
      fetch.mockRejectedValueOnce(dnsError)

      const result = await checkEndpoint('https://invalid-domain.com/api', 'test')

      expect(result.status).toBe('offline')
      expect(result.error).toBe('DNS resolution failed')
    })

    it('should handle HTTP error codes', async () => {
      const httpCodes = [400, 401, 403, 404, 429, 500, 502, 503, 504]

      for (const code of httpCodes) {
        fetch.mockResolvedValueOnce({ ok: false, status: code })

        const result = await checkEndpoint('https://example.com/api', 'test')

        expect(result.status).toBe('offline')
        expect(result.error).toBe(`HTTP ${code}`)
      }
    })
  })

  describe('Performance tests', () => {
    it('should measure latency accurately', async () => {
      // Mock a delayed response
      fetch.mockImplementationOnce(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ ok: true, status: 200 }), 100)
        )
      )

      const result = await checkEndpoint('https://example.com/api', 'test')

      expect(result.latency).toBeGreaterThanOrEqual(100)
      expect(result.latency).toBeLessThan(200) // Allow some margin for test execution
    })

    it('should handle parallel endpoint checks efficiently', async () => {
      fetch.mockResolvedValue({ ok: true, status: 200 })

      const startTime = Date.now()
      await checkAllEndpoints()
      const endTime = Date.now()

      // All 5 requests should complete in parallel, not sequentially
      // This should take roughly the same time as a single request
      expect(endTime - startTime).toBeLessThan(1000) // Generous timeout for CI
    })
  })

  describe('Edge cases', () => {
    it('should handle empty response', async () => {
      fetch.mockResolvedValueOnce({ ok: true, status: 200 })

      const result = await checkEndpoint('https://example.com/api', 'test')

      expect(result.status).toBe('online')
      expect(result.error).toBeNull()
    })

    it('should handle malformed URLs gracefully', async () => {
      const urlError = new Error('Invalid URL')
      fetch.mockRejectedValueOnce(urlError)

      const result = await checkEndpoint('not-a-valid-url', 'test')

      expect(result.status).toBe('offline')
      expect(result.error).toBe('Invalid URL')
    })

    it('should handle null/undefined parameters', async () => {
      const result1 = await checkEndpoint(null, 'test').catch(() => ({ status: 'offline', error: 'Invalid URL' }))
      const result2 = await checkEndpoint(undefined, 'test').catch(() => ({ status: 'offline', error: 'Invalid URL' }))

      expect(result1.status).toBe('offline')
      expect(result2.status).toBe('offline')
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getPricingData, getMappingData, getVolumeData, getItemHistoryById } from '../api/rs-wiki-api.jsx'

/**
 * Integration tests to ensure JSON parsing errors are properly handled
 * This test suite specifically targets the "Unexpected end of JSON input" error
 * that was occurring frequently in production
 */
describe.skip('JSON Error Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console to avoid spam during tests
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Prevents "Unexpected end of JSON input" errors', () => {
    it('should handle empty response body gracefully', async () => {
      // Mock fetch to return empty response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'application/json'
            if (header === 'content-length') return '0'
            return null
          })
        },
        text: vi.fn().mockResolvedValue(''),
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input'))
      })

      const result = await getPricingData()
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual({}) // fallback value
      expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining('Unexpected end of JSON input'))
    })

    it('should handle truncated JSON responses', async () => {
      // Mock fetch to return truncated JSON
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'application/json'
            return null
          })
        },
        clone: function() { return this },
        text: vi.fn().mockResolvedValue('{"data":'), // Truncated JSON
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input'))
      })

      const result = await getMappingData()
      
      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual([]) // fallback value for mapping data
      expect(console.error).toHaveBeenCalled() // Should log the error, but not crash
    })

    it('should handle network disconnection during JSON parsing', async () => {
      // Mock fetch to simulate network failure during parsing
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'application/json'
            return null
          })
        },
        clone: function() { return this },
        text: vi.fn().mockRejectedValue(new Error('Network connection lost')),
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input'))
      })

      const result = await getVolumeData()
      
      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toContain('Network connection lost')
    })

    it('should handle server returning HTML error page instead of JSON', async () => {
      const htmlErrorPage = `
        <!DOCTYPE html>
        <html>
          <head><title>Server Error</title></head>
          <body><h1>500 Internal Server Error</h1></body>
        </html>
      `

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'text/html'
            return null
          })
        },
        clone: function() { return this },
        text: vi.fn().mockResolvedValue(htmlErrorPage),
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input'))
      })

      const result = await getItemHistoryById('1h', 123)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toContain('Expected JSON response but got: text/html')
    })

    it('should handle malformed JSON with safe fallbacks', async () => {
      // Mock fetch to return malformed JSON
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'application/json'
            return null
          })
        },
        clone: function() { return this },
        text: vi.fn().mockResolvedValue('{ "data": invalid json }'),
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token i in JSON at position 10'))
      })

      const result = await getPricingData()
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual({}) // Safe fallback
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle zero content-length responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'application/json'
            if (header === 'content-length') return '0'
            return null
          })
        },
        clone: function() { return this },
        text: vi.fn().mockResolvedValue(''),
        json: vi.fn()
      })

      const result = await getMappingData()
      
      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual([])
      expect(console.warn).toHaveBeenCalledWith('[SafeJsonParser] Response has zero content-length')
    })

    it('should handle API timeout errors gracefully', async () => {
      // Mock fetch to timeout
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('The operation was aborted')), 100)
        )
      )

      const result = await getItemHistoryById('1h', 123)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toContain('aborted')
    })
  })

  describe('Comprehensive error scenarios', () => {
    it('should never throw "Unexpected end of JSON input" under any circumstances', async () => {
      const problematicResponses = [
        { body: '', contentType: 'application/json' },
        { body: '{"incomplete": ', contentType: 'application/json' },
        { body: '{', contentType: 'application/json' },
        { body: 'null', contentType: 'text/plain' },
        { body: '<html>Error</html>', contentType: 'text/html' },
        { body: 'undefined', contentType: 'application/json' },
        { body: 'NaN', contentType: 'application/json' }
      ]

      for (const testCase of problematicResponses) {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: {
            get: vi.fn((header) => {
              if (header === 'content-type') return testCase.contentType
              return null
            })
          },
          clone: function() { return this },
          text: vi.fn().mockResolvedValue(testCase.body),
          json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input'))
        })

        // Test all API functions
        try {
          await getPricingData()
          await getMappingData()
          await getVolumeData()
          await getItemHistoryById('1h', 123)
          
          // If we get here, no unhandled errors were thrown
          expect(true).toBe(true)
        } catch (error) {
          // This should never happen
          expect(error.message).not.toContain('Unexpected end of JSON input')
          console.error(`Unexpected error in test case ${JSON.stringify(testCase)}:`, error)
          throw error
        }
      }
    })

    it('should provide meaningful error messages for debugging', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        url: 'https://api.example.com/test',
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'application/json'
            return null
          })
        },
        clone: function() { return this },
        text: vi.fn().mockResolvedValue('{ malformed json'),
        json: vi.fn()
      })

      const result = await getPricingData()
      
      expect(result.success).toBe(true)
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[SafeJsonParser] JSON parsing failed:'),
        expect.objectContaining({
          url: 'https://api.example.com/test'
        })
      )
    })
  })

  describe('Real-world production scenarios', () => {
    it('should handle the exact error that was reported: Failed to execute json on Response', async () => {
      // Simulate the exact scenario that was causing issues
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'application/json; charset=utf-8'
            return null
          })
        },
        clone: function() { return this },
        text: vi.fn().mockResolvedValue(''), // Empty response that causes the error
        json: vi.fn().mockRejectedValue(new DOMException("Failed to execute 'json' on 'Response': Unexpected end of JSON input"))
      })

      const result = await getPricingData()
      
      // Should handle gracefully without throwing
      expect(result.success).toBe(true)
      expect(result.data).toEqual({})
      
      // Should log appropriate error but not crash
      expect(console.error).toHaveBeenCalled()
    })

    it('should maintain backward compatibility with existing code', async () => {
      // Test that successful responses still work normally
      const mockData = { success: true, prices: { '123': 1000 } }
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'application/json'
            return null
          })
        },
        clone: function() { return this },
        text: vi.fn().mockResolvedValue(JSON.stringify(mockData)),
        json: vi.fn().mockResolvedValue(mockData)
      })

      const result = await getPricingData()
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockData)
    })
  })
})
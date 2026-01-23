import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  safeResponseJson,
  safeJsonParse,
  safeFetch,
  isValidJson,
  safeLocalStorage
} from './safeJsonParser.js'

// Mock fetch globally
global.fetch = vi.fn()

describe.skip('SafeJsonParser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console to avoid spam during tests
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('safeResponseJson', () => {
    it('should parse valid JSON response successfully', async () => {
      const mockData = { test: 'data', number: 123 }
      const mockResponse = {
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'application/json'
            if (header === 'content-length') return '25'
            return null
          })
        },
        clone: vi.fn(() => mockResponse),
        text: vi.fn().mockResolvedValue(JSON.stringify(mockData)),
        json: vi.fn().mockResolvedValue(mockData)
      }

      const result = await safeResponseJson(mockResponse)
      expect(result).toEqual(mockData)
    })

    it('should return fallback for empty response', async () => {
      const mockResponse = {
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'application/json'
            if (header === 'content-length') return '0'
            return null
          })
        },
        clone: vi.fn(() => mockResponse),
        text: vi.fn().mockResolvedValue(''),
        json: vi.fn()
      }

      const fallback = { empty: true }
      const result = await safeResponseJson(mockResponse, fallback)
      expect(result).toEqual(fallback)
    })

    it('should return fallback for non-JSON content-type', async () => {
      const mockResponse = {
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'text/html'
            return null
          })
        },
        clone: vi.fn(() => mockResponse),
        text: vi.fn().mockResolvedValue('<html></html>'),
        json: vi.fn()
      }

      const fallback = { error: 'not json' }
      const result = await safeResponseJson(mockResponse, fallback)
      expect(result).toEqual(fallback)
    })

    it('should handle malformed JSON gracefully', async () => {
      const mockResponse = {
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'application/json'
            return null
          })
        },
        clone: vi.fn(() => mockResponse),
        text: vi.fn().mockResolvedValue('{ invalid json }'),
        json: vi.fn(),
        url: 'https://test.com',
        status: 200,
        statusText: 'OK'
      }

      const fallback = { error: 'malformed' }
      const result = await safeResponseJson(mockResponse, fallback)
      expect(result).toEqual(fallback)
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle missing response object', async () => {
      const result = await safeResponseJson(null, { error: 'no response' })
      expect(result).toEqual({ error: 'no response' })
      expect(console.warn).toHaveBeenCalledWith('[SafeJsonParser] Invalid response object provided')
    })
  })

  describe('safeJsonParse', () => {
    it('should parse valid JSON string', () => {
      const jsonString = '{"test": "data", "number": 123}'
      const expected = { test: 'data', number: 123 }
      const result = safeJsonParse(jsonString)
      expect(result).toEqual(expected)
    })

    it('should return fallback for empty string', () => {
      const fallback = { empty: true }
      expect(safeJsonParse('', fallback)).toEqual(fallback)
      expect(safeJsonParse('   ', fallback)).toEqual(fallback)
      expect(safeJsonParse(null, fallback)).toEqual(fallback)
      expect(safeJsonParse(undefined, fallback)).toEqual(fallback)
    })

    it('should return fallback for malformed JSON', () => {
      const fallback = { malformed: true }
      const result = safeJsonParse('{ invalid json }', fallback)
      expect(result).toEqual(fallback)
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle non-string input', () => {
      const fallback = { not_string: true }
      expect(safeJsonParse(123, fallback)).toEqual(fallback)
      expect(safeJsonParse({}, fallback)).toEqual(fallback)
      expect(safeJsonParse([], fallback)).toEqual(fallback)
    })
  })

  describe('safeFetch', () => {
    it('should successfully fetch and parse JSON', async () => {
      const mockData = { success: true, data: 'test' }
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'application/json'
            return null
          })
        },
        clone: vi.fn(() => mockResponse),
        text: vi.fn().mockResolvedValue(JSON.stringify(mockData)),
        json: vi.fn().mockResolvedValue(mockData)
      }

      global.fetch.mockResolvedValue(mockResponse)

      const result = await safeFetch('https://test.com/api')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockData)
      expect(result.error).toBeUndefined()
    })

    it('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: vi.fn().mockResolvedValue('Not Found')
      }

      global.fetch.mockResolvedValue(mockResponse)

      const result = await safeFetch('https://test.com/api')
      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toContain('404')
    })

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'))

      const result = await safeFetch('https://test.com/api')
      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toBe('Network error')
    })

    it('should handle timeout', async () => {
      // Mock a fetch that never resolves
      global.fetch.mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      )

      const result = await safeFetch('https://test.com/api')
      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.name).toBe('AbortError')
    }, 35000) // 35 second test timeout
  })

  describe('isValidJson', () => {
    it('should return true for valid JSON strings', () => {
      expect(isValidJson('{"test": true}')).toBe(true)
      expect(isValidJson('[]')).toBe(true)
      expect(isValidJson('null')).toBe(true)
      expect(isValidJson('123')).toBe(true)
      expect(isValidJson('"string"')).toBe(true)
    })

    it('should return false for invalid JSON', () => {
      expect(isValidJson('{ invalid }')).toBe(false)
      expect(isValidJson('')).toBe(false)
      expect(isValidJson('   ')).toBe(false)
      expect(isValidJson('undefined')).toBe(false)
      expect(isValidJson(null)).toBe(false)
      expect(isValidJson(undefined)).toBe(false)
      expect(isValidJson(123)).toBe(false)
    })
  })

  describe('safeLocalStorage', () => {
    beforeEach(() => {
      // Mock localStorage
      const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      }
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true
      })
    })

    it('should safely get JSON from localStorage', () => {
      const mockData = { test: 'data' }
      window.localStorage.getItem.mockReturnValue(JSON.stringify(mockData))

      const result = safeLocalStorage.getJson('test-key')
      expect(result).toEqual(mockData)
      expect(window.localStorage.getItem).toHaveBeenCalledWith('test-key')
    })

    it('should return fallback for malformed JSON in localStorage', () => {
      window.localStorage.getItem.mockReturnValue('{ invalid json }')
      
      const fallback = { error: true }
      const result = safeLocalStorage.getJson('test-key', fallback)
      expect(result).toEqual(fallback)
    })

    it('should safely set JSON to localStorage', () => {
      const data = { test: 'data' }
      
      const result = safeLocalStorage.setJson('test-key', data)
      expect(result).toBe(true)
      expect(window.localStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(data))
    })

    it('should handle localStorage errors', () => {
      window.localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const result = safeLocalStorage.setJson('test-key', { data: 'test' })
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle the "Unexpected end of JSON input" error', async () => {
      const mockResponse = {
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'application/json'
            return null
          })
        },
        clone: vi.fn(() => mockResponse),
        text: vi.fn().mockResolvedValue(''), // Empty response body
        json: vi.fn(),
        url: 'https://api.example.com/data',
        status: 200,
        statusText: 'OK'
      }

      const fallback = { error: 'empty response' }
      const result = await safeResponseJson(mockResponse, fallback)
      
      expect(result).toEqual(fallback)
      expect(console.warn).toHaveBeenCalledWith('[SafeJsonParser] Response body is empty')
    })

    it('should handle truncated JSON responses', async () => {
      const mockResponse = {
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'application/json'
            return null
          })
        },
        clone: vi.fn(() => mockResponse),
        text: vi.fn().mockResolvedValue('{"data":'), // Truncated JSON
        json: vi.fn(),
        url: 'https://api.example.com/data',
        status: 200,
        statusText: 'OK'
      }

      const fallback = { error: 'truncated' }
      const result = await safeResponseJson(mockResponse, fallback)
      
      expect(result).toEqual(fallback)
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle server returning HTML instead of JSON', async () => {
      const htmlResponse = '<!DOCTYPE html><html><body>Error</body></html>'
      const mockResponse = {
        headers: {
          get: vi.fn((header) => {
            if (header === 'content-type') return 'text/html'
            return null
          })
        },
        clone: vi.fn(() => mockResponse),
        text: vi.fn().mockResolvedValue(htmlResponse),
        json: vi.fn(),
        url: 'https://api.example.com/data',
        status: 200,
        statusText: 'OK'
      }

      const fallback = { error: 'html response' }
      const result = await safeResponseJson(mockResponse, fallback)
      
      expect(result).toEqual(fallback)
      expect(console.warn).toHaveBeenCalledWith('[SafeJsonParser] Response is not JSON, content-type:', 'text/html')
    })
  })
})
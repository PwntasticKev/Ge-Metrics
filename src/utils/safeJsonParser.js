/**
 * Safe JSON parser utility that prevents "Unexpected end of JSON input" errors
 * This utility provides robust error handling for all JSON parsing operations
 */

/**
 * Safely parse a Response object's JSON content
 * @param {Response} response - Fetch Response object
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {Promise<any>} Parsed JSON or fallback value
 */
export async function safeResponseJson(response, fallback = null) {
  try {
    // Check if response is valid
    if (!response || typeof response.json !== 'function') {
      console.warn('[SafeJsonParser] Invalid response object provided')
      return fallback
    }

    // Check content-type header
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('[SafeJsonParser] Response is not JSON, content-type:', contentType)
      const text = await response.text().catch(() => 'Unable to read response text')
      throw new Error(`Expected JSON response but got: ${contentType}. Response: ${text.slice(0, 200)}`)
    }

    // Check content-length to avoid empty responses
    const contentLength = response.headers.get('content-length')
    if (contentLength === '0') {
      console.warn('[SafeJsonParser] Response has zero content-length')
      return fallback
    }

    // Clone response to allow multiple reads if needed
    const clonedResponse = response.clone()
    
    // First, try to read as text to check if it's empty
    const textContent = await response.text()
    if (!textContent || textContent.trim() === '') {
      console.warn('[SafeJsonParser] Response body is empty')
      return fallback
    }

    // Now parse the JSON from the cloned response
    const jsonData = JSON.parse(textContent)
    return jsonData

  } catch (error) {
    console.error('[SafeJsonParser] JSON parsing failed:', {
      error: error.message,
      url: response?.url,
      status: response?.status,
      statusText: response?.statusText
    })
    
    // Log additional debug info
    try {
      const textContent = await response.text().catch(() => 'Unable to read response')
      console.error('[SafeJsonParser] Response text:', textContent.slice(0, 200))
    } catch (e) {
      console.error('[SafeJsonParser] Could not read response text:', e.message)
    }

    return fallback
  }
}

/**
 * Safely parse a JSON string
 * @param {string} jsonString - JSON string to parse
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any} Parsed object or fallback value
 */
export function safeJsonParse(jsonString, fallback = null) {
  try {
    // Check if input is valid
    if (typeof jsonString !== 'string') {
      console.warn('[SafeJsonParser] Input is not a string:', typeof jsonString)
      return fallback
    }

    // Check if string is empty or just whitespace
    if (!jsonString || jsonString.trim() === '') {
      console.warn('[SafeJsonParser] Input string is empty or whitespace')
      return fallback
    }

    // Attempt to parse
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('[SafeJsonParser] String parsing failed:', {
      error: error.message,
      input: jsonString?.slice(0, 100) + (jsonString?.length > 100 ? '...' : '')
    })
    return fallback
  }
}

/**
 * Enhanced fetch wrapper with automatic JSON parsing and error handling
 * @param {string} url - URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {any} fallback - Fallback value for failed JSON parsing
 * @returns {Promise<{success: boolean, data: any, error?: Error}>}
 */
export async function safeFetch(url, options = {}, fallback = null) {
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const fetchOptions = {
      ...options,
      signal: controller.signal
    }

    const response = await fetch(url, fetchOptions)
    clearTimeout(timeoutId)

    // Check if request was successful
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    // Parse JSON safely
    const data = await safeResponseJson(response, fallback)
    
    return {
      success: true,
      data,
      response
    }

  } catch (error) {
    console.error('[SafeFetch] Request failed:', {
      url,
      error: error.message,
      name: error.name
    })

    return {
      success: false,
      data: fallback,
      error
    }
  }
}

/**
 * Validates if a string contains valid JSON
 * @param {string} str - String to validate
 * @returns {boolean} True if valid JSON, false otherwise
 */
export function isValidJson(str) {
  if (typeof str !== 'string' || str.trim() === '') {
    return false
  }

  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

/**
 * Safe localStorage JSON operations
 */
export const safeLocalStorage = {
  /**
   * Safely get and parse JSON from localStorage
   * @param {string} key - localStorage key
   * @param {any} fallback - Fallback value
   * @returns {any} Parsed value or fallback
   */
  getJson(key, fallback = null) {
    try {
      const item = localStorage.getItem(key)
      return safeJsonParse(item, fallback)
    } catch (error) {
      console.error('[SafeLocalStorage] Failed to get item:', key, error)
      return fallback
    }
  },

  /**
   * Safely stringify and set JSON to localStorage
   * @param {string} key - localStorage key
   * @param {any} value - Value to store
   * @returns {boolean} True if successful, false otherwise
   */
  setJson(key, value) {
    try {
      const jsonString = JSON.stringify(value)
      localStorage.setItem(key, jsonString)
      return true
    } catch (error) {
      console.error('[SafeLocalStorage] Failed to set item:', key, error)
      return false
    }
  }
}

export default {
  safeResponseJson,
  safeJsonParse,
  safeFetch,
  isValidJson,
  safeLocalStorage
}
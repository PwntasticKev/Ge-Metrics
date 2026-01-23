/**
 * API Rotation Service
 * Provides rotating User-Agents and API keys to prevent rate limiting
 */

interface ApiIdentity {
  userAgent: string
  contact: string
  apiKey?: string
}

export class ApiRotationService {
  private static instance: ApiRotationService
  private currentIndex = 0
  private lastRotation = 0
  private readonly ROTATION_INTERVAL = 30000 // 30 seconds between rotations

  // Multiple identities to rotate between
  private readonly API_IDENTITIES: ApiIdentity[] = [
    {
      userAgent: 'GE-Metrics/1.0 (https://ge-metrics.com)',
      contact: 'admin@ge-metrics.com',
      apiKey: process.env.OSRS_API_KEY_1
    },
    {
      userAgent: 'GE-Metrics-Analytics/1.0 (contact@ge-metrics.com)', 
      contact: 'analytics@ge-metrics.com',
      apiKey: process.env.OSRS_API_KEY_2
    },
    {
      userAgent: 'GE-Metrics-Cache/1.0 (cache@ge-metrics.com)',
      contact: 'cache@ge-metrics.com', 
      apiKey: process.env.OSRS_API_KEY_3
    },
    {
      userAgent: 'GE-Metrics-Monitor/1.0 (monitor@ge-metrics.com)',
      contact: 'monitor@ge-metrics.com',
      apiKey: process.env.OSRS_API_KEY_4
    }
  ]

  private constructor() {}

  public static getInstance(): ApiRotationService {
    if (!ApiRotationService.instance) {
      ApiRotationService.instance = new ApiRotationService()
    }
    return ApiRotationService.instance
  }

  /**
   * Get current API identity (User-Agent + API key)
   * Automatically rotates based on time interval
   */
  public getCurrentIdentity(): ApiIdentity {
    const now = Date.now()
    
    // Rotate every 30 seconds or if forced
    if (now - this.lastRotation >= this.ROTATION_INTERVAL) {
      this.rotateIdentity()
      this.lastRotation = now
    }
    
    return this.API_IDENTITIES[this.currentIndex]
  }

  /**
   * Force rotation to next identity
   * Useful when hitting rate limits
   */
  public rotateIdentity(): void {
    this.currentIndex = (this.currentIndex + 1) % this.API_IDENTITIES.length
    console.log(`[ApiRotation] Switched to identity ${this.currentIndex + 1}/${this.API_IDENTITIES.length}`)
  }

  /**
   * Get random identity (for distributed requests)
   */
  public getRandomIdentity(): ApiIdentity {
    const randomIndex = Math.floor(Math.random() * this.API_IDENTITIES.length)
    return this.API_IDENTITIES[randomIndex]
  }

  /**
   * Get identity by index (for specific use cases)
   */
  public getIdentityByIndex(index: number): ApiIdentity {
    if (index < 0 || index >= this.API_IDENTITIES.length) {
      throw new Error(`Invalid identity index: ${index}`)
    }
    return this.API_IDENTITIES[index]
  }

  /**
   * Get HTTP headers for current identity
   */
  public getCurrentHeaders(): Record<string, string> {
    const identity = this.getCurrentIdentity()
    const headers: Record<string, string> = {
      'User-Agent': identity.userAgent,
      'Contact': identity.contact
    }

    // Add API key if available
    if (identity.apiKey) {
      headers['Authorization'] = `Bearer ${identity.apiKey}`
      // or headers['X-API-Key'] = identity.apiKey (depending on API)
    }

    return headers
  }

  /**
   * Get headers for random identity
   */
  public getRandomHeaders(): Record<string, string> {
    const identity = this.getRandomIdentity()
    const headers: Record<string, string> = {
      'User-Agent': identity.userAgent,
      'Contact': identity.contact
    }

    if (identity.apiKey) {
      headers['Authorization'] = `Bearer ${identity.apiKey}`
    }

    return headers
  }

  /**
   * Handle API rate limit error
   * Rotates identity and provides backoff delay
   */
  public handleRateLimit(): { shouldRetry: boolean; delayMs: number } {
    console.warn('[ApiRotation] Rate limit detected, rotating identity...')
    this.rotateIdentity()
    
    // Exponential backoff: 1s, 2s, 4s, 8s
    const attempt = this.currentIndex + 1
    const delayMs = Math.min(1000 * Math.pow(2, attempt), 30000) // Max 30s
    
    return {
      shouldRetry: true,
      delayMs
    }
  }

  /**
   * Get statistics about API rotation
   */
  public getStats(): {
    totalIdentities: number
    currentIdentity: number
    lastRotation: Date
    nextRotation: Date
    rotationInterval: number
  } {
    return {
      totalIdentities: this.API_IDENTITIES.length,
      currentIdentity: this.currentIndex + 1,
      lastRotation: new Date(this.lastRotation),
      nextRotation: new Date(this.lastRotation + this.ROTATION_INTERVAL),
      rotationInterval: this.ROTATION_INTERVAL
    }
  }

  /**
   * Test all identities for validity
   */
  public async testAllIdentities(): Promise<{
    identity: ApiIdentity
    index: number
    valid: boolean
    error?: string
  }[]> {
    const results = []
    
    for (let i = 0; i < this.API_IDENTITIES.length; i++) {
      const identity = this.API_IDENTITIES[i]
      
      try {
        // Test with a simple OSRS Wiki API call
        const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping', {
          method: 'HEAD', // Just check if accessible
          headers: {
            'User-Agent': identity.userAgent,
            'Contact': identity.contact
          }
        })
        
        results.push({
          identity,
          index: i,
          valid: response.ok,
          error: response.ok ? undefined : `HTTP ${response.status}`
        })
      } catch (error) {
        results.push({
          identity,
          index: i,
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return results
  }
}

// Export singleton instance
export const apiRotation = ApiRotationService.getInstance()
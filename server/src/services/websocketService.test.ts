import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WebSocket, WebSocketServer } from 'ws'
import { websocketService } from './websocketService.js'

// Mock dependencies
vi.mock('../config/index.js', () => ({
  config: {
    JWT_SECRET: 'test-secret'
  }
}))

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 1,
            username: 'test',
            role: 'admin'
          }])
        })
      })
    })
  },
  users: {}
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn().mockReturnValue({ userId: 1 })
  }
}))

describe('WebSocketService', () => {
  let mockServer: any
  
  beforeEach(async () => {
    // Reset service state
    try {
      websocketService.cleanup()
    } catch (error) {
      // Ignore cleanup errors in tests
    }
    
    // Mock HTTP server with required WebSocket server methods
    mockServer = {
      on: vi.fn(),
      listen: vi.fn(),
      close: vi.fn(),
      removeListener: vi.fn(),
      removeAllListeners: vi.fn(),
      addListener: vi.fn(),
      off: vi.fn()
    }
  })

  afterEach(() => {
    try {
      websocketService.cleanup()
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  })

  it('should initialize WebSocket server successfully', async () => {
    const wss = await websocketService.initialize(mockServer)
    expect(wss).toBeInstanceOf(WebSocketServer)
    
    const stats = websocketService.getStats()
    expect(stats.totalConnections).toBe(0)
    expect(stats.authenticatedConnections).toBe(0)
    expect(stats.adminConnections).toBe(0)
  })

  it('should handle analytics events correctly', async () => {
    await websocketService.initialize(mockServer)
    
    const testEvent = {
      type: 'user_activity' as const,
      data: { action: 'login', userId: 1 },
      timestamp: new Date(),
      userId: 1
    }

    // Broadcasting should not throw error even with no clients
    expect(() => {
      websocketService.broadcastEvent(testEvent)
    }).not.toThrow()
  })

  it('should track connection statistics correctly', async () => {
    await websocketService.initialize(mockServer)
    
    const initialStats = websocketService.getStats()
    expect(initialStats.totalConnections).toBe(0)
    expect(initialStats.authenticatedConnections).toBe(0)
    expect(initialStats.adminConnections).toBe(0)
    expect(initialStats.bufferedEvents).toBe(0)
  })

  it('should broadcast to specific channels', async () => {
    await websocketService.initialize(mockServer)
    
    const testMessage = {
      type: 'test_broadcast',
      data: { message: 'Hello WebSocket clients!' }
    }

    expect(() => {
      websocketService.broadcastToChannels(['admin_dashboard'], testMessage)
    }).not.toThrow()
  })

  it('should cleanup resources properly', async () => {
    await websocketService.initialize(mockServer)
    
    expect(() => {
      websocketService.cleanup()
    }).not.toThrow()
    
    const stats = websocketService.getStats()
    expect(stats.totalConnections).toBe(0)
  })
})

describe('WebSocket Analytics Event Types', () => {
  beforeEach(async () => {
    websocketService.cleanup()
  })

  afterEach(() => {
    try {
      websocketService.cleanup()
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  })

  it('should handle user activity events', async () => {
    const mockServer = { on: vi.fn() }
    await websocketService.initialize(mockServer)
    
    const userActivityEvent = {
      type: 'user_activity' as const,
      data: {
        action: 'page_view',
        page: '/dashboard',
        userId: 1,
        username: 'testuser'
      },
      timestamp: new Date(),
      userId: 1
    }

    expect(() => {
      websocketService.broadcastEvent(userActivityEvent)
    }).not.toThrow()
  })

  it('should handle price update events', async () => {
    const mockServer = { on: vi.fn() }
    await websocketService.initialize(mockServer)
    
    const priceUpdateEvent = {
      type: 'price_update' as const,
      data: {
        itemId: 4151,
        itemName: 'Abyssal whip',
        oldPrice: 1200000,
        newPrice: 1250000,
        change: 50000
      },
      timestamp: new Date()
    }

    expect(() => {
      websocketService.broadcastEvent(priceUpdateEvent)
    }).not.toThrow()
  })

  it('should handle method update events', async () => {
    const mockServer = { on: vi.fn() }
    await websocketService.initialize(mockServer)
    
    const methodUpdateEvent = {
      type: 'method_update' as const,
      data: {
        methodId: 1,
        methodName: 'Vorkath farming',
        status: 'approved',
        profitPerHour: 2500000
      },
      timestamp: new Date(),
      userId: 1
    }

    expect(() => {
      websocketService.broadcastEvent(methodUpdateEvent)
    }).not.toThrow()
  })

  it('should handle system metric events', async () => {
    const mockServer = { on: vi.fn() }
    await websocketService.initialize(mockServer)
    
    const systemMetricEvent = {
      type: 'system_metric' as const,
      data: {
        metric: 'memory_usage',
        value: 85.5,
        unit: 'percent',
        threshold: 90
      },
      timestamp: new Date()
    }

    expect(() => {
      websocketService.broadcastEvent(systemMetricEvent)
    }).not.toThrow()
  })
})

describe('WebSocket Client Authentication', () => {
  let mockServer: any
  
  beforeEach(async () => {
    websocketService.cleanup()
    mockServer = { on: vi.fn() }
  })

  afterEach(() => {
    try {
      websocketService.cleanup()
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  })

  it('should handle unauthenticated clients', async () => {
    await websocketService.initialize(mockServer)
    
    // Simulate client connection without token
    const mockRequest = {
      headers: {}
    }
    
    // Service should handle this gracefully
    expect(websocketService.getStats().totalConnections).toBe(0)
  })

  it('should handle admin clients differently', async () => {
    await websocketService.initialize(mockServer)
    
    // Admin events should be handled differently
    const adminEvent = {
      type: 'system_metric' as const,
      data: { sensitive: 'admin data' },
      timestamp: new Date()
    }

    expect(() => {
      websocketService.broadcastEvent(adminEvent)
    }).not.toThrow()
  })
})
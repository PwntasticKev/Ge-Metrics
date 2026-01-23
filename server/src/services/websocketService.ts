import { WebSocket, WebSocketServer } from 'ws'
import { createServer } from 'http'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { db, users } from '../db/index.js'
import { eq } from 'drizzle-orm'

// Types for WebSocket analytics events
export interface AnalyticsEvent {
  type: 'user_activity' | 'price_update' | 'method_update' | 'system_metric'
  data: any
  timestamp: Date
  userId?: number
}

export interface ConnectedClient {
  id: string
  socket: WebSocket
  userId?: number
  subscriptions: Set<string>
  lastPing: Date
  isAdmin: boolean
}

class WebSocketAnalyticsService {
  private wss: WebSocketServer | null = null
  private clients = new Map<string, ConnectedClient>()
  private pingInterval: NodeJS.Timeout | null = null
  private metricsBuffer: AnalyticsEvent[] = []
  private readonly BUFFER_SIZE = 100
  private readonly PING_INTERVAL = 30000 // 30 seconds

  /**
   * Initialize WebSocket server
   */
  async initialize(httpServer?: any): Promise<WebSocketServer> {
    try {
      // Create WebSocket server
      this.wss = new WebSocketServer({
        server: httpServer,
        path: '/analytics-ws',
        clientTracking: true
      })

      this.wss.on('connection', this.handleConnection.bind(this))
      this.wss.on('error', this.handleError.bind(this))

      // Start ping interval to maintain connections
      this.startPingInterval()

      console.log('🌐 WebSocket Analytics Service initialized')
      return this.wss
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket service:', error)
      throw error
    }
  }

  /**
   * Handle new WebSocket connections
   */
  private async handleConnection(socket: WebSocket, request: any) {
    const clientId = this.generateClientId()
    const client: ConnectedClient = {
      id: clientId,
      socket,
      subscriptions: new Set(),
      lastPing: new Date(),
      isAdmin: false
    }

    // Authenticate client
    try {
      const token = this.extractTokenFromRequest(request)
      if (token) {
        const user = await this.authenticateToken(token)
        if (user) {
          client.userId = user.id
          client.isAdmin = user.role === 'admin'
        }
      }
    } catch (error) {
      console.warn('WebSocket auth failed:', error)
    }

    this.clients.set(clientId, client)
    
    // Set up message handlers
    socket.on('message', (data) => this.handleMessage(clientId, data))
    socket.on('close', () => this.handleDisconnection(clientId))
    socket.on('error', (error) => this.handleSocketError(clientId, error))
    socket.on('pong', () => this.handlePong(clientId))

    // Send welcome message with recent metrics
    this.sendToClient(clientId, {
      type: 'connection_established',
      data: {
        clientId,
        authenticated: !!client.userId,
        isAdmin: client.isAdmin,
        recentMetrics: this.getRecentMetrics()
      }
    })

    console.log(`📡 WebSocket client connected: ${clientId} (user: ${client.userId || 'anonymous'})`)
  }

  /**
   * Handle incoming messages from clients
   */
  private async handleMessage(clientId: string, data: any) {
    try {
      const client = this.clients.get(clientId)
      if (!client) return

      const message = JSON.parse(data.toString())
      
      switch (message.type) {
        case 'subscribe':
          this.handleSubscription(clientId, message.data)
          break
        case 'unsubscribe':
          this.handleUnsubscription(clientId, message.data)
          break
        case 'ping':
          this.handleClientPing(clientId)
          break
        case 'get_metrics':
          this.handleMetricsRequest(clientId, message.data)
          break
        default:
          console.warn(`Unknown WebSocket message type: ${message.type}`)
      }
    } catch (error) {
      console.error(`Error handling WebSocket message from ${clientId}:`, error)
    }
  }

  /**
   * Handle client subscriptions to specific channels
   */
  private handleSubscription(clientId: string, subscriptionData: any) {
    const client = this.clients.get(clientId)
    if (!client) return

    const { channel, filters } = subscriptionData
    
    // Validate subscription permissions
    if (channel.startsWith('admin_') && !client.isAdmin) {
      this.sendToClient(clientId, {
        type: 'subscription_error',
        data: { error: 'Insufficient permissions for admin channels' }
      })
      return
    }

    client.subscriptions.add(channel)
    
    this.sendToClient(clientId, {
      type: 'subscription_confirmed',
      data: { channel, filters }
    })

    console.log(`📋 Client ${clientId} subscribed to channel: ${channel}`)
  }

  /**
   * Handle client unsubscriptions
   */
  private handleUnsubscription(clientId: string, unsubscriptionData: any) {
    const client = this.clients.get(clientId)
    if (!client) return

    const { channel } = unsubscriptionData
    client.subscriptions.delete(channel)

    this.sendToClient(clientId, {
      type: 'unsubscription_confirmed',
      data: { channel }
    })
  }

  /**
   * Handle client ping messages
   */
  private handleClientPing(clientId: string) {
    const client = this.clients.get(clientId)
    if (!client) return

    client.lastPing = new Date()
    this.sendToClient(clientId, { type: 'pong' })
  }

  /**
   * Handle client pong responses
   */
  private handlePong(clientId: string) {
    const client = this.clients.get(clientId)
    if (!client) return

    client.lastPing = new Date()
  }

  /**
   * Handle metrics requests
   */
  private async handleMetricsRequest(clientId: string, requestData: any) {
    const client = this.clients.get(clientId)
    if (!client) return

    const { type, timeframe } = requestData
    let metrics: any[] = []

    try {
      switch (type) {
        case 'user_activity':
          metrics = await this.getUserActivityMetrics(timeframe)
          break
        case 'price_updates':
          metrics = await this.getPriceUpdateMetrics(timeframe)
          break
        case 'system_performance':
          metrics = client.isAdmin ? await this.getSystemMetrics(timeframe) : []
          break
        default:
          metrics = this.getRecentMetrics()
      }

      this.sendToClient(clientId, {
        type: 'metrics_response',
        data: { type, metrics, timestamp: new Date() }
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
      this.sendToClient(clientId, {
        type: 'metrics_error',
        data: { error: 'Failed to fetch metrics' }
      })
    }
  }

  /**
   * Broadcast analytics event to subscribed clients
   */
  public broadcastEvent(event: AnalyticsEvent) {
    // Add to buffer
    this.metricsBuffer.push(event)
    if (this.metricsBuffer.length > this.BUFFER_SIZE) {
      this.metricsBuffer.shift() // Remove oldest
    }

    // Determine relevant channels
    const channels = this.getChannelsForEvent(event)
    
    // Broadcast to subscribed clients
    for (const [clientId, client] of this.clients) {
      const relevantChannels = channels.filter(channel => 
        client.subscriptions.has(channel)
      )

      if (relevantChannels.length > 0) {
        this.sendToClient(clientId, {
          type: 'analytics_event',
          data: {
            event,
            channels: relevantChannels
          }
        })
      }
    }

    console.log(`📊 Broadcasted ${event.type} to ${this.getSubscriberCount(channels)} clients`)
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: any) {
    const client = this.clients.get(clientId)
    if (!client || client.socket.readyState !== WebSocket.OPEN) return

    try {
      client.socket.send(JSON.stringify(message))
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error)
      this.handleDisconnection(clientId)
    }
  }

  /**
   * Broadcast message to all clients in specific channels
   */
  public broadcastToChannels(channels: string[], message: any) {
    for (const [clientId, client] of this.clients) {
      const hasSubscription = channels.some(channel => 
        client.subscriptions.has(channel)
      )

      if (hasSubscription) {
        this.sendToClient(clientId, message)
      }
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId)
    if (!client) return

    this.clients.delete(clientId)
    console.log(`📡 WebSocket client disconnected: ${clientId}`)
  }

  /**
   * Handle socket errors
   */
  private handleSocketError(clientId: string, error: Error) {
    console.error(`WebSocket error for client ${clientId}:`, error)
    this.handleDisconnection(clientId)
  }

  /**
   * Handle WebSocket server errors
   */
  private handleError(error: Error) {
    console.error('❌ WebSocket server error:', error)
  }

  /**
   * Start ping interval to maintain connections
   */
  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      const now = new Date()
      
      for (const [clientId, client] of this.clients) {
        const timeSinceLastPing = now.getTime() - client.lastPing.getTime()
        
        if (timeSinceLastPing > this.PING_INTERVAL * 2) {
          // Client hasn't responded to ping in too long
          console.log(`⏰ Client ${clientId} ping timeout, disconnecting`)
          this.handleDisconnection(clientId)
        } else if (timeSinceLastPing > this.PING_INTERVAL) {
          // Send ping
          try {
            client.socket.ping()
          } catch (error) {
            console.error(`Error pinging client ${clientId}:`, error)
            this.handleDisconnection(clientId)
          }
        }
      }
    }, this.PING_INTERVAL)
  }

  /**
   * Utility functions
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private extractTokenFromRequest(request: any): string | null {
    const cookies = this.parseCookies(request.headers.cookie || '')
    return cookies.token || null
  }

  private parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {}
    cookieString.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=')
      if (name && value) {
        cookies[name] = decodeURIComponent(value)
      }
    })
    return cookies
  }

  private async authenticateToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any
      const user = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1)
      return user[0] || null
    } catch (error) {
      return null
    }
  }

  private getChannelsForEvent(event: AnalyticsEvent): string[] {
    const channels: string[] = []
    
    switch (event.type) {
      case 'user_activity':
        channels.push('user_activity', 'admin_dashboard')
        break
      case 'price_update':
        channels.push('price_updates', 'market_data')
        break
      case 'method_update':
        channels.push('method_updates', 'admin_dashboard')
        break
      case 'system_metric':
        channels.push('admin_dashboard', 'system_metrics')
        break
    }

    return channels
  }

  private getSubscriberCount(channels: string[]): number {
    let count = 0
    for (const client of this.clients.values()) {
      if (channels.some(channel => client.subscriptions.has(channel))) {
        count++
      }
    }
    return count
  }

  private getRecentMetrics(): AnalyticsEvent[] {
    return this.metricsBuffer.slice(-10) // Return last 10 events
  }

  private async getUserActivityMetrics(timeframe: string): Promise<any[]> {
    // Implement user activity metrics fetching
    // This would query the database for user activity in the specified timeframe
    return []
  }

  private async getPriceUpdateMetrics(timeframe: string): Promise<any[]> {
    // Implement price update metrics fetching
    return []
  }

  private async getSystemMetrics(timeframe: string): Promise<any[]> {
    // Implement system performance metrics
    return []
  }

  /**
   * Get connection statistics
   */
  public getStats() {
    const totalConnections = this.clients.size
    const authenticatedConnections = Array.from(this.clients.values())
      .filter(client => !!client.userId).length
    const adminConnections = Array.from(this.clients.values())
      .filter(client => client.isAdmin).length

    return {
      totalConnections,
      authenticatedConnections,
      adminConnections,
      bufferedEvents: this.metricsBuffer.length
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    for (const client of this.clients.values()) {
      try {
        client.socket.close()
      } catch (error) {
        console.error('Error closing client socket:', error)
      }
    }

    this.clients.clear()
    
    if (this.wss) {
      this.wss.close()
      this.wss = null
    }

    console.log('🧹 WebSocket Analytics Service cleaned up')
  }
}

// Export singleton instance
export const websocketService = new WebSocketAnalyticsService()
export default websocketService
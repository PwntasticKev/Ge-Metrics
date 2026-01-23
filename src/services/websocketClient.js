import { trpc } from '../utils/trpc'

class WebSocketClient {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.subscriptions = new Set()
    this.eventHandlers = new Map()
    this.heartbeatInterval = null
    this.usePollingFallback = false
    this.pollingInterval = null
    this.lastPollingUpdate = new Date()
  }

  /**
   * Initialize WebSocket connection with fallback to polling
   */
  async connect() {
    // Check if WebSocket is supported
    if (typeof WebSocket === 'undefined') {
      console.log('📊 WebSocket not supported, using polling fallback')
      this.enablePollingFallback()
      return
    }

    try {
      const wsUrl = this.getWebSocketUrl()
      console.log('🔗 Connecting to WebSocket:', wsUrl)
      
      this.socket = new WebSocket(wsUrl)
      this.setupSocketHandlers()
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error)
      this.enablePollingFallback()
    }
  }

  /**
   * Get WebSocket URL based on environment
   */
  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = process.env.NODE_ENV === 'development' 
      ? 'localhost:3001' 
      : window.location.host
    return `${protocol}//${host}/analytics-ws`
  }

  /**
   * Set up WebSocket event handlers
   */
  setupSocketHandlers() {
    if (!this.socket) return

    this.socket.onopen = () => {
      console.log('✅ WebSocket connected')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.startHeartbeat()
      
      // Resubscribe to channels
      this.subscriptions.forEach(channel => {
        this.subscribe(channel)
      })
      
      this.emit('connected', { timestamp: new Date() })
    }

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.socket.onclose = () => {
      console.log('🔌 WebSocket disconnected')
      this.isConnected = false
      this.stopHeartbeat()
      this.emit('disconnected', { timestamp: new Date() })
      
      // Attempt reconnection
      this.attemptReconnect()
    }

    this.socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error)
      this.emit('error', { error, timestamp: new Date() })
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(message) {
    const { type, data } = message

    switch (type) {
      case 'connection_established':
        console.log('🎉 WebSocket connection established:', data)
        break

      case 'analytics_event':
        this.emit('analytics_event', data)
        break

      case 'subscription_confirmed':
        console.log(`✅ Subscribed to channel: ${data.channel}`)
        break

      case 'subscription_error':
        console.error(`❌ Subscription error: ${data.error}`)
        break

      case 'metrics_response':
        this.emit('metrics', data)
        break

      case 'metrics_error':
        console.error('❌ Metrics error:', data.error)
        break

      case 'pong':
        // Heartbeat response
        break

      default:
        console.warn(`Unknown message type: ${type}`)
    }
  }

  /**
   * Subscribe to analytics channel
   */
  subscribe(channel, filters = {}) {
    this.subscriptions.add(channel)

    if (this.isConnected && this.socket) {
      this.send({
        type: 'subscribe',
        data: { channel, filters }
      })
    }
  }

  /**
   * Unsubscribe from analytics channel
   */
  unsubscribe(channel) {
    this.subscriptions.delete(channel)

    if (this.isConnected && this.socket) {
      this.send({
        type: 'unsubscribe',
        data: { channel }
      })
    }
  }

  /**
   * Request specific metrics
   */
  requestMetrics(type, timeframe = '24h') {
    if (this.isConnected && this.socket) {
      this.send({
        type: 'get_metrics',
        data: { type, timeframe }
      })
    } else if (this.usePollingFallback) {
      // Use TRPC for polling fallback
      this.fetchMetricsPolling(type, timeframe)
    }
  }

  /**
   * Send message to WebSocket
   */
  send(message) {
    if (this.socket && this.isConnected) {
      try {
        this.socket.send(JSON.stringify(message))
      } catch (error) {
        console.error('Error sending WebSocket message:', error)
      }
    }
  }

  /**
   * Start heartbeat to maintain connection
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.send({ type: 'ping' })
      }
    }, 30000) // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('🔄 Max reconnection attempts reached, switching to polling')
      this.enablePollingFallback()
      return
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * Enable polling fallback when WebSocket fails
   */
  enablePollingFallback() {
    this.usePollingFallback = true
    this.startPolling()
    
    console.log('📊 Analytics switched to polling mode')
    this.emit('fallback_enabled', { mode: 'polling', timestamp: new Date() })
  }

  /**
   * Start polling for analytics data
   */
  startPolling() {
    if (this.pollingInterval) return

    this.pollingInterval = setInterval(() => {
      this.pollForUpdates()
    }, 30000) // Poll every 30 seconds

    // Initial poll
    this.pollForUpdates()
  }

  /**
   * Poll for analytics updates using TRPC
   */
  async pollForUpdates() {
    try {
      const channels = Array.from(this.subscriptions)
      if (channels.length === 0) return

      const result = await trpc.analytics.getPollingData.query({
        channels,
        lastUpdate: this.lastPollingUpdate
      })

      if (result.events && result.events.length > 0) {
        result.events.forEach(event => {
          this.emit('analytics_event', { event })
        })
      }

      this.lastPollingUpdate = new Date(result.timestamp)
      
    } catch (error) {
      console.error('❌ Polling failed:', error)
      this.emit('polling_error', { error, timestamp: new Date() })
    }
  }

  /**
   * Fetch metrics using polling (TRPC fallback)
   */
  async fetchMetricsPolling(type, timeframe) {
    try {
      let result
      
      switch (type) {
        case 'user_activity':
          result = await trpc.analytics.getUserActivityMetrics.query({ timeframe })
          break
        case 'price_updates':
          result = await trpc.analytics.getPriceMetrics.query({ timeframe })
          break
        case 'system_performance':
          result = await trpc.analytics.getSystemMetrics.query({ timeframe })
          break
        default:
          console.warn(`Unknown metrics type: ${type}`)
          return
      }

      this.emit('metrics', { type, metrics: result.data, timestamp: new Date() })
      
    } catch (error) {
      console.error(`❌ Failed to fetch ${type} metrics:`, error)
      this.emit('metrics_error', { error: error.message, type })
    }
  }

  /**
   * Record user activity event
   */
  async recordActivity(action, page, metadata = {}) {
    try {
      await trpc.analytics.recordActivity.mutate({
        action,
        page,
        metadata
      })
    } catch (error) {
      console.error('❌ Failed to record activity:', error)
    }
  }

  /**
   * Add event listener
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event).add(handler)
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * Emit event to registered handlers
   */
  emit(event, data) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this.stopHeartbeat()
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    this.isConnected = false
    this.usePollingFallback = false
    this.subscriptions.clear()
    this.eventHandlers.clear()
    
    console.log('🧹 WebSocket client cleaned up')
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      usePollingFallback: this.usePollingFallback,
      subscriptions: Array.from(this.subscriptions),
      reconnectAttempts: this.reconnectAttempts
    }
  }
}

// Export singleton instance
export const websocketClient = new WebSocketClient()
export default websocketClient
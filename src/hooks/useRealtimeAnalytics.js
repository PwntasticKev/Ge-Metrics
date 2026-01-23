import { useState, useEffect, useCallback, useRef } from 'react'
import { websocketClient } from '../services/websocketClient'

/**
 * Hook for real-time analytics data with WebSocket and polling fallback
 */
export function useRealtimeAnalytics() {
  const [isConnected, setIsConnected] = useState(false)
  const [usePollingFallback, setUsePollingFallback] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [metrics, setMetrics] = useState({})
  const [events, setEvents] = useState([])
  const isInitialized = useRef(false)

  /**
   * Initialize WebSocket connection
   */
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    // Set up event listeners
    const handleConnected = () => {
      setIsConnected(true)
      setUsePollingFallback(false)
      setConnectionError(null)
    }

    const handleDisconnected = () => {
      setIsConnected(false)
    }

    const handleFallbackEnabled = (data) => {
      setUsePollingFallback(true)
      setIsConnected(false)
    }

    const handleError = (data) => {
      setConnectionError(data.error)
    }

    const handleAnalyticsEvent = (data) => {
      setEvents(prev => {
        const newEvents = [...prev, data.event]
        // Keep only last 50 events
        return newEvents.slice(-50)
      })
    }

    const handleMetrics = (data) => {
      setMetrics(prev => ({
        ...prev,
        [data.type]: {
          ...data,
          lastUpdated: new Date()
        }
      }))
    }

    // Register event handlers
    websocketClient.on('connected', handleConnected)
    websocketClient.on('disconnected', handleDisconnected)
    websocketClient.on('fallback_enabled', handleFallbackEnabled)
    websocketClient.on('error', handleError)
    websocketClient.on('polling_error', handleError)
    websocketClient.on('analytics_event', handleAnalyticsEvent)
    websocketClient.on('metrics', handleMetrics)

    // Initialize connection
    websocketClient.connect()

    // Cleanup on unmount
    return () => {
      websocketClient.off('connected', handleConnected)
      websocketClient.off('disconnected', handleDisconnected)
      websocketClient.off('fallback_enabled', handleFallbackEnabled)
      websocketClient.off('error', handleError)
      websocketClient.off('polling_error', handleError)
      websocketClient.off('analytics_event', handleAnalyticsEvent)
      websocketClient.off('metrics', handleMetrics)
    }
  }, [])

  /**
   * Subscribe to analytics channel
   */
  const subscribe = useCallback((channel, filters = {}) => {
    websocketClient.subscribe(channel, filters)
  }, [])

  /**
   * Unsubscribe from analytics channel
   */
  const unsubscribe = useCallback((channel) => {
    websocketClient.unsubscribe(channel)
  }, [])

  /**
   * Request specific metrics
   */
  const requestMetrics = useCallback((type, timeframe = '24h') => {
    websocketClient.requestMetrics(type, timeframe)
  }, [])

  /**
   * Record user activity
   */
  const recordActivity = useCallback((action, page, metadata = {}) => {
    websocketClient.recordActivity(action, page, metadata)
  }, [])

  return {
    // Connection status
    isConnected,
    usePollingFallback,
    connectionError,
    
    // Data
    metrics,
    events,
    
    // Actions
    subscribe,
    unsubscribe,
    requestMetrics,
    recordActivity,
    
    // Utilities
    getStatus: () => websocketClient.getStatus()
  }
}

/**
 * Hook specifically for admin dashboard analytics
 */
export function useAdminAnalytics() {
  const analytics = useRealtimeAnalytics()
  const [dashboardData, setDashboardData] = useState({
    userActivity: null,
    systemMetrics: null,
    connectionStats: null,
    lastUpdate: null
  })

  useEffect(() => {
    // Subscribe to admin channels
    analytics.subscribe('admin_dashboard')
    analytics.subscribe('system_metrics')
    analytics.subscribe('user_activity')

    // Request initial metrics
    analytics.requestMetrics('user_activity', '24h')
    analytics.requestMetrics('system_performance', '1h')

    return () => {
      analytics.unsubscribe('admin_dashboard')
      analytics.unsubscribe('system_metrics')
      analytics.unsubscribe('user_activity')
    }
  }, [analytics])

  // Update dashboard data when metrics change
  useEffect(() => {
    const { metrics } = analytics
    
    setDashboardData(prev => ({
      ...prev,
      userActivity: metrics.user_activity || prev.userActivity,
      systemMetrics: metrics.system_performance || prev.systemMetrics,
      lastUpdate: new Date()
    }))
  }, [analytics.metrics])

  return {
    ...analytics,
    dashboardData,
    refreshDashboard: () => {
      analytics.requestMetrics('user_activity', '24h')
      analytics.requestMetrics('system_performance', '1h')
    }
  }
}

/**
 * Hook for price monitoring and alerts
 */
export function usePriceAnalytics(itemIds = []) {
  const analytics = useRealtimeAnalytics()
  const [priceData, setPriceData] = useState({
    currentPrices: {},
    priceHistory: [],
    alerts: []
  })

  useEffect(() => {
    // Subscribe to price updates
    analytics.subscribe('price_updates', { itemIds })
    analytics.subscribe('market_data')

    // Request initial price metrics
    analytics.requestMetrics('price_updates', '1h')

    return () => {
      analytics.unsubscribe('price_updates')
      analytics.unsubscribe('market_data')
    }
  }, [analytics, itemIds])

  // Process price events
  useEffect(() => {
    const priceEvents = analytics.events.filter(event => 
      event.type === 'price_update'
    )

    if (priceEvents.length > 0) {
      const latestPrices = {}
      const history = []

      priceEvents.forEach(event => {
        const { itemId, buyPrice, sellPrice } = event.data
        latestPrices[itemId] = { buyPrice, sellPrice }
        history.push({
          itemId,
          buyPrice,
          sellPrice,
          timestamp: event.timestamp
        })
      })

      setPriceData(prev => ({
        ...prev,
        currentPrices: { ...prev.currentPrices, ...latestPrices },
        priceHistory: [...prev.priceHistory, ...history].slice(-1000) // Keep last 1000 records
      }))
    }
  }, [analytics.events])

  return {
    ...analytics,
    priceData,
    monitorItem: (itemId) => {
      const newItemIds = [...new Set([...itemIds, itemId])]
      analytics.subscribe('price_updates', { itemIds: newItemIds })
    },
    stopMonitoring: (itemId) => {
      const newItemIds = itemIds.filter(id => id !== itemId)
      analytics.subscribe('price_updates', { itemIds: newItemIds })
    }
  }
}

/**
 * Hook for user activity tracking and analytics
 */
export function useActivityTracking() {
  const analytics = useRealtimeAnalytics()
  const currentPage = useRef(null)

  // Track page views
  const trackPageView = useCallback((pageName, metadata = {}) => {
    currentPage.current = pageName
    analytics.recordActivity('page_view', pageName, {
      ...metadata,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })
  }, [analytics])

  // Track user interactions
  const trackInteraction = useCallback((action, element, metadata = {}) => {
    analytics.recordActivity('interaction', currentPage.current, {
      action,
      element,
      ...metadata,
      timestamp: new Date()
    })
  }, [analytics])

  // Track performance metrics
  const trackPerformance = useCallback((metrics) => {
    analytics.recordActivity('performance', currentPage.current, {
      ...metrics,
      timestamp: new Date()
    })
  }, [analytics])

  // Track errors
  const trackError = useCallback((error, context = {}) => {
    analytics.recordActivity('error', currentPage.current, {
      error: error.message || String(error),
      stack: error.stack,
      ...context,
      timestamp: new Date()
    })
  }, [analytics])

  return {
    trackPageView,
    trackInteraction,
    trackPerformance,
    trackError,
    currentPage: currentPage.current
  }
}

export default useRealtimeAnalytics
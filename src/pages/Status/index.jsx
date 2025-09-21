import React, { useState, useEffect } from 'react'
import './Status.scss'

const Status = () => {
  const [apiStatus, setApiStatus] = useState({
    pricing: { status: 'checking', latency: null, lastCheck: null },
    mapping: { status: 'checking', latency: null, lastCheck: null },
    timeseries: { status: 'checking', latency: null, lastCheck: null },
    fiveMinute: { status: 'checking', latency: null, lastCheck: null },
    oneHour: { status: 'checking', latency: null, lastCheck: null }
  })

  const [overallStatus, setOverallStatus] = useState('checking')
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const checkEndpoint = async (url, name) => {
    const startTime = Date.now()
    try {
      const response = await fetch(url, {
        method: 'HEAD', // Use HEAD to reduce data usage
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
      { name: 'oneHour', url: 'https://prices.runescape.wiki/api/v1/osrs/1h' },
      { name: 'OSRS Wiki - Latest Prices', url: 'https://prices.runescape.wiki/api/v1/osrs/latest', group: 'OSRS Wiki' },
      { name: 'OSRS Wiki - 5m Timestamps', url: 'https://prices.runescape.wiki/api/v1/osrs/5m', group: 'OSRS Wiki' },
      { name: 'OSRS Wiki - Item Mapping', url: 'https://prices.runescape.wiki/api/v1/osrs/mapping', group: 'OSRS Wiki' },
      { name: 'OSRS Wiki - 24h Volumes', url: 'https://prices.runescape.wiki/api/v1/osrs/24h', group: 'OSRS Wiki' },
      { name: 'OSRS Wiki - Real-time Volumes', url: 'https://prices.runescape.wiki/api/v1/osrs/volumes', group: 'OSRS Wiki' }
    ]

    const results = {}

    // Check all endpoints in parallel
    const promises = endpoints.map(async (endpoint) => {
      const result = await checkEndpoint(endpoint.url, endpoint.name)
      results[endpoint.name] = result
    })

    await Promise.all(promises)

    setApiStatus(results)

    // Determine overall status
    const statuses = Object.values(results).map(r => r.status)
    if (statuses.every(s => s === 'online')) {
      setOverallStatus('online')
    } else if (statuses.some(s => s === 'online')) {
      setOverallStatus('partial')
    } else {
      setOverallStatus('offline')
    }

    setLastUpdate(new Date())
  }

  useEffect(() => {
    checkAllEndpoints()

    // Check every 30 seconds
    const interval = setInterval(checkAllEndpoints, 30000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#10b981' // green
      case 'offline': return '#ef4444' // red
      case 'partial': return '#f59e0b' // yellow
      case 'checking': return '#6b7280' // gray
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

  return (
    <div className="status-page">
      <div className="status-header">
        <h1>OSRS Wiki API Status</h1>
        <div className="overall-status" style={{ color: getStatusColor(overallStatus) }}>
          <div className="status-indicator" style={{ backgroundColor: getStatusColor(overallStatus) }}></div>
          {getStatusText(overallStatus)}
        </div>
        <p className="last-update">Last updated: {lastUpdate.toLocaleString()}</p>
        <button onClick={checkAllEndpoints} className="refresh-btn">
          Refresh Status
        </button>
      </div>

      <div className="services-grid">
        {Object.entries(apiStatus).map(([serviceName, service]) => (
          <div key={serviceName} className="service-card">
            <div className="service-header">
              <h3>{serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} API</h3>
              <div
                className="service-status"
                style={{ color: getStatusColor(service.status) }}
              >
                <div
                  className="status-dot"
                  style={{ backgroundColor: getStatusColor(service.status) }}
                ></div>
                {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
              </div>
            </div>

            <div className="service-details">
              <div className="detail-row">
                <span>Response Time:</span>
                <span style={{ color: getLatencyColor(service.latency) }}>
                  {formatLatency(service.latency)}
                </span>
              </div>

              <div className="detail-row">
                <span>Last Check:</span>
                <span>
                  {service.lastCheck ? service.lastCheck.toLocaleTimeString() : 'Never'}
                </span>
              </div>

              {service.error && (
                <div className="detail-row error">
                  <span>Error:</span>
                  <span>{service.error}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="status-info">
        <h2>About This Status Page</h2>
        <p>
          This page monitors the availability and performance of the OSRS Wiki API endpoints
          that power the GE Metrics application. Status checks are performed every 30 seconds.
        </p>

        <div className="endpoint-list">
          <h3>Monitored Endpoints:</h3>
          <ul>
            <li><strong>Pricing API:</strong> Latest item prices</li>
            <li><strong>Mapping API:</strong> Item ID to name mappings</li>
            <li><strong>Timeseries API:</strong> Historical price data</li>
            <li><strong>5-Minute API:</strong> 5-minute interval data</li>
            <li><strong>1-Hour API:</strong> 1-hour interval data</li>
          </ul>
        </div>

        <div className="status-legend">
          <h3>Status Legend:</h3>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#10b981' }}></div>
              <span>Online - Service is operational</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></div>
              <span>Partial - Some services are down</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#ef4444' }}></div>
              <span>Offline - Service is unavailable</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#6b7280' }}></div>
              <span>Checking - Status being verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Status

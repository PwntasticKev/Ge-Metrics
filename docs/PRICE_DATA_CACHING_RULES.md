# Price Data Caching System - Cursor Rules

## Overview
This system implements a robust caching layer for OSRS Grand Exchange price data to prevent API rate limiting and enable historical price tracking. The system pulls price data every 2.5 minutes and stores it in our database, serving all user requests from cached data instead of hitting external APIs directly.

## Core Architecture

### Data Flow
1. **Cron Job**: Runs every 2.5 minutes (150 seconds)
2. **API Pull**: Fetches complete price data from OSRS GE API
3. **Database Storage**: Saves entire response with timestamp
4. **User Requests**: Served from cached database data
5. **Historical Tracking**: Enables chart data and price history analysis

### Key Benefits
- **Rate Limit Protection**: No direct API calls from user requests
- **Performance**: Fast database queries vs external API calls
- **Historical Data**: Built-in timestamp tracking for charts
- **Reliability**: Redundant data storage and error handling
- **Scalability**: Can handle high user load without API constraints

## Implementation Rules

### 1. Cron Job Configuration
```javascript
// scripts/priceDataCron.js
const cron = require('node-cron')

// Run every 2.5 minutes (150 seconds)
cron.schedule('*/2.5 * * * *', async () => {
  try {
    await fetchAndCachePriceData()
  } catch (error) {
    console.error('Price data fetch failed:', error)
    // Implement retry logic and alerting
  }
})
```

### 2. Database Schema Requirements
```sql
-- Price data cache table
CREATE TABLE price_cache (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data JSONB NOT NULL, -- Complete API response
  item_count INTEGER,
  api_version VARCHAR(50),
  fetch_duration_ms INTEGER,
  status VARCHAR(20) DEFAULT 'success'
);

-- Index for efficient timestamp queries
CREATE INDEX idx_price_cache_timestamp ON price_cache(timestamp);
CREATE INDEX idx_price_cache_status ON price_cache(status);
```

### 3. Service Layer Implementation
```javascript
// services/priceCacheService.js
class PriceCacheService {
  // Fetch and cache price data
  async fetchAndCachePriceData() {
    const startTime = Date.now()
    
    try {
      // Fetch from OSRS GE API
      const priceData = await this.fetchFromOSRSAPI()
      
      // Store in database
      await this.storePriceData(priceData, {
        fetchDuration: Date.now() - startTime,
        itemCount: Object.keys(priceData).length
      })
      
      return { success: true, itemCount: Object.keys(priceData).length }
    } catch (error) {
      await this.logFailedFetch(error, Date.now() - startTime)
      throw error
    }
  }
  
  // Get cached price data for user requests
  async getCachedPriceData(options = {}) {
    const { 
      itemId, 
      limit = 100, 
      offset = 0,
      includeHistory = false 
    } = options
    
    if (itemId) {
      return await this.getSingleItemPrice(itemId, includeHistory)
    }
    
    return await this.getLatestPriceData(limit, offset)
  }
}
```

### 4. API Integration Rules

#### External API Calls (Cron Only)
- **Location**: Only in cron jobs and background services
- **Rate Limiting**: Implement exponential backoff for failures
- **Error Handling**: Comprehensive error logging and alerting
- **Timeout**: 30-second timeout for API calls
- **Retry Logic**: 3 attempts with increasing delays

#### User-Facing API Endpoints
- **Data Source**: Always from database cache
- **Response Time**: < 100ms for cached data
- **Fallback**: Return last known good data if cache is stale
- **Status**: Include cache timestamp in responses

### 5. Error Handling and Monitoring

#### Cron Job Monitoring
```javascript
// Monitor cron job health
const monitorCronHealth = {
  lastSuccessfulRun: null,
  consecutiveFailures: 0,
  maxFailures: 5,
  
  async checkHealth() {
    const lastRun = await this.getLastSuccessfulRun()
    const timeSinceLastRun = Date.now() - lastRun
    
    if (timeSinceLastRun > 5 * 60 * 1000) { // 5 minutes
      await this.alert('Price cache cron job may be down')
    }
  }
}
```

#### Database Health Checks
- Monitor cache table size and growth
- Alert if cache is older than 5 minutes
- Implement cache cleanup for old data (keep 30 days)
- Monitor database performance impact

### 6. Performance Optimization

#### Database Queries
```javascript
// Optimized queries for different use cases
const optimizedQueries = {
  // Get latest price data
  getLatestPrices: `
    SELECT data, timestamp 
    FROM price_cache 
    WHERE status = 'success' 
    ORDER BY timestamp DESC 
    LIMIT 1
  `,
  
  // Get historical data for charts
  getHistoricalData: `
    SELECT timestamp, data 
    FROM price_cache 
    WHERE timestamp >= $1 
    AND timestamp <= $2 
    AND status = 'success'
    ORDER BY timestamp ASC
  `,
  
  // Get specific item price history
  getItemHistory: `
    SELECT timestamp, 
           data->$1->>'high' as high_price,
           data->$1->>'low' as low_price
    FROM price_cache 
    WHERE data ? $1 
    AND timestamp >= $2
    ORDER BY timestamp DESC
  `
}
```

#### Caching Strategy
- **Memory Cache**: Redis for frequently accessed items
- **Database Cache**: PostgreSQL for persistent storage
- **TTL**: 2.5 minutes for memory cache
- **Invalidation**: Clear memory cache after database update

### 7. Data Structure Standards

#### API Response Format
```javascript
// Expected OSRS GE API response structure
const expectedResponseFormat = {
  [itemId]: {
    high: number,      // High alch price
    low: number,       // Low alch price
    highTime: number,  // Timestamp of high price
    lowTime: number    // Timestamp of low price
  }
}
```

#### Database Storage Format
```javascript
// Database record structure
const dbRecordFormat = {
  id: 'auto-increment',
  timestamp: '2024-01-01T12:00:00Z',
  data: {
    // Complete API response as JSONB
    "2": { "high": 100, "low": 90, "highTime": 1704110400, "lowTime": 1704106800 },
    "3": { "high": 200, "low": 180, "highTime": 1704110400, "lowTime": 1704106800 }
    // ... all items
  },
  item_count: 50000,
  api_version: 'v1',
  fetch_duration_ms: 2500,
  status: 'success'
}
```

### 8. User Request Handling

#### Service Layer Pattern
```javascript
// services/priceService.js
class PriceService {
  async getItemPrice(itemId) {
    // Always get from cache, never external API
    const cachedData = await this.priceCacheService.getCachedPriceData({
      itemId,
      includeHistory: false
    })
    
    if (!cachedData) {
      throw new Error('Price data not available')
    }
    
    return {
      ...cachedData,
      cacheTimestamp: cachedData.timestamp,
      dataSource: 'cached'
    }
  }
  
  async getItemPriceHistory(itemId, days = 7) {
    return await this.priceCacheService.getCachedPriceData({
      itemId,
      includeHistory: true,
      days
    })
  }
}
```

### 9. Development and Testing

#### Test Requirements
```javascript
// __tests__/priceCacheService.test.js
describe('PriceCacheService', () => {
  test('should fetch and cache price data successfully', async () => {
    // Mock external API
    // Verify database storage
    // Check timestamp accuracy
  })
  
  test('should serve cached data to users', async () => {
    // Mock database cache
    // Verify response format
    // Check performance
  })
  
  test('should handle API failures gracefully', async () => {
    // Mock API failure
    // Verify error logging
    // Check fallback behavior
  })
})
```

#### Monitoring and Alerts
- **Success Rate**: Monitor cron job success rate
- **Performance**: Track fetch duration and database query times
- **Data Quality**: Validate response structure and item count
- **Storage**: Monitor database growth and cleanup

### 10. Deployment and Configuration

#### Environment Variables
```bash
# Required environment variables
PRICE_CACHE_CRON_INTERVAL=150000  # 2.5 minutes in milliseconds
PRICE_CACHE_RETENTION_DAYS=30     # How long to keep historical data
PRICE_CACHE_MAX_FAILURES=5        # Max consecutive failures before alert
PRICE_CACHE_API_TIMEOUT=30000     # API timeout in milliseconds
```

#### Cron Job Setup
```bash
# Add to package.json scripts
{
  "scripts": {
    "start:price-cache": "node scripts/priceDataCron.js",
    "test:price-cache": "npm test -- --grep 'PriceCache'"
  }
}
```

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create database schema for price_cache table
- [ ] Implement PriceCacheService with fetch and store methods
- [ ] Create cron job script with proper error handling
- [ ] Add monitoring and health checks

### Phase 2: Integration
- [ ] Update existing price-related services to use cache
- [ ] Modify API endpoints to serve cached data
- [ ] Implement fallback mechanisms for stale data
- [ ] Add performance monitoring

### Phase 3: Optimization
- [ ] Implement Redis memory caching layer
- [ ] Add data cleanup and retention policies
- [ ] Optimize database queries and indexes
- [ ] Add comprehensive logging and alerting

### Phase 4: Testing and Validation
- [ ] Create comprehensive test suite
- [ ] Load test the caching system
- [ ] Validate data accuracy and consistency
- [ ] Monitor production performance

## Security Considerations

### Data Protection
- Encrypt sensitive API credentials
- Implement API key rotation
- Log access patterns for security monitoring
- Validate all cached data before serving

### Rate Limiting
- Implement internal rate limiting for cache access
- Monitor for unusual access patterns
- Set up alerts for potential abuse

## Performance Targets

### Response Times
- **Cached Data**: < 100ms
- **Historical Data**: < 500ms
- **Cron Job Execution**: < 30 seconds
- **Database Queries**: < 50ms

### Reliability Targets
- **Uptime**: 99.9%
- **Data Freshness**: < 5 minutes old
- **Error Rate**: < 0.1%
- **Recovery Time**: < 2 minutes

## Maintenance Procedures

### Daily Tasks
- Monitor cron job execution logs
- Check database performance metrics
- Validate data freshness and quality

### Weekly Tasks
- Review error logs and failure patterns
- Analyze performance trends
- Clean up old cache data

### Monthly Tasks
- Review and optimize database indexes
- Update monitoring thresholds
- Plan capacity for data growth

This caching system ensures reliable, fast access to OSRS Grand Exchange price data while protecting against API rate limits and enabling comprehensive historical analysis for the Ge-Metrics application. 
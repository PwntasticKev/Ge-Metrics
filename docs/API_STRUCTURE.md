# OSRS Wiki API Structure & Caching System

## 🎯 **System Overview**
Our application uses a comprehensive caching strategy to avoid hitting the OSRS Wiki API directly for every user request. We cache data locally and refresh it on scheduled intervals.

## 📊 **Database Tables**

### `item_mapping`
Stores all OSRS item mappings from the wiki API.
```sql
CREATE TABLE item_mapping (
  id SERIAL PRIMARY KEY,
  item_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  examine TEXT,
  members BOOLEAN DEFAULT false,
  lowalch INTEGER,
  highalch INTEGER,
  value INTEGER,
  limit INTEGER,
  icon TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `potion_volumes` 
Caches volume data for all potions used in combination calculations.
```sql
CREATE TABLE potion_volumes (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  dose INTEGER NOT NULL, -- 1, 2, 3, or 4
  base_name TEXT NOT NULL, -- e.g., "Prayer potion"
  volume INTEGER DEFAULT 0,
  high_price_volume INTEGER,
  low_price_volume INTEGER,
  last_updated TIMESTAMP DEFAULT NOW(),
  rank INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🌐 **OSRS Wiki API Endpoints**

### 1. Item Mapping
**Endpoint:** `https://prices.runescape.wiki/api/v1/osrs/mapping`
**Method:** GET
**Purpose:** Get all item mappings (ID, name, metadata)
**Response:**
```json
[
  {
    "id": 2,
    "name": "Cannonball",
    "examine": "Ammo for the Dwarf Cannon.",
    "members": false,
    "lowalch": 2,
    "highalch": 4,
    "value": 6,
    "limit": 9000,
    "icon": "https://secure.runescape.com/m=itemdb_oldschool/1732816625/obj_sprite.gif?id=2"
  }
]
```

### 2. Latest Prices (Bulk)
**Endpoint:** `https://prices.runescape.wiki/api/v1/osrs/latest`
**Method:** GET
**Purpose:** Get current prices for all items (sometimes includes volume)
**Response:**
```json
{
  "data": {
    "2": {
      "high": 185,
      "highTime": 1732816625,
      "low": 184,
      "lowTime": 1732816625
    }
  }
}
```

### 3. Historical Data (Individual Items)
**Endpoint:** `https://prices.runescape.wiki/api/v1/osrs/timeseries`
**Method:** GET
**Query Params:**
- `timestep`: `5m`, `1h`, `6h`, `24h`
- `id`: Item ID (required)
**Purpose:** Get historical price/volume data for specific item
**Response:**
```json
{
  "data": [
    {
      "timestamp": 1732816625,
      "avgHighPrice": 185,
      "avgLowPrice": 184,
      "highPriceVolume": 1000,
      "lowPriceVolume": 500
    }
  ]
}
```

## 🔄 **Caching Strategy**

### Background Jobs (Every 2.5 minutes)
1. **Item Mapping Sync** (Daily)
   - Fetches all items from `/mapping`
   - Updates `item_mapping` table
   - Handles new items and metadata changes

2. **Potion Volume Cache** (Every 2.5 minutes)
   - Identifies all potions from recipes (~50-100 items)
   - Makes individual `/timeseries?timestep=1d&id=XXX` calls
   - Caches volume data in `potion_volumes` table
   - Updates profitability scores

3. **Price History Cache** (Every 5 minutes)
   - Fetches bulk prices from `/latest`
   - Stores in `item_price_history` table
   - Used for general price tracking

### Frontend API Endpoints
Our Express server provides these cached endpoints:

#### `GET /api/potion-volumes`
Returns cached potion volume data
```json
{
  "success": true,
  "data": [
    {
      "itemId": 2428,
      "itemName": "Attack potion(4)",
      "dose": 4,
      "baseName": "Attack potion",
      "volume": 1500,
      "lastUpdated": "2025-09-18T23:20:00Z"
    }
  ]
}
```

#### `GET /api/potion-volumes/status`
Returns cache status and last update times
```json
{
  "success": true,
  "data": {
    "totalCachedPotions": 87,
    "lastUpdated": "2025-09-18T23:20:00Z",
    "nextUpdate": "2025-09-18T23:22:30Z",
    "activeItems": 87
  }
}
```

## 🎯 **Volume Fetching Strategy**

### Why Individual API Calls?
The OSRS Wiki API `/timeseries` endpoint requires individual item IDs. To get volume data for all potions, we must make 50-100 separate API calls:

```javascript
// Example: Fetching volume for Attack potion (4)
const response = await fetch(
  'https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=1d&id=2428'
)
const data = await response.json()
const volume = data.data?.[0]?.highPriceVolume || 0
```

### Error Handling
- **400 errors**: Item doesn't exist or invalid ID → Set volume to 0
- **Rate limiting**: Implement delays between requests
- **Network failures**: Retry with exponential backoff
- **Invalid responses**: Log error and continue with next item

## 📈 **Profitability Scoring**

Volume data is used to calculate a 1-10 profitability score:

```javascript
const score = Math.min(10, Math.max(1, 
  (profit * volume) / (maxProfit * maxVolume) * 10
))
```

Where:
- `profit`: GP profit per combination
- `volume`: Daily trading volume
- `maxProfit`: Highest profit among all potions
- `maxVolume`: Highest volume among all potions

## 🚀 **Performance Benefits**

### Without Caching
- 4000 users × 50 API calls = 200,000 external requests
- Rate limiting issues
- Slow page loads
- API dependency

### With Caching
- Background job: 50 API calls every 2.5 minutes
- Users: 0 external API calls (served from PostgreSQL)
- Fast response times
- High availability

## 🔧 **Maintenance**

### Database Cleanup
- Remove inactive potions (no longer profitable)
- Archive old volume data (keep 30 days)
- Monitor table sizes and performance

### API Monitoring
- Track 400 error rates
- Monitor response times
- Alert on cache failures
- Log volume data anomalies

## 📝 **Development Notes**

### Rate Limiting
The OSRS Wiki API has rate limits. Our background job respects these by:
- Adding delays between requests (100ms)
- Implementing exponential backoff on failures
- Monitoring response codes and adjusting frequency

### Data Integrity
- Foreign key constraints ensure data consistency
- Timestamps track data freshness
- Boolean flags manage active/inactive states
- Indexes optimize query performance

This caching system ensures that thousands of users can access real-time potion profitability data without overwhelming the OSRS Wiki API or experiencing slow page loads.

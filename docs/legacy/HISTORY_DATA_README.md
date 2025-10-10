# History Data Collection & High Volumes Feature

This document explains the new history data collection system and high volumes page for the Ge-Metrics application.

## Features Added

### 1. High Volumes Page
- **Location**: `/high-volumes` 
- **Navigation**: Added to the main navigation menu with a trending up icon
- **Purpose**: Shows the most actively traded items sorted by 24-hour trading volume
- **Design**: Follows the same design pattern as the "All Items" page but prioritizes volume data

### 2. History Data Collection System
- **Database Schema**: Added `item_price_history` table to store historical price and volume data
- **API Integration**: Integrated with osrsprices.wiki API to fetch real-time and historical data
- **Service Layer**: Created `HistoryDataService` for data collection and transformation

### 3. Enhanced Data Structure
- **Volume Data**: Added volume information to all item records
- **API Endpoints**: Added new endpoints for fetching volume and historical data
- **Data Processing**: Enhanced item processing to include trading volume

## Database Schema

```sql
model item_price_history {
  id          Int      @id @default(autoincrement())
  item_id     Int
  timestamp   DateTime @db.Timestamptz(6)
  high_price  Int?
  low_price   Int?
  volume      BigInt?
  created_at  DateTime @default(now()) @db.Timestamptz(6)

  @@unique([item_id, timestamp])
  @@index([item_id])
  @@index([timestamp])
  @@index([volume])
}
```

## API Integration

### osrsprices.wiki Endpoints Used:
- `GET /api/v1/osrs/latest` - Latest prices with volume data
- `GET /api/v1/osrs/5m` - 5-minute price averages
- `GET /api/v1/osrs/1h` - 1-hour price averages  
- `GET /api/v1/osrs/timeseries` - Historical time series data

### New API Functions:
```javascript
// Volume data fetching
export const getVolumeData = () => { ... }
export const get5MinuteData = (timestamp) => { ... }
export const get1HourData = (timestamp) => { ... }
```

## High Volumes Page Features

### Table Columns:
- **ID**: Item ID
- **Image**: Item icon
- **Name**: Item name with link to details
- **Buy Price**: Current buy price
- **Sell Price**: Current sell price
- **Volume (24h)**: Trading volume in last 24 hours (highlighted)
- **Profit**: Potential profit from flipping
- **Limit**: GE buy limit
- **Chart**: Mini price chart
- **Actions**: Transaction and graph buttons

### Sorting & Filtering:
- **Default Sort**: By volume (highest first)
- **Search**: Filter by any field
- **Pagination**: 100 items per page
- **Volume Filter**: Only shows items with volume data

## History Data Service

### Key Methods:

```javascript
// Fetch latest prices with volume
await historyDataService.fetchLatestPrices()

// Collect current prices and save to DB
await historyDataService.collectCurrentPrices()

// Get historical data for specific item
await historyDataService.collectItemHistory(itemId, '1h')

// Get high volume items
await historyDataService.getHighVolumeItems(100)
```

### Data Collection Script:
```bash
node scripts/collectHistoryData.js
```

## Usage Examples

### Manual Data Collection:
```javascript
import historyDataService from './src/services/historyDataService.js'

// Collect current prices for all items
const result = await historyDataService.collectCurrentPrices()
console.log(`Saved ${result.count} price records`)

// Get top 10 high volume items
const highVolume = await historyDataService.getHighVolumeItems(10)
console.log('Top volume items:', highVolume)
```

### Automated Collection:
You can set up automated data collection using cron jobs or scheduled tasks:

```bash
# Collect prices every hour
0 * * * * cd /path/to/app && node scripts/collectHistoryData.js

# Collect detailed history for top items daily
0 0 * * * cd /path/to/app && node scripts/collectDetailedHistory.js
```

## Implementation Notes

### User Agent Compliance:
The service uses a proper User-Agent header as required by the osrsprices.wiki API:
```
Ge-Metrics Price History Collector - Contact: admin@ge-metrics.com
```

### Error Handling:
- Comprehensive error logging
- Graceful fallbacks for missing data
- API rate limiting awareness

### Performance Considerations:
- Bulk data operations
- Database indexing for fast queries
- Efficient data transformation
- Volume-based filtering to reduce dataset size

## Database Migration

To add the history table to your existing database:

```bash
# Generate migration
npx prisma migrate dev --name add_item_price_history

# Apply migration
npx prisma migrate deploy
```

## Testing the Feature

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Navigate to High Volumes**:
   - Click the "High Volumes" menu item (trending up icon)
   - Or visit `/high-volumes` directly

3. **Test Data Collection**:
   ```bash
   node scripts/collectHistoryData.js
   ```

## Future Enhancements

### Planned Features:
- **Automated Scheduling**: Background data collection service
- **Historical Charts**: Enhanced charts using collected history data  
- **Volume Alerts**: Notifications for unusual volume spikes
- **Trend Analysis**: Volume trend indicators and predictions
- **Export Features**: Export high volume data to CSV/JSON
- **Advanced Filtering**: Filter by volume ranges, time periods

### Performance Optimizations:
- **Data Compression**: Compress historical data for storage efficiency
- **Caching**: Cache high volume results for faster page loads
- **Batch Processing**: Process large datasets in batches
- **Background Jobs**: Move data collection to background workers

## Support

For questions or issues with the history data collection system:
- Check the console logs for detailed error messages
- Ensure proper database connectivity
- Verify API endpoints are accessible
- Review User-Agent configuration for API compliance

The system is designed to be robust and handle API failures gracefully while providing valuable trading volume insights to users. 
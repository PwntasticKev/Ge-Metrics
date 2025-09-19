# Potion Combinations System - Technical Documentation

## Overview
The Potion Combinations system helps OSRS players find the most profitable potion decanting opportunities by analyzing market data, volume patterns, and OSRS game mechanics.

## OSRS Potion Mechanics (CRITICAL CONTEXT)

### How Potions Are Created
1. **Making potions from herbs** → Always creates **(3) dose potions**
2. **Players typically buy (4) dose potions** from Grand Exchange
3. **Drinking mechanics**:
   - Drink 1 sip from (4) dose → Creates (3) dose
   - Drink 1 sip from (3) dose → Creates (2) dose  
   - Drink 1 sip from (2) dose → Creates (1) dose

### Natural Volume Hierarchy
Based on OSRS mechanics, the expected volume pattern is:
- **(3) dose**: **HIGHEST** volume (fresh from herblore + people drinking from (4))
- **(4) dose**: High volume (people buying full potions)
- **(2) dose**: Lower volume (people drank 2 sips)
- **(1) dose**: Lowest volume (people drank 3 sips)

**Key Insight**: (3) dose potions should be recommended most often due to highest natural supply.

## System Architecture

### Frontend Components
- **`/potion-combinations`** - Main page displaying all profitable combinations
- **`PotionCard.jsx`** - Individual potion combination cards
- **`VolumeChartModal.jsx`** - Historical volume charts for ingredients
- **`CalculationExplainer.jsx`** - Formula documentation

### Backend Services
- **`potionVolumeService.ts`** - Caches volume data every 2.5 minutes
- **`potionVolumeApi.js`** - Frontend API calls for cached volume data
- **`potion-recipes.js`** - Core calculation logic and React hook

### Database Schema
```sql
-- Potion Volumes Cache Table
CREATE TABLE potion_volumes (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  dose INTEGER NOT NULL CHECK (dose >= 1 AND dose <= 4),
  base_name TEXT NOT NULL, -- e.g., "Attack potion"
  volume INTEGER DEFAULT 0,
  high_price_volume INTEGER, -- People selling (supply available)
  low_price_volume INTEGER,  -- People buying (demand)
  total_volume INTEGER DEFAULT 0, -- Sum of high + low
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rank INTEGER, -- For ordering top potions
  is_active BOOLEAN DEFAULT TRUE
);
```

## Core Calculation Logic

### Profit Formulas
All calculations include 2% Grand Exchange tax on sell prices.

#### (1) to (4) Method
```javascript
// Buy 4x (1) dose → Sell 1x (4) dose
const cost = low1 * 4
const profit = (sellPrice * 0.98) - cost
```

#### (2) to (4) Method  
```javascript
// Buy 2x (2) dose → Sell 1x (4) dose
const cost = low2 * 2
const profit = (sellPrice * 0.98) - cost
```

#### (3) to (4) Method (Most Important)
```javascript
// Buy 4x (3) dose → Sell 3x (4) dose
const buyCost = low3 * 4
const totalProfit = (sellPrice * 0.98 * 3) - buyCost
const profitPerPotion = totalProfit / 3 // Profit per (4) dose made
```

### Volume-Weighted Scoring
The system uses volume-weighted scoring to prioritize bulk trading opportunities with **dose-specific multipliers**:

```javascript
// Scoring with EXTREME bulk trading viability weights + HOURLY volume
const score1 = profitPerPotion * (hourlyVolume1 + hourlyVolume4) * 0.1  // 90% penalty - impractical
const score2 = profitPerPotion * (hourlyVolume2 + hourlyVolume4) * 0.2  // 80% penalty - limited  
const score3 = profitPerPotion * (hourlyVolume3 + hourlyVolume4) * 3.0  // 200% bonus - OPTIMAL
const score4 = profitPerPotion * hourlyVolume4                          // Standard (4) dose scoring

// Volume Selection Logic:
// hourlyVolume = hourlyVol >= 10 ? hourlyVol : (dailyVol >= 20 ? dailyVol : 0)
// Outlier Detection: if (hourlyVol >= expectedHourlyVol * 4) flag as manipulation
```

**Rationale**: **Weight overrides profit and volume**. Even if (1) or (2) dose methods show 5x higher profit or volume, the (3) dose will still be selected due to its 3.0x multiplier. This ensures bulk trading viability is the primary factor, matching real OSRS trading patterns.

### Outlier Detection & Market Manipulation Prevention

The system includes robust outlier detection to prevent market manipulation from affecting recommendations:

```javascript
// Outlier Detection Algorithm
const expectedHourlyVol = Math.max(1, Math.floor(dailyVol / 24))
const isOutlier = hourlyVol >= (expectedHourlyVol * 4)

// Volume Thresholds
const validVolume = hourlyVol >= 10 ? hourlyVol : (dailyVol >= 20 ? dailyVol : 0)
```

**Detection Criteria**:
- **4x Volume Spike**: Hourly volume 4x+ expected triggers outlier flag
- **Minimum Thresholds**: 10+ trades/hour OR 20+ trades/day required
- **Expected Calculation**: Daily volume ÷ 24 = expected hourly baseline

**UI Indicators**:
- **Red Flag Icon**: Displayed on charts for suspicious data points
- **Tooltip Warnings**: Show outlier reason and spike magnitude
- **Chart Annotations**: Mark manipulation periods visually

### Best Method Selection
**CRITICAL**: The algorithm selects the best method based on **volume-weighted score**, not just profit:

```javascript
// Select method with highest score (profit × volume)
const bestMethod = combinations.reduce((best, current) =>
  (current.score > best.score) ? current : best
)
```

This ensures **(3) dose methods are favored** due to their naturally high volume.

## Volume Data Strategy

### Caching System
- **Update Frequency**: Every 2.5 minutes
- **Data Source**: OSRS Wiki API `/timeseries` endpoint
- **Storage**: PostgreSQL `potion_volumes` table
- **Top Potions**: Only caches top 15 most profitable potion families

### Volume Types (CRITICAL - Uses Hourly with Daily Fallback)
- **Hourly Volume**: `hourlyVolume` field = Most recent hour's trading activity (PRIMARY)
- **Daily Volume**: `volume` field = Current day's trading activity (FALLBACK)
- **High Price Volume**: People selling in current period (supply available)
- **Low Price Volume**: People buying in current period (demand/competition)
- **Total Volume**: `total_volume` field = Historical cumulative (NOT used for decisions)

**Volume Thresholds**:
- **Hourly**: Minimum 10 trades/hour to be considered valid
- **Daily Fallback**: Minimum 20 trades/day if hourly insufficient
- **Outlier Detection**: 4x+ expected hourly volume flagged as manipulation

**Key Insight**: We use **real-time hourly volume** for immediate bulk trading decisions, with robust fallback and manipulation detection.

### API Rate Limiting
- Uses `User-Agent` header: `Ge-Metrics - OSRS Grand Exchange Analytics`
- Respects OSRS Wiki API rate limits
- Caches data locally to minimize API calls

## UI/UX Design Patterns

### Tabs System
- **"All Potions"**: Shows all available potion combinations
- **"Favorites"**: Shows only favorited potions (stored in localStorage)
- **Favorites Counter**: Displays number of favorited items in tab

### Card Layout
```
[Image] | [Title (truncated)] | [Score Badge]
[Chart Icon] [Heart Icon - Red if favorited]
─────────────────────────────────────────────
(1): 3,391 | 6,377/per
(2): 7,444 | 5,053/per  
(3): 14,244 | 949/per ← HIGHLIGHTED (best volume×profit)
─────────────────────────────────────────────
Sell (4): 19,941
```

### Highlighting Logic
- **Green highlight**: Method with highest volume-weighted score (favors (3) dose)
- **No highlight**: Other methods (transparent background)
- **Compact design**: Minimal padding, small icons
- **Heart Icon**: Red when favorited, gray when not

### Filter Options
- **"Best Volume + Profit"**: Sorts by volume-weighted score (default)
- **"Best Profit Only"**: Sorts by profit per potion only
- **Search**: Real-time filtering by potion name (debounced)
- **Tabs**: All potions vs Favorites only

### Favorites System
- **Persistence**: Favorites stored in localStorage as `potionFavorites`
- **Toggle**: Click heart icon to add/remove favorites
- **Empty State**: Shows helpful message when no favorites exist

## Common Issues & Solutions

### Issue: All Scores Show "1/10"
**Cause**: CORS or rate limiting preventing volume data fetch
**Solution**: Check server CORS origins and rate limits

### Issue: (1) or (2) Dose Highlighted Instead of (3)
**Cause**: Algorithm using profit-only instead of volume-weighted scoring
**Solution**: Ensure `bestMethod` selection uses `current.score`, not `current.profitPerPotion`

### Issue: Charts Not Loading
**Cause**: Missing `User-Agent` header in API calls
**Solution**: Add proper User-Agent to all OSRS Wiki API requests

### Issue: Volume Data All Zeros
**Cause**: API authentication or inactive potion entries
**Solution**: Check `is_active = true` in database and API headers

## Development Guidelines

### Testing Volume Logic
Use Attack potion as test case (has clear volume hierarchy):
- (3) dose: ~86,681 volume ← Should be highlighted
- (4) dose: ~84,194 volume  
- (1) dose: ~3,397 volume
- (2) dose: ~825 volume

### Debug Logging
Enable debug logs for specific potions to verify algorithm:
```javascript
if (item4.name.toLowerCase().includes('attack potion')) {
  console.log('🧪 Attack Potion Analysis:', {
    combinations: combinations.map(c => ({ 
      dose: c.dose, profit: c.profitPerPotion, score: c.score
    })),
    selectedBest: { dose: bestMethod.dose, score: bestMethod.score }
  })
}
```

### Performance Considerations
- Cache volume data (don't hit API on every page load)
- Use total volume for scoring (most accurate market liquidity)
- Limit to top profitable potions only
- Debounce search inputs

## Future Enhancements

### Potential Features
- Historical profit tracking
- Price alerts for profitable methods
- Bulk calculator (how many potions can I make?)
- Profit margins over time analysis
- Integration with player inventory

### Technical Improvements
- WebSocket for real-time price updates
- More sophisticated volume prediction
- Machine learning for profit forecasting
- Mobile-responsive chart interactions

## API Dependencies

### OSRS Wiki API Endpoints
- **`/mapping`**: Get all item IDs and names
- **`/latest`**: Current prices and volumes  
- **`/timeseries`**: Historical price/volume data

### Required Headers
```javascript
headers: {
  'User-Agent': 'Ge-Metrics - OSRS Grand Exchange Analytics - contact@email.com'
}
```

## Database Queries

### Get Volume Data for Potion Family
```sql
SELECT base_name, dose, volume, high_price_volume, low_price_volume, total_volume 
FROM potion_volumes 
WHERE base_name = 'Attack potion' 
ORDER BY dose;
```

### Check Cache Status
```sql
SELECT COUNT(*) as total_potions, 
       MAX(last_updated) as last_update,
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_potions
FROM potion_volumes;
```

---

**Remember**: The (3) dose method should dominate recommendations due to OSRS's natural potion consumption patterns. If (1) or (2) dose methods are being highlighted frequently, there's likely a bug in the volume-weighted scoring algorithm.

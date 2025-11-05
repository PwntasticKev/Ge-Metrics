# RuneLite Plugin Integration - Technical Decisions

## Database Schema Design

### Core Tables

#### `osrs_accounts` (OSRS Account Links)
- `id` (UUID, PK)
- `user_id` (FK to users)
- `osrs_username` (text) - from RuneLite client
- `runelite_client_id` (text) - unique identifier for RuneLite client instance
- `created_at` (timestamp)
- `updated_at` (timestamp)
- Unique constraint: `(user_id, runelite_client_id)` - one client = one OSRS account

#### `trade_events` (Individual Trade Events)
- `id` (UUID, PK)
- `osrs_account_id` (FK to osrs_accounts)
- `user_id` (FK to users) - denormalized for admin queries
- `item_id` (integer)
- `item_name` (text) - denormalized for queries
- `offer_type` (enum: 'buy', 'sell')
- `price` (integer)
- `quantity` (integer) - total quantity in offer
- `filled_quantity` (integer) - how much was filled
- `remaining_quantity` (integer) - how much remains
- `status` (enum: 'pending', 'completed', 'canceled')
- `runelite_event_id` (text) - unique ID from RuneLite to prevent duplicates
- `timestamp` (timestamp) - when trade occurred
- `created_at` (timestamp)
- `updated_at` (timestamp)
- Indexes:
  - `(user_id, item_id, timestamp)` for user queries
  - `(osrs_account_id, item_id, status)` for FIFO matching
  - `(user_id, timestamp)` for pagination
  - `(runelite_event_id)` unique for deduplication

#### `trade_matches` (Matched Buy/Sell Pairs)
- `id` (UUID, PK)
- `user_id` (FK to users)
- `osrs_account_id` (FK to osrs_accounts)
- `item_id` (integer)
- `buy_event_id` (FK to trade_events)
- `sell_event_id` (FK to trade_events)
- `buy_price` (integer)
- `sell_price` (integer)
- `quantity` (integer) - matched quantity
- `profit` (integer) - calculated profit (before tax)
- `profit_after_tax` (integer) - profit after 2% GE tax
- `roi_percentage` (decimal)
- `matched_at` (timestamp)
- `created_at` (timestamp)
- Indexes:
  - `(user_id, item_id, matched_at)` for user trade history
  - `(osrs_account_id, matched_at)` for per-account queries

#### `open_positions` (Unmatched Trades)
- `id` (UUID, PK)
- `user_id` (FK to users)
- `osrs_account_id` (FK to osrs_accounts)
- `item_id` (integer)
- `buy_event_id` (FK to trade_events)
- `quantity` (integer) - remaining quantity
- `average_buy_price` (integer)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- Indexes:
  - `(user_id, item_id)` for user open positions
  - `(osrs_account_id)` for per-account queries

#### `all_trades_admin` (Admin-Only Global Trade Table)
- Same structure as `trade_events` but includes all users
- Used for analytics and admin access
- Partitioned by year for performance
- Indexes: `(item_id, timestamp)`, `(user_id, timestamp)`

#### `trade_archives` (Archived Trades)
- Partitioned by year: `trade_archives_2024`, `trade_archives_2025`, etc.
- Same structure as `trade_events`
- Moved from `trade_events` when > 1 year old

## FIFO Matching Algorithm

### Process Flow:
1. When new sell event comes in:
   - Find oldest unmatched buy events for same item_id and osrs_account_id
   - Match sell quantity against buy events in FIFO order
   - Create `trade_matches` records
   - Update `open_positions` table
   - Calculate profit: `(sell_price - buy_price) * quantity`
   - Apply 2% GE tax: `profit_after_tax = profit * 0.98`

### Example:
- Buy 1000 coal @ 150gp (Order A)
- Buy 500 coal @ 155gp (Order B)
- Sell 750 coal @ 160gp (Order C)
- Result:
  - Match 750 from Order A
  - Order A: 250 remaining (open position)
  - Order B: 500 remaining (open position)
  - Profit: (160 - 150) * 750 = 7,500gp
  - Profit after tax: 7,500 * 0.98 = 7,350gp

## Partial Fill Aggregation

### Strategy:
- Aggregate partial fills within **48 hour timeframe** OR until offer is explicitly canceled/completed
- When partial fill comes in: **Update existing event** (increment `filled_quantity`, decrement `remaining_quantity`)
- When offer fully fills OR is canceled:
  - Mark status as 'completed' or 'canceled'
  - Only track quantity that was filled (ignore unfulfilled quantity)

### Complex Scenario Handling (FIFO Approach):
- Buy 1000 coal @ 150gp (Order A)
- Sell 500 @ 160gp → Match 500 from Order A using FIFO (profit: 5,000gp)
- Cancel remaining 500
- Sell 250 @ 165gp → Match 250 from Order A using FIFO (profit: 3,750gp)
- Cancel remaining 250
- Sell 250 @ 170gp → Match 250 from Order A using FIFO (profit: 5,000gp)
- Result: Each sell matched separately using FIFO, total profit calculated per match
- Alternative: Group all sells and calculate total profit (user preference - implement FIFO but can group if needed)

## API Endpoints

### POST `/api/runelite/trades`
**Request Body:**
```json
{
  "runeliteClientId": "unique-client-id",
  "osrsUsername": "username-from-runelite",
  "trades": [
    {
      "runeliteEventId": "unique-event-id",
      "itemId": 123,
      "itemName": "Coal",
      "offerType": "buy",
      "price": 150,
      "quantity": 1000,
      "filledQuantity": 500,
      "remainingQuantity": 500,
      "status": "pending",
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "processed": 1,
  "errors": []
}
```

### GET `/api/trades/history`
**Query Params:**
- `osrsAccountId` (optional)
- `itemId` (optional)
- `startDate` (optional)
- `endDate` (optional)
- `page` (default: 1)
- `limit` (default: 100)

**Response:**
```json
{
  "trades": [...],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 5000,
    "totalPages": 50
  }
}
```

### GET `/api/trades/open-positions`
Returns all unmatched buy orders (open positions)

### WebSocket: `/ws/trades`
Real-time updates when trades occur

## Security Measures

### Rate Limiting
- 5,000 trades per day per user (across all their clients)
- Implemented via Redis or database counter
- Returns 429 Too Many Requests if exceeded

### SQL Injection Prevention
- Use parameterized queries (Drizzle ORM handles this)
- Validate all inputs
- Sanitize user-provided data

### Audit Logging
- Log all suspicious activity:
  - SQL injection attempts
  - Rate limit violations
  - Invalid authentication attempts
  - Unusual trade patterns

### Input Validation
- Validate item IDs exist
- Validate prices are integers > 0
- Validate quantities are integers > 0
- Validate timestamps are reasonable
- Validate runeliteEventId format

## Cron Jobs

### Daily: Check for Trades to Archive
- Run at 2 AM UTC
- Find trades older than 1 year
- Move to archive table for that year
- Keep reference in main table with `archived_at` timestamp

### Yearly: Archive Old Trades
- Run on January 1st at 3 AM UTC
- Batch move all trades > 1 year old
- Create archive partition if needed

## Archive Query Strategy
- Query both `trade_events` AND `trade_archives` tables when fetching user trade history
- Union results for seamless access
- Users can see all their trades regardless of archive status
- Archive tables partitioned by year for performance

## Pagination Strategy

### Trade History Pagination
- Default: 100 trades per page
- Use cursor-based pagination for better performance:
  - Instead of `OFFSET`, use `WHERE timestamp < last_timestamp`
  - Much faster for large datasets

### Index Usage
- Use `(user_id, timestamp DESC)` index for user trade history
- Use `(osrs_account_id, timestamp DESC)` for per-account history
- Use `(item_id, timestamp DESC)` for item-specific queries

## Notification System

### Notification Types
- Enable/disable notifications (user preference)
- Filter by trade type (buy only, sell only, both)
- Filter by item (all items, favorites only)
- Filter by profit threshold (only notify if profit > X gp)
- Notification appears in top-right corner of web app
- Real-time via WebSocket connection

## Runelite Client ID
- Generate UUID on first plugin startup
- Store locally in plugin config
- Persist across plugin restarts
- Used to link multiple RuneLite clients to one web account


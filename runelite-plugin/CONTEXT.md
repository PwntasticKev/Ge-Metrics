# RuneLite Plugin Integration - Context & Decisions

## Project Structure
- **Monorepo**: `runelite-plugin/` folder at root level
- **Shared Backend**: Plugin uses same backend as web app
- **Base Reference**: [Flipping-Utilities/rl-plugin](https://github.com/Flipping-Utilities/rl-plugin)
- **Plugin Hub**: Submit to [RuneLite Plugin Hub](https://runelite.net/plugin-hub/)
- **Requirements**: Follow [RuneLite Plugin Hub Guide](https://github.com/runelite/runelite/wiki/Information-about-the-Plugin-Hub)

## Authentication & User Management
- **Login Method**: Users login/create account directly in plugin UI when plugin is downloaded
- **Subscription**: No subscription required to use plugin (we want the data), but subscriptions required for premium features
- **Token Type**: JWT tokens with refresh tokens
- **Session**: Persistent sessions (never log out)
- **Account Linking**: Plugin detects OSRS username from RuneLite client (if possible)
- **Username Verification**: We don't care about username verification - only care they're authenticated
- **Multi-Client**: One RuneLite client = one OSRS account. Multiple clients can connect to one web account
- **Privacy**: Default to private (hide trades from everyone)

## Data Flow & Sync Strategy
- **Primary Source**: RuneLite plugin is primary data source
- **Manual Entries**: Minimal manual entries, website is source of truth when plugin offline
- **Conflict Resolution**: No sync conflicts expected - plugin sends all data
- **Offline Handling**: When client reconnects, send missed trades. Orders will appear when client opens
- **Override Logic**: If manual entry while plugin offline, website data takes precedence

## Trade Tracking
- **Trade States**: Track completed trades, pending offers, partial fills
- **GE Tax**: 2% (not 1%)
- **Partial Fills**: Aggregate partial fills to complete orders (need timeframe for expiration/consolidation)
- **Pending → Completed**: When offer fully fills OR when user cancels remaining quantity
- **Complex Scenarios**: Buy 1000, sell 500, cancel, sell 250, cancel, sell 250 at different price → should group these
- **Canceled Orders**: Only track quantity that was filled before cancel (ignore unfulfilled quantity)
- **Profit Calculation**: Calculate profit after total bought and sold complete
- **Open Positions**: If user buys but never sells, show as "Open Position" (may have many open positions)
- **Incomplete Flips**: If user buys 300 shark but never sells, don't track profit (but show as open position)
- **Matching Algorithm**: FIFO (First In, First Out) for buy/sell pairs
- **Partial Flips**: Handle partial flips (buy 1000, sell 500, sell 200, sell rest)

## Data Structure
- **Per Account**: Separate trade history per OSRS account
- **Trade Events**: Store individual trade events (buy/sell as separate rows)
- **Matched Pairs**: Also store matched pairs (buy + sell combined) for profit tracking
- **Admin Table**: Global admin-only table tracking all trades across all users (for analytics)
- **Rate Limiting**: 5,000 trades per day per web user (not per client)
- **Archiving**: 
  - Daily cron job checking for trades > 1 year old
  - Run once per year on January 1st
  - Archive but keep data accessible to users
  - Users should see all their trades from previous years

## API & Backend
- **Endpoint**: Plugin sends trade data → Backend handles storage
- **Real-time**: WebSocket for live updates - trades appear immediately in web app
- **Notifications**: Real-time notifications in top-right corner when trades bought/sold (configurable)
- **Security**: 
  - Rate limiting (5000 trades/day per user)
  - SQL injection prevention
  - General security best practices
  - Audit logs for suspicious activity (injection attempts, etc.)
- **Data Validation**: 
  - Backend just saves data (trust plugin)
  - Don't validate fake trades (trust plugin)
  - But audit suspicious activity

## UI/UX
- **Plugin UI**: Login/create account UI in plugin, show errors if login fails
- **Web App**: Real-time updates when trades happen
- **Trade History**: Pagination required (don't load all trades at once)
- **Pagination**: Handle users with millions of trades efficiently
- **Notifications**: Multiple notification types (enable/disable, filter by trade type, filter by item, filter by profit threshold)

## Final Technical Decisions
- **Partial Fill Window**: 48 hours OR until offer explicitly canceled/completed
- **Partial Fill Updates**: Update existing event (increment filled_quantity)
- **Complex Scenario Matching**: FIFO approach (match each sell separately)
- **Archive Query**: Query both active and archived tables (union results)
- **Client ID**: UUID generated on first plugin startup, stored locally
- **Session Duration**: As long as client is open + 48 hours grace period


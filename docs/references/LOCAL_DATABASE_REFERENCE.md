# Local Database Reference Guide

## 📊 Database Configuration

### Connection Details
```bash
Database Name: auth_db
Host: localhost
Port: 5432
User: postgres
Password: postgres
Connection String: postgresql://postgres:postgres@localhost:5432/auth_db
```

### Environment Variables
```bash
NODE_ENV=development
LOCAL_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auth_db"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_db
```

## 🗂️ Complete Table List (44 Tables)

### Core Tables
- `users` - User accounts
- `user_sessions` - Active user sessions
- `user_settings` - User preferences
- `user_messages` - Internal messaging
- `notifications` - User notifications

### Trash Voting System
- `user_trash_votes` - User votes marking items as unreliable
- `item_admin_clean` - Admin-cleared items

### Trading & Market Data
- `all_trades_admin` - Admin trade management
- `favorites` - User favorite items
- `item_mapping` - Item ID mappings
- `item_price_history` - Historical price data
- `item_volumes` - Trading volume data
- `method_items` - Money making method items
- `money_making_methods` - User-created methods
- `open_positions` - Active trading positions
- `trade_events` - Trade history
- `trade_matches` - Matched trades
- `user_profits` - User profit tracking
- `user_transactions` - Transaction history
- `user_watchlists` - Price watch lists

### Game Content
- `blogs` - OSRS blog posts
- `game_updates` - Game update tracking
- `osrs_accounts` - OSRS account linking
- `recipes` - Recipe definitions
- `recipe_ingredients` - Recipe components
- `formulas` - Calculation formulas

### Security & Authentication
- `admin_actions` - Admin activity log
- `api_usage_logs` - API usage tracking
- `audit_log` - Security audit trail
- `auth_tokens` - Authentication tokens
- `login_history` - Login records
- `otps` - One-time passwords
- `refresh_tokens` - JWT refresh tokens
- `security_events` - Security incidents

### Social Features
- `clans` - Clan definitions
- `clan_members` - Clan membership
- `clan_invites` - Pending invitations
- `user_achievements` - Achievement tracking
- `user_goals` - User goals
- `user_invitations` - Friend invites

### System & Analytics
- `cron_jobs` - Scheduled jobs
- `cron_job_logs` - Job execution logs
- `revenue_analytics` - Revenue tracking
- `stripe_events` - Payment events
- `subscriptions` - User subscriptions
- `system_metrics` - Performance metrics
- `system_settings` - System configuration

## 🔧 Common Database Commands

### Check Database Status
```bash
# Count all tables
psql -U postgres -d auth_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# List all tables
psql -U postgres -d auth_db -c "\dt"

# Check specific table structure
psql -U postgres -d auth_db -c "\d user_trash_votes"
```

### Trash Voting System
```sql
-- Check trash votes
SELECT * FROM user_trash_votes;

-- Check admin-cleaned items
SELECT * FROM item_admin_clean;

-- Get trash vote statistics
SELECT item_id, item_name, COUNT(*) as vote_count 
FROM user_trash_votes 
GROUP BY item_id, item_name 
ORDER BY vote_count DESC;
```

### Database Sync Commands
```bash
# Sync schema from production
node scripts/sync-database-schema.js

# Run pre-deployment check
.claude/hooks/pre-deployment-db-check.sh

# Apply all migrations
cd server && DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auth_db" npx drizzle-kit push
```

## 🚨 Troubleshooting

### If tables are missing:
1. Check you're connected to `auth_db` (not `kevinlee` or `postgres`)
2. Run the sync script: `psql -U postgres -d auth_db -f sync-to-auth-db.sql`
3. Refresh Postico2 with Cmd+R

### If trash voting isn't working:
1. Verify tables exist: `psql -U postgres -d auth_db -c "SELECT * FROM user_trash_votes;"`
2. Check user exists: `psql -U postgres -d auth_db -c "SELECT id, email FROM users;"`
3. Restart server: `pkill -f "npm run dev" && npm run dev`

## 📝 Notes
- Local development uses `auth_db` database
- Production uses Neon cloud database
- Always ensure NODE_ENV=development for local work
- The server auto-selects database based on NODE_ENV

## Last Synced
- Date: January 22, 2026
- Table Count: 44
- Verified Working: ✅
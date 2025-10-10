# Volume Dump Alert System

A comprehensive system for monitoring OSRS Grand Exchange volume dumps and sending email alerts to users via Mailchimp integration.

## 🚀 Features

### Core Functionality
- **Volume Monitoring**: Tracks high-volume trading activity that may indicate item dumps
- **Email Alerts**: Sends detailed email notifications via Mailchimp API
- **Spam Prevention**: Built-in cooldown system prevents alert spam
- **User Watchlists**: Personalized item monitoring with custom thresholds
- **Settings Management**: User-configurable Mailchimp API keys and alert preferences

### User Interface
- **Watchlist Page**: Manage monitored items with inline editing
- **Settings Page**: Configure Mailchimp API key and alert preferences  
- **Add Item Modal**: Search and add items to watchlist with threshold settings
- **Navigation Integration**: Seamlessly integrated into existing app navigation

## 📋 Database Schema

### New Tables Added

```sql
-- User Mailchimp API key storage
ALTER TABLE users ADD COLUMN mailchimp_api_key VARCHAR(255);

-- User watchlists with alert thresholds
CREATE TABLE watchlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  volume_threshold BIGINT,
  price_drop_threshold FLOAT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- Alert history and tracking
CREATE TABLE volume_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  triggered_volume BIGINT,
  triggered_price INTEGER,
  price_drop_percent FLOAT,
  alert_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spam prevention cooldowns
CREATE TABLE alert_cooldowns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  cooldown_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id, alert_type)
);
```

## 🎯 User Journey

### 1. Initial Setup
1. User navigates to **Settings** page
2. Enters their Mailchimp API key
3. Configures alert preferences (volume alerts, price drop alerts, cooldown period)
4. Tests email connection

### 2. Adding Items to Watchlist
1. User navigates to **Watchlist** page
2. Clicks "Add Item to Watch" button
3. Searches for desired item
4. Sets volume and price drop thresholds
5. Confirms addition to watchlist

### 3. Managing Watchlist
1. View all monitored items in table format
2. Edit thresholds inline by clicking edit icon
3. Remove items from watchlist
4. Monitor alert status (Watching/ALERT)

### 4. Receiving Alerts
1. System monitors items every 5-10 minutes via cron job
2. When thresholds are exceeded, email is sent via Mailchimp
3. Cooldown period prevents spam (default: 60 minutes)
4. Alert history is logged in database

## 🔧 Technical Implementation

### Frontend Components

#### Pages
- `src/pages/Watchlist/index.jsx` - Main watchlist management page
- `src/pages/Settings/index.jsx` - User settings and API key configuration

#### Components
- `src/components/Table/watchlist-table.jsx` - Watchlist table with inline editing
- `src/components/modals/AddToWatchlistModal.jsx` - Item search and addition modal

#### Navigation
- Added Watchlist and Settings links to main navigation
- Integrated with existing routing system

### Backend Services

#### Volume Alert Service
- `src/services/volumeAlertService.js` - Core alert processing logic
- Email generation with HTML and text formats
- Mailchimp API integration
- Cooldown management
- Alert history tracking

#### Monitoring Script
- `scripts/monitorVolumeAlerts.js` - Automated monitoring script
- Designed for cron job execution
- Processes all user watchlists
- Sends alerts when thresholds are exceeded

### API Integration

#### Mailchimp Email Sending
```javascript
// Extract datacenter from API key
const datacenter = apiKey.split('-')[1]
const baseUrl = `https://${datacenter}.api.mailchimp.com/3.0`

// Send transactional email
await sendEmail(apiKey, recipientEmail, subject, htmlContent, textContent)
```

#### OSRS Prices API
- Leverages existing `historyDataService` for volume data
- Monitors latest prices and volume information
- Compares against user-defined thresholds

## 📧 Email Templates

### Volume Dump Alert Email
- **Subject**: 🚨 Volume Dump Alert: [Item Name]
- **Content**: Item details, volume information, threshold comparison
- **Actions**: View item details, manage watchlist, adjust settings
- **Styling**: Professional HTML template with responsive design

### Email Features
- Rich HTML formatting with tables and styling
- Plain text fallback for accessibility
- Direct links to item details and watchlist management
- Unsubscribe functionality
- Branded header and footer

## ⚙️ Configuration & Deployment

### Environment Setup
```bash
# Install dependencies (if needed)
npm install axios

# Run database migrations
npm run db:migrate

# Test the monitoring system
npm run monitor-alerts
```

### Cron Job Setup
```bash
# Edit crontab
crontab -e

# Add monitoring job (every 5 minutes)
0,5,10,15,20,25,30,35,40,45,50,55 * * * * cd /path/to/ge-metrics && npm run monitor-alerts

# Alternative: every 10 minutes
*/10 * * * * cd /path/to/ge-metrics && npm run monitor-alerts
```

### Mailchimp API Key Setup
1. Log into Mailchimp account
2. Navigate to Account → Extras → API keys
3. Generate new API key
4. Copy key to user settings in application
5. Test connection using built-in test feature

## 🛡️ Security & Privacy

### API Key Storage
- Mailchimp API keys stored encrypted in database
- Keys are user-specific and not shared between accounts
- No system-wide API key - each user provides their own

### Spam Prevention
- Configurable cooldown periods (default: 60 minutes)
- Per-user, per-item, per-alert-type cooldowns
- Alert history tracking for audit purposes

### Data Privacy
- Users control their own email preferences
- Unsubscribe functionality in all emails
- Alert data retention policies can be configured

## 📊 Monitoring & Analytics

### Alert Metrics
- Track number of alerts processed per monitoring cycle
- Monitor email delivery success rates
- Log failed alerts for troubleshooting

### Performance Monitoring
```javascript
// Example monitoring output
🔍 Starting watchlist monitoring...
✅ Monitoring complete: 15 alerts processed, 3 emails sent
```

### Database Indexes
- Optimized queries with proper indexing
- Efficient cooldown checking
- Fast watchlist lookups

## 🚨 Troubleshooting

### Common Issues

#### Email Not Sending
1. Verify Mailchimp API key is correct
2. Check API key datacenter matches account region
3. Ensure user has valid email address
4. Check Mailchimp account sending limits

#### Alerts Not Triggering
1. Verify watchlist items are active (`is_active = true`)
2. Check volume thresholds are realistic
3. Confirm monitoring script is running via cron
4. Verify OSRS API data is available for items

#### Performance Issues
1. Monitor database query performance
2. Consider reducing monitoring frequency
3. Implement database connection pooling
4. Add caching for frequently accessed data

### Debugging Commands
```bash
# Test monitoring manually
npm run monitor-alerts

# Check database connections
npm run db:status

# View recent alerts
# SELECT * FROM volume_alerts ORDER BY created_at DESC LIMIT 10;
```

## 🔮 Future Enhancements

### Planned Features
- **Discord Integration**: Alternative to email alerts
- **Price Drop Alerts**: Monitor significant price decreases
- **Bulk Import**: CSV import for watchlist items
- **Alert Analytics**: Dashboard showing alert history and trends
- **Mobile Notifications**: Push notifications for mobile users

### Technical Improvements
- **Real-time Monitoring**: WebSocket-based live monitoring
- **Machine Learning**: Predictive dump detection
- **API Rate Limiting**: Respect OSRS API rate limits
- **Horizontal Scaling**: Support for multiple monitoring instances

## 📚 API Reference

### Volume Alert Service Methods

```javascript
// Monitor all watchlists
await volumeAlertService.monitorWatchlists()

// Process single alert
await volumeAlertService.processVolumeAlert(user, watchlistItem, currentData)

// Test email functionality
await volumeAlertService.testEmailAlert(user, testItemData)

// Check cooldown status
await volumeAlertService.isInCooldown(userId, itemId, alertType)
```

### Database Queries

```javascript
// Get user watchlist
const watchlist = await db.watchlist.findMany({
  where: { user_id: userId, is_active: true }
})

// Check alert cooldown
const cooldown = await db.alert_cooldowns.findFirst({
  where: {
    user_id: userId,
    item_id: itemId,
    alert_type: alertType,
    cooldown_until: { gt: new Date() }
  }
})
```

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Implement changes with proper error handling
3. Add comprehensive logging
4. Test with mock data
5. Update documentation
6. Submit pull request

### Testing Guidelines
- Test email delivery with real Mailchimp accounts
- Verify cooldown mechanisms work correctly
- Ensure database migrations are reversible
- Test with various volume threshold scenarios

---

## 📞 Support

For issues related to the Volume Alert System:
1. Check this documentation first
2. Review application logs for error messages
3. Test Mailchimp API connectivity
4. Verify database schema is up to date
5. Contact system administrator if issues persist

**Last Updated**: December 2024
**Version**: 1.0.0 
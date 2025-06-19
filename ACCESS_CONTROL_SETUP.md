# Access Control & Abnormal Activity Detection Setup Guide

## Overview

This guide covers the implementation of two major features:
1. **User Access Control System** - Require admin approval for all new users
2. **Abnormal Activity Detection** - AI-powered trading anomaly detection for watchlists

## 🔐 Access Control System

### Features Implemented

- **User Registration Approval**: All new users require admin approval before accessing the app
- **Role-Based Access Control**: Admin, Moderator, and User roles with different permissions
- **Admin Panel**: Complete interface for managing user access and permissions
- **Access Denied Page**: Professional page for users awaiting approval

### Database Schema Changes

```sql
-- Add new fields to users table
ALTER TABLE users ADD COLUMN access BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD COLUMN approved_by INTEGER;
ALTER TABLE users ADD COLUMN approved_at TIMESTAMP;
```

### Key Components

1. **Access Control Service** (`src/services/accessControlService.js`)
   - User permission checking
   - Role management
   - Access granting/revoking

2. **Admin Panel** (`src/pages/Admin/index.jsx`)
   - User approval interface
   - Role management
   - Email notifications

3. **Access Denied Page** (`src/pages/AccessDenied/index.jsx`)
   - Professional waiting page
   - Access request functionality

### Usage

#### Check User Access
```javascript
import accessControlService from './services/accessControlService.js'

// Check if user has access
if (!accessControlService.hasAccess(user)) {
  // Redirect to access denied page
  return <AccessDenied />
}

// Check if user is admin
if (accessControlService.isAdmin(user)) {
  // Show admin features
}
```

#### Grant Access (Admin Only)
```javascript
// Grant access to user
await accessControlService.grantAccess(userId, adminId)

// Update user role
await accessControlService.updateRole(userId, 'moderator', adminId)
```

## 🧠 Abnormal Activity Detection

### Features Implemented

- **Statistical Analysis**: Calculates volume/price patterns from historical data
- **Multiple Alert Types**: Volume spikes, price dumps, volatility, and pattern anomalies
- **Confidence Scoring**: AI confidence levels for detected anomalies
- **Smart Thresholds**: Dynamic thresholds based on historical patterns

### Database Schema Changes

```sql
-- Add abnormal activity fields to watchlist
ALTER TABLE watchlist ADD COLUMN price_spike_threshold FLOAT;
ALTER TABLE watchlist ADD COLUMN abnormal_activity BOOLEAN DEFAULT FALSE;

-- Create abnormal activity patterns table
CREATE TABLE abnormal_activity_patterns (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL,
  avg_volume_24h BIGINT,
  avg_volume_7d BIGINT,
  avg_price_change_24h FLOAT,
  price_volatility FLOAT,
  volume_spike_threshold BIGINT,
  last_calculated TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_id)
);
```

### Key Components

1. **Abnormal Activity Service** (`src/services/abnormalActivityService.js`)
   - Statistical analysis engine
   - Pattern detection algorithms
   - Confidence scoring

2. **Enhanced Watchlist Modal** (`src/components/modals/AddToWatchlistModal.jsx`)
   - Smart detection toggle
   - Custom threshold options
   - User-friendly interface

3. **Updated Volume Alert Service** (`src/services/volumeAlertService.js`)
   - Integrated abnormal activity processing
   - Professional email templates
   - Access control integration

### Detection Algorithms

#### Volume Spike Detection
- Compares current volume to 24-hour average
- Triggers on 3x+ normal volume
- Considers statistical significance

#### Price Anomaly Detection
- Monitors price changes beyond normal volatility
- Detects both dumps and spikes
- Uses standard deviation analysis

#### Pattern Analysis
- Z-score calculations for volume patterns
- Volatility threshold monitoring
- Historical trend analysis

### Usage

#### Enable Smart Detection
```javascript
// Add item with abnormal activity detection
const watchlistData = {
  item_id: 4151,
  abnormal_activity: true, // Enable AI detection
  volume_threshold: null,  // No manual thresholds needed
  price_drop_threshold: null
}
```

#### Manual Analysis
```javascript
import abnormalActivityService from './services/abnormalActivityService.js'

// Analyze item for abnormal patterns
const analysis = await abnormalActivityService.detectAbnormalActivity(itemId, currentData)

if (analysis.isAbnormal) {
  console.log('Alerts:', analysis.alerts)
  console.log('Confidence:', analysis.confidence)
}
```

## 🚀 Setup Instructions

### 1. Database Migration

Run the database migrations to add the new fields:

```bash
# If using Prisma
npx prisma db push

# Or run SQL directly
psql -d your_database -f migrations/access_control.sql
```

### 2. Update Master User

Ensure your master admin user has access:

```sql
UPDATE users 
SET access = TRUE, role = 'admin', approved_at = CURRENT_TIMESTAMP 
WHERE email = 'admin@test.com';
```

### 3. Environment Configuration

Add any required environment variables:

```bash
# .env file
ADMIN_EMAIL=admin@test.com
ACCESS_CONTROL_ENABLED=true
ABNORMAL_DETECTION_ENABLED=true
```

### 4. Start Services

Start the monitoring services:

```bash
# Start volume alert monitoring
npm run monitor-alerts

# Start abnormal activity pattern calculation (if implemented)
npm run calculate-patterns
```

## 🎯 User Flow

### New User Registration
1. User creates account → `access: false` by default
2. User sees "Access Denied" page with request option
3. Admin receives notification in Admin Panel
4. Admin reviews and approves/rejects user
5. User receives email notification
6. Approved user gains full access

### Abnormal Activity Monitoring
1. User adds item to watchlist with "Smart Detection"
2. System analyzes historical patterns
3. Monitors real-time data for anomalies
4. Sends email alerts when patterns detected
5. Respects cooldown periods to prevent spam

## 🔧 Configuration Options

### Access Control Settings
```javascript
// In accessControlService.js
const settings = {
  requireApproval: true,
  defaultRole: 'user',
  autoApproveEmails: [], // Emails to auto-approve
  maxPendingDays: 30     // Auto-reject after 30 days
}
```

### Abnormal Activity Thresholds
```javascript
// In abnormalActivityService.js
const thresholds = {
  VOLUME_SPIKE_MULTIPLIER: 3.0,      // 3x normal volume
  PRICE_SPIKE_PERCENTAGE: 20.0,      // 20% price change
  VOLATILITY_THRESHOLD: 0.15,        // 15% volatility
  MIN_VOLUME_FOR_ANALYSIS: 1000,     // Minimum volume
  ANALYSIS_WINDOW_HOURS: 24          // Hours of history
}
```

## 📊 Monitoring & Analytics

### Admin Dashboard Metrics
- Pending user requests
- Approval/rejection rates
- User activity levels
- System health status

### Abnormal Activity Metrics
- Items monitored
- Alerts generated
- Confidence score distribution
- False positive rates

## 🔒 Security Considerations

### Access Control
- All admin actions are logged
- Role changes require admin approval
- Master admin account cannot be modified
- Session management with proper logout

### Data Privacy
- User data is encrypted in transit
- Email addresses are protected
- Activity logs are anonymized
- GDPR compliance considerations

## 🚨 Troubleshooting

### Common Issues

#### Users Not Getting Approved
- Check admin panel for pending requests
- Verify email notifications are working
- Ensure database permissions are correct

#### Abnormal Activity Not Detecting
- Verify historical data is available
- Check item volume thresholds
- Review statistical calculations
- Confirm email service is configured

#### Performance Issues
- Monitor database query performance
- Consider caching statistical calculations
- Optimize historical data queries
- Review alert processing frequency

### Debug Commands

```bash
# Check user access status
node -e "console.log(require('./src/services/accessControlService.js').hasAccess({access: true}))"

# Test abnormal activity detection
node -e "require('./src/services/abnormalActivityService.js').detectAbnormalActivity(4151, {volume: 50000})"

# Monitor alert processing
npm run monitor-alerts -- --debug
```

## 📈 Future Enhancements

### Access Control
- OAuth integration (Google, Discord)
- Two-factor authentication
- Audit log viewer
- Bulk user management

### Abnormal Activity
- Machine learning model training
- Market sentiment analysis
- Cross-item correlation detection
- Predictive anomaly forecasting

## 📞 Support

For technical support or questions:
- Email: admin@ge-metrics.com
- Documentation: [Link to full docs]
- Issue Tracker: [GitHub issues]

---

**Note**: This system is designed for production use with proper database connections, email services, and security measures. The current implementation includes mock data for development and testing purposes. 
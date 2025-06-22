# GE Metrics - Comprehensive Feature Documentation

## Overview

This document covers all the major features and updates implemented in the GE Metrics application, including authentication, security, data processing, and testing frameworks.

## Table of Contents

1. [High Volumes Data Fix](#high-volumes-data-fix)
2. [2% Tax Calculation Update](#2-tax-calculation-update)
3. [OTP (Two-Factor Authentication) System](#otp-two-factor-authentication-system)
4. [Master Password & Admin Access](#master-password--admin-access)
5. [Database Schema Updates](#database-schema-updates)
6. [Unit Testing Framework](#unit-testing-framework)
7. [Security Features](#security-features)
8. [API Integration](#api-integration)
9. [Setup & Deployment](#setup--deployment)

---

## High Volumes Data Fix

### Problem
The high volumes page was not displaying items with volume data due to incorrect data processing in the volume data fetching pipeline.

### Solution
Fixed the data processing pipeline in multiple files:

#### Files Updated:
- `src/utils/item-data.jsx` - Fixed volume data processing
- `src/utils/utils.jsx` - Updated profit calculations
- `src/api/rs-wiki-api.jsx` - Ensured proper API integration

#### Key Changes:
```javascript
// Fixed volume data processing
setVolumesById(volumeData.data.data || volumeData.data)

// Updated allItems function call
setAllItems(allItems(mapItems, pricesById.data || pricesById, volumesById))
```

### Usage
The high volumes page now properly displays items sorted by volume (highest first) and only shows items with valid volume data.

---

## 2% Tax Calculation Update

### Problem
The game introduced a 2% tax on Grand Exchange transactions, but the profit calculations were still using the old 1% tax rate.

### Solution
Updated all profit calculation formulas from 0.99 (1% tax) to 0.98 (2% tax).

#### Files Updated:
- `src/utils/utils.jsx` - Updated profit calculations in multiple functions

#### Key Changes:
```javascript
// Before (1% tax)
Math.floor(Number(priceById.high) * 0.99 - Number(priceById.low))

// After (2% tax)
Math.floor(Number(priceById.high) * 0.98 - Number(priceById.low))
```

### Impact
All profit calculations now accurately reflect the current 2% Grand Exchange tax, providing users with more accurate profit estimates.

---

## OTP (Two-Factor Authentication) System

### Features
- **TOTP Support**: Google Authenticator, Authy, and other TOTP apps
- **QR Code Generation**: Easy setup with QR code scanning
- **Backup Codes**: 10 backup codes for account recovery
- **SMS Backup**: Optional phone number for SMS verification
- **Manual Entry**: Secret key for manual authenticator setup

### Components

#### OTPService (`src/services/otpService.js`)
Comprehensive service handling all OTP operations:

```javascript
import otpService from './services/otpService.js'

// Generate TOTP secret
const secret = otpService.generateTOTPSecret()

// Setup OTP for user
const setup = await otpService.setupOTP(userId, userEmail)

// Verify TOTP token
const isValid = otpService.verifyTOTP(secret, token)

// Enable/disable OTP
await otpService.enableOTP(userId, verificationToken)
await otpService.disableOTP(userId)
```

#### OTPSettings Component (`src/components/OTP/OTPSettings.jsx`)
React component for managing OTP settings:

- Toggle OTP on/off
- QR code display for setup
- Backup codes management
- Phone number configuration
- Visual status indicators

### Database Schema
```sql
-- Users table additions
ALTER TABLE users 
ADD COLUMN phone_number VARCHAR(20),
ADD COLUMN otp_enabled BOOLEAN DEFAULT false,
ADD COLUMN otp_secret VARCHAR(255),
ADD COLUMN backup_codes TEXT;

-- OTP tokens table
CREATE TABLE otp_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(10) NOT NULL,
    token_type VARCHAR(20) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Setup Instructions
1. User navigates to Settings page
2. Clicks on Two-Factor Authentication toggle
3. Scans QR code with authenticator app
4. Saves backup codes securely
5. Enters verification code to enable OTP
6. OTP is now required for login

---

## Master Password & Admin Access

### Features
- **Master Password**: Super admin password for accessing any user account
- **Dual Authentication**: Master password + OTP verification
- **Audit Logging**: All master access attempts are logged
- **Session Management**: Time-limited access sessions
- **Access Reasoning**: Required justification for access

### Components

#### MasterAccessModal (`src/components/admin/MasterAccessModal.jsx`)
Secure modal for master access authentication:

```javascript
// Usage in admin panel
<MasterAccessModal
  opened={modalOpened}
  onClose={() => setModalOpened(false)}
  targetUser={selectedUser}
  adminUser={currentAdmin}
/>
```

#### Master Access Flow
1. **Step 1**: Admin enters master password and access reason
2. **Step 2**: OTP sent to admin's phone/email
3. **Step 3**: Admin enters OTP to complete authentication
4. **Step 4**: Access granted with time-limited session token

### Security Features
- Master password is hashed with SHA256
- OTP verification required after master password
- All access attempts logged with:
  - Admin user ID
  - Target user ID
  - Access reason
  - IP address
  - User agent
  - Session duration

### Database Schema
```sql
-- Master access logs
CREATE TABLE master_access_logs (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER NOT NULL,
    target_user_id INTEGER NOT NULL,
    access_reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_duration INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Configuration
Set environment variables:
```bash
MASTER_PASSWORD_HASH=your-sha256-hash
ADMIN_PHONE_NUMBER=+1234567890
ADMIN_EMAIL=admin@ge-metrics.com
```

---

## Database Schema Updates

### Complete Migration
Run the complete schema migration:
```bash
psql -d your_database -f prisma/migrations/complete_schema_update.sql
```

### New Tables Created
1. **otp_tokens** - Temporary OTP storage
2. **master_access_logs** - Admin access audit trail
3. **item_price_history** - Historical price/volume data
4. **watchlist** - User item watchlists
5. **volume_alerts** - Alert history
6. **alert_cooldowns** - Spam prevention
7. **abnormal_activity_patterns** - AI pattern analysis

### Updated Tables
- **users** - Added OTP and security fields

### Indexes & Optimization
- Strategic indexes on frequently queried columns
- Foreign key constraints for data integrity
- Automatic cleanup functions for expired data

---

## Unit Testing Framework

### Test Utilities (`src/tests/testUtils.js`)
Comprehensive testing utilities including:

- **Mock Data**: Users, items, alerts, etc.
- **Providers**: React Query, Router, Mantine
- **Helpers**: Async waiting, element checks
- **Mocked Services**: OTP, alerts, access control

### Sample Test Structure
```javascript
import { renderWithProviders, mockUser } from '../testUtils'
import OTPSettings from '../../components/OTP/OTPSettings'

describe('OTPSettings Component', () => {
  it('renders correctly when OTP is disabled', () => {
    renderWithProviders(
      <OTPSettings user={mockUser} onUpdate={jest.fn()} />
    )
    
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })
})
```

### Test Coverage Areas
- Component rendering and state management
- User interactions and form submissions
- API service calls and error handling
- Authentication and authorization flows
- Data processing and calculations

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test OTPSettings.test.js

# Run with coverage
npm test -- --coverage
```

---

## Security Features

### Authentication & Authorization
- **Role-based Access Control**: Admin, Moderator, User roles
- **User Approval System**: Admin approval required for new users
- **Access Permissions**: Granular permission system
- **Session Management**: Secure session handling

### Data Protection
- **Password Hashing**: bcrypt for user passwords
- **Master Password**: SHA256 hashed master password
- **OTP Secrets**: Encrypted TOTP secrets
- **Backup Codes**: Secure backup code generation

### Audit & Monitoring
- **Access Logs**: Complete audit trail
- **Failed Login Tracking**: Brute force protection
- **OTP Verification Logs**: 2FA usage tracking
- **Admin Action Logging**: All admin actions logged

---

## API Integration

### OSRS Prices API
Updated integration with enhanced volume data processing:

```javascript
// Enhanced API calls
export const getVolumeData = () => {
  return axios.get('https://prices.runescape.wiki/api/v1/osrs/latest')
}

// Historical data
export const get5MinuteData = (timestamp) => {
  const url = timestamp
    ? `https://prices.runescape.wiki/api/v1/osrs/5m?timestamp=${timestamp}`
    : 'https://prices.runescape.wiki/api/v1/osrs/5m'
  return axios.get(url)
}
```

### Email Services
- **Mailchimp Integration**: User-specific API keys
- **OTP Email Templates**: Professional HTML emails
- **Alert Notifications**: Volume dump and price alerts

### SMS Services (Ready for Integration)
- **Twilio Support**: SMS OTP delivery
- **International Numbers**: Global phone number support
- **Delivery Confirmation**: SMS delivery tracking

---

## Setup & Deployment

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ge_metrics

# Security
MASTER_PASSWORD_HASH=your-sha256-hash
JWT_SECRET=your-jwt-secret

# Communications
ADMIN_PHONE_NUMBER=+1234567890
ADMIN_EMAIL=admin@ge-metrics.com
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# API Keys
MAILCHIMP_API_KEY=your-mailchimp-key
```

### Installation Steps
1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd ge-metrics
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   ```bash
   # Run schema migration
   psql -d your_database -f prisma/migrations/complete_schema_update.sql
   
   # Or using Prisma
   npx prisma migrate deploy
   ```

4. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Start Authentication Server**
   ```bash
   cd server
   node ultra-simple-auth.mjs
   ```

### Production Deployment
1. **Build Application**
   ```bash
   npm run build
   ```

2. **Set Production Environment Variables**
3. **Run Database Migrations**
4. **Start Production Servers**
5. **Configure Reverse Proxy** (nginx/Apache)
6. **Set up SSL Certificates**
7. **Configure Monitoring & Logging**

### Testing Deployment
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

---

## Troubleshooting

### Common Issues

#### High Volumes Page Not Loading
- Check API connectivity to OSRS prices API
- Verify volume data processing in `item-data.jsx`
- Check browser console for JavaScript errors

#### OTP Setup Failing
- Verify QR code generation service is accessible
- Check that TOTP secret generation is working
- Ensure database OTP tables exist

#### Master Access Not Working
- Verify master password hash is set correctly
- Check OTP service configuration
- Ensure admin has proper permissions

#### Volume Alerts Not Sending
- Check Mailchimp API key configuration
- Verify user has email notifications enabled
- Check alert cooldown settings

### Debug Commands
```bash
# Check database connections
npm run db:check

# Test email service
npm run test:email

# Verify OTP service
npm run test:otp

# Run system health check
npm run health:check
```

---

## Future Enhancements

### Planned Features
1. **Mobile App**: React Native mobile application
2. **Advanced Analytics**: Machine learning price predictions
3. **Social Features**: User groups and shared watchlists
4. **API Rate Limiting**: Enhanced API protection
5. **Caching Layer**: Redis caching for performance
6. **Real-time Updates**: WebSocket price updates
7. **Export Features**: Data export to CSV/Excel
8. **Backup System**: Automated database backups

### Performance Optimizations
1. **Database Indexing**: Additional strategic indexes
2. **Query Optimization**: Optimize slow queries
3. **Caching Strategy**: Implement comprehensive caching
4. **CDN Integration**: Static asset optimization
5. **Code Splitting**: Lazy loading for components

---

## Support & Maintenance

### Monitoring
- **Application Logs**: Centralized logging system
- **Performance Metrics**: Response time monitoring
- **Error Tracking**: Automated error reporting
- **Uptime Monitoring**: Service availability tracking

### Backup Strategy
- **Database Backups**: Daily automated backups
- **Code Repository**: Version control with Git
- **Configuration Backup**: Environment settings backup
- **Recovery Procedures**: Documented recovery steps

### Updates & Patches
- **Security Updates**: Regular dependency updates
- **Feature Releases**: Planned feature rollouts
- **Bug Fixes**: Rapid bug fix deployment
- **Database Migrations**: Safe schema updates

---

## Contact & Support

For technical support or questions about this documentation:

- **Email**: admin@ge-metrics.com
- **Documentation**: This file and inline code comments
- **Issue Tracking**: GitHub Issues (if applicable)
- **Development Team**: Internal development team

---

## Dependency Management & Build Verification

### Rule: Always Verify Build Success
**CRITICAL**: Before any feature is considered complete or any code is delivered, the application **MUST** be successfully built to prevent runtime errors due to missing dependencies or other build-time issues.

### Workflow:
1.  **Add Dependencies**: When adding new functionality that requires a new package, install it using `npm install <package-name>`.
2.  **Verify Build**: After installing dependencies and implementing the new feature, run `npm run build` locally.
3.  **Resolve Errors**: If the build fails (e.g., due to a missing package or import error), resolve the issue immediately.
4.  **Deliver**: Only deliver code after a successful build.

This process ensures that the application is always in a working, buildable state, and prevents errors like the one you just encountered.

---

*Last Updated: December 2024*
*Version: 2.0.0* 
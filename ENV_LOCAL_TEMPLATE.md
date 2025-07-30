# Environment Variables Template for .env.local

Copy this content to a `.env.local` file in your project root:

```bash
# GE Metrics Local Environment Variables

# =============================================================================
# STRIPE CONFIGURATION (DISABLED FOR NOW)
# =============================================================================

# Stripe Configuration (commented out - uncomment when needed)
# REACT_APP_STRIPE_PUBLISHABLE_KEY_DEV=pk_test_your_development_key_here
# REACT_APP_STRIPE_PRICE_ID_MONTHLY_DEV=price_development_monthly_id
# REACT_APP_STRIPE_PUBLISHABLE_KEY_PROD=pk_live_your_production_key_here
# REACT_APP_STRIPE_PRICE_ID_MONTHLY_PROD=price_production_monthly_id

# =============================================================================
# API CONFIGURATION
# =============================================================================

# API Base URL
REACT_APP_API_URL=http://localhost:3001/api

# =============================================================================
# DEVELOPMENT SETTINGS
# =============================================================================

# Authentication Bypass (Development Only)
REACT_APP_BYPASS_AUTH=false
REACT_APP_DEV_EMAIL=dev@ge-metrics.com
REACT_APP_DEV_PASSWORD=
REACT_APP_DEV_NAME=Development User

# Development/Debug Settings
REACT_APP_ENABLE_LOGGING=true
REACT_APP_LOG_LEVEL=debug
REACT_APP_USE_MOCK_DATA=false
REACT_APP_MOCK_API=false

# =============================================================================
# FEATURE FLAGS
# =============================================================================

REACT_APP_ENABLE_SUBSCRIPTIONS=true
REACT_APP_ENABLE_COMMUNITY=true
REACT_APP_ENABLE_ADMIN=true
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_NOTIFICATIONS=true

# =============================================================================
# EXTERNAL SERVICES (OPTIONAL)
# =============================================================================

# Discord Integration
REACT_APP_DISCORD_WEBHOOK=https://discord.com/api/webhooks/your/webhook/url
REACT_APP_DISCORD_INVITE=https://discord.gg/your-server-invite

# Analytics
REACT_APP_GA_ID=G-XXXXXXXXXX
REACT_APP_HOTJAR_ID=your_hotjar_id
REACT_APP_MIXPANEL_TOKEN=your_mixpanel_token

# Firebase Configuration (if using Firebase for authentication)
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-firebase-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id
```

## 🚨 **STRIPE DISABLED**

Stripe configuration has been disabled for now. When you need it:

1. **Uncomment the Stripe configuration** in `src/config/environment.js`
2. **Uncomment the Stripe environment variables** in your `.env.local` file
3. **Add your actual Stripe keys** when ready for production

## 🔧 **How to Set Up (When Needed)**

1. **Create `.env.local` file:**
   ```bash
   cp environment.example .env.local
   ```

2. **Edit `.env.local` and uncomment Stripe variables:**
   ```bash
   nano .env.local
   ```

3. **For production deployment platforms (Vercel, Netlify, etc.):**
   - Add `REACT_APP_STRIPE_PUBLISHABLE_KEY_PROD` to your environment variables
   - Add `REACT_APP_STRIPE_PRICE_ID_MONTHLY_PROD` to your environment variables

## ⚠️ **Security Notes**

- **Never commit `.env.local` to version control**
- **Use test keys for development**
- **Use live keys only for production**
- **The app automatically switches between dev/prod keys based on NODE_ENV**

## 🔍 **Current Configuration**

Stripe configuration is currently **disabled** in `src/config/environment.js`. When you need it:

```javascript
// Uncomment this section when ready for Stripe
stripe: {
  publishableKey: isDevelopment
    ? process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY_DEV
    : process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY_PROD,
  // ...
}
```

This means:
- **Currently:** No Stripe integration
- **When enabled:** Automatically switches between dev/prod keys based on NODE_ENV 
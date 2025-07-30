# Development Setup Guide

## 🔐 Authentication Bypass for Development

To quickly bypass authentication during development, set the following environment variable:

```bash
# In your .env.local file
REACT_APP_BYPASS_AUTH=true
```

This will automatically log you in with a mock user that has admin privileges.

### Mock User Details
- **Email:** dev@ge-metrics.com
- **Username:** dev_user
- **Name:** Development User
- **Role:** Admin
- **Subscription:** Premium

## 🚀 Quick Start

### 1. Enable Authentication Bypass
```bash
# Copy environment template
cp environment.example .env.local

# Edit .env.local and set:
REACT_APP_BYPASS_AUTH=true
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Access the Application
- Navigate to `http://localhost:5173`
- You'll be automatically logged in as the development user
- No login form or authentication required

## 🔧 Environment Variables

### Authentication Bypass
```bash
# Enable/disable authentication bypass
REACT_APP_BYPASS_AUTH=true|false

# Development user details (only used if bypass is disabled)
REACT_APP_DEV_EMAIL=dev@ge-metrics.com
REACT_APP_DEV_PASSWORD=
REACT_APP_DEV_NAME=Development User
```

### API Configuration
```bash
# API base URL
REACT_APP_API_URL=http://localhost:3001/api

# Development settings
REACT_APP_ENABLE_LOGGING=true
REACT_APP_LOG_LEVEL=debug
REACT_APP_USE_MOCK_DATA=false
REACT_APP_MOCK_API=false
```

## 🛡️ Security Notes

1. **Development Only:** Authentication bypass only works in development mode
2. **Environment Check:** The bypass is automatically disabled in production
3. **No Credentials:** No test passwords are stored in the codebase
4. **Mock User:** Uses a predefined mock user with admin privileges
5. **Easy Toggle:** Simply change `REACT_APP_BYPASS_AUTH` to enable/disable

## 🔄 Switching Between Modes

### Enable Authentication Bypass
```bash
REACT_APP_BYPASS_AUTH=true
```

### Disable Authentication Bypass
```bash
REACT_APP_BYPASS_AUTH=false
```

When disabled, you'll need to use proper authentication with the server.

## 📝 Development Workflow

1. **Start with bypass enabled** for quick development
2. **Test authentication flows** by temporarily disabling bypass
3. **Use mock data** for rapid prototyping
4. **Switch to real API** when testing integration

## 🚨 Important

- Authentication bypass is **automatically disabled** in production builds
- No test credentials are stored in the codebase
- The mock user has full admin privileges for development
- This feature is only available in development mode 
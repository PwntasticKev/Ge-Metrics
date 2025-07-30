// Environment configuration for GE Metrics
// Handles different settings for development, staging, and production environments

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

// Base configuration
const config = {
  // Environment flags
  isDevelopment,
  isProduction,
  isTest,

  // Authentication Configuration
  auth: {
    // Development authentication bypass
    bypassAuth: isDevelopment && process.env.REACT_APP_BYPASS_AUTH === 'true',
    mockUser: isDevelopment
      ? {
          id: 'dev-user-id',
          email: 'dev@ge-metrics.com',
          username: 'dev_user',
          name: 'Development User',
          role: 'admin',
          subscription: 'premium',
          isActive: true
        }
      : null
  },

  // API Configuration
  api: {
    baseUrl: isDevelopment
      ? process.env.REACT_APP_API_URL || 'http://localhost:3001/api'
      : process.env.REACT_APP_API_URL || 'https://api.ge-metrics.com/api',

    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second

    // API endpoints
    endpoints: {
      // Core data endpoints
      items: '/items',
      prices: '/prices',
      charts: '/charts',

      // User/Auth endpoints
      auth: '/auth',
      users: '/users',
      profile: '/profile',

      // Community features
      leaderboard: '/leaderboard',
      clans: '/clans',
      invitations: '/invitations',
      achievements: '/achievements',

      // Trading features
      trades: '/trades',
      watchlist: '/watchlist',
      alerts: '/alerts',

      // Market data
      marketWatch: '/market-watch',
      indexes: '/indexes',
      predictions: '/predictions',

      // Admin
      admin: '/admin',
      analytics: '/analytics'
    }
  },

  // Database Configuration
  database: {
    // Connection settings would be handled server-side
    // Client only needs to know about local storage keys
    localStorageKeys: {
      authToken: 'ge_metrics_auth_token',
      userPreferences: 'ge_metrics_user_prefs',
      watchlist: 'ge_metrics_watchlist',
      tradeHistory: 'ge_metrics_trades',
      themeMode: 'ge_metrics_theme',
      gameMode: 'ge_metrics_game_mode',
      subscriptionStatus: 'ge_metrics_subscription'
    }
  },

  // Stripe Configuration (disabled for now)
  // stripe: {
  //   publishableKey: isDevelopment
  //     ? process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY_DEV
  //     : process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY_PROD,
  //   priceIds: {
  //     monthly: isDevelopment
  //       ? process.env.REACT_APP_STRIPE_PRICE_ID_MONTHLY_DEV
  //       : process.env.REACT_APP_STRIPE_PRICE_ID_MONTHLY_PROD
  //   }
  // },

  // Firebase Configuration (if using Firebase for auth)
  firebase: {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  },

  // Application Settings
  app: {
    name: 'GE Metrics',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    homepage: isDevelopment ? 'http://localhost:3000' : 'https://ge-metrics.com',
    supportEmail: 'support@ge-metrics.com',

    // Feature flags
    features: {
      subscriptions: process.env.REACT_APP_ENABLE_SUBSCRIPTIONS !== 'false',
      community: process.env.REACT_APP_ENABLE_COMMUNITY !== 'false',
      admin: process.env.REACT_APP_ENABLE_ADMIN !== 'false',
      analytics: process.env.REACT_APP_ENABLE_ANALYTICS !== 'false',
      notifications: process.env.REACT_APP_ENABLE_NOTIFICATIONS !== 'false'
    },

    // UI Configuration
    ui: {
      itemsPerPage: 100,
      chartUpdateInterval: isDevelopment ? 5000 : 1000, // 5s dev, 1s prod
      leaderboardUpdateInterval: 60000, // 1 minute
      priceUpdateInterval: 1000, // 1 second for live updates
      maxWatchlistItems: 50,
      maxClanMembers: 50
    },

    // Business Logic Configuration
    business: {
      // Subscription pricing
      subscription: {
        monthlyPrice: 3.00,
        currency: 'USD',
        trialDays: 7
      },

      // Ranking system
      ranks: {
        bronze: 10000000, // 10M
        iron: 30000000, // 30M
        steel: 50000000, // 50M
        mithril: 70000000, // 70M
        adamant: 90000000, // 90M
        rune: 130000000, // 130M
        dragon: 190000000, // 190M
        barrows: 270000000, // 270M
        torva: 370000000 // 370M
      },

      // Rate limiting
      rateLimits: {
        tradesPerHour: 100,
        invitesPerDay: 10,
        apiCallsPerMinute: isDevelopment ? 1000 : 60
      }
    }
  },

  // External Services
  external: {
    // Discord integration
    discord: {
      webhookUrl: process.env.REACT_APP_DISCORD_WEBHOOK,
      inviteUrl: process.env.REACT_APP_DISCORD_INVITE || 'https://discord.gg/your-server'
    },

    // OSRS Official API
    osrs: {
      geUrl: 'https://secure.runescape.com/m=itemdb_oldschool/api/catalogue/detail.json',
      graphUrl: 'https://secure.runescape.com/m=itemdb_oldschool/api/graph/',
      timeout: 10000
    },

    // Analytics
    analytics: {
      googleAnalyticsId: process.env.REACT_APP_GA_ID,
      hotjarId: process.env.REACT_APP_HOTJAR_ID,
      mixpanelToken: process.env.REACT_APP_MIXPANEL_TOKEN
    }
  },

  // Security Configuration
  security: {
    // CORS settings (for reference, actual CORS handled server-side)
    allowedOrigins: isDevelopment
      ? ['http://localhost:3000', 'http://localhost:3001']
      : ['https://ge-metrics.com', 'https://api.ge-metrics.com'],

    // Session configuration
    session: {
      tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
      refreshThreshold: 60 * 60 * 1000, // 1 hour before expiry
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000 // 15 minutes
    },

    // Validation rules
    validation: {
      passwordMinLength: 8,
      usernameMinLength: 3,
      usernameMaxLength: 20,
      clanNameMaxLength: 50,
      maxFileUploadSize: 5 * 1024 * 1024 // 5MB
    }
  },

  // Development/Debug Configuration
  debug: {
    enableLogging: isDevelopment || process.env.REACT_APP_ENABLE_LOGGING === 'true',
    logLevel: process.env.REACT_APP_LOG_LEVEL || (isDevelopment ? 'debug' : 'error'),
    enableReduxDevTools: isDevelopment,
    mockData: isDevelopment && process.env.REACT_APP_USE_MOCK_DATA === 'true',
    apiMocking: isDevelopment && process.env.REACT_APP_MOCK_API === 'true'
  }
}

// Validation function to ensure required environment variables are set
export const validateEnvironment = () => {
  const required = []
  const missing = []

  // Add required environment variables based on features
  // Note: Stripe validation is disabled since Stripe is not currently used
  // if (config.app.features.subscriptions) {
  //   required.push('REACT_APP_STRIPE_PUBLISHABLE_KEY_' + (isDevelopment ? 'DEV' : 'PROD'))
  // }

  // Check for missing variables
  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key)
    }
  })

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing)
    if (isProduction) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }
  }

  return missing.length === 0
}

// Helper functions
export const getApiUrl = (endpoint = '') => {
  const baseUrl = config.api.baseUrl
  const endpointPath = config.api.endpoints[endpoint] || endpoint
  return `${baseUrl}${endpointPath}`
}

export const isFeatureEnabled = (feature) => {
  return config.app.features[feature] ?? false
}

export const getLocalStorageKey = (key) => {
  return config.database.localStorageKeys[key] || key
}

export const getRankThreshold = (rank) => {
  return config.app.business.ranks[rank] || 0
}

// Environment-specific overrides
const environmentOverrides = {
  development: {
    debug: {
      enableLogging: true,
      logLevel: 'debug',
      apiMocking: process.env.REACT_APP_MOCK_API === 'true'
    }
  },

  test: {
    api: {
      baseUrl: 'http://localhost:3001/api',
      timeout: 5000
    },
    debug: {
      enableLogging: false,
      mockData: true,
      apiMocking: true
    }
  },

  production: {
    debug: {
      enableLogging: false,
      logLevel: 'error',
      mockData: false,
      apiMocking: false
    },
    api: {
      retryAttempts: 3,
      timeout: 30000
    }
  }
}

// Apply environment-specific overrides
if (environmentOverrides[process.env.NODE_ENV]) {
  Object.assign(config, environmentOverrides[process.env.NODE_ENV])
}

// Initialize environment validation
validateEnvironment()

export default config

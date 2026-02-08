import { z } from 'zod'
import { config } from './index.js'

/**
 * Enhanced environment variable validation for production readiness.
 * This validates all critical configuration and fails fast with clear error messages.
 */

// Define critical environment variables that MUST be present in production
const productionRequiredVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET', 
  'JWT_REFRESH_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'FRONTEND_URL'
] as const

// Define recommended variables for full production features
const productionRecommendedVars = [
  'STRIPE_PRICE_MONTHLY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY', 
  'AWS_REGION',
  'S3_BACKUP_BUCKET',
  'SES_FROM_EMAIL'
] as const

/**
 * Validates that all required environment variables are present and properly formatted
 */
export function validateEnvironmentVariables(): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const isProduction = config.NODE_ENV === 'production'

  console.log(`🔍 Validating environment variables for ${config.NODE_ENV} environment...`)

  // Check critical variables
  for (const varName of productionRequiredVars) {
    const value = process.env[varName]
    
    if (!value || value.trim().length === 0) {
      const message = `❌ CRITICAL: Missing required environment variable: ${varName}`
      
      if (isProduction) {
        errors.push(message)
      } else {
        warnings.push(`⚠️  ${message} (required for production)`)
      }
    }
  }

  // Validate specific format requirements
  validateJWTSecrets(errors, warnings, isProduction)
  validateStripeKeys(errors, warnings, isProduction)
  validateDatabaseURL(errors, warnings, isProduction)
  validateURLs(errors, warnings, isProduction)

  // Check recommended variables for production
  if (isProduction) {
    for (const varName of productionRecommendedVars) {
      const value = process.env[varName]
      
      if (!value || value.trim().length === 0) {
        warnings.push(`⚠️  Missing recommended environment variable: ${varName}`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates JWT secrets meet security requirements
 */
function validateJWTSecrets(errors: string[], warnings: string[], isProduction: boolean) {
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET

  if (jwtAccessSecret) {
    if (jwtAccessSecret.length < 32) {
      const message = `JWT_ACCESS_SECRET must be at least 32 characters (current: ${jwtAccessSecret.length})`
      isProduction ? errors.push(`❌ SECURITY: ${message}`) : warnings.push(`⚠️  ${message}`)
    }
    
    if (jwtAccessSecret.length < 64) {
      warnings.push(`⚠️  JWT_ACCESS_SECRET should be 64+ characters for optimal security (current: ${jwtAccessSecret.length})`)
    }

    // Check for weak/default secrets
    if (jwtAccessSecret.includes('your-secret') || jwtAccessSecret.includes('changeme') || jwtAccessSecret === 'secret') {
      const message = `JWT_ACCESS_SECRET appears to be using a default/weak value`
      isProduction ? errors.push(`❌ SECURITY: ${message}`) : warnings.push(`⚠️  ${message}`)
    }
  }

  if (jwtRefreshSecret) {
    if (jwtRefreshSecret.length < 32) {
      const message = `JWT_REFRESH_SECRET must be at least 32 characters (current: ${jwtRefreshSecret.length})`
      isProduction ? errors.push(`❌ SECURITY: ${message}`) : warnings.push(`⚠️  ${message}`)
    }

    if (jwtAccessSecret === jwtRefreshSecret && jwtAccessSecret) {
      const message = `JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different`
      isProduction ? errors.push(`❌ SECURITY: ${message}`) : warnings.push(`⚠️  ${message}`)
    }
  }
}

/**
 * Validates Stripe configuration
 */
function validateStripeKeys(errors: string[], warnings: string[], isProduction: boolean) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripePriceMonthly = process.env.STRIPE_PRICE_MONTHLY

  if (stripeSecretKey) {
    // Check if using test key in production
    if (isProduction && stripeSecretKey.startsWith('sk_test_')) {
      errors.push(`❌ BILLING: Using Stripe test key in production (STRIPE_SECRET_KEY starts with sk_test_)`)
    }
    
    // Check if using live key in development
    if (!isProduction && stripeSecretKey.startsWith('sk_live_')) {
      warnings.push(`⚠️  Using Stripe live key in ${config.NODE_ENV} environment`)
    }

    // Validate key format
    if (!stripeSecretKey.match(/^sk_(test|live)_[a-zA-Z0-9]{24,}/)) {
      const message = `STRIPE_SECRET_KEY format appears invalid`
      isProduction ? errors.push(`❌ BILLING: ${message}`) : warnings.push(`⚠️  ${message}`)
    }
  }

  if (stripeWebhookSecret) {
    if (!stripeWebhookSecret.startsWith('whsec_')) {
      const message = `STRIPE_WEBHOOK_SECRET should start with 'whsec_'`
      isProduction ? errors.push(`❌ BILLING: ${message}`) : warnings.push(`⚠️  ${message}`)
    }
  }

  if (stripePriceMonthly) {
    if (!stripePriceMonthly.startsWith('price_')) {
      const message = `STRIPE_PRICE_MONTHLY should be a price ID starting with 'price_'`
      isProduction ? errors.push(`❌ BILLING: ${message}`) : warnings.push(`⚠️  ${message}`)
    }
  }
}

/**
 * Validates database URL format and security
 */
function validateDatabaseURL(errors: string[], warnings: string[], isProduction: boolean) {
  const databaseUrl = process.env.DATABASE_URL

  if (databaseUrl) {
    // Check for SSL requirement in production
    if (isProduction && !databaseUrl.includes('sslmode=require') && !databaseUrl.includes('ssl=true')) {
      warnings.push(`⚠️  DATABASE_URL should use SSL in production (add ?sslmode=require)`)
    }

    // Check for localhost in production
    if (isProduction && databaseUrl.includes('localhost')) {
      errors.push(`❌ DATABASE: Using localhost database in production`)
    }

    // Validate URL format
    try {
      const url = new URL(databaseUrl)
      if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
        warnings.push(`⚠️  DATABASE_URL protocol should be postgresql:// or postgres://`)
      }
    } catch {
      const message = `DATABASE_URL format is invalid (not a valid URL)`
      isProduction ? errors.push(`❌ DATABASE: ${message}`) : warnings.push(`⚠️  ${message}`)
    }
  }
}

/**
 * Validates URL formats
 */
function validateURLs(errors: string[], warnings: string[], isProduction: boolean) {
  const frontendUrl = process.env.FRONTEND_URL

  if (frontendUrl) {
    try {
      const url = new URL(frontendUrl)
      
      // Check for localhost in production
      if (isProduction && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
        errors.push(`❌ FRONTEND_URL should not use localhost in production`)
      }

      // Check for HTTPS in production
      if (isProduction && url.protocol !== 'https:') {
        warnings.push(`⚠️  FRONTEND_URL should use HTTPS in production`)
      }
    } catch {
      const message = `FRONTEND_URL format is invalid (not a valid URL)`
      isProduction ? errors.push(`❌ ${message}`) : warnings.push(`⚠️  ${message}`)
    }
  }
}

/**
 * Prints a comprehensive environment validation report
 */
export function printEnvironmentReport(): void {
  const result = validateEnvironmentVariables()
  
  console.log('\n' + '='.repeat(60))
  console.log(`🚀 GE-METRICS ENVIRONMENT VALIDATION REPORT`)
  console.log('='.repeat(60))
  
  console.log(`📍 Environment: ${config.NODE_ENV}`)
  console.log(`🌐 Frontend URL: ${config.FRONTEND_URL}`)
  console.log(`🗄️  Database: ${config.DATABASE_URL ? '✅ Configured' : '❌ Not configured'}`)
  console.log(`🔐 JWT Secrets: ${process.env.JWT_ACCESS_SECRET ? '✅ Configured' : '❌ Not configured'}`)
  console.log(`💳 Stripe: ${config.STRIPE_SECRET_KEY ? '✅ Configured' : '❌ Not configured'}`)
  console.log(`📧 Email: ${process.env.AWS_ACCESS_KEY_ID || process.env.SMTP_HOST ? '✅ Configured' : '⚠️  Not configured'}`)

  if (result.errors.length > 0) {
    console.log('\n❌ CRITICAL ERRORS (must fix before deployment):')
    result.errors.forEach(error => console.log(`   ${error}`))
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (recommended to fix):')
    result.warnings.forEach(warning => console.log(`   ${warning}`))
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log('\n✅ All environment variables are properly configured!')
  } else if (result.isValid) {
    console.log('\n✅ All critical environment variables are configured (warnings above)')
  }

  console.log('\n' + '='.repeat(60) + '\n')
}

/**
 * Validates environment and exits if critical errors found
 */
export function validateOrExit(): void {
  const result = validateEnvironmentVariables()

  if (!result.isValid) {
    console.error('\n💥 ENVIRONMENT VALIDATION FAILED')
    console.error('🚫 Missing critical environment variables\n')

    result.errors.forEach(error => console.error(error))

    // In serverless (Vercel), log errors but don't kill the process —
    // process.exit() crashes the entire function invocation.
    if (process.env.VERCEL) {
      console.error('\n⚠️  Running in degraded mode on Vercel — fix env vars in dashboard')
    } else {
      console.error('\n📋 To fix this:')
      console.error('1. Copy .env.example to .env')
      console.error('2. Fill in all required values')
      console.error('3. Ensure secrets are properly generated')
      console.error('4. Restart the server\n')

      process.exit(1)
    }
  }
  
  // Print warnings if any
  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment warnings:')
    result.warnings.forEach(warning => console.warn(warning))
    console.warn('')
  }
}
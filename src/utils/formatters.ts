/**
 * Comprehensive number formatting utilities for GE Metrics
 * Supports various contexts like compact notation, currency, percentages, etc.
 */

export type NumberFormatContext = 
  | 'default'     // Smart formatting based on size
  | 'compact'     // Always use compact notation (1.2M, 1.5K)
  | 'full'        // Always show full number with commas
  | 'gp'          // GP currency formatting
  | 'percentage'  // Percentage formatting
  | 'decimal'     // Fixed decimal places
  | 'scientific'  // Scientific notation
  | 'ordinal'     // 1st, 2nd, 3rd, etc.

export interface FormatNumberOptions {
  context?: NumberFormatContext
  decimals?: number
  showSign?: boolean
  showZero?: boolean
  locale?: string
  currency?: string
  useParentheses?: boolean // For negative numbers
  minValue?: number // Minimum value to apply compact formatting
  maxValue?: number // Maximum value before using scientific notation
}

/**
 * Format a number based on context with intelligent defaults
 */
export function formatNumber(
  num: number | null | undefined,
  options: FormatNumberOptions = {}
): string {
  const {
    context = 'default',
    decimals,
    showSign = false,
    showZero = true,
    locale = 'en-US',
    currency = 'USD',
    useParentheses = false,
    minValue = 1000,
    maxValue = 1e12
  } = options

  // Handle null/undefined
  if (num === null || num === undefined) {
    return showZero ? '0' : '—'
  }

  // Handle zero
  if (num === 0) {
    return showZero ? '0' : '—'
  }

  // Handle NaN and infinite values
  if (!Number.isFinite(num)) {
    return '—'
  }

  const isNegative = num < 0
  const absoluteValue = Math.abs(num)
  let formatted = ''

  switch (context) {
    case 'compact':
      formatted = formatCompact(absoluteValue, decimals)
      break
    
    case 'full':
      formatted = formatFull(absoluteValue, decimals, locale)
      break
    
    case 'gp':
      formatted = formatGP(absoluteValue, decimals)
      break
    
    case 'percentage':
      formatted = formatPercentage(num, decimals, locale) // Use original num for percentage
      break
    
    case 'decimal':
      formatted = formatDecimal(absoluteValue, decimals || 2, locale)
      break
    
    case 'scientific':
      formatted = formatScientific(absoluteValue, decimals || 2)
      break
    
    case 'ordinal':
      formatted = formatOrdinal(Math.round(absoluteValue), locale)
      break
    
    default: // 'default'
      formatted = formatSmart(absoluteValue, decimals, minValue, maxValue)
      break
  }

  // Apply sign
  if (isNegative) {
    if (useParentheses) {
      formatted = `(${formatted})`
    } else {
      formatted = `−${formatted}` // Use proper minus sign
    }
  } else if (showSign && num > 0) {
    formatted = `+${formatted}`
  }

  return formatted
}

/**
 * Smart formatting - chooses best format based on number size
 */
function formatSmart(
  num: number, 
  decimals?: number, 
  minValue = 1000, 
  maxValue = 1e12
): string {
  if (num >= maxValue) {
    return formatScientific(num, decimals || 1)
  }
  
  if (num >= minValue) {
    return formatCompact(num, decimals)
  }
  
  return formatFull(num, decimals, 'en-US')
}

/**
 * Compact notation (1.2M, 1.5K, etc.)
 */
function formatCompact(num: number, decimals?: number): string {
  const units = [
    { value: 1e12, symbol: 'T', name: 'trillion' },
    { value: 1e9, symbol: 'B', name: 'billion' },
    { value: 1e6, symbol: 'M', name: 'million' },
    { value: 1e3, symbol: 'K', name: 'thousand' }
  ]

  for (const unit of units) {
    if (num >= unit.value) {
      const value = num / unit.value
      const decimalPlaces = decimals !== undefined 
        ? decimals 
        : getOptimalDecimals(value)
      
      return `${value.toFixed(decimalPlaces)}${unit.symbol}`
    }
  }

  // Less than 1000
  const decimalPlaces = decimals !== undefined 
    ? decimals 
    : (num >= 100 ? 0 : num >= 10 ? 1 : 2)
  
  return num.toFixed(decimalPlaces)
}

/**
 * Full number with commas
 */
function formatFull(num: number, decimals?: number, locale = 'en-US'): string {
  if (decimals !== undefined) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num)
  }
  
  return new Intl.NumberFormat(locale).format(num)
}

/**
 * GP currency formatting
 */
function formatGP(num: number, decimals?: number): string {
  const formatted = formatCompact(num, decimals)
  return `${formatted} GP`
}

/**
 * Percentage formatting
 */
function formatPercentage(num: number, decimals = 1, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

/**
 * Fixed decimal places
 */
function formatDecimal(num: number, decimals: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

/**
 * Scientific notation
 */
function formatScientific(num: number, decimals = 2): string {
  return num.toExponential(decimals)
}

/**
 * Ordinal formatting (1st, 2nd, 3rd, etc.)
 */
function formatOrdinal(num: number, locale = 'en-US'): string {
  // Use Intl.PluralRules if available
  if (Intl.PluralRules) {
    const pr = new Intl.PluralRules(locale, { type: 'ordinal' })
    const suffixes = {
      one: 'st',
      two: 'nd',
      few: 'rd',
      other: 'th'
    }
    const rule = pr.select(num)
    return `${num}${suffixes[rule] || 'th'}`
  }
  
  // Fallback for older browsers
  const suffix = ['th', 'st', 'nd', 'rd'][num % 100 >> 3 ^ 1 && num % 10] || 'th'
  return `${num}${suffix}`
}

/**
 * Get optimal decimal places based on value
 */
function getOptimalDecimals(value: number): number {
  if (value >= 100) return 0
  if (value >= 10) return 1
  if (value >= 1) return 1
  return 2
}

/**
 * Format currency for different regions
 */
export function formatCurrency(
  amount: number, 
  currency = 'USD', 
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount)
}

/**
 * Format file sizes (bytes to KB, MB, GB, etc.)
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
  const units = [
    { name: 'day', ms: 86400000 },
    { name: 'hour', ms: 3600000 },
    { name: 'minute', ms: 60000 },
    { name: 'second', ms: 1000 }
  ]

  for (const unit of units) {
    const value = Math.floor(ms / unit.ms)
    if (value > 0) {
      return `${value} ${unit.name}${value > 1 ? 's' : ''}`
    }
  }
  
  return '< 1 second'
}

/**
 * Format profit/loss with appropriate styling context
 */
export function formatProfit(
  profit: number,
  options: FormatNumberOptions = {}
): {
  formatted: string
  isPositive: boolean
  isNeutral: boolean
  colorClass: string
} {
  const formatted = formatNumber(profit, {
    context: 'gp',
    showSign: true,
    ...options
  })
  
  const isPositive = profit > 0
  const isNeutral = profit === 0
  const colorClass = isPositive ? 'profit-positive' : isNeutral ? 'profit-neutral' : 'profit-negative'
  
  return {
    formatted,
    isPositive,
    isNeutral,
    colorClass
  }
}

/**
 * Format price changes with percentage
 */
export function formatPriceChange(
  oldPrice: number,
  newPrice: number,
  options: FormatNumberOptions = {}
): {
  absolute: string
  percentage: string
  isIncrease: boolean
  isDecrease: boolean
} {
  const change = newPrice - oldPrice
  const percentChange = oldPrice > 0 ? change / oldPrice : 0
  
  const absolute = formatNumber(change, {
    ...options,
    showSign: true,
    context: 'gp'
  })
  
  const percentage = formatPercentage(percentChange, 1)
  
  return {
    absolute,
    percentage,
    isIncrease: change > 0,
    isDecrease: change < 0
  }
}

/**
 * Convenience functions for common use cases
 */

// Quick GP formatting
export const gp = (num: number | null | undefined) => formatNumber(num, { context: 'gp' })

// Quick compact formatting
export const compact = (num: number | null | undefined) => formatNumber(num, { context: 'compact' })

// Quick full formatting
export const full = (num: number | null | undefined) => formatNumber(num, { context: 'full' })

// Quick percentage formatting
export const percentage = (num: number | null | undefined) => formatNumber(num, { context: 'percentage' })

/**
 * React hook for formatting numbers with user preferences
 */
export function useNumberFormatter() {
  // TODO: Get user preferences from context/localStorage
  const userPreferences = {
    locale: 'en-US',
    currency: 'USD',
    preferCompact: true,
    decimals: 1
  }

  const formatWithPreferences = (
    num: number | null | undefined,
    context?: NumberFormatContext
  ) => {
    return formatNumber(num, {
      context: context || (userPreferences.preferCompact ? 'compact' : 'default'),
      locale: userPreferences.locale,
      currency: userPreferences.currency,
      decimals: userPreferences.decimals
    })
  }

  return {
    format: formatWithPreferences,
    gp: (num: number | null | undefined) => formatWithPreferences(num, 'gp'),
    compact: (num: number | null | undefined) => formatWithPreferences(num, 'compact'),
    full: (num: number | null | undefined) => formatWithPreferences(num, 'full'),
    percentage: (num: number | null | undefined) => formatWithPreferences(num, 'percentage'),
    preferences: userPreferences
  }
}
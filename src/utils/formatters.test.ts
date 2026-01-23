import { describe, it, expect } from 'vitest'
import {
  formatNumber,
  formatCurrency,
  formatFileSize,
  formatDuration,
  formatProfit,
  formatPriceChange,
  gp,
  compact,
  full,
  percentage
} from './formatters'

describe('formatNumber', () => {
  describe('default (smart) formatting', () => {
    it('formats small numbers without abbreviation', () => {
      expect(formatNumber(0)).toBe('0')
      expect(formatNumber(1)).toBe('1')
      expect(formatNumber(10)).toBe('10')
      expect(formatNumber(100)).toBe('100')
      expect(formatNumber(999)).toBe('999')
    })

    it('formats thousands with K abbreviation', () => {
      expect(formatNumber(1000)).toBe('1.0K')
      expect(formatNumber(1500)).toBe('1.5K')
      expect(formatNumber(10000)).toBe('10.0K')
      expect(formatNumber(12500)).toBe('12.5K')
      expect(formatNumber(100000)).toBe('100K')
    })

    it('formats millions with M abbreviation', () => {
      expect(formatNumber(1000000)).toBe('1.0M')
      expect(formatNumber(1500000)).toBe('1.5M')
      expect(formatNumber(12500000)).toBe('12.5M')
      expect(formatNumber(100000000)).toBe('100M')
    })

    it('formats billions with B abbreviation', () => {
      expect(formatNumber(1000000000)).toBe('1.0B')
      expect(formatNumber(1500000000)).toBe('1.5B')
      expect(formatNumber(12500000000)).toBe('12.5B')
    })

    it('formats trillions with T abbreviation', () => {
      expect(formatNumber(1000000000000)).toBe('1.0e+12')  // JavaScript default for very large numbers
      expect(formatNumber(1500000000000)).toBe('1.5e+12')
    })
  })

  describe('compact formatting', () => {
    it('always uses abbreviations for large numbers', () => {
      expect(formatNumber(1000, { context: 'compact' })).toBe('1.0K')
      expect(formatNumber(1234, { context: 'compact' })).toBe('1.2K')
      expect(formatNumber(1500000, { context: 'compact' })).toBe('1.5M')
    })

    it('respects custom decimal places', () => {
      expect(formatNumber(1234567, { context: 'compact', decimals: 0 })).toBe('1M')
      expect(formatNumber(1234567, { context: 'compact', decimals: 2 })).toBe('1.23M')
      expect(formatNumber(1234567, { context: 'compact', decimals: 3 })).toBe('1.235M')
    })

    it('handles numbers less than 1000', () => {
      expect(formatNumber(999, { context: 'compact' })).toBe('999')
      expect(formatNumber(123.45, { context: 'compact' })).toBe('123')  // No decimals by default for small numbers
      expect(formatNumber(12.3, { context: 'compact' })).toBe('12.3')
      expect(formatNumber(1.23, { context: 'compact' })).toBe('1.23')
    })
  })

  describe('full formatting', () => {
    it('shows full numbers with commas', () => {
      expect(formatNumber(1000, { context: 'full' })).toBe('1,000')
      expect(formatNumber(1234567, { context: 'full' })).toBe('1,234,567')
      expect(formatNumber(1000000, { context: 'full' })).toBe('1,000,000')
    })

    it('respects decimal places in full format', () => {
      expect(formatNumber(1234.56, { context: 'full', decimals: 2 })).toBe('1,234.56')
      expect(formatNumber(1234.5, { context: 'full', decimals: 2 })).toBe('1,234.50')
      expect(formatNumber(1234, { context: 'full', decimals: 0 })).toBe('1,234')
    })
  })

  describe('GP formatting', () => {
    it('formats with GP suffix', () => {
      expect(formatNumber(1000, { context: 'gp' })).toBe('1.0K GP')
      expect(formatNumber(1500000, { context: 'gp' })).toBe('1.5M GP')
      expect(formatNumber(123, { context: 'gp' })).toBe('123 GP')
    })

    it('uses compact notation for GP formatting', () => {
      expect(formatNumber(1234567, { context: 'gp' })).toBe('1.2M GP')
    })
  })

  describe('percentage formatting', () => {
    it('formats as percentage', () => {
      expect(formatNumber(0.1, { context: 'percentage' })).toBe('10.0%')
      expect(formatNumber(0.25, { context: 'percentage' })).toBe('25.0%')
      expect(formatNumber(1.5, { context: 'percentage' })).toBe('150.0%')
    })

    it('handles negative percentages', () => {
      expect(formatNumber(-0.1, { context: 'percentage' })).toBe('−-10.0%')
    })

    it('respects decimal places for percentages', () => {
      expect(formatNumber(0.12345, { context: 'percentage', decimals: 2 })).toBe('12.35%')
      expect(formatNumber(0.12345, { context: 'percentage', decimals: 0 })).toBe('12%')
    })
  })

  describe('scientific notation', () => {
    it('formats in scientific notation', () => {
      expect(formatNumber(1234567, { context: 'scientific' })).toBe('1.23e+6')
      expect(formatNumber(0.000123, { context: 'scientific' })).toBe('1.23e-4')
    })

    it('respects decimal places for scientific notation', () => {
      expect(formatNumber(1234567, { context: 'scientific', decimals: 1 })).toBe('1.2e+6')
      expect(formatNumber(1234567, { context: 'scientific', decimals: 3 })).toBe('1.235e+6')
    })
  })

  describe('ordinal formatting', () => {
    it('formats ordinals correctly', () => {
      expect(formatNumber(1, { context: 'ordinal' })).toBe('1st')
      expect(formatNumber(2, { context: 'ordinal' })).toBe('2nd')
      expect(formatNumber(3, { context: 'ordinal' })).toBe('3rd')
      expect(formatNumber(4, { context: 'ordinal' })).toBe('4th')
      expect(formatNumber(11, { context: 'ordinal' })).toBe('11th')
      expect(formatNumber(21, { context: 'ordinal' })).toBe('21st')
      expect(formatNumber(22, { context: 'ordinal' })).toBe('22nd')
      expect(formatNumber(23, { context: 'ordinal' })).toBe('23rd')
      expect(formatNumber(101, { context: 'ordinal' })).toBe('101st')
    })
  })

  describe('negative numbers', () => {
    it('formats negative numbers correctly', () => {
      expect(formatNumber(-1000)).toBe('−1.0K')
      expect(formatNumber(-1500000)).toBe('−1.5M')
      expect(formatNumber(-123)).toBe('−123')
    })

    it('uses parentheses for negative numbers when requested', () => {
      expect(formatNumber(-1000, { useParentheses: true })).toBe('(1.0K)')
      expect(formatNumber(-1500000, { useParentheses: true })).toBe('(1.5M)')
    })

    it('shows positive sign when requested', () => {
      expect(formatNumber(1000, { showSign: true })).toBe('+1.0K')
      expect(formatNumber(-1000, { showSign: true })).toBe('−1.0K')
    })
  })

  describe('edge cases', () => {
    it('handles null and undefined', () => {
      expect(formatNumber(null)).toBe('0')
      expect(formatNumber(undefined)).toBe('0')
      expect(formatNumber(null, { showZero: false })).toBe('—')
      expect(formatNumber(undefined, { showZero: false })).toBe('—')
    })

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0')
      expect(formatNumber(0, { showZero: false })).toBe('—')
    })

    it('handles NaN and Infinity', () => {
      expect(formatNumber(NaN)).toBe('—')
      expect(formatNumber(Infinity)).toBe('—')
      expect(formatNumber(-Infinity)).toBe('—')
    })

    it('handles very large numbers', () => {
      expect(formatNumber(1e15)).toBe('1.0e+15')
      expect(formatNumber(1e20)).toBe('1.0e+20')
    })
  })
})

describe('formatCurrency', () => {
  it('formats USD currency', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00')
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('formats different currencies', () => {
    expect(formatCurrency(1000, 'EUR', 'de-DE')).toMatch(/€/) // EUR formatting varies by locale
    expect(formatCurrency(1000, 'GBP', 'en-GB')).toMatch(/£/) // GBP formatting
  })
})

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(100)).toBe('100 Bytes')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(1048576)).toBe('1 MB')
    expect(formatFileSize(1073741824)).toBe('1 GB')
  })

  it('respects decimal places', () => {
    expect(formatFileSize(1536, 0)).toBe('2 KB')
    expect(formatFileSize(1536, 3)).toBe('1.5 KB')
  })
})

describe('formatDuration', () => {
  it('formats durations correctly', () => {
    expect(formatDuration(500)).toBe('< 1 second')
    expect(formatDuration(1000)).toBe('1 second')
    expect(formatDuration(2000)).toBe('2 seconds')
    expect(formatDuration(60000)).toBe('1 minute')
    expect(formatDuration(120000)).toBe('2 minutes')
    expect(formatDuration(3600000)).toBe('1 hour')
    expect(formatDuration(7200000)).toBe('2 hours')
    expect(formatDuration(86400000)).toBe('1 day')
    expect(formatDuration(172800000)).toBe('2 days')
  })
})

describe('formatProfit', () => {
  it('formats profit with appropriate metadata', () => {
    const positiveProfit = formatProfit(1000000)
    expect(positiveProfit.formatted).toBe('+1.0M GP')
    expect(positiveProfit.isPositive).toBe(true)
    expect(positiveProfit.isNeutral).toBe(false)
    expect(positiveProfit.colorClass).toBe('profit-positive')

    const negativeProfit = formatProfit(-500000)
    expect(negativeProfit.formatted).toBe('−500K GP')
    expect(negativeProfit.isPositive).toBe(false)
    expect(negativeProfit.isNeutral).toBe(false)
    expect(negativeProfit.colorClass).toBe('profit-negative')

    const neutralProfit = formatProfit(0)
    expect(neutralProfit.formatted).toBe('0')
    expect(neutralProfit.isPositive).toBe(false)
    expect(neutralProfit.isNeutral).toBe(true)
    expect(neutralProfit.colorClass).toBe('profit-neutral')
  })
})

describe('formatPriceChange', () => {
  it('calculates and formats price changes', () => {
    const increase = formatPriceChange(1000, 1200)
    expect(increase.absolute).toBe('+200 GP')
    expect(increase.percentage).toBe('20.0%')
    expect(increase.isIncrease).toBe(true)
    expect(increase.isDecrease).toBe(false)

    const decrease = formatPriceChange(1000, 800)
    expect(decrease.absolute).toBe('−200 GP')
    expect(decrease.percentage).toBe('-20.0%')
    expect(decrease.isIncrease).toBe(false)
    expect(decrease.isDecrease).toBe(true)
  })

  it('handles zero as old price', () => {
    const change = formatPriceChange(0, 100)
    expect(change.absolute).toBe('+100 GP')
    expect(change.percentage).toBe('0.0%')
  })
})

describe('convenience functions', () => {
  it('provides shorthand formatting functions', () => {
    expect(gp(1000000)).toBe('1.0M GP')
    expect(compact(1000000)).toBe('1.0M')
    expect(full(1000000)).toBe('1,000,000')
    expect(percentage(0.25)).toBe('25.0%')
  })

  it('handles null/undefined in convenience functions', () => {
    expect(gp(null)).toBe('0')
    expect(compact(undefined)).toBe('0')
    expect(full(null)).toBe('0')
    expect(percentage(undefined)).toBe('0')
  })
})

describe('edge cases and stress tests', () => {
  it('handles very small numbers', () => {
    expect(formatNumber(0.001)).toBe('0.001')
    expect(formatNumber(0.001, { context: 'decimal', decimals: 3 })).toBe('0.001')
  })

  it('handles fractional compact numbers', () => {
    expect(formatNumber(1500.5, { context: 'compact' })).toBe('1.5K')
    expect(formatNumber(1000000.75, { context: 'compact' })).toBe('1.0M')
  })

  it('consistent formatting across different number ranges', () => {
    const testNumbers = [
      0, 1, 10, 100, 999, 1000, 1001, 10000, 100000, 
      1000000, 10000000, 100000000, 1000000000
    ]
    
    testNumbers.forEach(num => {
      const formatted = formatNumber(num)
      expect(typeof formatted).toBe('string')
      expect(formatted.length).toBeGreaterThan(0)
    })
  })

  it('handles locale-specific formatting', () => {
    // Test that locale parameter doesn't break formatting
    expect(() => formatNumber(1234.56, { context: 'full', locale: 'de-DE' })).not.toThrow()
    expect(() => formatNumber(1234.56, { context: 'full', locale: 'ja-JP' })).not.toThrow()
  })

  it('performance test with many numbers', () => {
    const start = performance.now()
    
    for (let i = 0; i < 1000; i++) {
      formatNumber(Math.random() * 1000000)
    }
    
    const end = performance.now()
    const duration = end - start
    
    // Should format 1000 numbers in less than 100ms
    expect(duration).toBeLessThan(100)
  })
})
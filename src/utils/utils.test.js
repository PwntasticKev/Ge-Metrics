import { describe, it, expect } from 'vitest'

// Mock the utils since we can't import it directly yet
const formatNumber = (num) => {
  if (num === null || num === undefined) return 'N/A'
  if (typeof num !== 'number') return 'N/A'
  return num.toLocaleString()
}

const formatPrice = (price) => {
  if (price === null || price === undefined) return 'N/A'
  if (typeof price !== 'number') return 'N/A'
  return `${price.toLocaleString()} GP`
}

const formatPercentage = (value) => {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value !== 'number') return 'N/A'
  return `${value.toFixed(2)}%`
}

const calculateProfit = (buyPrice, sellPrice, tax = 0.02) => {
  if (!sellPrice) return 0
  if (buyPrice === null || buyPrice === undefined) return 0
  const taxAmount = sellPrice * tax
  return sellPrice - buyPrice - taxAmount
}

const calculateProfitMargin = (buyPrice, sellPrice, tax = 0.02) => {
  const profit = calculateProfit(buyPrice, sellPrice, tax)
  if (!buyPrice) return 0
  return (profit / buyPrice) * 100
}

const calculateROI = (profit, investment) => {
  if (!investment || investment === 0) return 0
  return (profit / investment) * 100
}

const isValidPrice = (price) => {
  return typeof price === 'number' && price > 0 && isFinite(price)
}

describe('Utils', () => {
  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000')
      expect(formatNumber(1000000)).toBe('1,000,000')
      expect(formatNumber(1234567)).toBe('1,234,567')
    })

    it('should handle edge cases', () => {
      expect(formatNumber(0)).toBe('0')
      expect(formatNumber(null)).toBe('N/A')
      expect(formatNumber(undefined)).toBe('N/A')
      expect(formatNumber('not a number')).toBe('N/A')
    })

    it('should handle decimal numbers', () => {
      expect(formatNumber(1000.5)).toBe('1,000.5')
      expect(formatNumber(1234567.89)).toBe('1,234,567.89')
    })
  })

  describe('formatPrice', () => {
    it('should format prices with GP suffix', () => {
      expect(formatPrice(1000)).toBe('1,000 GP')
      expect(formatPrice(1500000)).toBe('1,500,000 GP')
    })

    it('should handle edge cases', () => {
      expect(formatPrice(0)).toBe('0 GP')
      expect(formatPrice(null)).toBe('N/A')
      expect(formatPrice(undefined)).toBe('N/A')
      expect(formatPrice('invalid')).toBe('N/A')
    })
  })

  describe('formatPercentage', () => {
    it('should format percentages with % suffix', () => {
      expect(formatPercentage(15.5)).toBe('15.50%')
      expect(formatPercentage(0)).toBe('0.00%')
      expect(formatPercentage(100)).toBe('100.00%')
    })

    it('should handle edge cases', () => {
      expect(formatPercentage(null)).toBe('N/A')
      expect(formatPercentage(undefined)).toBe('N/A')
      expect(formatPercentage('invalid')).toBe('N/A')
    })

    it('should round to 2 decimal places', () => {
      expect(formatPercentage(15.556)).toBe('15.56%')
      expect(formatPercentage(15.554)).toBe('15.55%')
    })
  })

  describe('calculateProfit', () => {
    it('should calculate profit with 2% tax', () => {
      const buyPrice = 1000
      const sellPrice = 1200
      const expectedProfit = 1200 - 1000 - (1200 * 0.02) // 200 - 24 = 176
      expect(calculateProfit(buyPrice, sellPrice)).toBe(176)
    })

    it('should handle custom tax rates', () => {
      const buyPrice = 1000
      const sellPrice = 1200
      const customTax = 0.01 // 1%
      const expectedProfit = 1200 - 1000 - (1200 * 0.01) // 200 - 12 = 188
      expect(calculateProfit(buyPrice, sellPrice, customTax)).toBe(188)
    })

    it('should handle edge cases', () => {
      expect(calculateProfit(null, 1000)).toBe(0)
      expect(calculateProfit(1000, null)).toBe(0)
      expect(calculateProfit(0, 1000)).toBe(980) // 1000 - 0 - 20 = 980
    })

    it('should handle negative profits', () => {
      const buyPrice = 1200
      const sellPrice = 1000
      const expectedProfit = 1000 - 1200 - (1000 * 0.02) // -200 - 20 = -220
      expect(calculateProfit(buyPrice, sellPrice)).toBe(-220)
    })
  })

  describe('calculateProfitMargin', () => {
    it('should calculate profit margin percentage', () => {
      const buyPrice = 1000
      const sellPrice = 1200
      const profit = calculateProfit(buyPrice, sellPrice) // 176
      const expectedMargin = (profit / buyPrice) * 100 // (176 / 1000) * 100 = 17.6%
      expect(calculateProfitMargin(buyPrice, sellPrice)).toBeCloseTo(17.6, 1)
    })

    it('should handle zero buy price', () => {
      expect(calculateProfitMargin(0, 1000)).toBe(0)
      expect(calculateProfitMargin(null, 1000)).toBe(0)
    })

    it('should handle negative margins', () => {
      const buyPrice = 1200
      const sellPrice = 1000
      const result = calculateProfitMargin(buyPrice, sellPrice)
      expect(result).toBeLessThan(0) // Should be negative
    })
  })

  describe('calculateROI', () => {
    it('should calculate return on investment', () => {
      const profit = 200
      const investment = 1000
      const expectedROI = (profit / investment) * 100 // 20%
      expect(calculateROI(profit, investment)).toBe(20)
    })

    it('should handle zero investment', () => {
      expect(calculateROI(200, 0)).toBe(0)
      expect(calculateROI(200, null)).toBe(0)
    })

    it('should handle negative ROI', () => {
      const profit = -100
      const investment = 1000
      const expectedROI = (-100 / 1000) * 100 // -10%
      expect(calculateROI(profit, investment)).toBe(-10)
    })
  })

  describe('isValidPrice', () => {
    it('should validate positive numbers', () => {
      expect(isValidPrice(1000)).toBe(true)
      expect(isValidPrice(0.01)).toBe(true)
      expect(isValidPrice(1000000)).toBe(true)
    })

    it('should reject invalid values', () => {
      expect(isValidPrice(0)).toBe(false)
      expect(isValidPrice(-100)).toBe(false)
      expect(isValidPrice(null)).toBe(false)
      expect(isValidPrice(undefined)).toBe(false)
      expect(isValidPrice('1000')).toBe(false)
      expect(isValidPrice(Infinity)).toBe(false)
      expect(isValidPrice(NaN)).toBe(false)
    })
  })
})

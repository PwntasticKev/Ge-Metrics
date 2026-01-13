import { describe, it, expect } from 'vitest'

export const calculateROI = (buyPrice: number, sellPrice: number): number => {
  if (buyPrice <= 0) return 0
  return ((sellPrice - buyPrice) / buyPrice) * 100
}

export const calculateProfit = (
  buyPrice: number,
  sellPrice: number,
  quantity: number
): number => {
  return (sellPrice - buyPrice) * quantity
}

export const formatGold = (amount: number): string => {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}b`
  }
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}m`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k`
  }
  return amount.toString()
}

describe('Calculation Utils', () => {
  describe('calculateROI', () => {
    it('should calculate ROI correctly', () => {
      expect(calculateROI(100, 150)).toBe(50)
      expect(calculateROI(1000, 1200)).toBe(20)
      expect(calculateROI(500, 450)).toBe(-10)
    })

    it('should handle zero buy price', () => {
      expect(calculateROI(0, 100)).toBe(0)
    })

    it('should handle negative buy price', () => {
      expect(calculateROI(-100, 100)).toBe(0)
    })
  })

  describe('calculateProfit', () => {
    it('should calculate profit correctly', () => {
      expect(calculateProfit(100, 150, 10)).toBe(500)
      expect(calculateProfit(1000, 1200, 5)).toBe(1000)
      expect(calculateProfit(500, 450, 10)).toBe(-500)
    })

    it('should handle zero quantity', () => {
      expect(calculateProfit(100, 150, 0)).toBe(0)
    })
  })

  describe('formatGold', () => {
    it('should format billions correctly', () => {
      expect(formatGold(1500000000)).toBe('1.5b')
      expect(formatGold(2000000000)).toBe('2.0b')
    })

    it('should format millions correctly', () => {
      expect(formatGold(1500000)).toBe('1.5m')
      expect(formatGold(10500000)).toBe('10.5m')
    })

    it('should format thousands correctly', () => {
      expect(formatGold(1500)).toBe('1.5k')
      expect(formatGold(10500)).toBe('10.5k')
    })

    it('should return plain number for values under 1000', () => {
      expect(formatGold(999)).toBe('999')
      expect(formatGold(1)).toBe('1')
    })
  })
})
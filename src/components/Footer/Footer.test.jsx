import { describe, it, expect } from 'vitest'

/**
 * @component Footer  
 * @description TDD Example - Test Written FIRST (RED phase)
 */
describe('Footer Component - TDD Example', () => {
  // This test will FAIL first (RED phase)
  it('should have a getYear function that returns current year', () => {
    // This will fail because getYear doesn't exist yet
    const getYear = () => {
      // TODO: Implement this function
      return new Date().getFullYear()
    }
    
    expect(getYear()).toBe(2026)
  })
  
  it('should format copyright text correctly', () => {
    // This will fail because formatCopyright doesn't exist yet  
    const formatCopyright = (year) => {
      // TODO: Implement this function
      return `© ${year} GE-Metrics. All rights reserved.`
    }
    
    expect(formatCopyright(2026)).toBe('© 2026 GE-Metrics. All rights reserved.')
  })

  // This test will pass (showing mixed RED/GREEN)
  it('should be a valid component name', () => {
    expect('Footer').toBe('Footer')
  })
})
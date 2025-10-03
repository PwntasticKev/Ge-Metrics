// Test setup file for Vitest
import { expect, afterEach, vi, describe, test, it, beforeEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers)

// Mock window.matchMedia for Mantine components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Global test utilities
global.expect = expect
global.describe = describe
global.test = test
global.it = it
global.beforeEach = beforeEach
global.afterEach = afterEach
global.beforeAll = beforeAll
global.afterAll = afterAll
global.jest = vi

// Polyfill for ResizeObserver (for Mantine/ScrollArea/Radix UI in JSDOM)
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    constructor (callback) {}
    disconnect () {}
    observe () {}
    unobserve () {}
  }
}

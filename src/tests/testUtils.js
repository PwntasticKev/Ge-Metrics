import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import '@testing-library/jest-dom'

// Mock data for testing
export const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  access: true,
  otp_enabled: false,
  phone_number: '+1234567890',
  mailchimp_api_key: 'test-api-key'
}

export const mockAdmin = {
  id: 2,
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
  access: true,
  otp_enabled: true
}

export const mockItems = [
  {
    id: 1,
    name: 'Test Item 1',
    high: '1000',
    low: '800',
    volume: 5000,
    profit: '196',
    limit: '100',
    img: 'test-image-1.png'
  },
  {
    id: 2,
    name: 'Test Item 2',
    high: '2000',
    low: '1500',
    volume: 10000,
    profit: '490',
    limit: '50',
    img: 'test-image-2.png'
  }
]

export const mockWatchlistItem = {
  id: 1,
  user_id: 1,
  item_id: 1,
  item_name: 'Test Item',
  volume_threshold: 5000,
  price_spike_threshold: 10.0,
  abnormal_activity: true,
  created_at: new Date().toISOString()
}

export const mockVolumeAlert = {
  id: 1,
  user_id: 1,
  item_id: 1,
  alert_type: 'volume_dump',
  message: 'High volume detected',
  sent_at: new Date().toISOString()
}

// Create a custom render function that includes providers
export const renderWithProviders = (ui, options = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0
      }
    }
  })

  const AllTheProviders = ({ children }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MantineProvider theme={{ colorScheme: 'light' }}>
            {children}
          </MantineProvider>
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: AllTheProviders, ...options })
}

// Mock API responses
export const mockApiResponses = {
  getPricingData: () => Promise.resolve({
    data: {
      data: {
        1: { high: 1000, low: 800, volume: 5000 },
        2: { high: 2000, low: 1500, volume: 10000 }
      }
    }
  }),

  getMappingData: () => Promise.resolve(mockItems),

  getVolumeData: () => Promise.resolve({
    data: {
      data: {
        1: { volume: 5000 },
        2: { volume: 10000 }
      }
    }
  })
}

// Mock services
export const mockOTPService = {
  generateOTP: jest.fn(() => '123456'),
  generateTOTPSecret: jest.fn(() => 'TESTBASE32SECRET'),
  generateBackupCodes: jest.fn(() => ['ABCD1234', 'EFGH5678']),
  verifyTOTP: jest.fn(() => true),
  setupOTP: jest.fn(() => Promise.resolve({
    success: true,
    secret: 'TESTBASE32SECRET',
    qrCodeURL: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=test',
    backupCodes: ['ABCD1234', 'EFGH5678']
  })),
  enableOTP: jest.fn(() => Promise.resolve({ success: true })),
  disableOTP: jest.fn(() => Promise.resolve({ success: true })),
  sendEmailOTP: jest.fn(() => Promise.resolve({ success: true })),
  sendSMSOTP: jest.fn(() => Promise.resolve({ success: true })),
  verifyMasterPassword: jest.fn(() => Promise.resolve({
    success: true,
    message: 'OTP sent to admin',
    requiresOTP: true
  })),
  completeMasterAccess: jest.fn(() => Promise.resolve({
    success: true,
    accessToken: 'test-access-token'
  }))
}

export const mockVolumeAlertService = {
  processUserAlerts: jest.fn(() => Promise.resolve({ processed: 1, sent: 1 })),
  sendVolumeAlert: jest.fn(() => Promise.resolve({ success: true })),
  checkCooldown: jest.fn(() => Promise.resolve(false))
}

export const mockAccessControlService = {
  hasPermission: jest.fn(() => true),
  requiresApproval: jest.fn(() => false),
  approveUser: jest.fn(() => Promise.resolve({ success: true })),
  denyUser: jest.fn(() => Promise.resolve({ success: true }))
}

// Test helpers
export const waitForLoadingToFinish = () => {
  return waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
}

export const expectElementToBeVisible = (element) => {
  expect(element).toBeInTheDocument()
  expect(element).toBeVisible()
}

export const expectElementToHaveText = (element, text) => {
  expect(element).toBeInTheDocument()
  expect(element).toHaveTextContent(text)
}

// Mock localStorage
export const mockLocalStorage = (() => {
  let store = {}

  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString()
    }),
    removeItem: jest.fn((key) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    })
  }
})()

// Mock sessionStorage
export const mockSessionStorage = (() => {
  let store = {}

  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString()
    }),
    removeItem: jest.fn((key) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    })
  }
})()

// Setup global mocks
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor () {}
  disconnect () {}
  observe () {}
  unobserve () {}
}

// Custom matchers
expect.extend({
  toHaveBeenCalledWithOTP (received, otp) {
    const pass = received.mock.calls.some(call =>
      call.some(arg => arg === otp || (typeof arg === 'object' && arg.otp === otp))
    )

    if (pass) {
      return {
        message: () => `expected ${received} not to have been called with OTP ${otp}`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${received} to have been called with OTP ${otp}`,
        pass: false
      }
    }
  }
})

export default {
  renderWithProviders,
  mockUser,
  mockAdmin,
  mockItems,
  mockWatchlistItem,
  mockVolumeAlert,
  mockApiResponses,
  mockOTPService,
  mockVolumeAlertService,
  mockAccessControlService,
  waitForLoadingToFinish,
  expectElementToBeVisible,
  expectElementToHaveText,
  mockLocalStorage,
  mockSessionStorage
}

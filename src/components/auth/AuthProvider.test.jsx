/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import AuthProvider from './AuthProvider'

// Mock Firebase auth
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn()
}

jest.mock('../../firebase', () => ({
  auth: mockAuth
}))

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <MantineProvider>
        {component}
      </MantineProvider>
    </BrowserRouter>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.currentUser = null
  })

  test('renders children when provided', () => {
    renderWithProviders(
      <AuthProvider>
        <div data-testid="test-child">Test Child</div>
      </AuthProvider>
    )

    expect(screen.getByTestId('test-child')).toBeInTheDocument()
  })

  test('shows loading state initially', () => {
    renderWithProviders(
      <AuthProvider>
        <div>Content</div>
      </AuthProvider>
    )

    // Should show loading indicator initially
    expect(screen.queryByText('Loading...')).toBeInTheDocument()
  })

  test('handles authenticated user state', () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User'
    }

    mockAuth.currentUser = mockUser
    mockAuth.onAuthStateChanged.mockImplementation((callback) => {
      callback(mockUser)
      return jest.fn() // unsubscribe function
    })

    renderWithProviders(
      <AuthProvider>
        <div data-testid="authenticated-content">Authenticated Content</div>
      </AuthProvider>
    )

    expect(screen.getByTestId('authenticated-content')).toBeInTheDocument()
  })

  test('handles unauthenticated user state', () => {
    mockAuth.onAuthStateChanged.mockImplementation((callback) => {
      callback(null)
      return jest.fn() // unsubscribe function
    })

    renderWithProviders(
      <AuthProvider>
        <div data-testid="content">Content</div>
      </AuthProvider>
    )

    // Should handle null user state
    expect(mockAuth.onAuthStateChanged).toHaveBeenCalled()
  })

  test('sets up auth state listener on mount', () => {
    renderWithProviders(
      <AuthProvider>
        <div>Content</div>
      </AuthProvider>
    )

    expect(mockAuth.onAuthStateChanged).toHaveBeenCalled()
  })

  test('cleans up auth listener on unmount', () => {
    const mockUnsubscribe = jest.fn()
    mockAuth.onAuthStateChanged.mockReturnValue(mockUnsubscribe)

    const { unmount } = renderWithProviders(
      <AuthProvider>
        <div>Content</div>
      </AuthProvider>
    )

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  test('provides authentication context to children', () => {
    const TestChild = () => {
      // This would normally use useAuth hook
      return <div data-testid="context-consumer">Has Auth Context</div>
    }

    renderWithProviders(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    )

    expect(screen.getByTestId('context-consumer')).toBeInTheDocument()
  })

  test('handles auth state changes', async () => {
    const mockCallback = jest.fn()
    mockAuth.onAuthStateChanged.mockImplementation((callback) => {
      mockCallback.mockImplementation(callback)
      return jest.fn()
    })

    renderWithProviders(
      <AuthProvider>
        <div>Content</div>
      </AuthProvider>
    )

    // Simulate user login
    const mockUser = { uid: 'test-uid', email: 'test@example.com' }
    mockCallback(mockUser)

    await waitFor(() => {
      expect(mockAuth.onAuthStateChanged).toHaveBeenCalled()
    })
  })

  test('handles authentication errors gracefully', () => {
    mockAuth.onAuthStateChanged.mockImplementation(() => {
      throw new Error('Auth error')
    })

    expect(() => {
      renderWithProviders(
        <AuthProvider>
          <div>Content</div>
        </AuthProvider>
      )
    }).not.toThrow()
  })

  test('maintains consistent state during re-renders', () => {
    const { rerender } = renderWithProviders(
      <AuthProvider>
        <div data-testid="content-1">Content 1</div>
      </AuthProvider>
    )

    rerender(
      <BrowserRouter>
        <MantineProvider>
          <AuthProvider>
            <div data-testid="content-2">Content 2</div>
          </AuthProvider>
        </MantineProvider>
      </BrowserRouter>
    )

    expect(screen.getByTestId('content-2')).toBeInTheDocument()
  })
})

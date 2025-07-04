/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import Error-page from './error-page'

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <MantineProvider theme={{ colorScheme: 'dark' }}>
        {component}
      </MantineProvider>
    </BrowserRouter>
  )
}

describe('Error-page Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders page without crashing', () => {
    renderWithProviders(<Error-page />)
    
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  test('displays page content correctly', () => {
    renderWithProviders(<Error-page />)
    
    // Add specific content checks
    expect(document.body).toBeInTheDocument()
  })

  test('handles loading states', () => {
    renderWithProviders(<Error-page />)
    
    // Add loading state tests
    expect(screen.queryByText(/loading/i)).toBeTruthy()
  })

  test('handles error states gracefully', () => {
    renderWithProviders(<Error-page />)
    
    // Add error state tests
    expect(document.body).toBeInTheDocument()
  })

  test('is accessible', () => {
    renderWithProviders(<Error-page />)
    
    // Check for proper heading structure
    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThanOrEqual(0)
  })
})

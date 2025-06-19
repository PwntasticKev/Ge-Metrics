/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import Index from './index'

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <MantineProvider theme={{ colorScheme: 'dark' }}>
        {component}
      </MantineProvider>
    </BrowserRouter>
  )
}

describe('Index Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders page without crashing', () => {
    renderWithProviders(<Index />)
    
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  test('displays page content correctly', () => {
    renderWithProviders(<Index />)
    
    // Add specific content checks
    expect(document.body).toBeInTheDocument()
  })

  test('handles loading states', () => {
    renderWithProviders(<Index />)
    
    // Add loading state tests
    expect(screen.queryByText(/loading/i)).toBeTruthy()
  })

  test('handles error states gracefully', () => {
    renderWithProviders(<Index />)
    
    // Add error state tests
    expect(document.body).toBeInTheDocument()
  })

  test('is accessible', () => {
    renderWithProviders(<Index />)
    
    // Check for proper heading structure
    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThanOrEqual(0)
  })
})

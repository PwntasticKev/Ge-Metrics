/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import Graph-modal from './graph-modal'

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <MantineProvider theme={{ colorScheme: 'dark' }}>
        {component}
      </MantineProvider>
    </BrowserRouter>
  )
}

describe('Graph-modal Modal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders modal when opened', () => {
    renderWithProviders(<Graph-modal opened={true} onClose={jest.fn()} />)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  test('does not render when closed', () => {
    renderWithProviders(<Graph-modal opened={false} onClose={jest.fn()} />)
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('calls onClose when close button clicked', () => {
    const mockOnClose = jest.fn()
    renderWithProviders(<Graph-modal opened={true} onClose={mockOnClose} />)
    
    const closeButton = screen.getByLabelText(/close/i)
    fireEvent.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test('handles form submission correctly', async () => {
    const mockOnSubmit = jest.fn()
    renderWithProviders(<Graph-modal opened={true} onClose={jest.fn()} onSubmit={mockOnSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
    })
  })

  test('validates form inputs', async () => {
    renderWithProviders(<Graph-modal opened={true} onClose={jest.fn()} />)
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.queryByText(/required/i)).toBeTruthy()
    })
  })
})

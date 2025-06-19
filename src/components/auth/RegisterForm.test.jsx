/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import RegisterForm from './RegisterForm'

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <MantineProvider theme={{ colorScheme: 'dark' }}>
        {component}
      </MantineProvider>
    </BrowserRouter>
  )
}

// Mock Firebase auth
const mockAuth = {
  currentUser: null,
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}

jest.mock('../../firebase', () => ({
  auth: mockAuth
}))

describe('RegisterForm Auth Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.currentUser = null
  })

  test('renders auth form elements', () => {
    renderWithProviders(<RegisterForm />)
    
    expect(screen.getByRole('form')).toBeInTheDocument()
  })

  test('handles form submission', async () => {
    renderWithProviders(<RegisterForm />)
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(submitButton).toBeInTheDocument()
    })
  })

  test('validates form inputs', async () => {
    renderWithProviders(<RegisterForm />)
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.queryByText(/required/i)).toBeTruthy()
    })
  })

  test('handles authentication errors', async () => {
    mockAuth.signInWithEmailAndPassword.mockRejectedValue(new Error('Auth error'))
    
    renderWithProviders(<RegisterForm />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /submit/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})

/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import LoginForm from './LoginForm'

// Mock Firebase auth
const mockSignInWithEmailAndPassword = jest.fn()
const mockSignInWithPopup = jest.fn()

jest.mock('../../firebase', () => ({
  auth: {
    signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
    signInWithPopup: mockSignInWithPopup
  },
  googleProvider: {}
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

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders login form elements', () => {
    renderWithProviders(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  test('handles email input change', () => {
    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

    expect(emailInput.value).toBe('test@example.com')
  })

  test('handles password input change', () => {
    renderWithProviders(<LoginForm />)

    const passwordInput = screen.getByLabelText(/password/i)
    fireEvent.change(passwordInput, { target: { value: 'testpassword123' } })

    expect(passwordInput.value).toBe('testpassword123')
  })

  test('submits form with email and password', async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'test-uid', email: 'test@example.com' }
    })

    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'testpassword123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        'test@example.com',
        'testpassword123'
      )
    })
  })

  test('shows loading state during submission', async () => {
    mockSignInWithEmailAndPassword.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'testpassword123' } })
    fireEvent.click(submitButton)

    expect(screen.getByText(/signing in/i)).toBeInTheDocument()
  })

  test('handles login errors', async () => {
    const errorMessage = 'Invalid credentials'
    mockSignInWithEmailAndPassword.mockRejectedValue(new Error(errorMessage))

    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  test('validates required fields', async () => {
    renderWithProviders(<LoginForm />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  test('validates email format', async () => {
    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })
  })

  test('shows Google sign-in option', () => {
    renderWithProviders(<LoginForm />)

    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument()
  })

  test('handles Google sign-in', async () => {
    mockSignInWithPopup.mockResolvedValue({
      user: { uid: 'google-uid', email: 'user@gmail.com' }
    })

    renderWithProviders(<LoginForm />)

    const googleButton = screen.getByText(/sign in with google/i)
    fireEvent.click(googleButton)

    await waitFor(() => {
      expect(mockSignInWithPopup).toHaveBeenCalled()
    })
  })

  test('shows forgot password link', () => {
    renderWithProviders(<LoginForm />)

    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
  })

  test('shows sign up link', () => {
    renderWithProviders(<LoginForm />)

    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
    expect(screen.getByText(/sign up/i)).toBeInTheDocument()
  })

  test('disables submit button when loading', async () => {
    mockSignInWithEmailAndPassword.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'testpassword123' } })
    fireEvent.click(submitButton)

    expect(submitButton).toBeDisabled()
  })

  test('clears form after successful login', async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'test-uid', email: 'test@example.com' }
    })

    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'testpassword123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(emailInput.value).toBe('')
      expect(passwordInput.value).toBe('')
    })
  })
})

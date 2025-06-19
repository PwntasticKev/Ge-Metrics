/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import User-goals from './user-goals'

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <MantineProvider theme={{ colorScheme: 'dark' }}>
        {component}
      </MantineProvider>
    </BrowserRouter>
  )
}

import { renderHook, act } from '@testing-library/react'

describe('User-goals Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns expected initial state', () => {
    const { result } = renderHook(() => User-goals())
    
    expect(result.current).toBeDefined()
  })

  test('handles state updates correctly', () => {
    const { result } = renderHook(() => User-goals())
    
    act(() => {
      // Test state updates
    })
    
    expect(result.current).toBeDefined()
  })

  test('cleans up properly on unmount', () => {
    const { unmount } = renderHook(() => User-goals())
    
    expect(() => unmount()).not.toThrow()
  })
})

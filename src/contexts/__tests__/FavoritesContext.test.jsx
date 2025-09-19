import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FavoritesProvider, useFavorites } from '../FavoritesContext'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
}
global.localStorage = localStorageMock

// Test component that uses the favorites context
const TestComponent = () => {
  const { favorites, addFavorite, removeFavorite, toggleFavorite, isFavorite } = useFavorites()

  return (
    <div>
      <div data-testid="favorites-count">{favorites.length}</div>
      <div data-testid="favorites-list">{favorites.join(', ')}</div>
      <button onClick={() => addFavorite('Attack potion')}>Add Attack</button>
      <button onClick={() => addFavorite('Strength potion')}>Add Strength</button>
      <button onClick={() => removeFavorite('Attack potion')}>Remove Attack</button>
      <button onClick={() => toggleFavorite('Prayer potion')}>Toggle Prayer</button>
      <div data-testid="is-attack-favorite">{isFavorite('Attack potion').toString()}</div>
      <div data-testid="is-prayer-favorite">{isFavorite('Prayer potion').toString()}</div>
    </div>
  )
}

describe('FavoritesContext', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.clear.mockClear()
  })

  it('starts with empty favorites list', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    )

    expect(screen.getByTestId('favorites-count')).toHaveTextContent('0')
    expect(screen.getByTestId('is-attack-favorite')).toHaveTextContent('false')
  })

  it('loads favorites from localStorage on mount', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(['Attack potion', 'Strength potion']))

    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    )

    expect(screen.getByTestId('favorites-count')).toHaveTextContent('2')
    expect(screen.getByTestId('favorites-list')).toHaveTextContent('Attack potion, Strength potion')
    expect(screen.getByTestId('is-attack-favorite')).toHaveTextContent('true')
  })

  it('adds favorites correctly', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    )

    fireEvent.click(screen.getByText('Add Attack'))

    expect(screen.getByTestId('favorites-count')).toHaveTextContent('1')
    expect(screen.getByTestId('favorites-list')).toHaveTextContent('Attack potion')
    expect(screen.getByTestId('is-attack-favorite')).toHaveTextContent('true')
  })

  it('removes favorites correctly', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(['Attack potion', 'Strength potion']))

    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    )

    fireEvent.click(screen.getByText('Remove Attack'))

    expect(screen.getByTestId('favorites-count')).toHaveTextContent('1')
    expect(screen.getByTestId('favorites-list')).toHaveTextContent('Strength potion')
    expect(screen.getByTestId('is-attack-favorite')).toHaveTextContent('false')
  })

  it('toggles favorites correctly', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    )

    // Toggle on
    fireEvent.click(screen.getByText('Toggle Prayer'))
    expect(screen.getByTestId('is-prayer-favorite')).toHaveTextContent('true')
    expect(screen.getByTestId('favorites-count')).toHaveTextContent('1')

    // Toggle off
    fireEvent.click(screen.getByText('Toggle Prayer'))
    expect(screen.getByTestId('is-prayer-favorite')).toHaveTextContent('false')
    expect(screen.getByTestId('favorites-count')).toHaveTextContent('0')
  })

  it('prevents duplicate favorites', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    )

    fireEvent.click(screen.getByText('Add Attack'))
    fireEvent.click(screen.getByText('Add Attack'))

    expect(screen.getByTestId('favorites-count')).toHaveTextContent('1')
    expect(screen.getByTestId('favorites-list')).toHaveTextContent('Attack potion')
  })

  it('saves to localStorage when favorites change', () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    )

    fireEvent.click(screen.getByText('Add Attack'))

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'potionFavorites',
      JSON.stringify(['Attack potion'])
    )
  })

  it('handles localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <FavoritesProvider>
        <TestComponent />
      </FavoritesProvider>
    )

    expect(screen.getByTestId('favorites-count')).toHaveTextContent('0')
    expect(consoleSpy).toHaveBeenCalledWith('Error loading favorites:', expect.any(Error))

    consoleSpy.mockRestore()
  })
})

import { render, screen } from '@testing-library/react'
import { AllItemsTable } from './all-items-table'
import { MantineProvider } from '@mantine/core'
import { mockResizeObserver } from '../../../../tests/utils/mockResizeObserver'

describe('AllItemsTable', () => {
  const mockData = [
    {
      id: 1,
      name: 'Item 1',
      low: '100',
      high: '200',
      profit: '100',
      limit: '1000',
      img: 'test.jpg'
    }
  ]

  beforeAll(() => {
    mockResizeObserver()
  })

  it('renders smaller buttons on mobile', () => {
    // Set viewport to mobile
    global.innerWidth = 500
    global.dispatchEvent(new Event('resize'))

    render(
      <MantineProvider>
        <AllItemsTable data={mockData} favoriteItems={new Set()} onToggleFavorite={() => {}} showFavoriteColumn />
      </MantineProvider>
    )

    const favoriteButton = screen.getByLabelText('Favorite')
    const chartButton = screen.getByLabelText('Chart')

    expect(favoriteButton).toHaveStyle('font-size: 0.875rem') // Corresponds to size 'sm'
    expect(chartButton).toHaveStyle('font-size: 0.875rem') // Corresponds to size 'sm'
  })

  it('renders larger buttons on desktop', () => {
    // Set viewport to desktop
    global.innerWidth = 1200
    global.dispatchEvent(new Event('resize'))

    render(
      <MantineProvider>
        <AllItemsTable data={mockData} favoriteItems={new Set()} onToggleFavorite={() => {}} showFavoriteColumn />
      </MantineProvider>
    )

    const favoriteButton = screen.getByLabelText('Favorite')
    const chartButton = screen.getByLabelText('Chart')

    expect(favoriteButton).toHaveStyle('font-size: 1rem') // Corresponds to size 'md'
    expect(chartButton).toHaveStyle('font-size: 1rem') // Corresponds to size 'md'
  })
})

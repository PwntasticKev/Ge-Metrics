import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import FormulaDocumentation, { FormulaCard } from './index'
import { vi, describe, test, expect } from 'vitest'

// Mock the icons to avoid import issues
vi.mock('@tabler/icons-react', () => ({
  IconMathSymbols: () => <div data-testid="icon-math">Math</div>,
  IconBrain: () => <div data-testid="icon-brain">Brain</div>,
  IconCalculator: () => <div data-testid="icon-calculator">Calculator</div>,
  IconChartLine: () => <div data-testid="icon-chart">Chart</div>,
  IconTarget: () => <div data-testid="icon-target">Target</div>,
  IconAlertCircle: () => <div data-testid="icon-alert">Alert</div>,
  IconInfoCircle: () => <div data-testid="icon-info">Info</div>,
  IconEdit: () => <div data-testid="icon-edit">Edit</div>,
  IconCheck: () => <div data-testid="icon-check">Check</div>,
  IconX: () => <div data-testid="icon-x">X</div>,
  IconMath: () => <div data-testid="icon-math">Math</div>,
  IconTrendingUp: () => <div data-testid="icon-trending">Trending</div>,
  IconCoins: () => <div data-testid="icon-coins">Coins</div>,
  IconDiamond: () => <div data-testid="icon-diamond">Diamond</div>,
  IconClock: () => <div data-testid="icon-clock">Clock</div>,
  IconShield: () => <div data-testid="icon-shield">Shield</div>
}))

const renderWithMantine = (component) => {
  return render(
    <MantineProvider>
      {component}
    </MantineProvider>
  )
}

describe('FormulaDocumentation', () => {
  test('renders the main page title and description', () => {
    renderWithMantine(<FormulaDocumentation />)

    expect(screen.getByText('📚 Formula Documentation')).toBeInTheDocument()
    expect(screen.getByText(/Simple explanations of all algorithms and formulas used in Ge-Metrics/)).toBeInTheDocument()
  })

  test('renders all tab sections', () => {
    renderWithMantine(<FormulaDocumentation />)

    expect(screen.getByText('AI Predictions')).toBeInTheDocument()
    expect(screen.getByText('Profit Calculations')).toBeInTheDocument()
    expect(screen.getByText('Market Analysis')).toBeInTheDocument()
    expect(screen.getByText('Risk Assessment')).toBeInTheDocument()
    expect(screen.getByText('Other Formulas')).toBeInTheDocument()
  })

  test('shows AI Predictions content by default', () => {
    renderWithMantine(<FormulaDocumentation />)

    expect(screen.getByText('Overall AI Score')).toBeInTheDocument()
    expect(screen.getByText('Buy Limit Optimization')).toBeInTheDocument()
    expect(screen.getByText('Multi-Account Scaling Factor')).toBeInTheDocument()
  })

  test('switches to Profit Calculations tab when clicked', () => {
    renderWithMantine(<FormulaDocumentation />)

    const profitTab = screen.getByText('Profit Calculations')
    fireEvent.click(profitTab)

    expect(screen.getByText('Basic Profit Calculation')).toBeInTheDocument()
    expect(screen.getByText('Profit Margin Percentage')).toBeInTheDocument()
    expect(screen.getByText('ROI (Return on Investment)')).toBeInTheDocument()
  })

  test('switches to Market Analysis tab when clicked', () => {
    renderWithMantine(<FormulaDocumentation />)

    const marketTab = screen.getByText('Market Analysis')
    fireEvent.click(marketTab)

    expect(screen.getByText('Volume Analysis')).toBeInTheDocument()
    expect(screen.getByText('Price Stability Index')).toBeInTheDocument()
    expect(screen.getByText('Market Opportunity Score')).toBeInTheDocument()
  })

  test('switches to Risk Assessment tab when clicked', () => {
    renderWithMantine(<FormulaDocumentation />)

    const riskTab = screen.getByText('Risk Assessment')
    fireEvent.click(riskTab)

    expect(screen.getByText('Risk Score Calculation')).toBeInTheDocument()
    expect(screen.getByText('Loss Prevention Algorithm')).toBeInTheDocument()
  })

  test('switches to Other Formulas tab when clicked', () => {
    renderWithMantine(<FormulaDocumentation />)

    const otherTab = screen.getByText('Other Formulas')
    fireEvent.click(otherTab)

    expect(screen.getByText('Item Popularity Score')).toBeInTheDocument()
    expect(screen.getByText('Trend Strength Indicator')).toBeInTheDocument()
    expect(screen.getByText('Competition Level')).toBeInTheDocument()
  })

  test('renders important reminder alert', () => {
    renderWithMantine(<FormulaDocumentation />)

    expect(screen.getByText('📝 IMPORTANT REMINDER:')).toBeInTheDocument()
    expect(screen.getByText(/This documentation MUST be updated every time we make changes/)).toBeInTheDocument()
  })

  test('renders update required badge', () => {
    renderWithMantine(<FormulaDocumentation />)

    expect(screen.getByText('🚨 Update Required After Changes')).toBeInTheDocument()
  })

  test('renders edit formula button', () => {
    renderWithMantine(<FormulaDocumentation />)

    expect(screen.getByText('Edit Formula')).toBeInTheDocument()
  })

  test('renders help section at bottom', () => {
    renderWithMantine(<FormulaDocumentation />)

    expect(screen.getByText('💡 How to Keep This Updated:')).toBeInTheDocument()
    expect(screen.getByText(/Every time you change a formula or algorithm/)).toBeInTheDocument()
  })
})

describe('FormulaCard', () => {
  const mockProps = {
    title: 'Test Formula',
    description: 'This is a test formula description',
    formula: 'Test = A + B',
    variables: ['A: First variable', 'B: Second variable'],
    example: 'A=5, B=3: Test = 5 + 3 = 8',
    lastUpdated: 'Dec 2024',
    complexity: 'Simple',
    icon: () => <div data-testid="test-icon">Test Icon</div>
  }

  test('renders formula card with all props', () => {
    renderWithMantine(<FormulaCard {...mockProps} />)

    expect(screen.getByText('Test Formula')).toBeInTheDocument()
    expect(screen.getByText('This is a test formula description')).toBeInTheDocument()
    expect(screen.getByText('Test = A + B')).toBeInTheDocument()
    expect(screen.getByText('A: First variable')).toBeInTheDocument()
    expect(screen.getByText('B: Second variable')).toBeInTheDocument()
    expect(screen.getByText('A=5, B=3: Test = 5 + 3 = 8')).toBeInTheDocument()
    expect(screen.getByText('Last updated: Dec 2024')).toBeInTheDocument()
    expect(screen.getByText('Simple')).toBeInTheDocument()
  })

  test('renders formula card without optional props', () => {
    const minimalProps = {
      title: 'Minimal Formula',
      description: 'Minimal description',
      lastUpdated: 'Dec 2024',
      complexity: 'Medium',
      icon: () => <div data-testid="minimal-icon">Minimal Icon</div>
    }

    renderWithMantine(<FormulaCard {...minimalProps} />)

    expect(screen.getByText('Minimal Formula')).toBeInTheDocument()
    expect(screen.getByText('Minimal description')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  test('displays correct complexity badge color', () => {
    const { rerender } = renderWithMantine(<FormulaCard {...mockProps} complexity="Simple" />)
    expect(screen.getByText('Simple')).toBeInTheDocument()

    rerender(
      <MantineProvider>
        <FormulaCard {...mockProps} complexity="Medium" />
      </MantineProvider>
    )
    expect(screen.getByText('Medium')).toBeInTheDocument()

    rerender(
      <MantineProvider>
        <FormulaCard {...mockProps} complexity="High" />
      </MantineProvider>
    )
    expect(screen.getByText('High')).toBeInTheDocument()
  })
})

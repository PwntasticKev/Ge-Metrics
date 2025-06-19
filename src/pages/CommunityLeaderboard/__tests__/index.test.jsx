/* eslint-env jest */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'
import CommunityLeaderboard from '../index'

const TestWrapper = ({ children }) => (
  <MantineProvider>
    {children}
  </MantineProvider>
)

// Mock environment config
jest.mock('../../../config/environment', () => ({
  default: {
    app: {
      business: {
        ranks: {
          bronze: 10000000,
          iron: 30000000,
          steel: 50000000,
          mithril: 70000000,
          adamant: 90000000,
          rune: 130000000,
          dragon: 190000000,
          barrows: 270000000,
          torva: 370000000
        }
      }
    }
  }
}))

describe('CommunityLeaderboard', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders user profile card correctly', () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Check user profile elements
    expect(screen.getByText('CurrentUser')).toBeInTheDocument()
    expect(screen.getByText('Global Rank #156')).toBeInTheDocument()
    expect(screen.getByText('45.0M GP')).toBeInTheDocument() // Total profit
    expect(screen.getByText('0.9M GP')).toBeInTheDocument() // Weekly profit
    expect(screen.getByText('Bronze')).toBeInTheDocument() // Current rank
  })

  it('displays rank progress bar correctly', () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Should show progress to next tier (Iron)
    expect(screen.getByText('Progress to Iron')).toBeInTheDocument()

    // Progress bar should be present
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
  })

  it('switches between tabs correctly', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Initially on global leaderboard
    expect(screen.getByText('Top Players')).toBeInTheDocument()

    // Switch to clans tab
    await user.click(screen.getByRole('tab', { name: /clan rankings/i }))

    await waitFor(() => {
      expect(screen.getByText('Top Clans')).toBeInTheDocument()
      expect(screen.getByText('Elite Flippers')).toBeInTheDocument()
      expect(screen.getByText('Market Makers')).toBeInTheDocument()
    })

    // Switch to my clan tab
    await user.click(screen.getByRole('tab', { name: /my clan/i }))

    await waitFor(() => {
      expect(screen.getByText('No Clan')).toBeInTheDocument()
      expect(screen.getByText("You're not part of any clan yet")).toBeInTheDocument()
    })
  })

  it('displays global leaderboard correctly', () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Check leaderboard headers
    expect(screen.getByText('Rank')).toBeInTheDocument()
    expect(screen.getByText('Player')).toBeInTheDocument()
    expect(screen.getByText('Total Profit')).toBeInTheDocument()
    expect(screen.getByText('Weekly Profit')).toBeInTheDocument()
    expect(screen.getByText('Tier')).toBeInTheDocument()
    expect(screen.getByText('Clan')).toBeInTheDocument()

    // Check some leaderboard data
    expect(screen.getByText('FlipMaster')).toBeInTheDocument()
    expect(screen.getByText('GEKing')).toBeInTheDocument()
    expect(screen.getByText('ProfitWizard')).toBeInTheDocument()

    // Check rank badges and trophies for top 3
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()
  })

  it('displays clan cards correctly', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Switch to clans tab
    await user.click(screen.getByRole('tab', { name: /clan rankings/i }))

    await waitFor(() => {
      // Check clan card elements
      expect(screen.getByText('Elite Flippers')).toBeInTheDocument()
      expect(screen.getByText('24 members')).toBeInTheDocument()
      expect(screen.getByText('2100M GP')).toBeInTheDocument() // Total profit
      expect(screen.getByText('45M GP')).toBeInTheDocument() // Weekly profit
      expect(screen.getByText('Leader: FlipMaster')).toBeInTheDocument()
      expect(screen.getByText('Private')).toBeInTheDocument() // Privacy badge
    })
  })

  it('opens invite friend modal correctly', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Click invite friend button
    await user.click(screen.getByRole('button', { name: /invite friend/i }))

    await waitFor(() => {
      expect(screen.getByText('Invite Friend')).toBeInTheDocument()
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('friend@example.com')).toBeInTheDocument()
    })
  })

  it('handles friend invitation correctly', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Open invite modal
    await user.click(screen.getByRole('button', { name: /invite friend/i }))

    // Fill in email
    const emailInput = screen.getByPlaceholderText('friend@example.com')
    await user.type(emailInput, 'test@example.com')

    // Send invite
    await user.click(screen.getByRole('button', { name: /send invite/i }))

    await waitFor(() => {
      // Modal should close after successful invite
      expect(screen.queryByText('Invite Friend')).not.toBeInTheDocument()
    })
  })

  it('opens create clan modal correctly', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Switch to clans tab
    await user.click(screen.getByRole('tab', { name: /clan rankings/i }))

    // Click create clan button
    await user.click(screen.getByRole('button', { name: /create clan/i }))

    await waitFor(() => {
      expect(screen.getByText('Create New Clan')).toBeInTheDocument()
      expect(screen.getByLabelText('Clan Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Privacy')).toBeInTheDocument()
    })
  })

  it('handles clan creation correctly', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Switch to clans tab and open modal
    await user.click(screen.getByRole('tab', { name: /clan rankings/i }))
    await user.click(screen.getByRole('button', { name: /create clan/i }))

    // Fill in clan details
    await user.type(screen.getByLabelText('Clan Name'), 'Test Clan')
    await user.type(screen.getByLabelText('Description'), 'A test clan for testing')

    // Create clan
    await user.click(screen.getByRole('button', { name: /create clan/i }))

    await waitFor(() => {
      // Modal should close after successful creation
      expect(screen.queryByText('Create New Clan')).not.toBeInTheDocument()
    })
  })

  it('disables invite button when email is empty', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Open invite modal
    await user.click(screen.getByRole('button', { name: /invite friend/i }))

    // Send invite button should be disabled
    const sendButton = screen.getByRole('button', { name: /send invite/i })
    expect(sendButton).toBeDisabled()

    // Type email and button should be enabled
    await user.type(screen.getByPlaceholderText('friend@example.com'), 'test@example.com')
    expect(sendButton).not.toBeDisabled()
  })

  it('disables create clan button when name is empty', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Switch to clans tab and open modal
    await user.click(screen.getByRole('tab', { name: /clan rankings/i }))
    await user.click(screen.getByRole('button', { name: /create clan/i }))

    // Create clan button should be disabled
    const createButton = screen.getAllByRole('button', { name: /create clan/i })[1] // Second one is in modal
    expect(createButton).toBeDisabled()

    // Type name and button should be enabled
    await user.type(screen.getByLabelText('Clan Name'), 'Test Clan')
    expect(createButton).not.toBeDisabled()
  })

  it('displays different rank badges correctly', () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Check for various rank badges in the leaderboard
    // FlipMaster should have Torva rank (850M profit)
    // This would show in the leaderboard table
    const rankBadges = screen.getAllByText(/Bronze|Iron|Steel|Mithril|Adamant|Rune|Dragon|Barrows|Torva/)
    expect(rankBadges.length).toBeGreaterThan(0)
  })

  it('shows profit amounts correctly formatted', () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Check profit formatting in leaderboard
    expect(screen.getByText('850.0M GP')).toBeInTheDocument() // FlipMaster total
    expect(screen.getByText('12.5M GP')).toBeInTheDocument() // FlipMaster weekly
    expect(screen.getByText('720.0M GP')).toBeInTheDocument() // GEKing total
  })

  it('handles modal cancellation correctly', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Open invite modal
    await user.click(screen.getByRole('button', { name: /invite friend/i }))

    // Cancel modal
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByText('Invite Friend')).not.toBeInTheDocument()
    })
  })

  it('shows clan member count and stats correctly', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Switch to clans tab
    await user.click(screen.getByRole('tab', { name: /clan rankings/i }))

    await waitFor(() => {
      // Check clan stats
      expect(screen.getByText('24 members')).toBeInTheDocument()
      expect(screen.getByText('18 members')).toBeInTheDocument()
      expect(screen.getByText('31 members')).toBeInTheDocument()
    })
  })

  it('displays no clan message for user without clan', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Switch to my clan tab
    await user.click(screen.getByRole('tab', { name: /my clan/i }))

    await waitFor(() => {
      expect(screen.getByText('No Clan')).toBeInTheDocument()
      expect(screen.getByText("You're not part of any clan yet. Join or create a clan to compete with friends!")).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create clan/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /browse clans/i })).toBeInTheDocument()
    })
  })

  it('handles invite buttons in leaderboard correctly', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Find invite buttons in the leaderboard table
    const inviteButtons = screen.getAllByRole('button', { name: /invite/i })

    // Should have invite buttons for each player
    expect(inviteButtons.length).toBeGreaterThan(0)

    // Click first invite button
    await user.click(inviteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Invite Friend')).toBeInTheDocument()
    })
  })

  it('shows loading state during invite process', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Open invite modal and fill email
    await user.click(screen.getByRole('button', { name: /invite friend/i }))
    await user.type(screen.getByPlaceholderText('friend@example.com'), 'test@example.com')

    // Click send invite
    const sendButton = screen.getByRole('button', { name: /send invite/i })
    await user.click(sendButton)

    // Should show loading state temporarily
    expect(sendButton).toHaveAttribute('data-loading', 'true')
  })

  it('displays clan privacy settings correctly', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Switch to clans tab
    await user.click(screen.getByRole('tab', { name: /clan rankings/i }))

    await waitFor(() => {
      // Elite Flippers should show Private badge
      expect(screen.getByText('Private')).toBeInTheDocument()

      // Check for Request Join vs Join Clan buttons based on privacy
      expect(screen.getByRole('button', { name: /request join/i })).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /join clan/i })).toHaveLength(2) // For public clans
    })
  })
})

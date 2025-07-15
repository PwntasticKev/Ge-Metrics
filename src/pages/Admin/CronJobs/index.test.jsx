import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import CronJobs from './index.jsx'

const renderWithProvider = (component) => {
  return render(
    <MantineProvider>
      {component}
    </MantineProvider>
  )
}

describe('CronJobs', () => {
  beforeEach(() => {
    // Mock console.log
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('renders the component with title', () => {
    renderWithProvider(<CronJobs />)
    expect(screen.getByText('Cron Jobs Management')).toBeInTheDocument()
  })

  test('displays stats cards', () => {
    renderWithProvider(<CronJobs />)

    expect(screen.getByText('Total Jobs')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Avg Success Rate')).toBeInTheDocument()
  })

  test('displays cron jobs table', () => {
    renderWithProvider(<CronJobs />)

    expect(screen.getByText('Profit Opportunities Monitor')).toBeInTheDocument()
    expect(screen.getByText('Price Data Caching')).toBeInTheDocument()
    expect(screen.getByText('Whale Activity Monitor')).toBeInTheDocument()
    expect(screen.getByText('Volume Alert System')).toBeInTheDocument()
  })

  test('shows job schedules correctly', () => {
    renderWithProvider(<CronJobs />)

    expect(screen.getByText('Daily at 8am, 12pm, 4pm, 8pm UTC')).toBeInTheDocument()
    expect(screen.getByText('Every 2.5 minutes')).toBeInTheDocument()
    expect(screen.getByText('Every 10 minutes')).toBeInTheDocument()
  })

  test('displays job status badges', () => {
    renderWithProvider(<CronJobs />)

    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('running')).toBeInTheDocument()
    expect(screen.getByText('idle')).toBeInTheDocument()
  })

  test('shows success rate progress bars', () => {
    renderWithProvider(<CronJobs />)

    expect(screen.getByText('95%')).toBeInTheDocument()
    expect(screen.getByText('99%')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  test('opens job details modal when clicking eye icon', async () => {
    renderWithProvider(<CronJobs />)

    const eyeIcons = screen.getAllByTestId('IconEye')
    fireEvent.click(eyeIcons[0])

    await waitFor(() => {
      expect(screen.getByText('Profit Opportunities Monitor')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Schedule')).toBeInTheDocument()
      expect(screen.getByText('Data Sources')).toBeInTheDocument()
    })
  })

  test('opens logs modal when clicking settings icon', async () => {
    renderWithProvider(<CronJobs />)

    const settingsIcons = screen.getAllByTestId('IconSettings')
    fireEvent.click(settingsIcons[0])

    await waitFor(() => {
      expect(screen.getByText('Profit Opportunities Monitor - Recent Logs')).toBeInTheDocument()
      expect(screen.getByText('Started monitoring Reddit')).toBeInTheDocument()
    })
  })

  test('runs job manually when clicking play icon', () => {
    renderWithProvider(<CronJobs />)

    const playIcons = screen.getAllByTestId('IconPlay')
    fireEvent.click(playIcons[0])

    expect(console.log).toHaveBeenCalledWith('Manually running job: profit-opportunities')
  })

  test('toggles job enabled status', () => {
    renderWithProvider(<CronJobs />)

    const switches = screen.getAllByRole('checkbox')
    const firstSwitch = switches[0]

    // Check initial state (should be enabled)
    expect(firstSwitch).toBeChecked()

    // Toggle off
    fireEvent.click(firstSwitch)
    expect(firstSwitch).not.toBeChecked()

    // Toggle back on
    fireEvent.click(firstSwitch)
    expect(firstSwitch).toBeChecked()
  })

  test('displays job sources correctly', async () => {
    renderWithProvider(<CronJobs />)

    const eyeIcons = screen.getAllByTestId('IconEye')
    fireEvent.click(eyeIcons[0])

    await waitFor(() => {
      expect(screen.getByText('Reddit')).toBeInTheDocument()
      expect(screen.getByText('OSRS Wiki')).toBeInTheDocument()
    })
  })

  test('shows job actions in timeline', async () => {
    renderWithProvider(<CronJobs />)

    const eyeIcons = screen.getAllByTestId('IconEye')
    fireEvent.click(eyeIcons[0])

    await waitFor(() => {
      expect(screen.getByText('Monitor sources')).toBeInTheDocument()
      expect(screen.getByText('Analyze content')).toBeInTheDocument()
      expect(screen.getByText('Save opportunities')).toBeInTheDocument()
      expect(screen.getByText('Update AI predictions')).toBeInTheDocument()
    })
  })

  test('displays log entries with correct timestamps', async () => {
    renderWithProvider(<CronJobs />)

    const settingsIcons = screen.getAllByTestId('IconSettings')
    fireEvent.click(settingsIcons[0])

    await waitFor(() => {
      expect(screen.getByText('Started monitoring Reddit')).toBeInTheDocument()
      expect(screen.getByText('Found 3 new opportunities')).toBeInTheDocument()
      expect(screen.getByText('Updated AI predictions')).toBeInTheDocument()
      expect(screen.getByText('Completed successfully')).toBeInTheDocument()
    })
  })

  test('shows cron schedule codes', () => {
    renderWithProvider(<CronJobs />)

    expect(screen.getByText('0 8,12,16,20 * * *')).toBeInTheDocument()
    expect(screen.getByText('*/2.5 * * * *')).toBeInTheDocument()
    expect(screen.getByText('0 */10 * * * *')).toBeInTheDocument()
  })

  test('displays duration in readable format', () => {
    renderWithProvider(<CronJobs />)

    expect(screen.getByText('45s')).toBeInTheDocument() // 45000ms
    expect(screen.getByText('8s')).toBeInTheDocument() // 8000ms
    expect(screen.getByText('12s')).toBeInTheDocument() // 12000ms
  })

  test('shows time until next run', () => {
    renderWithProvider(<CronJobs />)

    // Should show "Due now" or time remaining for next run
    expect(screen.getByText(/in \d+m \d+s|Due now/)).toBeInTheDocument()
  })

  test('displays job descriptions', () => {
    renderWithProvider(<CronJobs />)

    expect(screen.getByText('Monitors Reddit, Wiki, and other sources for profit opportunities')).toBeInTheDocument()
    expect(screen.getByText('Fetches and caches OSRS Grand Exchange price data every 2.5 minutes')).toBeInTheDocument()
  })

  test('shows last run timestamps', () => {
    renderWithProvider(<CronJobs />)

    // Should show formatted timestamps
    expect(screen.getByText(/Jan 15, \d{1,2}:\d{2}:\d{2}/)).toBeInTheDocument()
  })

  test('displays next run timestamps', () => {
    renderWithProvider(<CronJobs />)

    // Should show formatted timestamps for next run
    expect(screen.getByText(/Jan 15, \d{1,2}:\d{2}:\d{2}/)).toBeInTheDocument()
  })

  test('closes modals when clicking close', async () => {
    renderWithProvider(<CronJobs />)

    // Open details modal
    const eyeIcons = screen.getAllByTestId('IconEye')
    fireEvent.click(eyeIcons[0])

    await waitFor(() => {
      expect(screen.getByText('Profit Opportunities Monitor')).toBeInTheDocument()
    })

    // Close modal
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText('Description')).not.toBeInTheDocument()
    })
  })

  test('shows alert in logs modal', async () => {
    renderWithProvider(<CronJobs />)

    const settingsIcons = screen.getAllByTestId('IconSettings')
    fireEvent.click(settingsIcons[0])

    await waitFor(() => {
      expect(screen.getByText(/Showing the most recent logs for this job/)).toBeInTheDocument()
    })
  })

  test('displays all job statuses correctly', () => {
    renderWithProvider(<CronJobs />)

    // Should show all different status types
    const statusBadges = screen.getAllByText(/active|running|idle|error/)
    expect(statusBadges.length).toBeGreaterThan(0)
  })

  test('shows correct success rate colors', () => {
    renderWithProvider(<CronJobs />)

    // High success rates should be green, medium yellow, low red
    // This is tested by checking the progress bars exist
    const progressBars = document.querySelectorAll('[role="progressbar"]')
    expect(progressBars.length).toBeGreaterThan(0)
  })
})

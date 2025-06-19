/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import Faq from './index'

const renderWithProviders = (component, initialEntries = ['/faq']) => {
  return render(
    <BrowserRouter>
      <MantineProvider theme={{ colorScheme: 'dark' }}>
        {component}
      </MantineProvider>
    </BrowserRouter>
  )
}

describe('FAQ Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders FAQ page with title', () => {
    renderWithProviders(<Faq />)

    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument()
    expect(screen.getByText('Find answers to common questions about Ge-Metrics')).toBeInTheDocument()
  })

  test('renders all accordion sections', () => {
    renderWithProviders(<Faq />)

    // Check for all main FAQ sections
    expect(screen.getByText('Smart Detection & AI Algorithms')).toBeInTheDocument()
    expect(screen.getByText('Email Alerts & Notifications')).toBeInTheDocument()
    expect(screen.getByText('Account Security & 2FA')).toBeInTheDocument()
    expect(screen.getByText('Watchlist & Price Tracking')).toBeInTheDocument()
    expect(screen.getByText('Data Sources & API')).toBeInTheDocument()
    expect(screen.getByText('Troubleshooting')).toBeInTheDocument()
  })

  test('opens smart detection section when hash is present', () => {
    // Mock location hash
    Object.defineProperty(window, 'location', {
      value: { hash: '#smart-detection' },
      writable: true
    })

    renderWithProviders(<Faq />)

    // Smart detection section should be expanded
    expect(screen.getByText('What is Smart Detection?')).toBeInTheDocument()
    expect(screen.getByText(/Smart Detection uses advanced AI algorithms/)).toBeInTheDocument()
  })

  test('expands accordion sections when clicked', () => {
    renderWithProviders(<Faq />)

    // Click on Smart Detection section
    const smartDetectionHeader = screen.getByText('Smart Detection & AI Algorithms')
    fireEvent.click(smartDetectionHeader)

    // Content should be visible
    expect(screen.getByText('What is Smart Detection?')).toBeInTheDocument()
    expect(screen.getByText(/Smart Detection uses advanced AI algorithms/)).toBeInTheDocument()
  })

  test('shows detailed smart detection information', () => {
    renderWithProviders(<Faq />)

    // Expand Smart Detection section
    fireEvent.click(screen.getByText('Smart Detection & AI Algorithms'))

    // Check for detailed information
    expect(screen.getByText('Pattern Recognition')).toBeInTheDocument()
    expect(screen.getByText('Volume Analysis')).toBeInTheDocument()
    expect(screen.getByText('Price Movement Detection')).toBeInTheDocument()
    expect(screen.getByText('Market Correlation')).toBeInTheDocument()
  })

  test('shows alert severity levels', () => {
    renderWithProviders(<Faq />)

    // Expand Smart Detection section
    fireEvent.click(screen.getByText('Smart Detection & AI Algorithms'))

    // Check for severity levels
    expect(screen.getByText('Low')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  test('shows email alerts configuration info', () => {
    renderWithProviders(<Faq />)

    // Expand Email Alerts section
    fireEvent.click(screen.getByText('Email Alerts & Notifications'))

    // Check for Mailchimp setup information
    expect(screen.getByText('How do I set up email alerts?')).toBeInTheDocument()
    expect(screen.getByText(/You need to configure a Mailchimp API key/)).toBeInTheDocument()
    expect(screen.getByText('Get your Mailchimp API key →')).toBeInTheDocument()
  })

  test('shows external links with correct attributes', () => {
    renderWithProviders(<Faq />)

    // Expand Email Alerts section
    fireEvent.click(screen.getByText('Email Alerts & Notifications'))

    // Check Mailchimp link
    const mailchimpLink = screen.getByText('Get your Mailchimp API key →')
    expect(mailchimpLink).toHaveAttribute('href', 'https://mailchimp.com/help/about-api-keys/')
    expect(mailchimpLink).toHaveAttribute('target', '_blank')
    expect(mailchimpLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('shows 2FA setup instructions', () => {
    renderWithProviders(<Faq />)

    // Expand Security section
    fireEvent.click(screen.getByText('Account Security & 2FA'))

    // Check for 2FA information
    expect(screen.getByText('How do I enable Two-Factor Authentication?')).toBeInTheDocument()
    expect(screen.getByText(/Go to Settings and find the Two-Factor Authentication section/)).toBeInTheDocument()
    expect(screen.getByText('Google Authenticator')).toBeInTheDocument()
    expect(screen.getByText('Authy')).toBeInTheDocument()
    expect(screen.getByText('Microsoft Authenticator')).toBeInTheDocument()
  })

  test('shows watchlist information', () => {
    renderWithProviders(<Faq />)

    // Expand Watchlist section
    fireEvent.click(screen.getByText('Watchlist & Price Tracking'))

    // Check for watchlist information
    expect(screen.getByText('How do I add items to my watchlist?')).toBeInTheDocument()
    expect(screen.getByText(/Click the "Add to Watchlist" button/)).toBeInTheDocument()
    expect(screen.getByText('Volume thresholds')).toBeInTheDocument()
    expect(screen.getByText('Price change percentages')).toBeInTheDocument()
  })

  test('shows data sources information', () => {
    renderWithProviders(<Faq />)

    // Expand Data Sources section
    fireEvent.click(screen.getByText('Data Sources & API'))

    // Check for data source information
    expect(screen.getByText('Where does the data come from?')).toBeInTheDocument()
    expect(screen.getByText(/Old School RuneScape Grand Exchange API/)).toBeInTheDocument()
    expect(screen.getByText('Real-time price updates')).toBeInTheDocument()
    expect(screen.getByText('Historical price data')).toBeInTheDocument()
    expect(screen.getByText('Trading volume information')).toBeInTheDocument()
  })

  test('shows troubleshooting section', () => {
    renderWithProviders(<Faq />)

    // Expand Troubleshooting section
    fireEvent.click(screen.getByText('Troubleshooting'))

    // Check for troubleshooting information
    expect(screen.getByText('Why am I not receiving email alerts?')).toBeInTheDocument()
    expect(screen.getByText(/Check your Mailchimp API key configuration/)).toBeInTheDocument()
    expect(screen.getByText('Why is data not loading?')).toBeInTheDocument()
    expect(screen.getByText(/Try refreshing the page/)).toBeInTheDocument()
  })

  test('shows links to settings page', () => {
    renderWithProviders(<Faq />)

    // Expand relevant sections and look for settings links
    fireEvent.click(screen.getByText('Email Alerts & Notifications'))
    fireEvent.click(screen.getByText('Account Security & 2FA'))

    // Check for settings page links
    const settingsLinks = screen.getAllByText(/Settings/i)
    expect(settingsLinks.length).toBeGreaterThan(0)
  })

  test('shows proper code formatting', () => {
    renderWithProviders(<Faq />)

    // Expand Smart Detection section
    fireEvent.click(screen.getByText('Smart Detection & AI Algorithms'))

    // Check for code blocks or formatted text
    const codeElements = document.querySelectorAll('code, pre')
    expect(codeElements.length).toBeGreaterThan(0)
  })

  test('shows collapsible sections work independently', () => {
    renderWithProviders(<Faq />)

    // Open first section
    fireEvent.click(screen.getByText('Smart Detection & AI Algorithms'))
    expect(screen.getByText('What is Smart Detection?')).toBeInTheDocument()

    // Open second section
    fireEvent.click(screen.getByText('Email Alerts & Notifications'))
    expect(screen.getByText('How do I set up email alerts?')).toBeInTheDocument()

    // Both should be open
    expect(screen.getByText('What is Smart Detection?')).toBeInTheDocument()
    expect(screen.getByText('How do I set up email alerts?')).toBeInTheDocument()

    // Close first section
    fireEvent.click(screen.getByText('Smart Detection & AI Algorithms'))

    // First should be closed, second should still be open
    expect(screen.queryByText('What is Smart Detection?')).not.toBeInTheDocument()
    expect(screen.getByText('How do I set up email alerts?')).toBeInTheDocument()
  })

  test('handles hash navigation correctly', () => {
    // Mock location hash change
    Object.defineProperty(window, 'location', {
      value: { hash: '#email-alerts' },
      writable: true
    })

    renderWithProviders(<Faq />)

    // Should automatically expand the email alerts section
    expect(screen.getByText('How do I set up email alerts?')).toBeInTheDocument()
  })

  test('shows proper styling for different content types', () => {
    renderWithProviders(<Faq />)

    // Expand sections and check for different styling elements
    fireEvent.click(screen.getByText('Smart Detection & AI Algorithms'))

    // Check for lists, headings, and other styled elements
    const listItems = document.querySelectorAll('li')
    const headings = document.querySelectorAll('h3, h4, h5')
    const paragraphs = document.querySelectorAll('p')

    expect(listItems.length).toBeGreaterThan(0)
    expect(headings.length).toBeGreaterThan(0)
    expect(paragraphs.length).toBeGreaterThan(0)
  })

  test('shows contact information or support links', () => {
    renderWithProviders(<Faq />)

    // Look for any contact or support information
    const supportText = screen.queryByText(/support/i) || screen.queryByText(/contact/i) || screen.queryByText(/help/i)
    expect(supportText).toBeTruthy()
  })

  test('is responsive and accessible', () => {
    renderWithProviders(<Faq />)

    // Check for proper ARIA attributes
    const accordionButtons = screen.getAllByRole('button')
    accordionButtons.forEach(button => {
      expect(button).toHaveAttribute('aria-expanded')
    })

    // Check for proper heading structure
    const mainHeading = screen.getByRole('heading', { level: 1 })
    expect(mainHeading).toBeInTheDocument()
  })
})

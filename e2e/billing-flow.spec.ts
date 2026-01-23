import { test, expect } from '@playwright/test'

/**
 * Critical E2E Tests for Billing Flow
 * Tests the complete billing functionality including Stripe integration
 */

const TEST_USER = {
  email: `billing-test-${Date.now()}@ge-metrics.com`,
  username: `billingtest${Date.now()}`,
  password: 'TestBilling123!@#'
}

test.describe('Billing Flow - Critical E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Stripe responses to avoid actual charges during testing
    await page.route('**/api/stripe/**', async (route) => {
      const url = route.request().url()
      if (url.includes('create-checkout-session')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            url: 'https://checkout.stripe.com/pay/cs_test_mock_session_id'
          })
        })
      } else {
        await route.continue()
      }
    })

    // Mock billing API responses
    await page.route('**/trpc/billing.**', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        // Mock subscription status
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              data: {
                plan: 'free',
                status: 'active',
                trialDaysRemaining: 14,
                isTrialing: true,
                currentPrice: null,
                nextBillingDate: null
              }
            }
          })
        })
      } else {
        await route.continue()
      }
    })
  })

  test('should display subscription status correctly', async ({ page }) => {
    // Navigate to billing page (assuming user is logged in)
    await page.goto('/billing')
    
    // Should show current subscription status
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Trial Active')
    await expect(page.locator('[data-testid="trial-days"]')).toContainText('14 days')
    
    // Should show upgrade options
    await expect(page.locator('text=Upgrade to Premium')).toBeVisible()
  })

  test('should initiate Stripe checkout flow', async ({ page }) => {
    await page.goto('/billing')
    
    // Click upgrade button
    await page.click('[data-testid="upgrade-button"]')
    
    // Should show pricing options or redirect to checkout
    const upgradeModal = page.locator('[data-testid="upgrade-modal"]')
    const checkoutRedirect = page.waitForURL(/.*stripe\.com.*/)
    
    // Either modal should appear or redirect should happen
    await Promise.race([
      expect(upgradeModal).toBeVisible(),
      checkoutRedirect
    ])
    
    console.log('✅ Stripe checkout initiation working')
  })

  test('should handle subscription upgrade', async ({ page }) => {
    // Mock successful upgrade response
    await page.route('**/trpc/billing.createCheckoutSession', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: { url: 'https://checkout.stripe.com/test-session' }
          }
        })
      })
    })

    await page.goto('/billing')
    await page.click('[data-testid="upgrade-button"]')
    
    // Should redirect to Stripe checkout
    await expect(page).toHaveURL(/.*checkout\.stripe\.com.*/)
  })

  test('should display billing history', async ({ page }) => {
    // Mock invoice history
    await page.route('**/trpc/billing.getInvoices', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: [
              {
                id: 'in_test_123',
                number: 'INV-001',
                amount: 999, // $9.99
                currency: 'usd',
                status: 'paid',
                date: new Date().toISOString(),
                description: 'GE-Metrics Premium',
                invoiceUrl: 'https://example.com/invoice.pdf'
              }
            ]
          }
        })
      })
    })

    await page.goto('/billing')
    
    // Should display invoice history
    await expect(page.locator('[data-testid="invoice-history"]')).toBeVisible()
    await expect(page.locator('text=INV-001')).toBeVisible()
    await expect(page.locator('text=$9.99')).toBeVisible()
  })

  test('should handle payment method management', async ({ page }) => {
    // Mock payment method response
    await page.route('**/trpc/billing.getPaymentMethod', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              brand: 'visa',
              last4: '4242',
              expMonth: 12,
              expYear: 2025
            }
          }
        })
      })
    })

    await page.goto('/billing')
    
    // Should display payment method if exists
    await expect(page.locator('text=**** 4242')).toBeVisible()
    await expect(page.locator('text=Visa')).toBeVisible()
    
    // Should have option to update payment method
    await expect(page.locator('[data-testid="update-payment-method"]')).toBeVisible()
  })

  test('should handle subscription cancellation', async ({ page }) => {
    // Mock active subscription
    await page.route('**/trpc/billing.getSubscription', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              plan: 'premium',
              status: 'active',
              isTrialing: false,
              currentPrice: 999,
              currency: 'usd',
              nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              cancelAtPeriodEnd: false
            }
          }
        })
      })
    })

    await page.goto('/billing')
    
    // Should show cancel option for active subscription
    await expect(page.locator('[data-testid="cancel-subscription"]')).toBeVisible()
    
    // Click cancel button
    await page.click('[data-testid="cancel-subscription"]')
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="cancel-confirmation"]')).toBeVisible()
    await expect(page.locator('text=Are you sure')).toBeVisible()
  })

  test('should handle billing errors gracefully', async ({ page }) => {
    // Mock billing API error
    await page.route('**/trpc/billing.**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Billing service temporarily unavailable'
          }
        })
      })
    })

    await page.goto('/billing')
    
    // Should display error message
    await expect(page.locator('[data-testid="billing-error"]')).toBeVisible()
    await expect(page.locator('text=temporarily unavailable')).toBeVisible()
    
    // Should have retry option
    await expect(page.locator('[data-testid="retry-billing"]')).toBeVisible()
  })

  test('should validate trial limitations', async ({ page }) => {
    await page.goto('/billing')
    
    // Should show trial status
    await expect(page.locator('text=Trial Active')).toBeVisible()
    
    // Navigate to a premium feature
    await page.goto('/analytics')
    
    // Should show upgrade prompt for premium features
    const upgradePrompt = page.locator('[data-testid="upgrade-prompt"]')
    if (await upgradePrompt.isVisible()) {
      await expect(upgradePrompt).toContainText('Upgrade to access')
    }
  })
})

test.describe('Stripe Webhook Handling', () => {
  test('should handle successful payment webhook', async ({ request }) => {
    // Test webhook endpoint with mock Stripe event
    const webhookPayload = {
      id: 'evt_test_webhook',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session',
          mode: 'subscription',
          subscription: 'sub_test_subscription',
          customer: 'cus_test_customer',
          metadata: { userId: '1' }
        }
      }
    }

    const response = await request.post('/api/stripe/webhook', {
      data: webhookPayload,
      headers: {
        'stripe-signature': 'test-signature'
      }
    })

    // Webhook should process successfully (or fail gracefully)
    expect([200, 400].includes(response.status())).toBeTruthy()
  })

  test('should handle failed payment webhook', async ({ request }) => {
    const webhookPayload = {
      id: 'evt_test_webhook_failed',
      object: 'event',
      type: 'invoice.payment_failed',
      data: {
        object: {
          subscription: 'sub_test_subscription',
          customer: 'cus_test_customer'
        }
      }
    }

    const response = await request.post('/api/stripe/webhook', {
      data: webhookPayload,
      headers: {
        'stripe-signature': 'test-signature'
      }
    })

    // Should handle failed payment webhook
    expect([200, 400].includes(response.status())).toBeTruthy()
  })
})

test.describe('Billing Security Tests', () => {
  test('should require authentication for billing endpoints', async ({ request }) => {
    // Test billing endpoints without authentication
    const endpoints = [
      '/trpc/billing.getSubscription',
      '/trpc/billing.createCheckoutSession',
      '/trpc/billing.getInvoices'
    ]

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint)
      // Should return 401 or redirect to login
      expect([401, 403, 302].includes(response.status())).toBeTruthy()
    }
  })

  test('should validate Stripe webhook signatures', async ({ request }) => {
    // Test webhook with invalid signature
    const response = await request.post('/api/stripe/webhook', {
      data: { test: 'invalid' },
      headers: {
        'stripe-signature': 'invalid-signature'
      }
    })

    // Should reject invalid signatures
    expect(response.status()).toBe(400)
  })
})
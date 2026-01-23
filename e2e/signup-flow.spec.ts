import { test, expect } from '@playwright/test'

// Test configuration
const TEST_USER = {
  email: `test-${Date.now()}@ge-metrics-test.com`,
  username: `testuser${Date.now()}`,
  password: 'TestPass123!@#'
}

test.describe('Complete Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh on the homepage
    await page.goto('/')
  })

  test('should complete full signup flow with email verification', async ({ page }) => {
    // Step 1: Navigate to signup
    await page.click('text=Sign Up')
    await expect(page).toHaveURL(/.*signup/)
    
    // Step 2: Fill out signup form
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[name="runescapeName"]', TEST_USER.username)  
    await page.fill('input[type="password"]', TEST_USER.password)
    
    // Accept terms
    await page.check('input[type="checkbox"]')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Step 3: Check for successful registration
    await expect(page.locator('text=Check your email')).toBeVisible()
    
    // In a real test, you would:
    // 1. Check test email inbox for verification email
    // 2. Extract verification token from email
    // 3. Navigate to verification URL
    // 4. Verify account is activated
    
    console.log(`✅ Signup completed for ${TEST_USER.email}`)
    console.log('📧 Check email inbox for verification link')
  })

  test('should show proper validation errors', async ({ page }) => {
    await page.goto('/signup')
    
    // Try to submit empty form
    await page.click('button[type="submit"]')
    
    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible()
    await expect(page.locator('text=RuneScape username is required')).toBeVisible()
    await expect(page.locator('text=Password does not meet all requirements')).toBeVisible()
  })

  test('should prevent duplicate email registration', async ({ page }) => {
    await page.goto('/signup')
    
    // Try to register with an email that already exists
    await page.fill('input[type="email"]', 'existing-user@example.com')
    await page.fill('input[name="runescapeName"]', 'newusername')  
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.check('input[type="checkbox"]')
    
    await page.click('button[type="submit"]')
    
    // Should show error for duplicate email
    await expect(page.locator('text=User with this email or username already exists')).toBeVisible()
  })

  test('should handle password requirements correctly', async ({ page }) => {
    await page.goto('/signup')
    
    const passwordInput = page.locator('input[type="password"]')
    
    // Test weak password
    await passwordInput.fill('weak')
    await expect(page.locator('text=Includes number')).toHaveClass(/.*red.*/)
    await expect(page.locator('text=Includes uppercase letter')).toHaveClass(/.*red.*/)
    
    // Test strong password
    await passwordInput.fill(TEST_USER.password)
    await expect(page.locator('text=Includes number')).toHaveClass(/.*green.*/)
    await expect(page.locator('text=Includes uppercase letter')).toHaveClass(/.*green.*/)
  })
})

test.describe('Email Verification Flow', () => {
  // This test requires manual setup of a verification token
  test.skip('should verify email with valid token', async ({ page }) => {
    // This would require:
    // 1. Creating a user in the database
    // 2. Generating a verification token
    // 3. Navigating to the verification URL
    
    const verificationToken = 'test-verification-token'
    await page.goto(`/verify-email?token=${verificationToken}`)
    
    await expect(page.locator('text=Email verified successfully')).toBeVisible()
    await expect(page).toHaveURL(/.*login/)
  })

  test('should handle invalid verification token', async ({ page }) => {
    await page.goto('/verify-email?token=invalid-token')
    
    await expect(page.locator('text=Invalid or expired verification token')).toBeVisible()
  })
})

test.describe('Trial Subscription Creation', () => {
  test.beforeEach(async ({ page }) => {
    // This assumes the user is logged in after verification
    // In a real test, you'd set up authentication state
  })
  
  test.skip('should create 30-day trial automatically', async ({ page }) => {
    // Navigate to profile/billing page
    await page.goto('/profile')
    
    // Check that trial subscription exists
    await expect(page.locator('text=Trial Active')).toBeVisible()
    await expect(page.locator('text=30 days remaining')).toBeVisible()
  })
})

test.describe('Stripe Integration', () => {
  test('should redirect to Stripe checkout for paid subscription', async ({ page }) => {
    // This test requires being logged in and having Stripe configured
    await page.goto('/profile')
    
    // Click upgrade button
    await page.click('text=Upgrade to Pro')
    
    // Should redirect to Stripe (or show checkout form)
    await page.waitForURL(/.*stripe\.com.*|.*checkout.*/)
    
    // Verify Stripe checkout page loads
    await expect(page.locator('text=Card number')).toBeVisible()
  })

  test.skip('should handle successful payment callback', async ({ page }) => {
    // This would test the success URL callback from Stripe
    const sessionId = 'cs_test_example_session_id'
    await page.goto(`/signup/success?session_id=${sessionId}`)
    
    await expect(page.locator('text=Payment successful')).toBeVisible()
    await expect(page.locator('text=Welcome to GE-Metrics Pro')).toBeVisible()
  })
})

// Helper test to verify backend endpoints
test.describe('API Integration Tests', () => {
  test('should register user via API', async ({ request }) => {
    const response = await request.post('/api/trpc/auth.register', {
      data: {
        email: TEST_USER.email,
        username: TEST_USER.username,
        password: TEST_USER.password
      }
    })
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data.result.data.user.email).toBe(TEST_USER.email)
  })

  test('should send verification email', async ({ request }) => {
    // This would test the email service endpoint
    const response = await request.post('/api/send-verification-email', {
      data: { email: TEST_USER.email }
    })
    
    expect(response.ok()).toBeTruthy()
  })
})

/**
 * Manual Test Checklist:
 * 
 * 1. Email Verification:
 *    - Sign up with real email
 *    - Check inbox (and spam) for verification email
 *    - Click verification link
 *    - Verify account is activated
 * 
 * 2. Stripe Integration:
 *    - Attempt to upgrade subscription
 *    - Use test card: 4242 4242 4242 4242
 *    - Verify webhook events are received
 *    - Check subscription status in database
 * 
 * 3. Trial Functionality:
 *    - Verify 30-day trial is created automatically
 *    - Check trial expiration date
 *    - Test feature access during trial
 * 
 * 4. Error Handling:
 *    - Test with duplicate emails
 *    - Test with invalid passwords
 *    - Test with network errors
 *    - Test with Stripe failures
 */
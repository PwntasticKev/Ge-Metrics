import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import billingService from './billingService'

describe('BillingService', () => {
  beforeEach(() => {
    // Clear service state for clean tests
    billingService.subscriptions.clear()
    billingService.transactions.clear()
    billingService.customers.clear()
    billingService.refunds.clear()

    // Reinitialize mock data
    billingService.initializeMockData()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Subscription Management', () => {
    it('should create monthly subscriptions', async () => {
      const result = await billingService.createSubscription('user_test', 'monthly', 'pm_test')

      expect(result.success).toBe(true)
      expect(result.subscription).toBeDefined()
      expect(result.subscription.planId).toBe('monthly')
      expect(result.subscription.plan.price).toBe(4.00)
      expect(result.subscription.status).toBe('active')
    })

    it('should create yearly subscriptions with correct pricing', async () => {
      const result = await billingService.createSubscription('user_test', 'yearly', 'pm_test')

      expect(result.success).toBe(true)
      expect(result.subscription.planId).toBe('yearly')
      expect(result.subscription.plan.price).toBe(33.00)
      expect(result.subscription.plan.monthlyEquivalent).toBe(2.75)
      expect(result.subscription.plan.savings).toBe(31)
    })

    it('should create free trial subscriptions', async () => {
      const result = await billingService.createSubscription('user_test', 'trial', null)

      expect(result.success).toBe(true)
      expect(result.subscription.planId).toBe('trial')
      expect(result.subscription.plan.price).toBe(0)
      expect(result.subscription.trialEnd).toBeDefined()
    })

    it('should reject invalid plan IDs', async () => {
      const result = await billingService.createSubscription('user_test', 'invalid_plan', 'pm_test')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid plan selected')
    })

    it('should cancel subscriptions at period end', async () => {
      const createResult = await billingService.createSubscription('user_test', 'monthly', 'pm_test')
      const subscriptionId = createResult.subscription.id

      const cancelResult = await billingService.cancelSubscription(subscriptionId, false)

      expect(cancelResult.success).toBe(true)
      expect(cancelResult.subscription.cancelAtPeriodEnd).toBe(true)
      expect(cancelResult.subscription.status).toBe('active') // Still active until period end
    })

    it('should cancel subscriptions immediately', async () => {
      const createResult = await billingService.createSubscription('user_test', 'monthly', 'pm_test')
      const subscriptionId = createResult.subscription.id

      const cancelResult = await billingService.cancelSubscription(subscriptionId, true)

      expect(cancelResult.success).toBe(true)
      expect(cancelResult.subscription.status).toBe('canceled')
      expect(cancelResult.subscription.canceledAt).toBeDefined()
    })

    it('should update subscription plans', async () => {
      const createResult = await billingService.createSubscription('user_test', 'monthly', 'pm_test')
      const subscriptionId = createResult.subscription.id

      const updateResult = await billingService.updateSubscription(subscriptionId, 'yearly')

      expect(updateResult.success).toBe(true)
      expect(updateResult.subscription.planId).toBe('yearly')
      expect(updateResult.proration).toBeDefined()
    })

    it('should calculate prorations correctly', async () => {
      const createResult = await billingService.createSubscription('user_test', 'monthly', 'pm_test')
      const subscriptionId = createResult.subscription.id

      const updateResult = await billingService.updateSubscription(subscriptionId, 'yearly')

      expect(updateResult.proration.amount).toBeDefined()
      expect(updateResult.proration.daysRemaining).toBeGreaterThan(0)
    })
  })

  describe('Payment Processing', () => {
    it('should create payment records', async () => {
      const result = await billingService.createPayment('user_test', 'sub_test', 4.00, 'subscription')

      expect(result.success).toBe(true)
      expect(result.payment.amount).toBe(4.00)
      expect(result.payment.type).toBe('subscription')
      expect(result.payment.status).toBe('succeeded')
    })

    it('should update customer billing history', async () => {
      await billingService.createPayment('user_test', 'sub_test', 4.00, 'subscription')

      const customer = billingService.customers.get('user_test')
      expect(customer.totalSpent).toBe(4.00)
      expect(customer.paymentHistory.length).toBeGreaterThan(0)
    })

    it('should process full refunds', async () => {
      const paymentResult = await billingService.createPayment('user_test', 'sub_test', 4.00, 'subscription')
      const paymentId = paymentResult.payment.id

      const refundResult = await billingService.processRefund(paymentId, null, 'Customer request')

      expect(refundResult.success).toBe(true)
      expect(refundResult.refund.amount).toBe(4.00)
      expect(refundResult.refund.reason).toBe('Customer request')

      // Check payment status updated
      const payment = billingService.transactions.get(paymentId)
      expect(payment.status).toBe('refunded')
    })

    it('should process partial refunds', async () => {
      const paymentResult = await billingService.createPayment('user_test', 'sub_test', 4.00, 'subscription')
      const paymentId = paymentResult.payment.id

      const refundResult = await billingService.processRefund(paymentId, 2.00, 'Partial refund')

      expect(refundResult.success).toBe(true)
      expect(refundResult.refund.amount).toBe(2.00)

      // Payment should still be succeeded (not fully refunded)
      const payment = billingService.transactions.get(paymentId)
      expect(payment.status).toBe('succeeded')
    })

    it('should reject refunds exceeding payment amount', async () => {
      const paymentResult = await billingService.createPayment('user_test', 'sub_test', 4.00, 'subscription')
      const paymentId = paymentResult.payment.id

      const refundResult = await billingService.processRefund(paymentId, 10.00, 'Invalid refund')

      expect(refundResult.success).toBe(false)
      expect(refundResult.error).toContain('exceeds payment amount')
    })

    it('should reject refunds for non-existent payments', async () => {
      const refundResult = await billingService.processRefund('invalid_payment_id', 4.00, 'Invalid payment')

      expect(refundResult.success).toBe(false)
      expect(refundResult.error).toContain('Payment not found')
    })
  })

  describe('Trial Management', () => {
    it('should start free trials for new users', async () => {
      const result = await billingService.startFreeTrial('new_user')

      expect(result.success).toBe(true)
      expect(result.subscription.planId).toBe('trial')
      expect(result.subscription.trialEnd).toBeDefined()
    })

    it('should prevent multiple trials for same user', async () => {
      await billingService.startFreeTrial('user_test')
      const secondTrial = await billingService.startFreeTrial('user_test')

      expect(secondTrial.success).toBe(false)
      expect(secondTrial.error).toContain('already used their free trial')
    })

    it('should allow admins to grant additional trials', async () => {
      await billingService.startFreeTrial('user_test') // First trial
      const adminGrant = await billingService.grantFreeTrial('user_test', 'admin_user')

      expect(adminGrant.success).toBe(true)
    })
  })

  describe('Customer Management', () => {
    it('should retrieve customer billing information', () => {
      const billing = billingService.getCustomerBilling('user_1')

      expect(billing.customer).toBeDefined()
      expect(billing.subscription).toBeDefined()
      expect(billing.payments).toBeDefined()
      expect(billing.refunds).toBeDefined()
      expect(billing.summary).toBeDefined()
      expect(billing.summary.totalSpent).toBeGreaterThanOrEqual(0)
    })

    it('should return empty data for non-existent customers', () => {
      const billing = billingService.getCustomerBilling('non_existent_user')

      expect(billing.customer).toBeUndefined()
      expect(billing.payments).toEqual([])
      expect(billing.refunds).toEqual([])
    })
  })

  describe('Admin Functions', () => {
    it('should retrieve all customers', () => {
      const customers = billingService.getAllCustomers()

      expect(Array.isArray(customers)).toBe(true)
      expect(customers.length).toBeGreaterThan(0)

      customers.forEach(customer => {
        expect(customer).toHaveProperty('id')
        expect(customer).toHaveProperty('email')
        expect(customer).toHaveProperty('billing')
      })
    })

    it('should generate subscription statistics', () => {
      const stats = billingService.getSubscriptionStats()

      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('active')
      expect(stats).toHaveProperty('canceled')
      expect(stats).toHaveProperty('trials')
      expect(stats).toHaveProperty('monthly')
      expect(stats).toHaveProperty('yearly')
      expect(stats).toHaveProperty('mrr')
      expect(stats).toHaveProperty('arr')
      expect(stats).toHaveProperty('totalRevenue')

      expect(typeof stats.total).toBe('number')
      expect(typeof stats.mrr).toBe('number')
      expect(typeof stats.arr).toBe('number')
    })

    it('should generate revenue metrics', () => {
      const metrics = billingService.getRevenueMetrics()

      expect(metrics).toHaveProperty('monthlyRevenue')
      expect(metrics).toHaveProperty('yearlyRevenue')
      expect(metrics).toHaveProperty('monthlyRefunds')
      expect(metrics).toHaveProperty('netMonthlyRevenue')
      expect(metrics).toHaveProperty('totalRevenue')
      expect(metrics).toHaveProperty('totalRefunds')

      expect(typeof metrics.totalRevenue).toBe('number')
      expect(typeof metrics.totalRefunds).toBe('number')
    })
  })

  describe('Utility Functions', () => {
    it('should find active subscriptions for users', () => {
      const subscription = billingService.getUserActiveSubscription('user_1')

      expect(subscription).toBeDefined()
      expect(subscription.status).toBe('active')
      expect(subscription.userId).toBe('user_1')
    })

    it('should return undefined for users without active subscriptions', () => {
      const subscription = billingService.getUserActiveSubscription('non_existent_user')
      expect(subscription).toBeUndefined()
    })

    it('should generate unique IDs', () => {
      const id1 = billingService.generateId('test')
      const id2 = billingService.generateId('test')

      expect(id1).not.toBe(id2)
      expect(id1.startsWith('test_')).toBe(true)
      expect(id2.startsWith('test_')).toBe(true)
    })

    it('should calculate prorations accurately', () => {
      const mockSubscription = {
        currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
      }
      const oldPlan = { price: 4.00, interval: 'month' }
      const newPlan = { price: 33.00, interval: 'year' }

      const proration = billingService.calculateProration(mockSubscription, oldPlan, newPlan)

      expect(proration).toHaveProperty('amount')
      expect(proration).toHaveProperty('daysRemaining')
      expect(proration).toHaveProperty('unusedAmount')
      expect(proration).toHaveProperty('newAmount')
      expect(proration.daysRemaining).toBeGreaterThan(0)
    })
  })

  describe('Plan Configuration', () => {
    it('should have correct monthly plan configuration', () => {
      const plan = billingService.plans.monthly

      expect(plan.id).toBe('monthly')
      expect(plan.name).toBe('Monthly Premium')
      expect(plan.price).toBe(4.00)
      expect(plan.currency).toBe('USD')
      expect(plan.interval).toBe('month')
      expect(Array.isArray(plan.features)).toBe(true)
      expect(plan.features.length).toBeGreaterThan(0)
    })

    it('should have correct yearly plan configuration', () => {
      const plan = billingService.plans.yearly

      expect(plan.id).toBe('yearly')
      expect(plan.name).toBe('Yearly Premium')
      expect(plan.price).toBe(33.00)
      expect(plan.monthlyEquivalent).toBe(2.75)
      expect(plan.savings).toBe(31)
      expect(plan.currency).toBe('USD')
      expect(plan.interval).toBe('year')
    })

    it('should have correct trial plan configuration', () => {
      const plan = billingService.plans.trial

      expect(plan.id).toBe('trial')
      expect(plan.name).toBe('Free Trial')
      expect(plan.price).toBe(0)
      expect(plan.duration).toBe(30)
      expect(plan.interval).toBe('month')
    })

    it('should validate yearly plan offers better value', () => {
      const monthly = billingService.plans.monthly
      const yearly = billingService.plans.yearly

      const monthlyYearlyPrice = monthly.price * 12
      const yearlyPrice = yearly.price

      expect(yearlyPrice).toBeLessThan(monthlyYearlyPrice)

      // Verify the monthly equivalent calculation
      const actualMonthlyEquivalent = yearly.price / 12
      expect(Math.abs(actualMonthlyEquivalent - yearly.monthlyEquivalent)).toBeLessThan(0.01)
    })
  })

  describe('Error Handling', () => {
    it('should handle subscription creation errors gracefully', async () => {
      // Test with invalid plan
      const result = await billingService.createSubscription('user_test', null, 'pm_test')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle payment processing errors', async () => {
      // Test with invalid parameters
      const result = await billingService.createPayment(null, null, -1, 'invalid')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle refund processing errors', async () => {
      const result = await billingService.processRefund('invalid_id', 100, 'test')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Data Integrity', () => {
    it('should maintain data consistency across operations', async () => {
      const userId = 'consistency_test_user'

      // Create subscription
      const subResult = await billingService.createSubscription(userId, 'monthly', 'pm_test')
      expect(subResult.success).toBe(true)

      // Verify customer was created/updated
      const customer = billingService.customers.get(userId)
      expect(customer).toBeDefined()

      // Verify payment was created
      const payments = Array.from(billingService.transactions.values())
        .filter(payment => payment.userId === userId)
      expect(payments.length).toBe(1)

      // Verify billing totals match
      const billing = billingService.getCustomerBilling(userId)
      expect(billing.summary.totalSpent).toBe(4.00)
      expect(billing.summary.paymentCount).toBe(1)
    })

    it('should handle concurrent operations safely', async () => {
      const userId = 'concurrent_test_user'

      // Create multiple payments concurrently
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(billingService.createPayment(userId, `sub_${i}`, 4.00, 'subscription'))
      }

      const results = await Promise.all(promises)

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      // Verify final state
      const customer = billingService.customers.get(userId)
      expect(customer.totalSpent).toBe(20.00) // 5 * 4.00
      expect(customer.paymentHistory.length).toBe(5)
    })
  })
})

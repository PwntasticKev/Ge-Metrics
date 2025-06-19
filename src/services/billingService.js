/**
 * Comprehensive Billing Service
 * Handles subscriptions, payments, refunds, and billing management
 */

class BillingService {
  constructor () {
    this.subscriptions = new Map()
    this.transactions = new Map()
    this.customers = new Map()
    this.refunds = new Map()

    // Subscription plans
    this.plans = {
      monthly: {
        id: 'monthly',
        name: 'Monthly Premium',
        price: 4.00,
        currency: 'USD',
        interval: 'month',
        features: [
          'Unlimited price alerts',
          'Advanced analytics',
          'Priority support',
          'Real-time notifications',
          'Export data'
        ]
      },
      yearly: {
        id: 'yearly',
        name: 'Yearly Premium',
        price: 33.00, // $2.75/month when billed yearly
        currency: 'USD',
        interval: 'year',
        monthlyEquivalent: 2.75,
        savings: 31, // percentage saved
        features: [
          'All Monthly features',
          'Advanced market insights',
          'Custom alerts',
          'API access',
          'Dedicated support'
        ]
      },
      trial: {
        id: 'trial',
        name: 'Free Trial',
        price: 0,
        currency: 'USD',
        interval: 'month',
        duration: 30, // days
        features: [
          'Limited price alerts (10)',
          'Basic analytics',
          'Standard support'
        ]
      }
    }

    // Initialize mock data
    this.initializeMockData()
  }

  /**
   * Subscription Management
   */
  async createSubscription (userId, planId, paymentMethodId) {
    try {
      const plan = this.plans[planId]
      if (!plan) {
        throw new Error('Invalid plan selected')
      }

      const subscriptionId = this.generateId('sub')
      const now = new Date()
      const endDate = new Date(now)

      if (plan.interval === 'month') {
        endDate.setMonth(endDate.getMonth() + 1)
      } else if (plan.interval === 'year') {
        endDate.setFullYear(endDate.getFullYear() + 1)
      }

      const subscription = {
        id: subscriptionId,
        userId,
        planId,
        plan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        cancelAtPeriodEnd: false,
        paymentMethodId,
        createdAt: now,
        updatedAt: now,
        trialEnd: planId === 'trial' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null
      }

      this.subscriptions.set(subscriptionId, subscription)

      // Create initial payment record
      if (plan.price > 0) {
        await this.createPayment(userId, subscriptionId, plan.price, 'subscription')
      }

      return { success: true, subscription }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async cancelSubscription (subscriptionId, immediate = false) {
    try {
      const subscription = this.subscriptions.get(subscriptionId)
      if (!subscription) {
        throw new Error('Subscription not found')
      }

      if (immediate) {
        subscription.status = 'canceled'
        subscription.canceledAt = new Date()
      } else {
        subscription.cancelAtPeriodEnd = true
      }

      subscription.updatedAt = new Date()
      this.subscriptions.set(subscriptionId, subscription)

      return { success: true, subscription }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async updateSubscription (subscriptionId, newPlanId) {
    try {
      const subscription = this.subscriptions.get(subscriptionId)
      if (!subscription) {
        throw new Error('Subscription not found')
      }

      const newPlan = this.plans[newPlanId]
      if (!newPlan) {
        throw new Error('Invalid plan')
      }

      const oldPlan = subscription.plan
      subscription.planId = newPlanId
      subscription.plan = newPlan
      subscription.updatedAt = new Date()

      // Handle prorations
      const proration = this.calculateProration(subscription, oldPlan, newPlan)
      if (proration.amount !== 0) {
        await this.createPayment(
          subscription.userId,
          subscriptionId,
          Math.abs(proration.amount),
          proration.amount > 0 ? 'upgrade' : 'downgrade'
        )
      }

      this.subscriptions.set(subscriptionId, subscription)
      return { success: true, subscription, proration }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Payment Processing
   */
  async createPayment (userId, subscriptionId, amount, type = 'subscription') {
    try {
      // Validate input parameters
      if (!userId || !subscriptionId || amount < 0) {
        throw new Error('Invalid payment parameters')
      }

      const paymentId = this.generateId('pay')
      const payment = {
        id: paymentId,
        userId,
        subscriptionId,
        amount,
        currency: 'USD',
        type,
        status: 'succeeded', // In real app, this would be pending initially
        paymentMethod: 'card',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      this.transactions.set(paymentId, payment)

      // Update customer billing history
      this.updateCustomerBilling(userId, payment)

      return { success: true, payment }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async processRefund (paymentId, amount = null, reason = '') {
    try {
      const payment = this.transactions.get(paymentId)
      if (!payment) {
        throw new Error('Payment not found')
      }

      if (payment.status !== 'succeeded') {
        throw new Error('Payment cannot be refunded')
      }

      const refundAmount = amount || payment.amount
      if (refundAmount > payment.amount) {
        throw new Error('Refund amount exceeds payment amount')
      }

      const refundId = this.generateId('ref')
      const refund = {
        id: refundId,
        paymentId,
        userId: payment.userId,
        amount: refundAmount,
        currency: payment.currency,
        reason,
        status: 'succeeded',
        createdAt: new Date()
      }

      this.refunds.set(refundId, refund)

      // Update payment status if fully refunded
      if (refundAmount === payment.amount) {
        payment.status = 'refunded'
        payment.refundedAt = new Date()
        this.transactions.set(paymentId, payment)
      }

      return { success: true, refund }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Trial Management
   */
  async startFreeTrial (userId) {
    try {
      // Check if user already had a trial
      const existingTrials = Array.from(this.subscriptions.values())
        .filter(sub => sub.userId === userId && sub.planId === 'trial')

      if (existingTrials.length > 0) {
        throw new Error('User has already used their free trial')
      }

      return await this.createSubscription(userId, 'trial', null)
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async grantFreeTrial (userId, adminUserId) {
    try {
      // Admin can grant additional free trials
      const result = await this.createSubscription(userId, 'trial', null)

      if (result.success) {
        // Log admin action
        console.log(`Admin ${adminUserId} granted free trial to user ${userId}`)
      }

      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Customer Management
   */
  updateCustomerBilling (userId, payment) {
    const customer = this.customers.get(userId) || {
      id: userId,
      totalSpent: 0,
      paymentHistory: [],
      createdAt: new Date()
    }

    customer.totalSpent += payment.amount
    customer.paymentHistory.push(payment.id)
    customer.updatedAt = new Date()

    this.customers.set(userId, customer)
  }

  getCustomerBilling (userId) {
    const customer = this.customers.get(userId)
    const subscription = this.getUserActiveSubscription(userId)
    const payments = Array.from(this.transactions.values())
      .filter(payment => payment.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    const refunds = Array.from(this.refunds.values())
      .filter(refund => refund.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    return {
      customer,
      subscription,
      payments,
      refunds,
      summary: {
        totalSpent: customer?.totalSpent || 0,
        totalRefunded: refunds.reduce((sum, refund) => sum + refund.amount, 0),
        paymentCount: payments.length,
        refundCount: refunds.length
      }
    }
  }

  /**
   * Admin Functions
   */
  getAllCustomers () {
    const customers = Array.from(this.customers.values())
    return customers.map(customer => {
      const subscription = this.getUserActiveSubscription(customer.id)
      const billing = this.getCustomerBilling(customer.id)

      return {
        ...customer,
        subscription,
        billing: billing.summary
      }
    })
  }

  getSubscriptionStats () {
    const subscriptions = Array.from(this.subscriptions.values())
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active')

    const stats = {
      total: subscriptions.length,
      active: activeSubscriptions.length,
      canceled: subscriptions.filter(sub => sub.status === 'canceled').length,
      trials: activeSubscriptions.filter(sub => sub.planId === 'trial').length,
      monthly: activeSubscriptions.filter(sub => sub.planId === 'monthly').length,
      yearly: activeSubscriptions.filter(sub => sub.planId === 'yearly').length,
      mrr: activeSubscriptions
        .filter(sub => sub.planId === 'monthly')
        .reduce((sum, sub) => sum + sub.plan.price, 0),
      arr: activeSubscriptions
        .filter(sub => sub.planId === 'yearly')
        .reduce((sum, sub) => sum + sub.plan.price, 0)
    }

    stats.totalRevenue = stats.mrr * 12 + stats.arr
    return stats
  }

  getRevenueMetrics () {
    const payments = Array.from(this.transactions.values())
    const refunds = Array.from(this.refunds.values())

    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const thisYear = new Date(thisMonth.getFullYear(), 0, 1)

    const monthlyRevenue = payments
      .filter(p => new Date(p.createdAt) >= thisMonth)
      .reduce((sum, p) => sum + p.amount, 0)

    const yearlyRevenue = payments
      .filter(p => new Date(p.createdAt) >= thisYear)
      .reduce((sum, p) => sum + p.amount, 0)

    const monthlyRefunds = refunds
      .filter(r => new Date(r.createdAt) >= thisMonth)
      .reduce((sum, r) => sum + r.amount, 0)

    return {
      monthlyRevenue,
      yearlyRevenue,
      monthlyRefunds,
      netMonthlyRevenue: monthlyRevenue - monthlyRefunds,
      totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
      totalRefunds: refunds.reduce((sum, r) => sum + r.amount, 0)
    }
  }

  /**
   * Utility Functions
   */
  getUserActiveSubscription (userId) {
    return Array.from(this.subscriptions.values())
      .find(sub => sub.userId === userId && sub.status === 'active')
  }

  calculateProration (subscription, oldPlan, newPlan) {
    const now = new Date()
    const periodEnd = new Date(subscription.currentPeriodEnd)
    const daysRemaining = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))
    const totalDays = oldPlan.interval === 'month' ? 30 : 365

    const unusedAmount = (oldPlan.price * daysRemaining) / totalDays
    const newAmount = (newPlan.price * daysRemaining) / totalDays

    return {
      amount: newAmount - unusedAmount,
      daysRemaining,
      unusedAmount,
      newAmount
    }
  }

  generateId (prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Initialize mock data for development
   */
  initializeMockData () {
    // Create some mock customers and subscriptions
    const mockUsers = [
      { id: 'user_1', email: 'john@example.com', name: 'John Doe' },
      { id: 'user_2', email: 'jane@example.com', name: 'Jane Smith' },
      { id: 'user_3', email: 'bob@example.com', name: 'Bob Johnson' }
    ]

    mockUsers.forEach((user, index) => {
      // Create customer record
      this.customers.set(user.id, {
        id: user.id,
        email: user.email,
        name: user.name,
        totalSpent: 0,
        paymentHistory: [],
        createdAt: new Date(Date.now() - (index + 1) * 30 * 24 * 60 * 60 * 1000)
      })

      // Create subscription based on index
      const planId = index === 0 ? 'yearly' : index === 1 ? 'monthly' : 'trial'
      this.createSubscription(user.id, planId, `pm_${user.id}`)
    })
  }
}

// Export singleton instance
export default new BillingService()

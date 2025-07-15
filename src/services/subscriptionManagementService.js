import { showNotification } from '@mantine/notifications'

// Available subscription plans
const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: [
      'Basic item tracking',
      'Limited watchlist (5 items)',
      'Basic price alerts',
      'Community access'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    interval: 'month',
    stripePriceId: 'price_premium_monthly',
    features: [
      'Advanced item tracking',
      'Unlimited watchlist',
      'Advanced price alerts',
      'Volume alerts',
      'Profit tracking',
      'Historical data access',
      'Priority support'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 19.99,
    interval: 'month',
    stripePriceId: 'price_pro_monthly',
    features: [
      'All Premium features',
      'AI predictions',
      'Whale tracking',
      'Advanced analytics',
      'API access',
      'Custom alerts',
      'Dedicated support',
      'Early access to features'
    ]
  }
}

class SubscriptionManagementService {
  constructor () {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001'
  }

  /**
   * Get all available subscription plans
   */
  getPlans () {
    return SUBSCRIPTION_PLANS
  }

  /**
   * Get a specific plan by ID
   */
  getPlan (planId) {
    return SUBSCRIPTION_PLANS[planId] || null
  }

  /**
   * Get all users with their subscription information
   */
  async getAllUsers () {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const users = await response.json()
      return users.map(user => ({
        ...user,
        subscription: user.subscription || null,
        planDetails: user.subscription ? this.getPlan(user.subscription.plan) : null
      }))
    } catch (error) {
      console.error('Error fetching users:', error)
      showNotification({
        title: 'Error',
        message: 'Failed to fetch users',
        color: 'red'
      })
      return []
    }
  }

  /**
   * Get user by ID with subscription details
   */
  async getUserById (userId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user')
      }

      const user = await response.json()
      return {
        ...user,
        subscription: user.subscription || null,
        planDetails: user.subscription ? this.getPlan(user.subscription.plan) : null
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      showNotification({
        title: 'Error',
        message: 'Failed to fetch user',
        color: 'red'
      })
      return null
    }
  }

  /**
   * Create a new subscription for a user
   */
  async createSubscription (userId, planId, stripeData = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId,
          planId,
          stripeData
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create subscription')
      }

      const subscription = await response.json()

      showNotification({
        title: 'Success',
        message: `Subscription created successfully for plan: ${this.getPlan(planId)?.name}`,
        color: 'green'
      })

      return subscription
    } catch (error) {
      console.error('Error creating subscription:', error)
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to create subscription',
        color: 'red'
      })
      throw error
    }
  }

  /**
   * Update a user's subscription
   */
  async updateSubscription (subscriptionId, updates) {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update subscription')
      }

      const subscription = await response.json()

      showNotification({
        title: 'Success',
        message: 'Subscription updated successfully',
        color: 'green'
      })

      return subscription
    } catch (error) {
      console.error('Error updating subscription:', error)
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to update subscription',
        color: 'red'
      })
      throw error
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription (subscriptionId, cancelAtPeriodEnd = true) {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ cancelAtPeriodEnd })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to cancel subscription')
      }

      const subscription = await response.json()

      showNotification({
        title: 'Success',
        message: `Subscription ${cancelAtPeriodEnd ? 'scheduled for cancellation' : 'canceled immediately'}`,
        color: 'yellow'
      })

      return subscription
    } catch (error) {
      console.error('Error canceling subscription:', error)
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to cancel subscription',
        color: 'red'
      })
      throw error
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription (subscriptionId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/subscriptions/${subscriptionId}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to reactivate subscription')
      }

      const subscription = await response.json()

      showNotification({
        title: 'Success',
        message: 'Subscription reactivated successfully',
        color: 'green'
      })

      return subscription
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to reactivate subscription',
        color: 'red'
      })
      throw error
    }
  }

  /**
   * Upgrade a user's subscription
   */
  async upgradeSubscription (userId, newPlanId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/subscriptions/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId,
          newPlanId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to upgrade subscription')
      }

      const subscription = await response.json()

      showNotification({
        title: 'Success',
        message: `Subscription upgraded to ${this.getPlan(newPlanId)?.name}`,
        color: 'green'
      })

      return subscription
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to upgrade subscription',
        color: 'red'
      })
      throw error
    }
  }

  /**
   * Downgrade a user's subscription
   */
  async downgradeSubscription (userId, newPlanId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/subscriptions/downgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId,
          newPlanId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to downgrade subscription')
      }

      const subscription = await response.json()

      showNotification({
        title: 'Success',
        message: `Subscription downgraded to ${this.getPlan(newPlanId)?.name}`,
        color: 'yellow'
      })

      return subscription
    } catch (error) {
      console.error('Error downgrading subscription:', error)
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to downgrade subscription',
        color: 'red'
      })
      throw error
    }
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats () {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/subscriptions/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch subscription stats')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching subscription stats:', error)
      showNotification({
        title: 'Error',
        message: 'Failed to fetch subscription statistics',
        color: 'red'
      })
      return {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        canceledSubscriptions: 0,
        pastDueSubscriptions: 0,
        monthlyRevenue: 0,
        yearlyRevenue: 0,
        planDistribution: {}
      }
    }
  }

  /**
   * Get expiring subscriptions
   */
  async getExpiringSubscriptions (days = 7) {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/subscriptions/expiring?days=${days}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch expiring subscriptions')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching expiring subscriptions:', error)
      return []
    }
  }

  /**
   * Check if a user has access to a specific feature
   */
  async hasFeatureAccess (userId, feature) {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/subscriptions/feature-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId,
          feature
        })
      })

      if (!response.ok) {
        return false
      }

      const result = await response.json()
      return result.hasAccess
    } catch (error) {
      console.error('Error checking feature access:', error)
      return false
    }
  }

  /**
   * Get user's subscription plan details
   */
  async getUserPlanDetails (userId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/subscriptions/user/${userId}/plan`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user plan details')
      }

      const planDetails = await response.json()
      return {
        ...planDetails,
        plan: planDetails.plan ? this.getPlan(planDetails.plan.id) : null
      }
    } catch (error) {
      console.error('Error fetching user plan details:', error)
      return {
        subscription: null,
        plan: null,
        features: [],
        isActive: false
      }
    }
  }

  /**
   * Search and filter users
   */
  async searchUsers (filters = {}) {
    try {
      const queryParams = new URLSearchParams()

      if (filters.search) queryParams.append('search', filters.search)
      if (filters.role) queryParams.append('role', filters.role)
      if (filters.membership) queryParams.append('membership', filters.membership)
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.limit) queryParams.append('limit', filters.limit)
      if (filters.offset) queryParams.append('offset', filters.offset)

      const response = await fetch(`${this.baseUrl}/api/admin/users/search?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to search users')
      }

      const users = await response.json()
      return users.map(user => ({
        ...user,
        subscription: user.subscription || null,
        planDetails: user.subscription ? this.getPlan(user.subscription.plan) : null
      }))
    } catch (error) {
      console.error('Error searching users:', error)
      return []
    }
  }

  /**
   * Export user data
   */
  async exportUserData (format = 'csv') {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/users/export?format=${format}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to export user data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users-export.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showNotification({
        title: 'Success',
        message: `User data exported successfully as ${format.toUpperCase()}`,
        color: 'green'
      })
    } catch (error) {
      console.error('Error exporting user data:', error)
      showNotification({
        title: 'Error',
        message: 'Failed to export user data',
        color: 'red'
      })
    }
  }

  /**
   * Send mass message to users
   */
  async sendMassMessage (recipients, subject, message, template = null) {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/users/mass-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          recipients,
          subject,
          message,
          template
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send mass message')
      }

      const result = await response.json()

      showNotification({
        title: 'Success',
        message: `Message sent to ${result.sentCount} users`,
        color: 'green'
      })

      return result
    } catch (error) {
      console.error('Error sending mass message:', error)
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to send mass message',
        color: 'red'
      })
      throw error
    }
  }

  /**
   * Get message templates
   */
  async getMessageTemplates () {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/message-templates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch message templates')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching message templates:', error)
      return {
        subscription_expiry: {
          subject: 'Your subscription is expiring soon',
          message: 'Dear {username},\n\nYour {plan} subscription will expire on {expiry_date}. Please renew to continue enjoying our premium features.\n\nBest regards,\nGe-Metrics Team'
        },
        welcome_premium: {
          subject: 'Welcome to Premium!',
          message: 'Dear {username},\n\nWelcome to Ge-Metrics Premium! You now have access to advanced features including unlimited watchlists, volume alerts, and profit tracking.\n\nBest regards,\nGe-Metrics Team'
        },
        trial_ending: {
          subject: 'Your trial is ending soon',
          message: 'Dear {username},\n\nYour free trial will end in {days_left} days. Upgrade to Premium to continue using all features.\n\nBest regards,\nGe-Metrics Team'
        }
      }
    }
  }
}

export default new SubscriptionManagementService()

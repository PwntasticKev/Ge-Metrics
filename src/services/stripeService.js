// Stripe Service for GE Metrics
// Handles subscription management, payments, and checkout flows

class StripeService {
  constructor () {
    this.apiKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_example'
    this.serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000'
    this.stripe = null
    this.initialized = false
  }

  // Initialize Stripe
  async initialize () {
    if (this.initialized) return this.stripe

    try {
      // Load Stripe.js
      if (typeof window !== 'undefined' && !window.Stripe) {
        const script = document.createElement('script')
        script.src = 'https://js.stripe.com/v3/'
        document.head.appendChild(script)

        await new Promise((resolve, reject) => {
          script.onload = resolve
          script.onerror = reject
        })
      }

      this.stripe = window.Stripe(this.apiKey)
      this.initialized = true
      return this.stripe
    } catch (error) {
      console.error('Failed to initialize Stripe:', error)
      throw new Error('Payment system unavailable')
    }
  }

  // Create checkout session
  async createCheckoutSession (priceId, customerId = null, trialDays = null) {
    try {
      const response = await fetch(`${this.serverUrl}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          priceId,
          customerId,
          trialDays,
          successUrl: `${window.location.origin}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/signup/cancel`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      return await response.json()
    } catch (error) {
      console.error('Checkout session creation failed:', error)
      throw error
    }
  }

  // Redirect to Stripe Checkout
  async redirectToCheckout (sessionId) {
    try {
      await this.initialize()
      const { error } = await this.stripe.redirectToCheckout({ sessionId })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Checkout redirect failed:', error)
      throw error
    }
  }

  // Create subscription with payment method
  async createSubscription (customerId, priceId, paymentMethodId, trialDays = null) {
    try {
      const response = await fetch(`${this.serverUrl}/stripe/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          customerId,
          priceId,
          paymentMethodId,
          trialDays
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create subscription')
      }

      return await response.json()
    } catch (error) {
      console.error('Subscription creation failed:', error)
      throw error
    }
  }

  // Update subscription
  async updateSubscription (subscriptionId, newPriceId) {
    try {
      const response = await fetch(`${this.serverUrl}/stripe/update-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          subscriptionId,
          newPriceId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update subscription')
      }

      return await response.json()
    } catch (error) {
      console.error('Subscription update failed:', error)
      throw error
    }
  }

  // Cancel subscription
  async cancelSubscription (subscriptionId, cancelAtPeriodEnd = true) {
    try {
      const response = await fetch(`${this.serverUrl}/stripe/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          subscriptionId,
          cancelAtPeriodEnd
        })
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      return await response.json()
    } catch (error) {
      console.error('Subscription cancellation failed:', error)
      throw error
    }
  }

  // Get customer portal URL
  async createCustomerPortalSession (customerId) {
    try {
      const response = await fetch(`${this.serverUrl}/stripe/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          customerId,
          returnUrl: window.location.origin + '/settings/billing'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      return await response.json()
    } catch (error) {
      console.error('Portal session creation failed:', error)
      throw error
    }
  }

  // Setup payment method
  async setupPaymentMethod (customerId) {
    try {
      await this.initialize()

      const response = await fetch(`${this.serverUrl}/stripe/create-setup-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ customerId })
      })

      if (!response.ok) {
        throw new Error('Failed to create setup intent')
      }

      const { clientSecret } = await response.json()
      return clientSecret
    } catch (error) {
      console.error('Setup intent creation failed:', error)
      throw error
    }
  }

  // Confirm payment method setup
  async confirmSetupIntent (clientSecret, paymentMethod) {
    try {
      await this.initialize()

      const { error, setupIntent } = await this.stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: paymentMethod
        }
      )

      if (error) {
        throw new Error(error.message)
      }

      return setupIntent
    } catch (error) {
      console.error('Setup intent confirmation failed:', error)
      throw error
    }
  }

  // Get subscription details
  async getSubscription (subscriptionId) {
    try {
      const response = await fetch(`${this.serverUrl}/stripe/subscription/${subscriptionId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to get subscription')
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get subscription:', error)
      throw error
    }
  }

  // Get customer details
  async getCustomer (customerId) {
    try {
      const response = await fetch(`${this.serverUrl}/stripe/customer/${customerId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to get customer')
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get customer:', error)
      throw error
    }
  }

  // Get payment methods
  async getPaymentMethods (customerId) {
    try {
      const response = await fetch(`${this.serverUrl}/stripe/payment-methods/${customerId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to get payment methods')
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get payment methods:', error)
      throw error
    }
  }

  // Create customer
  async createCustomer (email, name) {
    try {
      const response = await fetch(`${this.serverUrl}/stripe/create-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ email, name })
      })

      if (!response.ok) {
        throw new Error('Failed to create customer')
      }

      return await response.json()
    } catch (error) {
      console.error('Customer creation failed:', error)
      throw error
    }
  }

  // Get pricing plans
  getPricingPlans () {
    return {
      monthly: {
        id: 'price_monthly_premium',
        name: 'Monthly Premium',
        price: 4.00,
        currency: 'usd',
        interval: 'month',
        features: [
          'Unlimited price alerts',
          'Advanced analytics',
          'Priority support',
          'Export data',
          'API access'
        ]
      },
      yearly: {
        id: 'price_yearly_premium',
        name: 'Yearly Premium',
        price: 33.00,
        currency: 'usd',
        interval: 'year',
        monthlyPrice: 2.75,
        savings: 31,
        features: [
          'All Monthly Premium features',
          'Advanced market predictions',
          'Custom notifications',
          'Dedicated support',
          'Beta feature access'
        ]
      },
      trial: {
        days: 30,
        features: [
          '10 price alerts',
          'Basic analytics',
          'Email support'
        ]
      }
    }
  }

  // Format price for display
  formatPrice (amount, currency = 'usd') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Calculate savings
  calculateSavings (monthlyPrice, yearlyPrice) {
    const yearlyMonthly = yearlyPrice / 12
    const savings = ((monthlyPrice - yearlyMonthly) / monthlyPrice) * 100
    return Math.round(savings)
  }

  // Validate card number
  validateCardNumber (cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, '')
    const regex = /^[0-9]{13,19}$/
    return regex.test(cleaned)
  }

  // Format card number for display
  formatCardNumber (cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, '')
    const groups = cleaned.match(/.{1,4}/g)
    return groups ? groups.join(' ') : cleaned
  }

  // Get card brand
  getCardBrand (cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, '')

    if (/^4/.test(cleaned)) return 'visa'
    if (/^5[1-5]/.test(cleaned)) return 'mastercard'
    if (/^3[47]/.test(cleaned)) return 'amex'
    if (/^6/.test(cleaned)) return 'discover'

    return 'unknown'
  }

  // Handle webhook events (for server-side processing)
  async handleWebhook (event, endpointSecret) {
    try {
      await this.initialize()

      const sig = event.headers['stripe-signature']
      const payload = event.body

      const webhookEvent = this.stripe.webhooks.constructEvent(
        payload,
        sig,
        endpointSecret
      )

      return webhookEvent
    } catch (error) {
      console.error('Webhook verification failed:', error)
      throw error
    }
  }

  // Error handling helper
  handleStripeError (error) {
    switch (error.code) {
      case 'card_declined':
        return 'Your card was declined. Please try a different payment method.'
      case 'expired_card':
        return 'Your card has expired. Please use a different card.'
      case 'incorrect_cvc':
        return 'Your card\'s security code is incorrect.'
      case 'processing_error':
        return 'An error occurred while processing your card. Please try again.'
      case 'rate_limit':
        return 'Too many requests. Please try again in a moment.'
      default:
        return error.message || 'An unexpected error occurred. Please try again.'
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService()
export default stripeService

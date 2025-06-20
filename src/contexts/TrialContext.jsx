import React, { createContext, useContext, useState, useEffect } from 'react'
import trialService from '../services/trialService'
import { notifications } from '@mantine/notifications'

const TrialContext = createContext()

export const useTrialContext = () => {
  const context = useContext(TrialContext)
  if (!context) {
    throw new Error('useTrialContext must be used within a TrialProvider')
  }
  return context
}

export const TrialProvider = ({ children }) => {
  const [trialStatus, setTrialStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showExpiredModal, setShowExpiredModal] = useState(false)

  // Update trial status
  const updateTrialStatus = () => {
    const status = trialService.getTrialStatus()
    setTrialStatus(status)

    // Show expired modal if trial just expired
    if (status && status.isExpired && !showExpiredModal) {
      setShowExpiredModal(true)
    }

    return status
  }

  // Initialize trial for new user
  const initializeTrial = (userId, userEmail) => {
    const trialData = trialService.initializeTrial(userId, userEmail)
    setTrialStatus(trialData)

    notifications.show({
      title: '🎉 Welcome to Ge-Metrics!',
      message: 'Your 14-day free trial has started. Enjoy full access to all premium features!',
      color: 'green',
      autoClose: 5000
    })

    return trialData
  }

  // Check if feature is available
  const isFeatureAvailable = (featureName) => {
    if (!trialStatus) return false
    return trialService.isFeatureAvailable(featureName)
  }

  // Check restrictions
  const checkRestriction = (restrictionType, currentValue) => {
    return trialService.checkRestriction(restrictionType, currentValue)
  }

  // Handle API calls with rate limiting
  const makeApiCall = async (apiFunction, ...args) => {
    const callCheck = trialService.checkApiCallAllowed()

    if (!callCheck.allowed) {
      const message = callCheck.reason === 'Trial expired'
        ? 'Your trial has expired. Upgrade to continue using the app.'
        : callCheck.reason === 'Daily API limit reached'
          ? `Daily API limit reached (${callCheck.limit} calls). Upgrade for unlimited access.`
          : 'API call not allowed'

      notifications.show({
        title: 'Access Restricted',
        message,
        color: 'orange',
        autoClose: 5000
      })

      if (callCheck.reason === 'Trial expired') {
        setShowExpiredModal(true)
      }

      throw new Error(callCheck.reason)
    }

    try {
      trialService.recordApiCall()
      const result = await apiFunction(...args)
      return result
    } catch (error) {
      console.error('API call failed:', error)
      throw error
    }
  }

  // Show upgrade prompt
  const showUpgradePrompt = () => {
    if (!trialStatus) return

    const message = trialService.getUpgradeMessage()

    notifications.show({
      title: message.title,
      message: message.message,
      color: message.color,
      autoClose: 8000,
      action: {
        label: 'Upgrade Now',
        onClick: () => {
          window.location.href = '/billing'
        }
      }
    })
  }

  // End trial (when user upgrades)
  const endTrial = (reason = 'upgraded') => {
    trialService.endTrial(reason)
    setTrialStatus(null)
    setShowExpiredModal(false)

    if (reason === 'upgraded') {
      notifications.show({
        title: '🎉 Welcome to Premium!',
        message: 'Thank you for upgrading! You now have unlimited access to all features.',
        color: 'green',
        autoClose: 5000
      })
    }
  }

  // Get trial analytics
  const getTrialAnalytics = () => {
    return trialService.getTrialAnalytics()
  }

  // Check if user should see upgrade prompt
  const shouldShowUpgradePrompt = () => {
    return trialService.shouldShowUpgradePrompt()
  }

  // Get upgrade urgency
  const getUpgradeUrgency = () => {
    return trialService.getUpgradeUrgency()
  }

  // Initialize on mount
  useEffect(() => {
    setIsLoading(true)
    updateTrialStatus()
    setIsLoading(false)

    // Update every minute
    const interval = setInterval(updateTrialStatus, 60000)

    return () => clearInterval(interval)
  }, [])

  // Show upgrade prompts at appropriate intervals
  useEffect(() => {
    if (trialStatus && shouldShowUpgradePrompt()) {
      const timer = setTimeout(() => {
        showUpgradePrompt()
      }, 2000) // Show after 2 seconds to avoid overwhelming user

      return () => clearTimeout(timer)
    }
  }, [trialStatus])

  const value = {
    // State
    trialStatus,
    isLoading,
    showExpiredModal,

    // Actions
    initializeTrial,
    updateTrialStatus,
    endTrial,
    makeApiCall,
    showUpgradePrompt,

    // Checks
    isFeatureAvailable,
    checkRestriction,
    shouldShowUpgradePrompt,
    getUpgradeUrgency,
    getTrialAnalytics,

    // Modal control
    setShowExpiredModal,

    // Computed values
    isTrialActive: trialStatus && trialStatus.isActive,
    isTrialExpired: trialStatus && trialStatus.isExpired,
    daysRemaining: trialStatus ? trialStatus.daysRemaining : 0,
    hoursRemaining: trialStatus ? trialStatus.hoursRemaining : 0
  }

  return (
    <TrialContext.Provider value={value}>
      {children}
    </TrialContext.Provider>
  )
}

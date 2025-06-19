import axios from 'axios'
import historyDataService from './historyDataService.js'
import accessControlService from './accessControlService.js'
import abnormalActivityService from './abnormalActivityService.js'

class VolumeAlertService {
  constructor () {
    this.mailchimpBaseUrl = 'https://us1.api.mailchimp.com/3.0' // This would be dynamic based on API key
    this.alertCooldownMinutes = 60 // Default cooldown period
  }

  // Send email via Mailchimp
  async sendEmail (apiKey, recipientEmail, subject, htmlContent, textContent) {
    try {
      // Extract datacenter from API key (format: key-dc)
      const datacenter = apiKey.split('-')[1]
      const baseUrl = `https://${datacenter}.api.mailchimp.com/3.0`

      // Create a transactional email using Mailchimp's API
      // Note: This is a simplified example. In production, you'd typically use
      // Mailchimp's transactional email service (Mandrill) or their campaign API

      const emailData = {
        message: {
          subject,
          html: htmlContent,
          text: textContent,
          from_email: 'alerts@ge-metrics.com',
          from_name: 'GE Metrics Alerts',
          to: [
            {
              email: recipientEmail,
              type: 'to'
            }
          ]
        }
      }

      // For demo purposes, we'll just log the email content
      console.log('📧 Email Alert Sent:', {
        to: recipientEmail,
        subject,
        content: textContent
      })

      return { success: true, messageId: 'demo-message-id' }
    } catch (error) {
      console.error('Failed to send email:', error)
      throw error
    }
  }

  // Generate email content for volume dump alert
  generateVolumeDumpEmail (itemData, alertData) {
    const subject = `🚨 Volume Dump Alert: ${itemData.name}`

    const textContent = `
VOLUME DUMP ALERT

Item: ${itemData.name} (ID: ${itemData.id})
Current Volume: ${alertData.triggeredVolume?.toLocaleString() || 'N/A'}
Volume Threshold: ${alertData.volumeThreshold?.toLocaleString() || 'N/A'}
Current Price: ${itemData.currentPrice || 'N/A'} GP

Alert Details:
- Alert Type: ${alertData.alertType}
- Triggered At: ${new Date().toLocaleString()}

This item is experiencing high trading volume, which may indicate a dump is happening.

View item details: https://ge-metrics.com/item/${itemData.id}
Manage your watchlist: https://ge-metrics.com/watchlist

---
GE Metrics Alert System
Unsubscribe: https://ge-metrics.com/settings
    `.trim()

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #dc3545; margin: 0;">🚨 Volume Dump Alert</h1>
        </div>
        
        <div style="padding: 20px; background: white;">
          <h2 style="color: #333; margin-top: 0;">${itemData.name}</h2>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <strong>High volume detected!</strong> This item may be experiencing a dump.
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Item ID:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${itemData.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Current Volume:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; color: #dc3545; font-weight: bold;">
                ${alertData.triggeredVolume?.toLocaleString() || 'N/A'}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Your Threshold:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${alertData.volumeThreshold?.toLocaleString() || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Current Price:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${itemData.currentPrice || 'N/A'} GP</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Triggered At:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://ge-metrics.com/item/${itemData.id}" 
               style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Item Details
            </a>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://ge-metrics.com/watchlist" style="color: #6c757d; text-decoration: none;">
              Manage Watchlist
            </a>
            |
            <a href="https://ge-metrics.com/settings" style="color: #6c757d; text-decoration: none;">
              Alert Settings
            </a>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
          <p>You're receiving this because you have this item in your watchlist.</p>
          <p><a href="https://ge-metrics.com/settings" style="color: #6c757d;">Unsubscribe</a></p>
        </div>
      </div>
    `

    return { subject, textContent, htmlContent }
  }

  // Check if user is in cooldown period for this alert
  async isInCooldown (userId, itemId, alertType) {
    try {
      // This would query your database for alert_cooldowns
      // For demo purposes, we'll return false (no cooldown)

      // const cooldown = await db.alert_cooldowns.findFirst({
      //   where: {
      //     user_id: userId,
      //     item_id: itemId,
      //     alert_type: alertType,
      //     cooldown_until: { gt: new Date() }
      //   }
      // })

      // return !!cooldown
      return false
    } catch (error) {
      console.error('Error checking cooldown:', error)
      return false // Fail open - don't block alerts on error
    }
  }

  // Set cooldown period for user/item/alert combination
  async setCooldown (userId, itemId, alertType, cooldownMinutes = null) {
    try {
      const cooldownPeriod = cooldownMinutes || this.alertCooldownMinutes
      const cooldownUntil = new Date(Date.now() + cooldownPeriod * 60 * 1000)

      // This would insert/update the cooldown in your database
      // await db.alert_cooldowns.upsert({
      //   where: {
      //     user_id_item_id_alert_type: {
      //       user_id: userId,
      //       item_id: itemId,
      //       alert_type: alertType
      //     }
      //   },
      //   update: { cooldown_until: cooldownUntil },
      //   create: {
      //     user_id: userId,
      //     item_id: itemId,
      //     alert_type: alertType,
      //     cooldown_until: cooldownUntil
      //   }
      // })

      console.log(`⏰ Cooldown set for user ${userId}, item ${itemId}, type ${alertType} until ${cooldownUntil}`)
    } catch (error) {
      console.error('Error setting cooldown:', error)
    }
  }

  // Save alert record to database
  async saveAlertRecord (alertData) {
    try {
      // This would save the alert to your volume_alerts table
      // const alert = await db.volume_alerts.create({
      //   data: {
      //     user_id: alertData.userId,
      //     item_id: alertData.itemId,
      //     alert_type: alertData.alertType,
      //     triggered_volume: alertData.triggeredVolume,
      //     triggered_price: alertData.triggeredPrice,
      //     price_drop_percent: alertData.priceDropPercent,
      //     alert_sent: alertData.alertSent,
      //     email_sent_at: alertData.emailSentAt
      //   }
      // })

      console.log('💾 Alert record saved:', alertData)
      return { id: 'demo-alert-id', ...alertData }
    } catch (error) {
      console.error('Error saving alert record:', error)
      throw error
    }
  }

  // Process volume and price alerts for a specific user and item
  async processVolumeAlert (user, watchlistItem, currentData) {
    try {
      const {
        itemId,
        volumeThreshold,
        priceDropThreshold,
        priceSpikeThreshold,
        priceDropPercentage,
        priceSpikePercentage,
        userId
      } = watchlistItem
      const currentVolume = currentData.volume || 0
      const currentPrice = currentData.high || currentData.low || 0

      let alertTriggered = false
      let alertType = ''
      let alertReason = ''

      // Check volume threshold
      if (volumeThreshold && currentVolume > volumeThreshold) {
        alertTriggered = true
        alertType = 'volume_dump'
        alertReason = `Volume exceeded threshold: ${currentVolume.toLocaleString()} > ${volumeThreshold.toLocaleString()}`
      }

      // Get previous price for percentage calculations (mock for now)
      const previousPrice = currentPrice * 1.1 // Mock previous price - in real app, get from historical data

      // Check price drop thresholds (both absolute and percentage)
      if (!alertTriggered && currentPrice > 0) {
        let priceDropTriggered = false
        const dropReasons = []

        // Check absolute price drop threshold
        if (priceDropThreshold && currentPrice < priceDropThreshold) {
          priceDropTriggered = true
          dropReasons.push(`below ${priceDropThreshold.toLocaleString()} GP`)
        }

        // Check percentage price drop threshold
        if (priceDropPercentage && previousPrice > 0) {
          const priceDropPercent = ((previousPrice - currentPrice) / previousPrice) * 100
          if (priceDropPercent >= priceDropPercentage) {
            priceDropTriggered = true
            dropReasons.push(`dropped ${priceDropPercent.toFixed(1)}% (threshold: ${priceDropPercentage}%)`)
          }
        }

        if (priceDropTriggered) {
          alertTriggered = true
          alertType = 'price_drop'
          alertReason = `Price ${dropReasons.join(' and ')}: ${currentPrice.toLocaleString()} GP`
        }
      }

      // Check price spike thresholds (both absolute and percentage)
      if (!alertTriggered && currentPrice > 0) {
        let priceSpikeTriggered = false
        const spikeReasons = []

        // Check absolute price spike threshold
        if (priceSpikeThreshold && currentPrice > priceSpikeThreshold) {
          priceSpikeTriggered = true
          spikeReasons.push(`above ${priceSpikeThreshold.toLocaleString()} GP`)
        }

        // Check percentage price spike threshold
        if (priceSpikePercentage && previousPrice > 0) {
          const priceSpikePercent = ((currentPrice - previousPrice) / previousPrice) * 100
          if (priceSpikePercent >= priceSpikePercentage) {
            priceSpikeTriggered = true
            spikeReasons.push(`spiked ${priceSpikePercent.toFixed(1)}% (threshold: ${priceSpikePercentage}%)`)
          }
        }

        if (priceSpikeTriggered) {
          alertTriggered = true
          alertType = 'price_spike'
          alertReason = `Price ${spikeReasons.join(' and ')}: ${currentPrice.toLocaleString()} GP`
        }
      }

      // No alert conditions met
      if (!alertTriggered) {
        return { processed: false, reason: 'No thresholds exceeded' }
      }

      // Check cooldown
      const inCooldown = await this.isInCooldown(userId, itemId, alertType)
      if (inCooldown) {
        return { processed: false, reason: 'In cooldown period' }
      }

      // Check if user has Mailchimp API key
      if (!user.mailchimpApiKey) {
        return { processed: false, reason: 'No Mailchimp API key configured' }
      }

      // Prepare alert data
      const alertData = {
        userId,
        itemId,
        alertType,
        triggeredVolume: currentVolume,
        triggeredPrice: currentPrice,
        volumeThreshold,
        priceDropThreshold,
        priceSpikeThreshold,
        priceDropPercentage,
        priceSpikePercentage,
        alertReason,
        alertSent: false,
        emailSentAt: null
      }

      // Get item details for email
      const itemData = {
        id: itemId,
        name: currentData.name || `Item ${itemId}`,
        currentPrice
      }

      // Generate email content based on alert type
      let emailContent
      if (alertType === 'volume_dump') {
        emailContent = this.generateVolumeDumpEmail(itemData, alertData)
      } else {
        emailContent = this.generatePriceAlertEmail(itemData, alertData)
      }

      // Send email
      const emailResult = await this.sendEmail(
        user.mailchimpApiKey,
        user.email,
        emailContent.subject,
        emailContent.htmlContent,
        emailContent.textContent
      )

      if (emailResult.success) {
        alertData.alertSent = true
        alertData.emailSentAt = new Date()
      }

      // Save alert record
      await this.saveAlertRecord(alertData)

      // Set cooldown
      await this.setCooldown(userId, itemId, alertType)

      return {
        processed: true,
        alertSent: alertData.alertSent,
        alertType,
        alertReason,
        emailResult
      }
    } catch (error) {
      console.error('Error processing volume alert:', error)
      return { processed: false, error: error.message }
    }
  }

  // Generate price alert email (for price drops and spikes)
  generatePriceAlertEmail (itemData, alertData) {
    const isDropAlert = alertData.alertType === 'price_drop'
    const alertIcon = isDropAlert ? '📉' : '📈'
    const alertColor = isDropAlert ? '#dc3545' : '#28a745'
    const alertTitle = isDropAlert ? 'Price Drop Alert' : 'Price Spike Alert'

    const subject = `${alertIcon} ${alertTitle}: ${itemData.name}`

    const textContent = `
${alertIcon} ${alertTitle.toUpperCase()} ${alertIcon}

Item: ${itemData.name}
Current Price: ${alertData.triggeredPrice?.toLocaleString() || 'N/A'} GP
Your Threshold: ${(isDropAlert ? alertData.priceDropThreshold : alertData.priceSpikeThreshold)?.toLocaleString() || 'N/A'} GP
Alert Reason: ${alertData.alertReason}

View item details: https://ge-metrics.com/item/${itemData.id}
Manage watchlist: https://ge-metrics.com/watchlist

This alert was sent because you have this item in your watchlist with price monitoring enabled.
    `

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${alertTitle}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${alertColor} 0%, ${alertColor}dd 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px;">${alertIcon} ${alertTitle}</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Price monitoring alert for your watchlist</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #495057; margin-top: 0;">${itemData.name}</h2>
          <p style="margin: 5px 0; color: #6c757d; font-size: 14px;">Item ID: ${itemData.id}</p>
          
          <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Current Price:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; color: ${alertColor}; font-weight: bold;">
                ${alertData.triggeredPrice?.toLocaleString() || 'N/A'} GP
              </td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Your Threshold:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">
                ${(isDropAlert ? alertData.priceDropThreshold : alertData.priceSpikeThreshold)?.toLocaleString() || 'N/A'} GP
              </td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Alert Reason:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${alertData.alertReason}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Triggered At:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://ge-metrics.com/item/${itemData.id}" 
               style="background: ${alertColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Item Details
            </a>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://ge-metrics.com/watchlist" style="color: #6c757d; text-decoration: none;">
              Manage Watchlist
            </a>
            |
            <a href="https://ge-metrics.com/settings" style="color: #6c757d; text-decoration: none;">
              Alert Settings
            </a>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
          <p>You're receiving this because you have this item in your watchlist with price monitoring enabled.</p>
          <p><a href="https://ge-metrics.com/settings" style="color: #6c757d;">Unsubscribe</a></p>
        </div>
      </div>
    `

    return { subject, textContent, htmlContent }
  }

  // Process abnormal activity alert for a specific user and item
  async processAbnormalActivityAlert (user, watchlistItem, currentData) {
    try {
      const { itemId, userId } = watchlistItem

      // Check access control
      if (!accessControlService.hasAccess(user)) {
        return { processed: false, reason: 'User access denied' }
      }

      // Run abnormal activity detection
      const analysis = await abnormalActivityService.detectAbnormalActivity(itemId, currentData)

      if (!analysis.isAbnormal) {
        return { processed: false, reason: 'No abnormal activity detected' }
      }

      // Check cooldown
      const inCooldown = await this.isInCooldown(userId, itemId, 'abnormal_activity')
      if (inCooldown) {
        return { processed: false, reason: 'In cooldown period' }
      }

      // Check if user has Mailchimp API key
      if (!user.mailchimpApiKey) {
        return { processed: false, reason: 'No Mailchimp API key configured' }
      }

      // Prepare alert data
      const alertData = {
        userId,
        itemId,
        alertType: 'abnormal_activity',
        triggeredVolume: analysis.currentData.volume,
        triggeredPrice: analysis.currentData.price,
        abnormalityScore: analysis.confidence,
        alerts: analysis.alerts,
        alertSent: false,
        emailSentAt: null
      }

      // Get item details for email
      const itemData = {
        id: itemId,
        name: currentData.name || `Item ${itemId}`,
        currentPrice: analysis.currentData.price,
        currentVolume: analysis.currentData.volume
      }

      // Generate email content
      const emailContent = this.generateAbnormalActivityEmail(itemData, alertData, analysis)

      // Send email
      const emailResult = await this.sendEmail(
        user.mailchimpApiKey,
        user.email,
        emailContent.subject,
        emailContent.htmlContent,
        emailContent.textContent
      )

      if (emailResult.success) {
        alertData.alertSent = true
        alertData.emailSentAt = new Date()
      }

      // Save alert record
      await this.saveAlertRecord(alertData)

      // Set cooldown
      await this.setCooldown(userId, itemId, 'abnormal_activity')

      return {
        processed: true,
        alertSent: alertData.alertSent,
        emailResult,
        analysis
      }
    } catch (error) {
      console.error('Error processing abnormal activity alert:', error)
      return { processed: false, error: error.message }
    }
  }

  // Generate abnormal activity email content
  generateAbnormalActivityEmail (itemData, alertData, analysis) {
    const alertSummary = abnormalActivityService.getActivitySummary(analysis)
    const alertsList = analysis.alerts.map(alert =>
      `• ${alert.message} (${alert.severity.toUpperCase()} severity)`
    ).join('\n')

    const subject = `🚨 Abnormal Activity Alert: ${itemData.name}`

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Abnormal Activity Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px;">🚨 Abnormal Activity Detected</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">AI-powered market anomaly detection</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #495057; margin-top: 0;">${itemData.name}</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
            <div>
              <strong>Current Price:</strong><br>
              <span style="font-size: 18px; color: #28a745;">${itemData.currentPrice?.toLocaleString() || 'N/A'} gp</span>
            </div>
            <div>
              <strong>Current Volume:</strong><br>
              <span style="font-size: 18px; color: #007bff;">${itemData.currentVolume?.toLocaleString() || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #856404; margin-top: 0;">⚠️ Detected Anomalies</h3>
          <div style="background: white; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-line;">${alertsList}</div>
          <p style="margin-bottom: 0; font-size: 14px; color: #856404;">
            <strong>Confidence Score:</strong> ${Math.round(analysis.confidence * 100)}%
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://ge-metrics.com/watchlist" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Watchlist</a>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; text-align: center;">
          <p>This alert was generated by GE Metrics abnormal activity detection system.</p>
          <p>To unsubscribe or manage your alerts, visit your <a href="https://ge-metrics.com/settings">account settings</a>.</p>
        </div>
      </body>
      </html>
    `

    const textContent = `
🚨 ABNORMAL ACTIVITY ALERT 🚨

Item: ${itemData.name}
Current Price: ${itemData.currentPrice?.toLocaleString() || 'N/A'} gp
Current Volume: ${itemData.currentVolume?.toLocaleString() || 'N/A'}

DETECTED ANOMALIES:
${alertsList}

Confidence Score: ${Math.round(analysis.confidence * 100)}%

Visit your watchlist: https://ge-metrics.com/watchlist
Manage alerts: https://ge-metrics.com/settings

This alert was generated by GE Metrics AI-powered anomaly detection.
    `

    return { subject, htmlContent, textContent }
  }

  // Monitor all watchlist items for all users
  async monitorWatchlists () {
    try {
      console.log('🔍 Starting watchlist monitoring...')

      // Get latest price and volume data
      const latestData = await historyDataService.fetchLatestPrices()

      // Mock watchlist data - this would come from your database
      const mockWatchlists = [
        {
          userId: 1,
          itemId: 4151,
          volumeThreshold: 10000,
          priceDropThreshold: 15.0,
          abnormalActivity: false,
          isActive: true
        },
        {
          userId: 1,
          itemId: 1515,
          volumeThreshold: null,
          priceDropThreshold: null,
          abnormalActivity: true,
          isActive: true
        }
      ]

      // Mock user data - this would come from your database
      const mockUsers = [
        {
          id: 1,
          email: 'user@example.com',
          mailchimpApiKey: 'your-api-key-here',
          access: true,
          role: 'user'
        }
      ]

      let alertsProcessed = 0
      let alertsSent = 0

      for (const watchlistItem of mockWatchlists) {
        if (!watchlistItem.isActive) continue

        const user = mockUsers.find(u => u.id === watchlistItem.userId)
        if (!user) continue

        // Check user access
        if (!accessControlService.hasAccess(user)) {
          console.log(`⚠️ Skipping user ${user.id} - access denied`)
          continue
        }

        const currentData = latestData[watchlistItem.itemId]
        if (!currentData) continue

        let result

        // Process abnormal activity alerts
        if (watchlistItem.abnormalActivity) {
          result = await this.processAbnormalActivityAlert(user, watchlistItem, currentData)
        } else {
          // Process traditional volume/price threshold alerts
          result = await this.processVolumeAlert(user, watchlistItem, currentData)
        }

        if (result.processed) {
          alertsProcessed++
          if (result.alertSent) {
            alertsSent++
          }
        }
      }

      console.log(`✅ Monitoring complete: ${alertsProcessed} alerts processed, ${alertsSent} emails sent`)

      return {
        success: true,
        alertsProcessed,
        alertsSent,
        timestamp: new Date()
      }
    } catch (error) {
      console.error('Error monitoring watchlists:', error)
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      }
    }
  }

  // Test email sending functionality
  async testEmailAlert (user, testItemData) {
    try {
      if (!user.mailchimpApiKey) {
        throw new Error('No Mailchimp API key configured')
      }

      const alertData = {
        alertType: 'test_alert',
        triggeredVolume: 50000,
        volumeThreshold: 25000
      }

      const itemData = {
        id: testItemData.id || 4151,
        name: testItemData.name || 'Test Item',
        currentPrice: testItemData.price || '1,000'
      }

      const emailContent = this.generateVolumeDumpEmail(itemData, alertData)

      const result = await this.sendEmail(
        user.mailchimpApiKey,
        user.email,
        `[TEST] ${emailContent.subject}`,
        emailContent.htmlContent,
        emailContent.textContent
      )

      return result
    } catch (error) {
      console.error('Error sending test email:', error)
      throw error
    }
  }
}

export default new VolumeAlertService()

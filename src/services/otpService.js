// Browser-compatible OTP service
class OTPService {
  constructor () {
    // Use environment variables in production
    this.adminPhoneNumber = import.meta.env.VITE_ADMIN_PHONE_NUMBER || '+1234567890'
    this.masterPasswordHash = import.meta.env.VITE_MASTER_PASSWORD_HASH || ''
    this.adminEmail = 'admin@ge-metrics.com'
  }

  // Generate a random 6-digit OTP
  generateOTP () {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Generate TOTP secret for Google Authenticator (browser-compatible)
  generateTOTPSecret () {
    // Generate random base32 string for browser
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Generate backup codes (browser-compatible)
  generateBackupCodes (count = 10) {
    const codes = []
    for (let i = 0; i < count; i++) {
      // Generate 8-character hex codes
      let code = ''
      for (let j = 0; j < 8; j++) {
        code += Math.floor(Math.random() * 16).toString(16).toUpperCase()
      }
      codes.push(code)
    }
    return codes
  }

  // Verify TOTP token using time-based algorithm
  verifyTOTP (secret, token, window = 1) {
    const time = Math.floor(Date.now() / 30000) // 30-second window

    for (let i = -window; i <= window; i++) {
      const timeStep = time + i
      const expectedToken = this.generateTOTPToken(secret, timeStep)
      if (expectedToken === token) {
        return true
      }
    }
    return false
  }

  // Generate TOTP token for a specific time step (simplified for browser)
  generateTOTPToken (secret, timeStep) {
    // Simplified TOTP generation for browser compatibility
    // In production, use a proper TOTP library like 'otplib'
    const hash = this.simpleHash(secret + timeStep.toString())
    const code = parseInt(hash.slice(-6), 16) % 1000000
    return code.toString().padStart(6, '0')
  }

  // Simple hash function for browser compatibility
  simpleHash (str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16)
  }

  // Create QR code URL for Google Authenticator
  generateQRCodeURL (secret, userEmail, issuer = 'GE Metrics') {
    const otpauthURL = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthURL)}`
  }

  // Store OTP token in database
  async storeOTPToken (userId, token, tokenType = 'login', expiryMinutes = 10) {
    try {
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)

      // This would save to your database
      // await db.otp_tokens.create({
      //   data: {
      //     user_id: userId,
      //     token: token,
      //     token_type: tokenType,
      //     expires_at: expiresAt
      //   }
      // })

      console.log(`📱 OTP token stored for user ${userId}: ${token} (expires in ${expiryMinutes} minutes)`)
      return { success: true, token, expiresAt }
    } catch (error) {
      console.error('Error storing OTP token:', error)
      throw error
    }
  }

  // Verify OTP token from database
  async verifyOTPToken (userId, token, tokenType = 'login') {
    try {
      // This would query your database
      // const otpRecord = await db.otp_tokens.findFirst({
      //   where: {
      //     user_id: userId,
      //     token: token,
      //     token_type: tokenType,
      //     used: false,
      //     expires_at: { gt: new Date() }
      //   }
      // })

      // Mock verification for demo - only accept specific test tokens
      const validTestTokens = ['123456', '654321']

      if (validTestTokens.includes(token)) {
        console.log(`✅ OTP verified for user ${userId}`)
        return { success: true, verified: true }
      }

      console.log(`❌ OTP verification failed for user ${userId}`)
      return { success: false, verified: false, reason: 'Invalid or expired token' }
    } catch (error) {
      console.error('Error verifying OTP token:', error)
      return { success: false, verified: false, reason: 'Verification error' }
    }
  }

  // Send OTP via SMS (mock implementation)
  async sendSMSOTP (phoneNumber, otp) {
    try {
      // This would integrate with SMS service like Twilio
      // const message = `Your GE Metrics verification code is: ${otp}. Valid for 10 minutes.`
      // await twilioClient.messages.create({
      //   body: message,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: phoneNumber
      // })

      console.log(`📱 SMS OTP sent to ${phoneNumber}: ${otp}`)
      return { success: true, message: 'SMS sent successfully' }
    } catch (error) {
      console.error('Error sending SMS OTP:', error)
      return { success: false, error: error.message }
    }
  }

  // Send OTP via email
  async sendEmailOTP (email, otp, purpose = 'login') {
    try {
      const subject = `GE Metrics - Verification Code (${purpose})`
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verification Code</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">🔐 Verification Code</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">GE Metrics Security</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
            <h2 style="color: #495057; margin-top: 0;">Your verification code is:</h2>
            <div style="font-size: 36px; font-weight: bold; color: #007bff; letter-spacing: 5px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #6c757d; margin-bottom: 0;">This code will expire in 10 minutes</p>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>Security Notice:</strong> Never share this code with anyone. GE Metrics staff will never ask for your verification codes.
            </p>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; text-align: center;">
            <p>If you didn't request this code, please ignore this email or contact support.</p>
            <p>© ${new Date().getFullYear()} GE Metrics. All rights reserved.</p>
          </div>
        </body>
        </html>
      `

      const textContent = `
Your GE Metrics verification code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

© ${new Date().getFullYear()} GE Metrics
      `

      // This would send via your email service
      console.log(`📧 Email OTP sent to ${email}: ${otp}`)
      return { success: true, message: 'Email sent successfully' }
    } catch (error) {
      console.error('Error sending email OTP:', error)
      return { success: false, error: error.message }
    }
  }

  // Setup OTP for user (generate secret and QR code)
  async setupOTP (userId, userEmail) {
    try {
      const secret = this.generateTOTPSecret()
      const backupCodes = this.generateBackupCodes()
      const qrCodeURL = this.generateQRCodeURL(secret, userEmail)

      // This would save to your database
      // await db.users.update({
      //   where: { id: userId },
      //   data: {
      //     otp_secret: secret,
      //     backup_codes: JSON.stringify(backupCodes)
      //   }
      // })

      console.log(`🔧 OTP setup for user ${userId}`)
      return {
        success: true,
        secret,
        qrCodeURL,
        backupCodes
      }
    } catch (error) {
      console.error('Error setting up OTP:', error)
      throw error
    }
  }

  // Enable OTP for user after verification
  async enableOTP (userId, verificationToken) {
    try {
      // Verify the setup token first
      const user = await this.getUserById(userId)
      if (!user || !user.otp_secret) {
        throw new Error('OTP not set up for this user')
      }

      const isValid = this.verifyTOTP(user.otp_secret, verificationToken)
      if (!isValid) {
        return { success: false, error: 'Invalid verification token' }
      }

      // Enable OTP
      // await db.users.update({
      //   where: { id: userId },
      //   data: { otp_enabled: true }
      // })

      console.log(`✅ OTP enabled for user ${userId}`)
      return { success: true, message: 'OTP enabled successfully' }
    } catch (error) {
      console.error('Error enabling OTP:', error)
      return { success: false, error: error.message }
    }
  }

  // Disable OTP for user
  async disableOTP (userId) {
    try {
      // await db.users.update({
      //   where: { id: userId },
      //   data: {
      //     otp_enabled: false,
      //     otp_secret: null,
      //     backup_codes: null
      //   }
      // })

      console.log(`❌ OTP disabled for user ${userId}`)
      return { success: true, message: 'OTP disabled successfully' }
    } catch (error) {
      console.error('Error disabling OTP:', error)
      return { success: false, error: error.message }
    }
  }

  // Master password access
  async verifyMasterPassword (password, targetUserId, adminUserId, reason) {
    try {
      // Hash the provided password and compare with stored master password hash (browser-compatible)
      const hashedPassword = this.simpleHash(password + 'salt')

      if (hashedPassword !== this.masterPasswordHash) {
        console.log(`❌ Invalid master password attempt by admin ${adminUserId}`)
        return { success: false, error: 'Invalid master password' }
      }

      // Generate OTP and send to admin phone/email
      const otp = this.generateOTP()

      // Send to admin phone and email
      await this.sendSMSOTP(this.adminPhoneNumber, otp)
      await this.sendEmailOTP(this.adminEmail, otp, 'master access')

      // Store OTP for verification
      await this.storeOTPToken(adminUserId, otp, 'master_access', 5) // 5 minute expiry

      console.log(`🔐 Master password verified, OTP sent to admin for accessing user ${targetUserId}`)
      return {
        success: true,
        message: 'Master password verified. Check your phone and email for OTP.',
        requiresOTP: true
      }
    } catch (error) {
      console.error('Error verifying master password:', error)
      return { success: false, error: error.message }
    }
  }

  // Complete master access with OTP
  async completeMasterAccess (adminUserId, targetUserId, otp, reason, ipAddress, userAgent) {
    try {
      // Verify OTP
      const otpVerification = await this.verifyOTPToken(adminUserId, otp, 'master_access')
      if (!otpVerification.verified) {
        return { success: false, error: 'Invalid or expired OTP' }
      }

      // Log the master access
      await this.logMasterAccess(adminUserId, targetUserId, reason, ipAddress, userAgent)

      console.log(`🔓 Master access granted to admin ${adminUserId} for user ${targetUserId}`)
      return {
        success: true,
        message: 'Master access granted',
        accessToken: this.generateAccessToken(adminUserId, targetUserId)
      }
    } catch (error) {
      console.error('Error completing master access:', error)
      return { success: false, error: error.message }
    }
  }

  // Log master access for audit
  async logMasterAccess (adminUserId, targetUserId, reason, ipAddress, userAgent) {
    try {
      // await db.master_access_logs.create({
      //   data: {
      //     admin_user_id: adminUserId,
      //     target_user_id: targetUserId,
      //     access_reason: reason,
      //     ip_address: ipAddress,
      //     user_agent: userAgent
      //   }
      // })

      console.log(`📝 Master access logged: Admin ${adminUserId} accessed User ${targetUserId}`)
    } catch (error) {
      console.error('Error logging master access:', error)
    }
  }

  // Generate temporary access token for master access
  generateAccessToken (adminUserId, targetUserId) {
    const payload = {
      adminUserId,
      targetUserId,
      masterAccess: true,
      expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
    }
    // Browser-compatible base64 encoding
    return btoa(JSON.stringify(payload))
  }

  // Mock user getter (replace with actual database query)
  async getUserById (userId) {
    // This would query your database
    return {
      id: userId,
      email: 'user@example.com',
      otp_enabled: false,
      otp_secret: null
    }
  }

  // Cleanup expired OTP tokens
  async cleanupExpiredTokens () {
    try {
      // await db.otp_tokens.deleteMany({
      //   where: {
      //     expires_at: { lt: new Date() }
      //   }
      // })

      console.log('🧹 Expired OTP tokens cleaned up')
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error)
    }
  }
}

export default new OTPService()

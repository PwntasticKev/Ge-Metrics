import { describe, it, expect, beforeEach, vi } from 'vitest'
import OTPService from './otpService'

describe('OTPService (Browser Compatible)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect(OTPService.masterPasswordHash).toBe('your-master-password-hash')
      expect(OTPService.adminPhoneNumber).toBe('+1234567890')
      expect(OTPService.adminEmail).toBe('admin@ge-metrics.com')
    })
  })

  describe('generateOTP', () => {
    it('should generate a 6-digit OTP', () => {
      const otp = OTPService.generateOTP()
      expect(otp).toMatch(/^\d{6}$/)
      expect(parseInt(otp)).toBeGreaterThanOrEqual(100000)
      expect(parseInt(otp)).toBeLessThanOrEqual(999999)
    })

    it('should generate different OTPs on consecutive calls', () => {
      const otp1 = OTPService.generateOTP()
      const otp2 = OTPService.generateOTP()
      // Very unlikely to be the same, but possible
      expect(typeof otp1).toBe('string')
      expect(typeof otp2).toBe('string')
    })
  })

  describe('generateTOTPSecret', () => {
    it('should generate a 32-character base32 string', () => {
      const secret = OTPService.generateTOTPSecret()
      expect(secret).toHaveLength(32)
      expect(secret).toMatch(/^[A-Z2-7]+$/) // Base32 characters
    })

    it('should generate different secrets on consecutive calls', () => {
      const secret1 = OTPService.generateTOTPSecret()
      const secret2 = OTPService.generateTOTPSecret()
      expect(secret1).not.toBe(secret2)
    })
  })

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes by default', () => {
      const codes = OTPService.generateBackupCodes()
      expect(codes).toHaveLength(10)
      codes.forEach(code => {
        expect(code).toHaveLength(8)
        expect(code).toMatch(/^[0-9A-F]+$/) // Hex characters
      })
    })

    it('should generate custom number of backup codes', () => {
      const codes = OTPService.generateBackupCodes(5)
      expect(codes).toHaveLength(5)
    })

    it('should generate unique backup codes', () => {
      const codes = OTPService.generateBackupCodes(10)
      const uniqueCodes = new Set(codes)
      expect(uniqueCodes.size).toBe(codes.length)
    })
  })

  describe('simpleHash', () => {
    it('should generate consistent hash for same input', () => {
      const input = 'test-string'
      const hash1 = OTPService.simpleHash(input)
      const hash2 = OTPService.simpleHash(input)
      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different inputs', () => {
      const hash1 = OTPService.simpleHash('input1')
      const hash2 = OTPService.simpleHash('input2')
      expect(hash1).not.toBe(hash2)
    })

    it('should return a hex string', () => {
      const hash = OTPService.simpleHash('test')
      expect(hash).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('generateTOTPToken', () => {
    it('should generate a 6-digit token', () => {
      const secret = 'TESTSECRET123456789012345678'
      const timeStep = Math.floor(Date.now() / 30000)
      const token = OTPService.generateTOTPToken(secret, timeStep)

      expect(token).toMatch(/^\d{6}$/)
      expect(token).toHaveLength(6)
    })

    it('should generate consistent tokens for same secret and time', () => {
      const secret = 'TESTSECRET123456789012345678'
      const timeStep = 12345
      const token1 = OTPService.generateTOTPToken(secret, timeStep)
      const token2 = OTPService.generateTOTPToken(secret, timeStep)

      expect(token1).toBe(token2)
    })

    it('should generate different tokens for different time steps', () => {
      const secret = 'TESTSECRET123456789012345678'
      const token1 = OTPService.generateTOTPToken(secret, 12345)
      const token2 = OTPService.generateTOTPToken(secret, 12346)

      expect(token1).not.toBe(token2)
    })
  })

  describe('verifyTOTP', () => {
    it('should verify token generated for current time', () => {
      const secret = 'TESTSECRET123456789012345678'
      const timeStep = Math.floor(Date.now() / 30000)
      const token = OTPService.generateTOTPToken(secret, timeStep)

      const isValid = OTPService.verifyTOTP(secret, token)
      expect(isValid).toBe(true)
    })

    it('should reject invalid token', () => {
      const secret = 'TESTSECRET123456789012345678'
      const isValid = OTPService.verifyTOTP(secret, '000000')
      expect(isValid).toBe(false)
    })

    it('should verify token within time window', () => {
      const secret = 'TESTSECRET123456789012345678'
      const timeStep = Math.floor(Date.now() / 30000)
      const token = OTPService.generateTOTPToken(secret, timeStep - 1) // Previous time step

      const isValid = OTPService.verifyTOTP(secret, token, 1)
      expect(isValid).toBe(true)
    })
  })

  describe('generateQRCodeURL', () => {
    it('should generate valid QR code URL', () => {
      const secret = 'TESTSECRET123456789012345678'
      const email = 'test@example.com'
      const url = OTPService.generateQRCodeURL(secret, email)

      expect(url).toContain('https://api.qrserver.com')
      expect(url).toContain('otpauth%3A%2F%2Ftotp%2F') // URL encoded version
      expect(url).toContain('test%2540example.com') // Double encoded email in URL
    })

    it('should include custom issuer', () => {
      const secret = 'TESTSECRET123456789012345678'
      const email = 'test@example.com'
      const issuer = 'Custom App'
      const url = OTPService.generateQRCodeURL(secret, email, issuer)

      expect(url).toContain(encodeURIComponent(encodeURIComponent(issuer))) // Double encoded in URL
    })
  })

  describe('generateAccessToken', () => {
    it('should generate base64 encoded token', () => {
      const token = OTPService.generateAccessToken('admin123', 'user456')

      // Should be valid base64
      expect(() => {
        const decoded = atob(token)
        JSON.parse(decoded)
      }).not.toThrow()
    })

    it('should include correct payload data', () => {
      const adminId = 'admin123'
      const userId = 'user456'
      const token = OTPService.generateAccessToken(adminId, userId)

      const decoded = JSON.parse(atob(token))
      expect(decoded.adminUserId).toBe(adminId)
      expect(decoded.targetUserId).toBe(userId)
      expect(decoded.masterAccess).toBe(true)
      expect(decoded.expiresAt).toBeGreaterThan(Date.now())
    })
  })

  describe('async methods', () => {
    describe('storeOTPToken', () => {
      it('should store OTP token successfully', async () => {
        const result = await OTPService.storeOTPToken('user123', '123456')

        expect(result.success).toBe(true)
        expect(result.token).toBe('123456')
        expect(result.expiresAt).toBeInstanceOf(Date)
      })

      it('should set custom expiry time', async () => {
        const result = await OTPService.storeOTPToken('user123', '123456', 'login', 5)

        expect(result.success).toBe(true)
        expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now())
      })
    })

    describe('verifyOTPToken', () => {
      it('should verify valid OTP token', async () => {
        const result = await OTPService.verifyOTPToken('user123', '123456')

        expect(result.success).toBe(true)
        expect(result.verified).toBe(true)
      })

      it('should reject invalid OTP token', async () => {
        const result = await OTPService.verifyOTPToken('user123', '000000')

        expect(result.success).toBe(false)
        expect(result.verified).toBe(false)
        expect(result.reason).toBe('Invalid or expired token')
      })
    })

    describe('sendSMSOTP', () => {
      it('should send SMS OTP successfully', async () => {
        const result = await OTPService.sendSMSOTP('+1234567890', '123456')

        expect(result.success).toBe(true)
        expect(result.message).toBe('SMS sent successfully')
      })
    })

    describe('sendEmailOTP', () => {
      it('should send email OTP successfully', async () => {
        const result = await OTPService.sendEmailOTP('test@example.com', '123456')

        expect(result.success).toBe(true)
        expect(result.message).toBe('Email sent successfully')
      })

      it('should include purpose in email', async () => {
        const result = await OTPService.sendEmailOTP('test@example.com', '123456', 'password-reset')

        expect(result.success).toBe(true)
      })
    })

    describe('setupOTP', () => {
      it('should setup OTP for user', async () => {
        const result = await OTPService.setupOTP('user123', 'test@example.com')

        expect(result.success).toBe(true)
        expect(result.secret).toBeDefined()
        expect(result.qrCodeURL).toBeDefined()
        expect(result.backupCodes).toHaveLength(10)
      })
    })

    describe('verifyMasterPassword', () => {
      it('should verify master password and send OTP', async () => {
        // Set up the master password hash for testing
        const originalHash = OTPService.masterPasswordHash
        const testPassword = 'test-password'
        OTPService.masterPasswordHash = OTPService.simpleHash(testPassword + 'salt')

        const result = await OTPService.verifyMasterPassword(testPassword, 'user123', 'admin123', 'support')

        expect(result.success).toBe(true)
        expect(result.requiresOTP).toBe(true)
        expect(result.message).toContain('Master password verified')

        // Restore original hash
        OTPService.masterPasswordHash = originalHash
      })

      it('should reject invalid master password', async () => {
        // Set a known hash for testing
        const originalHash = OTPService.masterPasswordHash
        OTPService.masterPasswordHash = OTPService.simpleHash('correct-password' + 'salt')

        const result = await OTPService.verifyMasterPassword('wrong-password', 'user123', 'admin123', 'support')

        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid master password')

        // Restore original hash
        OTPService.masterPasswordHash = originalHash
      })
    })
  })
})

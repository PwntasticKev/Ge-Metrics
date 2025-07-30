import { db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { eq, and, lt } from 'drizzle-orm'
import { randomInt } from 'crypto'

export type OtpType = 'password_reset' | 'email_verification' | 'phone_verification' | 'login_verification'

export interface OtpConfig {
  length?: number
  expiresInMinutes?: number
  maxAttempts?: number
}

export class OtpService {
  private static readonly DEFAULT_CONFIG: Required<OtpConfig> = {
    length: 6,
    expiresInMinutes: 10,
    maxAttempts: 3
  }

  /**
   * Generate a new OTP for a user
   */
  static async generateOtp (
    userId: number,
    type: OtpType,
    config: OtpConfig = {}
  ): Promise<{ otpCode: string; expiresAt: Date }> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config }

    // Generate OTP code
    const otpCode = this.generateOtpCode(finalConfig.length)

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + finalConfig.expiresInMinutes * 60 * 1000)

    // Store OTP in database
    await db.insert(schema.otps).values({
      userId,
      otpCode,
      type,
      expiresAt,
      used: false
    })

    return { otpCode, expiresAt }
  }

  /**
   * Verify an OTP code
   */
  static async verifyOtp (
    userId: number,
    otpCode: string,
    type: OtpType
  ): Promise<{ valid: boolean; message: string }> {
    try {
      // Find the OTP
      const otp = await db.select()
        .from(schema.otps)
        .where(
          and(
            eq(schema.otps.userId, userId),
            eq(schema.otps.otpCode, otpCode),
            eq(schema.otps.type, type),
            eq(schema.otps.used, false)
          )
        )
        .limit(1)

      if (otp.length === 0) {
        return { valid: false, message: 'Invalid OTP code' }
      }

      const otpRecord = otp[0]

      // Check if OTP has expired
      if (new Date() > otpRecord.expiresAt) {
        return { valid: false, message: 'OTP code has expired' }
      }

      // Mark OTP as used
      await db.update(schema.otps)
        .set({ used: true })
        .where(eq(schema.otps.id, otpRecord.id))

      return { valid: true, message: 'OTP verified successfully' }
    } catch (error) {
      console.error('Error verifying OTP:', error)
      return { valid: false, message: 'Error verifying OTP' }
    }
  }

  /**
   * Check if user has any active OTPs of a specific type
   */
  static async hasActiveOtp (userId: number, type: OtpType): Promise<boolean> {
    const activeOtps = await db.select()
      .from(schema.otps)
      .where(
        and(
          eq(schema.otps.userId, userId),
          eq(schema.otps.type, type),
          eq(schema.otps.used, false),
          lt(schema.otps.expiresAt, new Date())
        )
      )
      .limit(1)

    return activeOtps.length > 0
  }

  /**
   * Invalidate all OTPs for a user of a specific type
   */
  static async invalidateOtps (userId: number, type: OtpType): Promise<void> {
    await db.update(schema.otps)
      .set({ used: true })
      .where(
        and(
          eq(schema.otps.userId, userId),
          eq(schema.otps.type, type),
          eq(schema.otps.used, false)
        )
      )
  }

  /**
   * Clean up expired OTPs
   */
  static async cleanupExpiredOtps (): Promise<number> {
    const result = await db.delete(schema.otps)
      .where(
        and(
          lt(schema.otps.expiresAt, new Date()),
          eq(schema.otps.used, true)
        )
      )

    return result.rowCount || 0
  }

  /**
   * Generate a random OTP code
   */
  private static generateOtpCode (length: number): string {
    const digits = '0123456789'
    let otp = ''

    for (let i = 0; i < length; i++) {
      otp += digits[randomInt(0, digits.length)]
    }

    return otp
  }

  /**
   * Get OTP statistics for a user
   */
  static async getOtpStats (userId: number): Promise<{
    totalOtps: number
    activeOtps: number
    expiredOtps: number
    usedOtps: number
  }> {
    const allOtps = await db.select()
      .from(schema.otps)
      .where(eq(schema.otps.userId, userId))

    const now = new Date()

    return {
      totalOtps: allOtps.length,
      activeOtps: allOtps.filter(otp => !otp.used && otp.expiresAt > now).length,
      expiredOtps: allOtps.filter(otp => otp.expiresAt <= now).length,
      usedOtps: allOtps.filter(otp => otp.used).length
    }
  }
}

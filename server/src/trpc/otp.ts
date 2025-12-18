import { z } from 'zod'
import { protectedProcedure, router } from './trpc.js'
import { db } from '../db/index.js'
import { users, userSettings } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { authenticator } from 'otplib'
import qrcode from 'qrcode'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export const otpRouter = router({
  setup: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!user) {
      throw new Error('User not found')
    }

    const secret = authenticator.generateSecret()
    const otpauth = authenticator.keyuri(user.email, 'GE-Metrics', secret)

    await db.update(userSettings).set({ otpSecret: secret, otpVerified: false }).where(eq(userSettings.userId, userId))

    const qrCodeDataURL = await qrcode.toDataURL(otpauth)

    return {
      qrCodeDataURL,
      secret
    }
  }),

  verifyAndEnable: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId)
      })

      if (!settings || !settings.otpSecret) {
        throw new Error('OTP not set up')
      }

      const isValid = authenticator.check(input.token, settings.otpSecret)

      if (isValid) {
        // Generate backup codes when enabling 2FA
        const backupCodes = generateBackupCodes()
        const hashedBackupCodes = await hashBackupCodes(backupCodes)
        
        await db.update(userSettings).set({ 
          otpEnabled: true, 
          otpVerified: true,
          backupCodes: hashedBackupCodes
        }).where(eq(userSettings.userId, userId))
        
        return { 
          success: true, 
          message: '2FA enabled successfully.',
          backupCodes // Return plain codes only once for user to save
        }
      } else {
        throw new Error('Invalid OTP token')
      }
    }),

  disable: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id
    await db.update(userSettings)
      .set({
        otpEnabled: false,
        otpVerified: false,
        otpSecret: null,
        backupCodes: null
      })
      .where(eq(userSettings.userId, userId))

    return { success: true, message: '2FA disabled successfully.' }
  }),

  generateBackupCodes: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId)
    })

    if (!settings || !settings.otpEnabled) {
      throw new Error('2FA must be enabled to generate backup codes')
    }

    const backupCodes = generateBackupCodes()
    const hashedBackupCodes = await hashBackupCodes(backupCodes)
    
    await db.update(userSettings)
      .set({ backupCodes: hashedBackupCodes })
      .where(eq(userSettings.userId, userId))

    return { 
      success: true, 
      message: 'Backup codes generated successfully.',
      backupCodes // Return plain codes only once
    }
  })
})

// Helper function to generate backup codes
function generateBackupCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 10; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
  }
  return codes
}

// Helper function to hash backup codes
async function hashBackupCodes(codes: string[]): Promise<Array<{ code: string; used: boolean; createdAt: string }>> {
  const hashedCodes = await Promise.all(
    codes.map(async (code) => ({
      code: await bcrypt.hash(code, 10),
      used: false,
      createdAt: new Date().toISOString()
    }))
  )
  return hashedCodes
}

// Helper function to verify a backup code
export async function verifyBackupCode(
  settings: { backupCodes: Array<{ code: string; used: boolean }> | null },
  inputCode: string
): Promise<boolean> {
  if (!settings.backupCodes || !Array.isArray(settings.backupCodes)) {
    return false
  }

  for (const backupCode of settings.backupCodes) {
    if (backupCode.used) {
      continue
    }

    const isValid = await bcrypt.compare(inputCode, backupCode.code)
    if (isValid) {
      return true
    }
  }

  return false
}

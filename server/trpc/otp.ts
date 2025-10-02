import { z } from 'zod'
import { protectedProcedure, router } from './trpc'
import { db } from '../db'
import { users, userSettings } from '../db/schema'
import { eq } from 'drizzle-orm'
import { authenticator } from 'otplib'
import qrcode from 'qrcode'

export const otpRouter = router({
  setup: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.userId // Corrected from ctx.user.id
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!user) {
      throw new Error('User not found')
    }

    const secret = authenticator.generateSecret()
    const otpauth = authenticator.keyuri(user.email, 'GE-Metrics', secret)

    await db.insert(userSettings)
      .values({
        userId,
        otpSecret: secret,
        otpVerified: false
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          otpSecret: secret,
          otpVerified: false,
          updatedAt: new Date()
        }
      })

    const qrCodeDataURL = await qrcode.toDataURL(otpauth)

    return {
      qrCodeDataURL,
      secret
    }
  }),

  verifyAndEnable: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.userId
      const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId)
      })

      if (!settings || !settings.otpSecret) {
        throw new Error('OTP not set up')
      }

      const isValid = authenticator.check(input.token, settings.otpSecret)

      if (isValid) {
        await db.update(userSettings).set({ otpEnabled: true, otpVerified: true }).where(eq(userSettings.userId, userId))
        return { success: true, message: '2FA enabled successfully.' }
      } else {
        throw new Error('Invalid OTP token')
      }
    }),

  disable: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.userId
    await db.update(userSettings)
      .set({
        otpEnabled: false,
        otpVerified: false,
        otpSecret: null
      })
      .where(eq(userSettings.userId, userId))

    return { success: true, message: '2FA disabled successfully.' }
  })
})

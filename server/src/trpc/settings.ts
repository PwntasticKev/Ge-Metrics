import { z } from 'zod'
import { protectedProcedure, router } from './trpc.js'
import { db } from '../db'
import { userSettings } from '../db/schema'
import { eq } from 'drizzle-orm'

export const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId)
    })

    if (!settings) {
      // This will be created on user registration, but as a fallback:
      const newSettings = await db.insert(userSettings).values({ userId }).returning()
      return newSettings[0]
    }

    return settings
  }),

  update: protectedProcedure
    .input(z.object({
      emailNotifications: z.boolean().optional(),
      volumeAlerts: z.boolean().optional(),
      priceDropAlerts: z.boolean().optional(),
      cooldownPeriod: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const { emailNotifications, volumeAlerts, priceDropAlerts, cooldownPeriod } = input

      await db.update(userSettings)
        .set({
          emailNotifications,
          volumeAlerts,
          priceDropAlerts,
          cooldownPeriod,
          updatedAt: new Date()
        })
        .where(eq(userSettings.userId, userId))

      return { success: true, message: 'Settings updated successfully.' }
    })
})

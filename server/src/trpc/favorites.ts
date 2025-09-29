import { z } from 'zod'
import { db } from '../db/index.js'
import { favorites } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { protectedProcedure, router } from './trpc.js'

export const favoritesRouter = router({
  // Get all favorites for the logged-in user
  getAll: protectedProcedure
    .input(z.object({
      itemType: z.string().optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const itemType = input?.itemType

      const whereClauses = [eq(favorites.userId, userId)]
      if (itemType) {
        whereClauses.push(eq(favorites.itemType, itemType))
      }

      const userFavorites = await db.select({
        itemId: favorites.itemId,
        itemType: favorites.itemType
      }).from(favorites).where(and(...whereClauses))

      // Return an array of favorite objects
      return userFavorites
    }),

  // Add a new favorite
  add: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      itemType: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const { itemId, itemType } = input

      // Use onConflictDoNothing to prevent duplicates
      await db.insert(favorites).values({
        userId,
        itemId,
        itemType
      }).onConflictDoNothing()

      return { success: true, message: 'Favorite added.' }
    }),

  // Remove a favorite
  remove: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      itemType: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const { itemId, itemType } = input

      await db.delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.itemId, itemId), eq(favorites.itemType, itemType)))

      return { success: true, message: 'Favorite removed.' }
    })
})

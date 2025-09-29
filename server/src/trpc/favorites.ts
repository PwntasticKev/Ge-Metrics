import { z } from 'zod'
import { db } from '../db/index.js'
import { favorites } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { protectedProcedure, router } from './trpc.js'

export const favoritesRouter = router({
  // Get all favorites for the logged-in user
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id
      const userFavorites = await db.select({
        itemId: favorites.itemId
      }).from(favorites).where(eq(favorites.userId, userId))

      // Return an array of item IDs
      return userFavorites.map(fav => fav.itemId)
    }),

  // Add a new favorite
  add: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const { itemId } = input

      // Use onConflictDoNothing to prevent duplicates
      await db.insert(favorites).values({
        userId,
        itemId
      }).onConflictDoNothing()

      return { success: true, message: 'Favorite added.' }
    }),

  // Remove a favorite
  remove: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const { itemId } = input

      await db.delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.itemId, itemId)))

      return { success: true, message: 'Favorite removed.' }
    })
})

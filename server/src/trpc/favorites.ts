import { z } from 'zod'
import { db } from '../db/index.js'
import { favorites } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { router, protectedProcedure } from './trpc.js'

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

      console.log('[favorites.add] Adding favorite:', { userId, itemId, itemType })

      // Check if favorite already exists first
      const existing = await db.select()
        .from(favorites)
        .where(and(
          eq(favorites.userId, userId),
          eq(favorites.itemId, itemId),
          eq(favorites.itemType, itemType)
        ))
        .limit(1)

      if (existing.length > 0) {
        console.log('[favorites.add] Favorite already exists, skipping insert')
        return { success: true, message: 'Favorite already exists.' }
      }

      try {
        await db.insert(favorites).values({
          userId,
          itemId,
          itemType
        })
        console.log('[favorites.add] Successfully added favorite')
        return { success: true, message: 'Favorite added.' }
      } catch (error) {
        console.error('[favorites.add] Error adding favorite:', error)
        // If it's a duplicate key error, that's OK - return success
        if (error instanceof Error && error.message.includes('duplicate')) {
          return { success: true, message: 'Favorite already exists.' }
        }
        throw error
      }
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

      console.log('[favorites.remove] Removing favorite:', { userId, itemId, itemType })

      try {
        const result = await db.delete(favorites)
          .where(and(eq(favorites.userId, userId), eq(favorites.itemId, itemId), eq(favorites.itemType, itemType)))
        
        console.log('[favorites.remove] Successfully removed favorite')
        return { success: true, message: 'Favorite removed.' }
      } catch (error) {
        console.error('[favorites.remove] Error removing favorite:', error)
        throw error
      }
    })
})

import { db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { eq, and } from 'drizzle-orm'

export interface FavoriteItem {
  id: string
  userId: string
  favoriteType: string
  favoriteId: string
  createdAt: Date
  updatedAt: Date
}

export class FavoritesService {
  /**
   * Add an item to user's favorites
   */
  async addFavorite (userId: string, favoriteType: 'item' | 'combination', favoriteId: string): Promise<FavoriteItem> {
    try {
      // Check if already favorited
      const existing = await db.select().from(schema.favorites).where(
        and(
          eq(schema.favorites.userId, userId),
          eq(schema.favorites.favoriteType, favoriteType),
          eq(schema.favorites.favoriteId, favoriteId)
        )
      )

      if (existing.length > 0) {
        throw new Error('Item is already in favorites')
      }

      // Add to favorites
      const [newFavorite] = await db.insert(schema.favorites).values({
        userId,
        favoriteType,
        favoriteId
      }).returning()

      return newFavorite
    } catch (error) {
      console.error('Error adding favorite:', error)
      throw error
    }
  }

  /**
   * Remove an item from user's favorites
   */
  async removeFavorite (userId: string, favoriteType: 'item' | 'combination', favoriteId: string): Promise<boolean> {
    try {
      const result = await db.delete(schema.favorites).where(
        and(
          eq(schema.favorites.userId, userId),
          eq(schema.favorites.favoriteType, favoriteType),
          eq(schema.favorites.favoriteId, favoriteId)
        )
      ).returning()

      return result.length > 0
    } catch (error) {
      console.error('Error removing favorite:', error)
      throw error
    }
  }

  /**
   * Get all favorites for a user
   */
  async getUserFavorites (userId: string): Promise<FavoriteItem[]> {
    try {
      return await db.select().from(schema.favorites).where(eq(schema.favorites.userId, userId))
    } catch (error) {
      console.error('Error getting user favorites:', error)
      throw error
    }
  }

  /**
   * Get favorites by type for a user
   */
  async getUserFavoritesByType (userId: string, favoriteType: 'item' | 'combination'): Promise<FavoriteItem[]> {
    try {
      return await db.select().from(schema.favorites).where(
        and(
          eq(schema.favorites.userId, userId),
          eq(schema.favorites.favoriteType, favoriteType)
        )
      )
    } catch (error) {
      console.error('Error getting user favorites by type:', error)
      throw error
    }
  }

  /**
   * Check if an item is favorited by a user
   */
  async isFavorited (userId: string, favoriteType: 'item' | 'combination', favoriteId: string): Promise<boolean> {
    try {
      const result = await db.select().from(schema.favorites).where(
        and(
          eq(schema.favorites.userId, userId),
          eq(schema.favorites.favoriteType, favoriteType),
          eq(schema.favorites.favoriteId, favoriteId)
        )
      )

      return result.length > 0
    } catch (error) {
      console.error('Error checking if favorited:', error)
      return false
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite (userId: string, favoriteType: 'item' | 'combination', favoriteId: string): Promise<{ isFavorited: boolean; favorite?: FavoriteItem }> {
    try {
      const isCurrentlyFavorited = await this.isFavorited(userId, favoriteType, favoriteId)

      if (isCurrentlyFavorited) {
        await this.removeFavorite(userId, favoriteType, favoriteId)
        return { isFavorited: false }
      } else {
        const favorite = await this.addFavorite(userId, favoriteType, favoriteId)
        return { isFavorited: true, favorite }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      throw error
    }
  }

  /**
   * Get favorite count for an item
   */
  async getFavoriteCount (favoriteType: 'item' | 'combination', favoriteId: string): Promise<number> {
    try {
      const result = await db.select().from(schema.favorites).where(
        and(
          eq(schema.favorites.favoriteType, favoriteType),
          eq(schema.favorites.favoriteId, favoriteId)
        )
      )

      return result.length
    } catch (error) {
      console.error('Error getting favorite count:', error)
      return 0
    }
  }

  /**
   * Clear all favorites for a user
   */
  async clearUserFavorites (userId: string): Promise<number> {
    try {
      const result = await db.delete(schema.favorites).where(eq(schema.favorites.userId, userId)).returning()
      return result.length
    } catch (error) {
      console.error('Error clearing user favorites:', error)
      throw error
    }
  }
}

export default FavoritesService

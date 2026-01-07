import { z } from 'zod'
import { protectedProcedure, adminProcedure, router } from './trpc.js'
import { db } from '../db/index.js'
import { recipes, recipeIngredients, users } from '../db/schema.js'
import { eq, desc, sql, and, count, inArray } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

export const recipesRouter = router({
  // Get user's recipes with pagination
  getUserRecipes: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(1000).default(50),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      const userRecipes = await db
        .select({
          id: recipes.id,
          outputItemId: recipes.outputItemId,
          outputItemName: recipes.outputItemName,
          conversionCost: recipes.conversionCost,
          createdAt: recipes.createdAt,
          updatedAt: recipes.updatedAt,
          ingredients: sql<any[]>`
            COALESCE(
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'itemId', ${recipeIngredients.itemId},
                  'itemName', ${recipeIngredients.itemName},
                  'quantity', ${recipeIngredients.quantity}
                )
                ORDER BY ${recipeIngredients.sortOrder}, ${recipeIngredients.createdAt}
              ) FILTER (WHERE ${recipeIngredients.id} IS NOT NULL),
              '[]'::json
            )
          `
        })
        .from(recipes)
        .leftJoin(recipeIngredients, eq(recipes.id, recipeIngredients.recipeId))
        .where(eq(recipes.userId, userId))
        .groupBy(
          recipes.id,
          recipes.outputItemId, 
          recipes.outputItemName,
          recipes.conversionCost,
          recipes.createdAt,
          recipes.updatedAt
        )
        .orderBy(desc(recipes.createdAt))
        .limit(input.limit)
        .offset(input.offset)

      return userRecipes
    }),

  // Get user's recipe count (for limit checking)
  getUserRecipeCount: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id
      
      const result = await db
        .select({ count: count() })
        .from(recipes)
        .where(eq(recipes.userId, userId))

      return result[0]?.count || 0
    }),

  // Create a new recipe
  createRecipe: protectedProcedure
    .input(z.object({
      outputItemId: z.number().positive(),
      outputItemName: z.string().min(1).max(255),
      conversionCost: z.number().nonnegative().default(0),
      ingredients: z.array(z.object({
        itemId: z.number().positive(),
        itemName: z.string().min(1).max(255),
        quantity: z.number().positive().default(1),
        sortOrder: z.number().nonnegative().optional()
      })).min(1).max(50) // Max 50 ingredients per recipe
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      // Check if user has reached recipe limit (200)
      const userRecipeCount = await db
        .select({ count: count() })
        .from(recipes)
        .where(eq(recipes.userId, userId))
      
      if ((userRecipeCount[0]?.count || 0) >= 300) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You have reached the maximum limit of 300 recipes. Please delete some recipes before creating new ones.'
        })
      }

      // Check for circular recipes (ingredient can't be same as output)
      const hasCircularRecipe = input.ingredients.some(ingredient => 
        ingredient.itemId === input.outputItemId
      )
      
      if (hasCircularRecipe) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid recipe: An ingredient cannot be the same as the output item.'
        })
      }

      // Check for duplicate recipe (same output item globally)
      const existingRecipe = await db
        .select({ id: recipes.id })
        .from(recipes)
        .where(eq(recipes.outputItemId, input.outputItemId))
        .limit(1)
      
      let isGlobalDuplicate = existingRecipe.length > 0

      // Create the recipe
      const newRecipe = await db
        .insert(recipes)
        .values({
          userId,
          outputItemId: input.outputItemId,
          outputItemName: input.outputItemName,
          conversionCost: input.conversionCost
        })
        .returning()

      // Add ingredients
      await db
        .insert(recipeIngredients)
        .values(
          input.ingredients.map((ingredient, index) => ({
            recipeId: newRecipe[0].id,
            itemId: ingredient.itemId,
            itemName: ingredient.itemName,
            quantity: ingredient.quantity,
            sortOrder: ingredient.sortOrder ?? index
          }))
        )

      return {
        recipe: newRecipe[0],
        isGlobalDuplicate,
        message: isGlobalDuplicate 
          ? 'Recipe created successfully. Note: A recipe with this output item already exists globally.' 
          : 'Recipe created successfully and added to global recipes.'
      }
    }),

  // Update user's recipe
  updateRecipe: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      conversionCost: z.number().nonnegative().optional(),
      ingredients: z.array(z.object({
        itemId: z.number().positive(),
        itemName: z.string().min(1).max(255),
        quantity: z.number().positive().default(1),
        sortOrder: z.number().nonnegative().optional()
      })).min(1).max(50).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const { id, ...updateData } = input
      
      // Verify recipe ownership
      const existingRecipe = await db
        .select()
        .from(recipes)
        .where(and(
          eq(recipes.id, id),
          eq(recipes.userId, userId)
        ))
        .limit(1)

      if (!existingRecipe.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Recipe not found or you do not have permission to edit it.'
        })
      }

      // Check for circular recipes if ingredients are being updated
      if (input.ingredients) {
        const hasCircularRecipe = input.ingredients.some(ingredient => 
          ingredient.itemId === existingRecipe[0].outputItemId
        )
        
        if (hasCircularRecipe) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid recipe: An ingredient cannot be the same as the output item.'
          })
        }
      }

      // Update recipe
      const updatedRecipe = await db
        .update(recipes)
        .set({
          conversionCost: updateData.conversionCost,
          updatedAt: new Date()
        })
        .where(and(
          eq(recipes.id, id),
          eq(recipes.userId, userId)
        ))
        .returning()

      // Update ingredients if provided
      if (input.ingredients) {
        // Delete existing ingredients
        await db
          .delete(recipeIngredients)
          .where(eq(recipeIngredients.recipeId, id))

        // Add new ingredients
        await db
          .insert(recipeIngredients)
          .values(
            input.ingredients.map((ingredient, index) => ({
              recipeId: id,
              itemId: ingredient.itemId,
              itemName: ingredient.itemName,
              quantity: ingredient.quantity,
              sortOrder: ingredient.sortOrder ?? index
            }))
          )
      }

      return updatedRecipe[0]
    }),

  // Delete user's recipe
  deleteRecipe: protectedProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      // Verify recipe ownership before deleting
      const recipeToDelete = await db
        .select()
        .from(recipes)
        .where(and(
          eq(recipes.id, input.id),
          eq(recipes.userId, userId)
        ))
        .limit(1)

      if (!recipeToDelete.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Recipe not found or you do not have permission to delete it.'
        })
      }

      // Delete recipe (ingredients will be deleted automatically due to CASCADE)
      await db
        .delete(recipes)
        .where(and(
          eq(recipes.id, input.id),
          eq(recipes.userId, userId)
        ))

      return { success: true }
    }),

  // Get global recipes (public view)
  getGlobalRecipes: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(1000).default(50),
      offset: z.number().min(0).default(0),
      sortBy: z.enum(['createdAt', 'outputItemName', 'username', 'profit']).default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc')
    }))
    .query(async ({ input }) => {
      
      const globalRecipes = await db
        .select({
          id: recipes.id,
          userId: recipes.userId,
          outputItemId: recipes.outputItemId,
          outputItemName: recipes.outputItemName,
          conversionCost: recipes.conversionCost,
          createdAt: recipes.createdAt,
          updatedAt: recipes.updatedAt,
          username: users.username,
          ingredients: sql<any[]>`
            COALESCE(
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'itemId', ${recipeIngredients.itemId},
                  'itemName', ${recipeIngredients.itemName},
                  'quantity', ${recipeIngredients.quantity}
                )
                ORDER BY ${recipeIngredients.sortOrder}, ${recipeIngredients.createdAt}
              ) FILTER (WHERE ${recipeIngredients.id} IS NOT NULL),
              '[]'::json
            )
          `
        })
        .from(recipes)
        .innerJoin(users, eq(recipes.userId, users.id))
        .leftJoin(recipeIngredients, eq(recipes.id, recipeIngredients.recipeId))
        .groupBy(
          recipes.id,
          recipes.userId,
          recipes.outputItemId,
          recipes.outputItemName,
          recipes.conversionCost,
          recipes.createdAt,
          recipes.updatedAt,
          users.username
        )
        .orderBy(
          input.sortOrder === 'desc' 
            ? desc(input.sortBy === 'username' ? users.username : input.sortBy === 'outputItemName' ? recipes.outputItemName : recipes.createdAt)
            : (input.sortBy === 'username' ? users.username : input.sortBy === 'outputItemName' ? recipes.outputItemName : recipes.createdAt)
        )
        .limit(input.limit)
        .offset(input.offset)

      return globalRecipes
    }),

  // ===== ADMIN ROUTES =====

  // Get all recipes (admin only)
  getAllRecipes: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(1000).default(50),
      offset: z.number().min(0).default(0),
      sortBy: z.enum(['createdAt', 'outputItemName', 'username']).default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc')
    }))
    .query(async ({ input }) => {
      
      const allRecipes = await db
        .select({
          id: recipes.id,
          userId: recipes.userId,
          outputItemId: recipes.outputItemId,
          outputItemName: recipes.outputItemName,
          conversionCost: recipes.conversionCost,
          createdAt: recipes.createdAt,
          updatedAt: recipes.updatedAt,
          username: users.username,
          userEmail: users.email,
          ingredients: sql<any[]>`
            COALESCE(
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'itemId', ${recipeIngredients.itemId},
                  'itemName', ${recipeIngredients.itemName},
                  'quantity', ${recipeIngredients.quantity}
                )
                ORDER BY ${recipeIngredients.sortOrder}, ${recipeIngredients.createdAt}
              ) FILTER (WHERE ${recipeIngredients.id} IS NOT NULL),
              '[]'::json
            )
          `
        })
        .from(recipes)
        .innerJoin(users, eq(recipes.userId, users.id))
        .leftJoin(recipeIngredients, eq(recipes.id, recipeIngredients.recipeId))
        .groupBy(
          recipes.id,
          recipes.userId,
          recipes.outputItemId,
          recipes.outputItemName,
          recipes.conversionCost,
          recipes.createdAt,
          recipes.updatedAt,
          users.username,
          users.email
        )
        .orderBy(
          input.sortOrder === 'desc' 
            ? desc(input.sortBy === 'username' ? users.username : input.sortBy === 'outputItemName' ? recipes.outputItemName : recipes.createdAt)
            : (input.sortBy === 'username' ? users.username : input.sortBy === 'outputItemName' ? recipes.outputItemName : recipes.createdAt)
        )
        .limit(input.limit)
        .offset(input.offset)

      return allRecipes
    }),

  // Get global recipes stats (admin only)
  getGlobalRecipeStats: adminProcedure
    .query(async () => {
      const stats = await db
        .select({
          totalRecipes: count(),
          uniqueOutputItems: sql<number>`COUNT(DISTINCT ${recipes.outputItemId})`,
          totalUsers: sql<number>`COUNT(DISTINCT ${recipes.userId})`
        })
        .from(recipes)

      return stats[0] || {
        totalRecipes: 0,
        uniqueOutputItems: 0,
        totalUsers: 0
      }
    }),

  // Update any recipe globally (admin only)
  updateRecipeGlobally: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      conversionCost: z.number().nonnegative().optional(),
      ingredients: z.array(z.object({
        itemId: z.number().positive(),
        itemName: z.string().min(1).max(255),
        quantity: z.number().positive().default(1),
        sortOrder: z.number().nonnegative().optional()
      })).min(1).max(50).optional()
    }))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input
      
      // Check if recipe exists
      const existingRecipe = await db
        .select()
        .from(recipes)
        .where(eq(recipes.id, id))
        .limit(1)

      if (!existingRecipe.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Recipe not found.'
        })
      }

      // Check for circular recipes if ingredients are being updated
      if (input.ingredients) {
        const hasCircularRecipe = input.ingredients.some(ingredient => 
          ingredient.itemId === existingRecipe[0].outputItemId
        )
        
        if (hasCircularRecipe) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid recipe: An ingredient cannot be the same as the output item.'
          })
        }
      }

      // Update recipe
      const updatedRecipe = await db
        .update(recipes)
        .set({
          conversionCost: updateData.conversionCost,
          updatedAt: new Date()
        })
        .where(eq(recipes.id, id))
        .returning()

      // Update ingredients if provided
      if (input.ingredients) {
        // Delete existing ingredients
        await db
          .delete(recipeIngredients)
          .where(eq(recipeIngredients.recipeId, id))

        // Add new ingredients
        await db
          .insert(recipeIngredients)
          .values(
            input.ingredients.map((ingredient, index) => ({
              recipeId: id,
              itemId: ingredient.itemId,
              itemName: ingredient.itemName,
              quantity: ingredient.quantity,
              sortOrder: ingredient.sortOrder ?? index
            }))
          )
      }

      return updatedRecipe[0]
    }),

  // Delete any recipe globally (admin only)
  deleteRecipeGlobally: adminProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .mutation(async ({ input }) => {
      
      // Check if recipe exists
      const recipeToDelete = await db
        .select()
        .from(recipes)
        .where(eq(recipes.id, input.id))
        .limit(1)

      if (!recipeToDelete.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Recipe not found.'
        })
      }

      // Delete recipe (ingredients will be deleted automatically due to CASCADE)
      await db
        .delete(recipes)
        .where(eq(recipes.id, input.id))

      return { success: true }
    })
})
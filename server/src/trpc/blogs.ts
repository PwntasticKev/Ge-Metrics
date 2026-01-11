import { router, subscribedProcedure } from './trpc.js'
import { z } from 'zod'
import { db } from '../db/index.js'
import { blogs } from '../db/schema.js'
import { desc, and, gte, lte, eq } from 'drizzle-orm'

export const blogsRouter = router({
  /**
   * Get all blogs, optionally filtered by date range
   */
  getAll: subscribedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        year: z.number().optional(),
        category: z.string().optional(),
        limit: z.number().optional().default(1000)
      }).optional()
    )
    .query(async ({ input }) => {
      try {
        const conditions = []
        
        if (input?.startDate) {
          conditions.push(gte(blogs.date, input.startDate))
        }
        
        if (input?.endDate) {
          conditions.push(lte(blogs.date, input.endDate))
        }
        
        if (input?.year) {
          conditions.push(eq(blogs.year, input.year))
        }
        
        if (input?.category) {
          conditions.push(eq(blogs.category, input.category))
        }
        
        const baseQuery = db.select().from(blogs)
        const query = conditions.length > 0 
          ? baseQuery.where(and(...conditions))
          : baseQuery
        
        const result = await query
          .orderBy(desc(blogs.date))
          .limit(input?.limit || 1000)
        
        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('[BlogsRouter] Error fetching blogs:', error)
        return {
          success: false,
          data: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }),
  
  /**
   * Get blogs within a date range (for chart markers)
   */
  getByDateRange: subscribedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date()
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await db
          .select()
          .from(blogs)
          .where(
            and(
              gte(blogs.date, input.startDate),
              lte(blogs.date, input.endDate)
            )
          )
          .orderBy(desc(blogs.date))
        
        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('[BlogsRouter] Error fetching blogs by date range:', error)
        return {
          success: false,
          data: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }),
  
  /**
   * Get latest blogs
   */
  getLatest: subscribedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(10)
      }).optional()
    )
    .query(async ({ input }) => {
      try {
        const result = await db
          .select()
          .from(blogs)
          .orderBy(desc(blogs.date))
          .limit(input?.limit || 10)
        
        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('[BlogsRouter] Error fetching latest blogs:', error)
        return {
          success: false,
          data: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
})


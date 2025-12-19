import { router, publicProcedure } from './trpc.js'
import { z } from 'zod'
import { db } from '../db/index.js'
import { blogs, gameUpdates } from '../db/schema.js'
import { desc, and, gte, lte, eq } from 'drizzle-orm'

export const gameEventsRouter = router({
  /**
   * Get blogs and updates within a date range (for chart markers)
   */
  getByDateRange: publicProcedure
    .input(
      z.object({
        startDate: z.union([z.date(), z.string()]).transform((val) => {
          if (typeof val === 'string') {
            const date = new Date(val)
            if (isNaN(date.getTime())) {
              throw new Error(`Invalid date string: ${val}`)
            }
            return date
          }
          return val
        }),
        endDate: z.union([z.date(), z.string()]).transform((val) => {
          if (typeof val === 'string') {
            const date = new Date(val)
            if (isNaN(date.getTime())) {
              throw new Error(`Invalid date string: ${val}`)
            }
            return date
          }
          return val
        })
      })
    )
    .query(async ({ input }) => {
      try {
        // Validate date range
        if (input.startDate > input.endDate) {
          throw new Error('startDate must be before endDate')
        }

        // Ensure dates are valid
        if (isNaN(input.startDate.getTime()) || isNaN(input.endDate.getTime())) {
          throw new Error('Invalid date values provided')
        }

        const [blogsData, updatesData] = await Promise.all([
          db
            .select()
            .from(blogs)
            .where(
              and(
                gte(blogs.date, input.startDate),
                lte(blogs.date, input.endDate)
              )
            )
            .orderBy(desc(blogs.date)),
          db
            .select()
            .from(gameUpdates)
            .where(
              and(
                gte(gameUpdates.updateDate, input.startDate),
                lte(gameUpdates.updateDate, input.endDate)
              )
            )
            .orderBy(desc(gameUpdates.updateDate))
        ])

        return {
          success: true,
          data: {
            blogs: blogsData,
            updates: updatesData
          }
        }
      } catch (error) {
        console.error('[GameEventsRouter] Error fetching events by date range:', error)
        return {
          success: false,
          data: { blogs: [], updates: [] },
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }),

  /**
   * Get latest events (blogs and updates)
   */
  getLatest: publicProcedure
    .input(
      z.object({
        limit: z.number().optional().default(10)
      }).optional()
    )
    .query(async ({ input }) => {
      try {
        const limit = input?.limit || 10

        const [latestBlogs, latestUpdates] = await Promise.all([
          db
            .select()
            .from(blogs)
            .orderBy(desc(blogs.date))
            .limit(limit),
          db
            .select()
            .from(gameUpdates)
            .orderBy(desc(gameUpdates.updateDate))
            .limit(limit)
        ])

        // Combine and sort by date
        const allEvents = [
          ...latestBlogs.map(blog => ({ ...blog, eventType: 'blog' as const })),
          ...latestUpdates.map(update => ({ ...update, eventType: 'update' as const }))
        ].sort((a, b) => {
          const dateA = 'date' in a ? a.date : a.updateDate
          const dateB = 'date' in b ? b.date : b.updateDate
          return dateB.getTime() - dateA.getTime()
        }).slice(0, limit)

        return {
          success: true,
          data: allEvents
        }
      } catch (error) {
        console.error('[GameEventsRouter] Error fetching latest events:', error)
        return {
          success: false,
          data: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }),

  /**
   * Get events by category/type
   */
  getByCategory: publicProcedure
    .input(
      z.object({
        category: z.string(),
        limit: z.number().optional().default(50)
      })
    )
    .query(async ({ input }) => {
      try {
        const [blogsData, updatesData] = await Promise.all([
          db
            .select()
            .from(blogs)
            .where(eq(blogs.category, input.category))
            .orderBy(desc(blogs.date))
            .limit(input.limit || 50),
          db
            .select()
            .from(gameUpdates)
            .where(eq(gameUpdates.category, input.category))
            .orderBy(desc(gameUpdates.updateDate))
            .limit(input.limit || 50)
        ])

        return {
          success: true,
          data: {
            blogs: blogsData,
            updates: updatesData
          }
        }
      } catch (error) {
        console.error('[GameEventsRouter] Error fetching events by category:', error)
        return {
          success: false,
          data: { blogs: [], updates: [] },
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
})


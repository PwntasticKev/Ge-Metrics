import { z } from 'zod'
import { eq, sql, and, gte, lte, desc, count, avg, sum, or, like, asc } from 'drizzle-orm'
import { 
  db, 
  users, 
  auditLog,
  formulas
} from '../db/index.js'
import { adminProcedure, router } from './trpc.js'

export const adminFormulasRouter = router({
  // Get all formulas
  getAllFormulas: adminProcedure
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      complexity: z.string().optional(),
      isActive: z.boolean().optional()
    }))
    .query(async ({ input }) => {
      const { category, search, complexity, isActive } = input
      
      let query = db.select().from(formulas)
      
      const conditions = []
      
      if (category) {
        conditions.push(eq(formulas.category, category))
      }
      
      if (search) {
        conditions.push(
          or(
            like(formulas.name, `%${search}%`),
            like(formulas.description, `%${search}%`)
          )
        )
      }
      
      if (complexity) {
        conditions.push(eq(formulas.complexity, complexity))
      }
      
      if (isActive !== undefined) {
        conditions.push(eq(formulas.isActive, isActive))
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions))
      }
      
      const allFormulas = await query.orderBy(desc(formulas.updatedAt))
      
      return allFormulas
    }),

  // Get formula by ID
  getFormulaById: adminProcedure
    .input(z.object({
      formulaId: z.string()
    }))
    .query(async ({ input }) => {
      const { formulaId } = input
      
      const [formula] = await db
        .select()
        .from(formulas)
        .where(eq(formulas.id, formulaId))
      
      if (!formula) {
        throw new Error('Formula not found')
      }
      
      return formula
    }),

  // Create new formula
  createFormula: adminProcedure
    .input(z.object({
      name: z.string(),
      category: z.string(),
      description: z.string(),
      formula: z.string(),
      parameters: z.array(z.any()).optional(),
      examples: z.array(z.any()).optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
      complexity: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
      isActive: z.boolean().default(true)
    }))
    .mutation(async ({ input, ctx }) => {
      const [newFormula] = await db.insert(formulas).values({
        ...input,
        createdBy: ctx.user.id
      }).returning()

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'create_formula',
        resource: 'formula',
        resourceId: newFormula.id,
        details: {
          formulaName: newFormula.name,
          category: newFormula.category,
          complexity: newFormula.complexity
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return newFormula
    }),

  // Update formula
  updateFormula: adminProcedure
    .input(z.object({
      formulaId: z.string(),
      name: z.string().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      formula: z.string().optional(),
      parameters: z.array(z.any()).optional(),
      examples: z.array(z.any()).optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
      complexity: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      isActive: z.boolean().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { formulaId, ...updateData } = input
      
      const [updatedFormula] = await db
        .update(formulas)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(formulas.id, formulaId))
        .returning()

      if (!updatedFormula) {
        throw new Error('Formula not found')
      }

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'update_formula',
        resource: 'formula',
        resourceId: formulaId,
        details: {
          formulaName: updatedFormula.name,
          changes: updateData
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return updatedFormula
    }),

  // Delete formula
  deleteFormula: adminProcedure
    .input(z.object({
      formulaId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const { formulaId } = input
      
      // Get formula before deletion for logging
      const [formula] = await db.select().from(formulas).where(eq(formulas.id, formulaId))
      if (!formula) {
        throw new Error('Formula not found')
      }

      // Delete the formula
      await db.delete(formulas).where(eq(formulas.id, formulaId))

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'delete_formula',
        resource: 'formula',
        resourceId: formulaId,
        details: {
          deletedFormulaName: formula.name,
          category: formula.category
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return { success: true, message: 'Formula deleted successfully' }
    }),

  // Get formula categories
  getCategories: adminProcedure
    .query(async () => {
      // Get distinct categories from formulas
      const categoryResults = await db
        .selectDistinct({ category: formulas.category })
        .from(formulas)
        .where(eq(formulas.isActive, true))
        .orderBy(asc(formulas.category))
      
      const categories = categoryResults.map(result => result.category)
      
      // Add predefined categories if they don't exist
      const predefinedCategories = ['trading', 'skilling', 'investment', 'combat', 'general']
      const allCategories = [...new Set([...predefinedCategories, ...categories])]
      
      return allCategories.map(cat => ({
        value: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1)
      }))
    }),

  // Get formula statistics
  getStatistics: adminProcedure
    .query(async () => {
      const [totalFormulas] = await db
        .select({ count: count() })
        .from(formulas)
      
      const [activeFormulas] = await db
        .select({ count: count() })
        .from(formulas)
        .where(eq(formulas.isActive, true))
      
      // Get formulas by category
      const formulasByCategory = await db
        .select({
          category: formulas.category,
          count: count()
        })
        .from(formulas)
        .where(eq(formulas.isActive, true))
        .groupBy(formulas.category)
      
      // Get formulas by complexity
      const formulasByComplexity = await db
        .select({
          complexity: formulas.complexity,
          count: count()
        })
        .from(formulas)
        .where(eq(formulas.isActive, true))
        .groupBy(formulas.complexity)
      
      return {
        totalFormulas: totalFormulas.count || 0,
        activeFormulas: activeFormulas.count || 0,
        inactiveFormulas: (totalFormulas.count || 0) - (activeFormulas.count || 0),
        byCategory: formulasByCategory,
        byComplexity: formulasByComplexity
      }
    })
})
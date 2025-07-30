import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Create a new goal
export const createGoal = mutation({
  args: {
    user_id: v.number(),
    goal_price: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const goalId = await ctx.db.insert('goals', {
      user_id: args.user_id,
      goal_price: args.goal_price,
      updated_at: Date.now()
    })
    return goalId
  }
})

// Get user's goals
export const getUserGoals = query({
  args: { user_id: v.number() },
  handler: async (ctx, args) => {
    const goals = await ctx.db
      .query('goals')
      .withIndex('by_user_id', (q) => q.eq('user_id', args.user_id))
      .collect()
    return goals
  }
})

// Update goal
export const updateGoal = mutation({
  args: {
    id: v.id('goals'),
    goal_price: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      goal_price: args.goal_price,
      updated_at: Date.now()
    })
  }
})

// Delete goal
export const deleteGoal = mutation({
  args: { id: v.id('goals') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  }
})

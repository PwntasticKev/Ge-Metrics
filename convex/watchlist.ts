import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Add item to watchlist
export const addToWatchlist = mutation({
  args: {
    user_id: v.number(),
    item_id: v.number(),
    item_name: v.string(),
    volume_threshold: v.optional(v.number()),
    price_drop_threshold: v.optional(v.number()),
    price_spike_threshold: v.optional(v.number()),
    abnormal_activity: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const watchlistId = await ctx.db.insert('watchlist', {
      user_id: args.user_id,
      item_id: args.item_id,
      item_name: args.item_name,
      volume_threshold: args.volume_threshold,
      price_drop_threshold: args.price_drop_threshold,
      price_spike_threshold: args.price_spike_threshold,
      abnormal_activity: args.abnormal_activity ?? false,
      is_active: true,
      created_at: Date.now(),
      updated_at: Date.now()
    })
    return watchlistId
  }
})

// Get user's watchlist
export const getUserWatchlist = query({
  args: { user_id: v.number() },
  handler: async (ctx, args) => {
    const watchlist = await ctx.db
      .query('watchlist')
      .withIndex('by_user_id', (q) => q.eq('user_id', args.user_id))
      .filter((q) => q.eq(q.field('is_active'), true))
      .collect()
    return watchlist
  }
})

// Update watchlist item
export const updateWatchlistItem = mutation({
  args: {
    id: v.id('watchlist'),
    updates: v.object({
      volume_threshold: v.optional(v.number()),
      price_drop_threshold: v.optional(v.number()),
      price_spike_threshold: v.optional(v.number()),
      abnormal_activity: v.optional(v.boolean()),
      is_active: v.optional(v.boolean())
    })
  },
  handler: async (ctx, args) => {
    const { id, updates } = args
    await ctx.db.patch(id, {
      ...updates,
      updated_at: Date.now()
    })
  }
})

// Remove item from watchlist
export const removeFromWatchlist = mutation({
  args: { id: v.id('watchlist') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      is_active: false,
      updated_at: Date.now()
    })
  }
})

// Get watchlist by item ID
export const getWatchlistByItem = query({
  args: { item_id: v.number() },
  handler: async (ctx, args) => {
    const watchlist = await ctx.db
      .query('watchlist')
      .withIndex('by_item_id', (q) => q.eq('item_id', args.item_id))
      .filter((q) => q.eq(q.field('is_active'), true))
      .collect()
    return watchlist
  }
})

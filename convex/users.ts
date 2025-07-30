import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Create a new user
export const createUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
    runescape_name: v.optional(v.string()),
    role: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert('users', {
      email: args.email,
      password: args.password, // Note: In production, hash this password
      name: args.name,
      runescape_name: args.runescape_name,
      role: args.role ?? 'user',
      access: false,
      otp_enabled: false,
      created_at: Date.now()
    })
    return userId
  }
})

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first()
    return user
  }
})

// Get user by ID
export const getUserById = query({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id)
    return user
  }
})

// Update user
export const updateUser = mutation({
  args: {
    id: v.id('users'),
    updates: v.object({
      name: v.optional(v.string()),
      runescape_name: v.optional(v.string()),
      role: v.optional(v.string()),
      access: v.optional(v.boolean()),
      otp_enabled: v.optional(v.boolean()),
      otp_secret: v.optional(v.string()),
      backup_codes: v.optional(v.string()),
      updated_at: v.optional(v.number())
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

// Get all users (admin only)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    return users
  }
})

// Delete user
export const deleteUser = mutation({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deleted_at: Date.now()
    })
  }
})

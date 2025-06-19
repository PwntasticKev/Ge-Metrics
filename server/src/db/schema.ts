import { pgTable, text, timestamp, uuid, index, boolean, integer, jsonb } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  salt: text('salt'),
  googleId: text('google_id'),
  name: text('name'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  googleIdIdx: index('google_id_idx').on(table.googleId)
}))

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
  tokenIdx: index('refresh_tokens_token_idx').on(table.token)
}))

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripePriceId: text('stripe_price_id'),
  status: text('status').notNull().default('inactive'), // active, inactive, canceled, past_due
  plan: text('plan').notNull().default('free'), // free, premium
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
  stripeCustomerIdx: index('subscriptions_stripe_customer_idx').on(table.stripeCustomerId),
  stripeSubscriptionIdx: index('subscriptions_stripe_subscription_idx').on(table.stripeSubscriptionId)
}))

export const userWatchlists = pgTable('user_watchlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull(),
  itemName: text('item_name').notNull(),
  targetPrice: integer('target_price'),
  alertType: text('alert_type').notNull().default('price'), // price, volume, manipulation
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('user_watchlists_user_id_idx').on(table.userId),
  itemIdIdx: index('user_watchlists_item_id_idx').on(table.itemId)
}))

export const userTransactions = pgTable('user_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull(),
  itemName: text('item_name').notNull(),
  transactionType: text('transaction_type').notNull(), // buy, sell
  quantity: integer('quantity').notNull(),
  price: integer('price').notNull(),
  profit: integer('profit'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('user_transactions_user_id_idx').on(table.userId),
  itemIdIdx: index('user_transactions_item_id_idx').on(table.itemId),
  createdAtIdx: index('user_transactions_created_at_idx').on(table.createdAt)
}))

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  name: z.string().min(1).max(100)
})

export const selectUserSchema = createSelectSchema(users)

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens)
export const selectRefreshTokenSchema = createSelectSchema(refreshTokens)

export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
  status: z.enum(['active', 'inactive', 'canceled', 'past_due']),
  plan: z.enum(['free', 'premium'])
})

export const selectSubscriptionSchema = createSelectSchema(subscriptions)

export const insertUserWatchlistSchema = createInsertSchema(userWatchlists, {
  alertType: z.enum(['price', 'volume', 'manipulation']),
  targetPrice: z.number().positive().optional()
})

export const selectUserWatchlistSchema = createSelectSchema(userWatchlists)

export const insertUserTransactionSchema = createInsertSchema(userTransactions, {
  transactionType: z.enum(['buy', 'sell']),
  quantity: z.number().positive(),
  price: z.number().positive(),
  profit: z.number().optional()
})

export const selectUserTransactionSchema = createSelectSchema(userTransactions)

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type UserWatchlist = typeof userWatchlists.$inferSelect;
export type NewUserWatchlist = typeof userWatchlists.$inferInsert;
export type UserTransaction = typeof userTransactions.$inferSelect;
export type NewUserTransaction = typeof userTransactions.$inferInsert;

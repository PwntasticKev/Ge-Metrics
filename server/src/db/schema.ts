import { pgTable, text, timestamp, uuid, index, boolean, integer, jsonb } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash'),
  salt: text('salt'),
  googleId: text('google_id'),
  name: text('name'),
  avatar: text('avatar'),
  emailVerified: boolean('email_verified').default(false).notNull(),
  emailVerificationToken: text('email_verification_token'),
  emailVerificationTokenExpiresAt: timestamp('email_verification_token_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  usernameIdx: index('username_idx').on(table.username),
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
  plan: text('plan').notNull().default('free'), // free, premium, pro
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
  email: (schema) => schema.email().min(1),
  username: (schema) => schema.min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  name: (schema) => schema.min(1).max(100)
})

export const selectUserSchema = createSelectSchema(users)

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens)
export const selectRefreshTokenSchema = createSelectSchema(refreshTokens)

export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
  status: (schema) => schema,
  plan: (schema) => schema
})

export const selectSubscriptionSchema = createSelectSchema(subscriptions)

export const insertUserWatchlistSchema = createInsertSchema(userWatchlists, {
  alertType: (schema) => schema,
  targetPrice: (schema) => schema.positive().optional()
})

export const selectUserWatchlistSchema = createSelectSchema(userWatchlists)

export const insertUserTransactionSchema = createInsertSchema(userTransactions, {
  transactionType: (schema) => schema,
  quantity: (schema) => schema.positive(),
  price: (schema) => schema.positive(),
  profit: (schema) => schema.optional()
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

// --- NEW TABLES FOR FULL DATA PERSISTENCE ---

// Favorites (per user, for items and combinations)
export const favorites = pgTable('favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  favoriteType: text('favorite_type').notNull(), // 'item' or 'combination'
  favoriteId: text('favorite_id').notNull(), // itemId or combinationId
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userFavoriteIdx: index('favorites_user_id_idx').on(table.userId),
  favoriteTypeIdx: index('favorites_type_idx').on(table.favoriteType),
  uniqueFavorite: index('favorites_unique_idx').on(table.userId, table.favoriteType, table.favoriteId)
}))

// Item Mapping (item definitions)
export const itemMapping = pgTable('item_mapping', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  examine: text('examine'),
  members: boolean('members').default(false),
  lowalch: integer('lowalch'),
  highalch: integer('highalch'),
  limit: integer('limit'),
  value: integer('value'),
  icon: text('icon'),
  wikiUrl: text('wiki_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Item Price History (5m, 1h, 24h, etc.)
export const itemPriceHistory = pgTable('item_price_history', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  itemId: integer('item_id').notNull().references(() => itemMapping.id),
  timestamp: timestamp('timestamp').notNull(),
  highPrice: integer('high_price'),
  lowPrice: integer('low_price'),
  volume: integer('volume'),
  timeframe: text('timeframe').notNull(), // '5m', '1h', '24h', etc.
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  itemTimeIdx: index('item_price_history_item_time_idx').on(table.itemId, table.timestamp)
}))

// Game Updates (patches, events, etc.)
export const gameUpdates = pgTable('game_updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  updateDate: timestamp('update_date').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'major', 'event', 'minor', etc.
  color: text('color'),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

// User Profits/Stats
export const userProfits = pgTable('user_profits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  totalProfit: integer('total_profit').default(0).notNull(),
  weeklyProfit: integer('weekly_profit').default(0).notNull(),
  monthlyProfit: integer('monthly_profit').default(0).notNull(),
  totalTrades: integer('total_trades').default(0).notNull(),
  bestSingleFlip: integer('best_single_flip').default(0).notNull(),
  currentRank: integer('current_rank'),
  lastRankUpdate: timestamp('last_rank_update').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('user_profits_user_id_idx').on(table.userId)
}))

// User Achievements
export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementId: text('achievement_id').notNull(),
  achievementName: text('achievement_name').notNull(),
  description: text('description'),
  icon: text('icon'),
  unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('user_achievements_user_id_idx').on(table.userId),
  achievementIdx: index('user_achievements_achievement_idx').on(table.achievementId)
}))

// User Goals
export const userGoals = pgTable('user_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  goalType: text('goal_type').notNull(), // 'profit', 'trades', 'items'
  targetValue: integer('target_value').notNull(),
  currentValue: integer('current_value').default(0).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  isCompleted: boolean('is_completed').default(false),
  deadline: timestamp('deadline'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('user_goals_user_id_idx').on(table.userId),
  goalTypeIdx: index('user_goals_type_idx').on(table.goalType)
}))

// Clans
export const clans = pgTable('clans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  ownerIdx: index('clans_owner_idx').on(table.ownerId),
  nameIdx: index('clans_name_idx').on(table.name)
}))

// Clan Members
export const clanMembers = pgTable('clan_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  clanId: uuid('clan_id').notNull().references(() => clans.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // 'owner', 'officer', 'member'
  joinedAt: timestamp('joined_at').defaultNow().notNull()
}, (table) => ({
  clanUserIdx: index('clan_members_clan_user_idx').on(table.clanId, table.userId),
  roleIdx: index('clan_members_role_idx').on(table.role)
}))

// Clan Invites
export const clanInvites = pgTable('clan_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  clanId: uuid('clan_id').notNull().references(() => clans.id, { onDelete: 'cascade' }),
  inviterId: uuid('inviter_id').notNull().references(() => users.id),
  invitedEmail: text('invited_email').notNull(),
  invitedUserId: uuid('invited_user_id').references(() => users.id),
  status: text('status').notNull().default('pending'), // 'pending', 'accepted', 'declined'
  message: text('message'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  clanIdx: index('clan_invites_clan_idx').on(table.clanId),
  inviterIdx: index('clan_invites_inviter_idx').on(table.inviterId),
  invitedEmailIdx: index('clan_invites_email_idx').on(table.invitedEmail)
}))

// Employees (for admin management)
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('support'), // 'admin', 'support', 'moderator'
  department: text('department'),
  isActive: boolean('is_active').default(true),
  permissions: jsonb('permissions'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('employees_user_id_idx').on(table.userId),
  roleIdx: index('employees_role_idx').on(table.role),
  departmentIdx: index('employees_department_idx').on(table.department)
}))

// Audit Log
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  details: jsonb('details'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('audit_log_user_id_idx').on(table.userId),
  actionIdx: index('audit_log_action_idx').on(table.action),
  createdAtIdx: index('audit_log_created_at_idx').on(table.createdAt)
}))

// Additional type exports
export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
export type ItemMapping = typeof itemMapping.$inferSelect;
export type NewItemMapping = typeof itemMapping.$inferInsert;
export type ItemPriceHistory = typeof itemPriceHistory.$inferSelect;
export type NewItemPriceHistory = typeof itemPriceHistory.$inferInsert;
export type GameUpdate = typeof gameUpdates.$inferSelect;
export type NewGameUpdate = typeof gameUpdates.$inferInsert;
export type UserProfit = typeof userProfits.$inferSelect;
export type NewUserProfit = typeof userProfits.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;
export type UserGoal = typeof userGoals.$inferSelect;
export type NewUserGoal = typeof userGoals.$inferInsert;
export type Clan = typeof clans.$inferSelect;
export type NewClan = typeof clans.$inferInsert;
export type ClanMember = typeof clanMembers.$inferSelect;
export type NewClanMember = typeof clanMembers.$inferInsert;
export type ClanInvite = typeof clanInvites.$inferSelect;
export type NewClanInvite = typeof clanInvites.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;

export const otps = pgTable('otps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  otpCode: text('otp_code').notNull(),
  type: text('type').notNull(), // e.g., 'password_reset', 'email_verification', etc.
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('otps_user_id_idx').on(table.userId),
  typeIdx: index('otps_type_idx').on(table.type)
}))

export const insertOtpSchema = createInsertSchema(otps)
export const selectOtpSchema = createSelectSchema(otps)

export type Otp = typeof otps.$inferSelect;
export type NewOtp = typeof otps.$inferInsert;

// Item Volumes Cache (for 5-minute refresh cycle)
export const itemVolumes = pgTable('item_volumes', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  itemId: integer('item_id').notNull().unique(),
  highPriceVolume: integer('high_price_volume').notNull().default(0),
  lowPriceVolume: integer('low_price_volume').notNull().default(0),
  hourlyHighPriceVolume: integer('hourly_high_price_volume').default(0),
  hourlyLowPriceVolume: integer('hourly_low_price_volume').default(0),
  lastUpdatedAt: timestamp('last_updated_at').defaultNow().notNull()
}, (table) => ({
  itemIdIdx: index('item_volumes_item_id_idx').on(table.itemId)
}))

export type NewItemVolume = typeof itemVolumes.$inferInsert;

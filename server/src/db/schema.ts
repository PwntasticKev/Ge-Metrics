import { pgTable, text, timestamp, uuid, index, boolean, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
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
  passwordResetOtp: text('password_reset_otp'),
  passwordResetOtpExpiresAt: timestamp('password_reset_otp_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  usernameIdx: index('username_idx').on(table.username),
  googleIdIdx: index('google_id_idx').on(table.googleId)
}))

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
  tokenIdx: index('refresh_tokens_token_idx').on(table.token)
}))

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripePriceId: text('stripe_price_id'),
  status: text('status').notNull().default('inactive'), // active, inactive, canceled, past_due, trialing
  plan: text('plan').notNull().default('free'), // free, premium, pro
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  // Trial fields
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  trialDays: integer('trial_days').default(14),
  isTrialing: boolean('is_trialing').default(false),
  trialExtendedBy: integer('trial_extended_by'), // Track admin extensions
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
  stripeCustomerIdx: index('subscriptions_stripe_customer_idx').on(table.stripeCustomerId),
  stripeSubscriptionIdx: index('subscriptions_stripe_subscription_idx').on(table.stripeSubscriptionId),
  trialEndIdx: index('subscriptions_trial_end_idx').on(table.trialEnd)
}))

export const userWatchlists = pgTable('user_watchlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: integer('item_id').notNull(),
  itemType: text('item_type').notNull(), // e.g., 'item', 'combination', 'sapling'
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userFavoriteIdx: index('favorites_user_id_idx').on(table.userId),
  uniqueFavorite: uniqueIndex('favorites_unique_idx').on(table.userId, table.itemId, table.itemType)
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
  high: integer('high'),
  low: integer('low'),
  volume: integer('volume'),
  data: jsonb('data'),
  timeframe: text('timeframe'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  cacheKey: text('cache_key').unique()
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
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  ownerId: integer('owner_id').notNull().references(() => users.id),
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
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  inviterId: integer('inviter_id').notNull().references(() => users.id),
  invitedEmail: text('invited_email').notNull(),
  invitedUserId: integer('invited_user_id').references(() => users.id),
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

// Employees table removed - using user_settings.role instead

// Audit Log
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').references(() => users.id),
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
// Employee types removed - using UserSettings.role instead
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;

export const otps = pgTable('otps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  highPrice: integer('high_price'),
  lowPrice: integer('low_price'),
  highPriceVolume: integer('high_price_volume').notNull().default(0),
  lowPriceVolume: integer('low_price_volume').notNull().default(0),
  hourlyHighPriceVolume: integer('hourly_high_price_volume').default(0),
  hourlyLowPriceVolume: integer('hourly_low_price_volume').default(0),
  lastUpdatedAt: timestamp('last_updated_at').defaultNow().notNull()
})

export type NewItemVolume = typeof itemVolumes.$inferInsert;

export const userSettings = pgTable('user_settings', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  mailchimpApiKey: text('mailchimp_api_key'),
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  volumeAlerts: boolean('volume_alerts').default(true).notNull(),
  priceDropAlerts: boolean('price_drop_alerts').default(true).notNull(),
  cooldownPeriod: integer('cooldown_period').default(5), // in minutes
  otpEnabled: boolean('otp_enabled').default(false).notNull(),
  otpSecret: text('otp_secret'),
  otpVerified: boolean('otp_verified').default(false).notNull(),
  role: text('role').notNull().default('user'), // 'user', 'admin', 'moderator'
  permissions: jsonb('permissions'), // Store additional permissions as JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

// --- COMPREHENSIVE ADMIN TRACKING TABLES ---

// API Usage Logs - Track all API calls for detailed analytics
export const apiUsageLogs = pgTable('api_usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').references(() => users.id),
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(), // GET, POST, PUT, DELETE
  statusCode: integer('status_code').notNull(),
  responseTime: integer('response_time'), // milliseconds
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  requestSize: integer('request_size'), // bytes
  responseSize: integer('response_size'), // bytes
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('api_usage_logs_user_id_idx').on(table.userId),
  endpointIdx: index('api_usage_logs_endpoint_idx').on(table.endpoint),
  createdAtIdx: index('api_usage_logs_created_at_idx').on(table.createdAt),
  statusCodeIdx: index('api_usage_logs_status_code_idx').on(table.statusCode)
}))

// Admin Actions Log - Track all admin actions for security audit
export const adminActions = pgTable('admin_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminUserId: integer('admin_user_id').notNull().references(() => users.id),
  actionType: text('action_type').notNull(), // 'refund', 'ban_user', 'extend_trial', etc.
  targetUserId: integer('target_user_id').references(() => users.id),
  targetResource: text('target_resource'), // 'subscription', 'user', 'billing', etc.
  targetResourceId: text('target_resource_id'),
  actionDetails: jsonb('action_details'), // Store specific details as JSON
  previousState: jsonb('previous_state'), // Store previous state for rollback
  newState: jsonb('new_state'), // Store new state
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  success: boolean('success').default(true).notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  adminUserIdx: index('admin_actions_admin_user_idx').on(table.adminUserId),
  targetUserIdx: index('admin_actions_target_user_idx').on(table.targetUserId),
  actionTypeIdx: index('admin_actions_action_type_idx').on(table.actionType),
  createdAtIdx: index('admin_actions_created_at_idx').on(table.createdAt)
}))

// Security Events - Track security-related events
export const securityEvents = pgTable('security_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').references(() => users.id),
  eventType: text('event_type').notNull(), // 'failed_login', 'suspicious_activity', 'rate_limit_hit', etc.
  severity: text('severity').notNull().default('low'), // 'low', 'medium', 'high', 'critical'
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  details: jsonb('details'),
  resolved: boolean('resolved').default(false),
  resolvedBy: integer('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('security_events_user_id_idx').on(table.userId),
  eventTypeIdx: index('security_events_event_type_idx').on(table.eventType),
  severityIdx: index('security_events_severity_idx').on(table.severity),
  createdAtIdx: index('security_events_created_at_idx').on(table.createdAt)
}))

// System Metrics - Track system performance and health
export const systemMetrics = pgTable('system_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricType: text('metric_type').notNull(), // 'api_response_time', 'database_connections', 'memory_usage', etc.
  value: integer('value').notNull(),
  unit: text('unit'), // 'ms', 'bytes', 'count', etc.
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  metricTypeIdx: index('system_metrics_metric_type_idx').on(table.metricType),
  createdAtIdx: index('system_metrics_created_at_idx').on(table.createdAt)
}))

// Cron Job Logs - Track scheduled task execution
export const cronJobLogs = pgTable('cron_job_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobName: text('job_name').notNull(),
  jobType: text('job_type').notNull(), // 'data_scraping', 'email_notifications', 'cleanup', etc.
  status: text('status').notNull(), // 'running', 'completed', 'failed', 'cancelled'
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // milliseconds
  recordsProcessed: integer('records_processed'),
  errorsCount: integer('errors_count').default(0),
  errorMessage: text('error_message'),
  logs: text('logs'), // Store execution logs
  metadata: jsonb('metadata')
}, (table) => ({
  jobNameIdx: index('cron_job_logs_job_name_idx').on(table.jobName),
  statusIdx: index('cron_job_logs_status_idx').on(table.status),
  startedAtIdx: index('cron_job_logs_started_at_idx').on(table.startedAt)
}))

// Stripe Events Log - Track all Stripe webhook events
export const stripeEvents = pgTable('stripe_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  eventType: text('event_type').notNull(), // 'payment_intent.succeeded', 'subscription.updated', etc.
  userId: integer('user_id').references(() => users.id),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  amount: integer('amount'), // in cents
  currency: text('currency'),
  status: text('status').notNull(), // 'processed', 'failed', 'duplicate'
  processedAt: timestamp('processed_at'),
  errorMessage: text('error_message'),
  rawData: jsonb('raw_data'), // Store full Stripe event data
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  stripeEventIdIdx: index('stripe_events_stripe_event_id_idx').on(table.stripeEventId),
  eventTypeIdx: index('stripe_events_event_type_idx').on(table.eventType),
  userIdIdx: index('stripe_events_user_id_idx').on(table.userId),
  createdAtIdx: index('stripe_events_created_at_idx').on(table.createdAt)
}))

// Revenue Analytics - Aggregated revenue data for quick dashboard access
export const revenueAnalytics = pgTable('revenue_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date').notNull(),
  periodType: text('period_type').notNull(), // 'daily', 'weekly', 'monthly'
  totalRevenue: integer('total_revenue').default(0), // in cents
  newSubscriptions: integer('new_subscriptions').default(0),
  canceledSubscriptions: integer('canceled_subscriptions').default(0),
  trialConversions: integer('trial_conversions').default(0),
  refundAmount: integer('refund_amount').default(0),
  churnRate: integer('churn_rate').default(0), // percentage * 100
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  dateIdx: index('revenue_analytics_date_idx').on(table.date),
  periodTypeIdx: index('revenue_analytics_period_type_idx').on(table.periodType)
}))

// User Invitations - For admin invitation system
export const userInvitations = pgTable('user_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  invitedBy: integer('invited_by').notNull().references(() => users.id),
  invitationToken: text('invitation_token').notNull().unique(),
  trialDays: integer('trial_days').notNull().default(14),
  role: text('role').notNull().default('user'), // user, admin, moderator
  status: text('status').notNull().default('pending'), // pending, accepted, expired
  emailSent: boolean('email_sent').default(false),
  emailSentAt: timestamp('email_sent_at'),
  acceptedAt: timestamp('accepted_at'),
  expiresAt: timestamp('expires_at').notNull(),
  metadata: jsonb('metadata'), // Store additional invitation data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  emailIdx: index('user_invitations_email_idx').on(table.email),
  tokenIdx: index('user_invitations_token_idx').on(table.invitationToken),
  statusIdx: index('user_invitations_status_idx').on(table.status),
  expiresAtIdx: index('user_invitations_expires_at_idx').on(table.expiresAt)
}))

// User Sessions - Enhanced session tracking
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').notNull().unique(),
  refreshToken: text('refresh_token').unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  deviceInfo: jsonb('device_info'), // parsed device/browser info
  location: jsonb('location'), // city, country, timezone
  isActive: boolean('is_active').default(true),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  loginMethod: text('login_method'), // 'email', 'google', 'otp'
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('user_sessions_user_id_idx').on(table.userId),
  sessionTokenIdx: index('user_sessions_session_token_idx').on(table.sessionToken),
  isActiveIdx: index('user_sessions_is_active_idx').on(table.isActive),
  lastActivityIdx: index('user_sessions_last_activity_idx').on(table.lastActivity)
}))

// Type exports for new admin tables
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;
export type NewApiUsageLog = typeof apiUsageLogs.$inferInsert;
export type AdminAction = typeof adminActions.$inferSelect;
export type NewAdminAction = typeof adminActions.$inferInsert;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type NewSecurityEvent = typeof securityEvents.$inferInsert;
export type SystemMetric = typeof systemMetrics.$inferSelect;
export type NewSystemMetric = typeof systemMetrics.$inferInsert;
export type CronJobLog = typeof cronJobLogs.$inferSelect;
export type NewCronJobLog = typeof cronJobLogs.$inferInsert;
export type StripeEvent = typeof stripeEvents.$inferSelect;
export type NewStripeEvent = typeof stripeEvents.$inferInsert;
export type RevenueAnalytic = typeof revenueAnalytics.$inferSelect;
export type NewRevenueAnalytic = typeof revenueAnalytics.$inferInsert;
export type UserInvitation = typeof userInvitations.$inferSelect;
export type NewUserInvitation = typeof userInvitations.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

// Formula Documentation - For managing calculation formulas
export const formulas = pgTable('formulas', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'trading', 'skilling', 'investment', 'combat', 'general'
  description: text('description').notNull(),
  formula: text('formula').notNull(), // Mathematical formula as string
  parameters: jsonb('parameters'), // Array of parameter definitions
  examples: jsonb('examples'), // Array of examples with inputs/outputs
  notes: text('notes'),
  tags: jsonb('tags'), // Array of tags for searching
  complexity: text('complexity').notNull().default('beginner'), // 'beginner', 'intermediate', 'advanced'
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  categoryIdx: index('formulas_category_idx').on(table.category),
  complexityIdx: index('formulas_complexity_idx').on(table.complexity),
  isActiveIdx: index('formulas_is_active_idx').on(table.isActive),
  createdByIdx: index('formulas_created_by_idx').on(table.createdBy)
}))

// Cron Jobs - For managing scheduled tasks
export const cronJobs = pgTable('cron_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  schedule: text('schedule').notNull(), // Cron expression
  scheduleDescription: text('schedule_description'), // Human readable schedule
  command: text('command').notNull(),
  category: text('category').notNull(), // 'data-sync', 'reporting', 'maintenance', 'backup', 'notifications'
  enabled: boolean('enabled').default(true),
  timeout: integer('timeout').default(300), // seconds
  retries: integer('retries').default(3),
  notifications: boolean('notifications').default(true),
  lastRun: timestamp('last_run'),
  nextRun: timestamp('next_run'),
  status: text('status').default('idle'), // 'idle', 'running', 'success', 'failed'
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  categoryIdx: index('cron_jobs_category_idx').on(table.category),
  enabledIdx: index('cron_jobs_enabled_idx').on(table.enabled),
  statusIdx: index('cron_jobs_status_idx').on(table.status),
  nextRunIdx: index('cron_jobs_next_run_idx').on(table.nextRun),
  createdByIdx: index('cron_jobs_created_by_idx').on(table.createdBy)
}))

// System Settings - For application configuration
export const systemSettings = pgTable('system_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  section: text('section').notNull(), // 'general', 'database', 'security', 'api', 'notifications'
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  description: text('description'),
  dataType: text('data_type').notNull(), // 'string', 'number', 'boolean', 'json'
  isSecret: boolean('is_secret').default(false), // For sensitive values
  updatedBy: integer('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  sectionKeyIdx: index('system_settings_section_key_idx').on(table.section, table.key),
  sectionIdx: index('system_settings_section_idx').on(table.section),
  isSecretIdx: index('system_settings_is_secret_idx').on(table.isSecret)
}))

// Developer Blogs - For tracking game updates and developer blogs
export const blogs = pgTable('blogs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  date: timestamp('date').notNull(),
  url: text('url').notNull(),
  category: text('category'), // 'Game updates', 'Rewards', 'Polls', 'Community updates', etc.
  content: text('content'), // Full content or summary
  year: integer('year'), // Year extracted from date for easier filtering
  month: integer('month'), // Month extracted from date
  day: integer('day'), // Day extracted from date
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  dateIdx: index('blogs_date_idx').on(table.date),
  yearIdx: index('blogs_year_idx').on(table.year),
  categoryIdx: index('blogs_category_idx').on(table.category),
  urlIdx: index('blogs_url_idx').on(table.url),
  dateUrlIdx: uniqueIndex('blogs_date_url_idx').on(table.date, table.url) // Prevent duplicates
}))

// Type exports for blogs table
export type Blog = typeof blogs.$inferSelect;
export type NewBlog = typeof blogs.$inferInsert;

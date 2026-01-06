import { pgTable, index, foreignKey, unique, uuid, text, integer, timestamp, boolean, jsonb, uniqueIndex, serial } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const clans = pgTable("clans", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	ownerId: integer("owner_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("clans_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("clans_owner_idx").using("btree", table.ownerId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "clans_owner_id_users_id_fk"
		}),
	unique("clans_name_unique").on(table.name),
]);

export const clanMembers = pgTable("clan_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clanId: uuid("clan_id").notNull(),
	userId: integer("user_id").notNull(),
	role: text().default('member').notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("clan_members_clan_user_idx").using("btree", table.clanId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops")),
	index("clan_members_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clanId],
			foreignColumns: [clans.id],
			name: "clan_members_clan_id_clans_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "clan_members_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const itemMapping = pgTable("item_mapping", {
	id: integer().primaryKey().notNull(),
	name: text().notNull(),
	examine: text(),
	members: boolean().default(false),
	lowalch: integer(),
	highalch: integer(),
	limit: integer(),
	value: integer(),
	icon: text(),
	wikiUrl: text("wiki_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const itemPriceHistory = pgTable("item_price_history", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "item_price_history_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	itemId: integer("item_id").notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	high: integer(),
	low: integer(),
	volume: integer(),
	data: jsonb(),
	timeframe: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	cacheKey: text("cache_key"),
}, (table) => [
	index("item_price_history_item_time_idx").using("btree", table.itemId.asc().nullsLast().op("int4_ops"), table.timestamp.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [itemMapping.id],
			name: "item_price_history_item_id_item_mapping_id_fk"
		}),
	unique("item_price_history_cache_key_unique").on(table.cacheKey),
]);

export const favorites = pgTable("favorites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	itemId: integer("item_id").notNull(),
	itemType: text("item_type").notNull(),
}, (table) => [
	uniqueIndex("favorites_unique_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.itemId.asc().nullsLast().op("text_ops"), table.itemType.asc().nullsLast().op("text_ops")),
	index("favorites_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "favorites_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const itemVolumes = pgTable("item_volumes", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "item_volumes_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	itemId: integer("item_id").notNull(),
	highPriceVolume: integer("high_price_volume").default(0).notNull(),
	lowPriceVolume: integer("low_price_volume").default(0).notNull(),
	hourlyHighPriceVolume: integer("hourly_high_price_volume").default(0),
	hourlyLowPriceVolume: integer("hourly_low_price_volume").default(0),
	lastUpdatedAt: timestamp("last_updated_at", { mode: 'string' }).defaultNow().notNull(),
	highPrice: integer("high_price"),
	lowPrice: integer("low_price"),
}, (table) => [
	unique("item_volumes_item_id_unique").on(table.itemId),
]);

export const gameUpdates = pgTable("game_updates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	updateDate: timestamp("update_date", { mode: 'string' }).notNull(),
	title: text().notNull(),
	description: text(),
	type: text().notNull(),
	color: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	url: text(),
	content: text(),
	category: text(),
	year: integer(),
	month: integer(),
	day: integer(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("refresh_tokens_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("refresh_tokens_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "refresh_tokens_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("refresh_tokens_user_id_unique").on(table.userId),
	unique("refresh_tokens_token_unique").on(table.token),
]);

export const otps = pgTable("otps", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	otpCode: text("otp_code").notNull(),
	type: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	used: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("otps_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	index("otps_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "otps_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userAchievements = pgTable("user_achievements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	achievementId: text("achievement_id").notNull(),
	achievementName: text("achievement_name").notNull(),
	description: text(),
	icon: text(),
	unlockedAt: timestamp("unlocked_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_achievements_achievement_idx").using("btree", table.achievementId.asc().nullsLast().op("text_ops")),
	index("user_achievements_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_achievements_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const auditLog = pgTable("audit_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id"),
	action: text().notNull(),
	resource: text().notNull(),
	resourceId: text("resource_id"),
	details: jsonb(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("audit_log_action_idx").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("audit_log_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("audit_log_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_log_user_id_users_id_fk"
		}),
]);

export const clanInvites = pgTable("clan_invites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clanId: uuid("clan_id").notNull(),
	inviterId: integer("inviter_id").notNull(),
	invitedEmail: text("invited_email").notNull(),
	invitedUserId: integer("invited_user_id"),
	status: text().default('pending').notNull(),
	message: text(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("clan_invites_clan_idx").using("btree", table.clanId.asc().nullsLast().op("uuid_ops")),
	index("clan_invites_email_idx").using("btree", table.invitedEmail.asc().nullsLast().op("text_ops")),
	index("clan_invites_inviter_idx").using("btree", table.inviterId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.clanId],
			foreignColumns: [clans.id],
			name: "clan_invites_clan_id_clans_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.inviterId],
			foreignColumns: [users.id],
			name: "clan_invites_inviter_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.invitedUserId],
			foreignColumns: [users.id],
			name: "clan_invites_invited_user_id_users_id_fk"
		}),
]);

export const userGoals = pgTable("user_goals", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	goalType: text("goal_type").notNull(),
	targetValue: integer("target_value").notNull(),
	currentValue: integer("current_value").default(0).notNull(),
	title: text().notNull(),
	description: text(),
	isCompleted: boolean("is_completed").default(false),
	deadline: timestamp({ mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_goals_type_idx").using("btree", table.goalType.asc().nullsLast().op("text_ops")),
	index("user_goals_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_goals_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userProfits = pgTable("user_profits", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	totalProfit: integer("total_profit").default(0).notNull(),
	weeklyProfit: integer("weekly_profit").default(0).notNull(),
	monthlyProfit: integer("monthly_profit").default(0).notNull(),
	totalTrades: integer("total_trades").default(0).notNull(),
	bestSingleFlip: integer("best_single_flip").default(0).notNull(),
	currentRank: integer("current_rank"),
	lastRankUpdate: timestamp("last_rank_update", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_profits_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_profits_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userTransactions = pgTable("user_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	itemId: text("item_id").notNull(),
	itemName: text("item_name").notNull(),
	transactionType: text("transaction_type").notNull(),
	quantity: integer().notNull(),
	price: integer().notNull(),
	profit: integer(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_transactions_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("user_transactions_item_id_idx").using("btree", table.itemId.asc().nullsLast().op("text_ops")),
	index("user_transactions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_transactions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userWatchlists = pgTable("user_watchlists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	itemId: text("item_id").notNull(),
	itemName: text("item_name").notNull(),
	targetPrice: integer("target_price"),
	alertType: text("alert_type").default('price').notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_watchlists_item_id_idx").using("btree", table.itemId.asc().nullsLast().op("text_ops")),
	index("user_watchlists_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_watchlists_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const apiUsageLogs = pgTable("api_usage_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id"),
	endpoint: text().notNull(),
	method: text().notNull(),
	statusCode: integer("status_code").notNull(),
	responseTime: integer("response_time"),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	requestSize: integer("request_size"),
	responseSize: integer("response_size"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("api_usage_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("api_usage_logs_endpoint_idx").using("btree", table.endpoint.asc().nullsLast().op("text_ops")),
	index("api_usage_logs_status_code_idx").using("btree", table.statusCode.asc().nullsLast().op("int4_ops")),
	index("api_usage_logs_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "api_usage_logs_user_id_fkey"
		}),
]);

export const adminActions = pgTable("admin_actions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	adminUserId: integer("admin_user_id").notNull(),
	actionType: text("action_type").notNull(),
	targetUserId: integer("target_user_id"),
	targetResource: text("target_resource"),
	targetResourceId: text("target_resource_id"),
	actionDetails: jsonb("action_details"),
	previousState: jsonb("previous_state"),
	newState: jsonb("new_state"),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	success: boolean().default(true).notNull(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("admin_actions_action_type_idx").using("btree", table.actionType.asc().nullsLast().op("text_ops")),
	index("admin_actions_admin_user_idx").using("btree", table.adminUserId.asc().nullsLast().op("int4_ops")),
	index("admin_actions_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("admin_actions_target_user_idx").using("btree", table.targetUserId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.adminUserId],
			foreignColumns: [users.id],
			name: "admin_actions_admin_user_id_fkey"
		}),
	foreignKey({
			columns: [table.targetUserId],
			foreignColumns: [users.id],
			name: "admin_actions_target_user_id_fkey"
		}),
]);

export const securityEvents = pgTable("security_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id"),
	eventType: text("event_type").notNull(),
	severity: text().default('low').notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	details: jsonb(),
	resolved: boolean().default(false),
	resolvedBy: integer("resolved_by"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("security_events_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("security_events_event_type_idx").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	index("security_events_severity_idx").using("btree", table.severity.asc().nullsLast().op("text_ops")),
	index("security_events_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "security_events_user_id_fkey"
		}),
	foreignKey({
			columns: [table.resolvedBy],
			foreignColumns: [users.id],
			name: "security_events_resolved_by_fkey"
		}),
]);

export const revenueAnalytics = pgTable("revenue_analytics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	periodType: text("period_type").notNull(),
	totalRevenue: integer("total_revenue").default(0),
	newSubscriptions: integer("new_subscriptions").default(0),
	canceledSubscriptions: integer("canceled_subscriptions").default(0),
	trialConversions: integer("trial_conversions").default(0),
	refundAmount: integer("refund_amount").default(0),
	churnRate: integer("churn_rate").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("revenue_analytics_date_idx").using("btree", table.date.asc().nullsLast().op("timestamp_ops")),
	index("revenue_analytics_period_type_idx").using("btree", table.periodType.asc().nullsLast().op("text_ops")),
]);

export const systemMetrics = pgTable("system_metrics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	metricType: text("metric_type").notNull(),
	value: integer().notNull(),
	unit: text(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("system_metrics_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("system_metrics_metric_type_idx").using("btree", table.metricType.asc().nullsLast().op("text_ops")),
]);

export const cronJobLogs = pgTable("cron_job_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobName: text("job_name").notNull(),
	jobType: text("job_type").notNull(),
	status: text().notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	duration: integer(),
	recordsProcessed: integer("records_processed"),
	errorsCount: integer("errors_count").default(0),
	errorMessage: text("error_message"),
	logs: text(),
	metadata: jsonb(),
}, (table) => [
	index("cron_job_logs_job_name_idx").using("btree", table.jobName.asc().nullsLast().op("text_ops")),
	index("cron_job_logs_started_at_idx").using("btree", table.startedAt.asc().nullsLast().op("timestamp_ops")),
	index("cron_job_logs_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const stripeEvents = pgTable("stripe_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	stripeEventId: text("stripe_event_id").notNull(),
	eventType: text("event_type").notNull(),
	userId: integer("user_id"),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	amount: integer(),
	currency: text(),
	status: text().notNull(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	errorMessage: text("error_message"),
	rawData: jsonb("raw_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("stripe_events_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("stripe_events_event_type_idx").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	index("stripe_events_stripe_event_id_idx").using("btree", table.stripeEventId.asc().nullsLast().op("text_ops")),
	index("stripe_events_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "stripe_events_user_id_fkey"
		}),
	unique("stripe_events_stripe_event_id_key").on(table.stripeEventId),
]);

export const subscriptions = pgTable("subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	stripePriceId: text("stripe_price_id"),
	status: text().default('inactive').notNull(),
	plan: text().default('free').notNull(),
	currentPeriodStart: timestamp("current_period_start", { mode: 'string' }),
	currentPeriodEnd: timestamp("current_period_end", { mode: 'string' }),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	trialStart: timestamp("trial_start", { mode: 'string' }),
	trialEnd: timestamp("trial_end", { mode: 'string' }),
	trialDays: integer("trial_days").default(14),
	isTrialing: boolean("is_trialing").default(false),
	trialExtendedBy: integer("trial_extended_by"),
}, (table) => [
	index("subscriptions_stripe_customer_idx").using("btree", table.stripeCustomerId.asc().nullsLast().op("text_ops")),
	index("subscriptions_stripe_subscription_idx").using("btree", table.stripeSubscriptionId.asc().nullsLast().op("text_ops")),
	index("subscriptions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "subscriptions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userSettings = pgTable("user_settings", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	mailchimpApiKey: text("mailchimp_api_key"),
	emailNotifications: boolean("email_notifications").default(true).notNull(),
	volumeAlerts: boolean("volume_alerts").default(true).notNull(),
	priceDropAlerts: boolean("price_drop_alerts").default(true).notNull(),
	cooldownPeriod: integer("cooldown_period").default(5),
	otpEnabled: boolean("otp_enabled").default(false).notNull(),
	otpSecret: text("otp_secret"),
	otpVerified: boolean("otp_verified").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	role: text().default('user').notNull(),
	permissions: jsonb(),
	backupCodes: jsonb("backup_codes"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_settings_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_settings_user_id_key").on(table.userId),
]);

export const userInvitations = pgTable("user_invitations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	invitedBy: integer("invited_by").notNull(),
	invitationToken: text("invitation_token").notNull(),
	trialDays: integer("trial_days").default(14).notNull(),
	role: text().default('user').notNull(),
	status: text().default('pending').notNull(),
	emailSent: boolean("email_sent").default(false),
	emailSentAt: timestamp("email_sent_at", { mode: 'string' }),
	acceptedAt: timestamp("accepted_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [users.id],
			name: "user_invitations_invited_by_fkey"
		}),
	unique("user_invitations_invitation_token_key").on(table.invitationToken),
]);

export const userSessions = pgTable("user_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	sessionToken: text("session_token").notNull(),
	refreshToken: text("refresh_token"),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	deviceInfo: jsonb("device_info"),
	location: jsonb(),
	isActive: boolean("is_active").default(true),
	lastActivity: timestamp("last_activity", { mode: 'string' }).defaultNow().notNull(),
	loginMethod: text("login_method"),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_sessions_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_sessions_session_token_key").on(table.sessionToken),
	unique("user_sessions_refresh_token_key").on(table.refreshToken),
]);

export const users = pgTable("users", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "users_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	email: text().notNull(),
	username: text().notNull(),
	passwordHash: text("password_hash"),
	salt: text(),
	googleId: text("google_id"),
	name: text(),
	avatar: text(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	emailVerificationToken: text("email_verification_token"),
	emailVerificationTokenExpiresAt: timestamp("email_verification_token_expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	passwordResetOtp: text("password_reset_otp"),
	passwordResetOtpExpiresAt: timestamp("password_reset_otp_expires_at", { mode: 'string' }),
	emailChangeToken: text("email_change_token"),
	emailChangeTokenExpiresAt: timestamp("email_change_token_expires_at", { mode: 'string' }),
	pendingEmail: text("pending_email"),
}, (table) => [
	index("email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("google_id_idx").using("btree", table.googleId.asc().nullsLast().op("text_ops")),
	index("username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
	unique("users_email_unique").on(table.email),
	unique("users_username_unique").on(table.username),
]);

export const formulas = pgTable("formulas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	description: text().notNull(),
	formula: text().notNull(),
	parameters: jsonb(),
	examples: jsonb(),
	notes: text(),
	tags: jsonb(),
	complexity: text().default('beginner').notNull(),
	isActive: boolean("is_active").default(true),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "formulas_created_by_fkey"
		}),
]);

export const cronJobs = pgTable("cron_jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	schedule: text().notNull(),
	scheduleDescription: text("schedule_description"),
	command: text().notNull(),
	category: text().notNull(),
	enabled: boolean().default(true),
	timeout: integer().default(300),
	retries: integer().default(3),
	notifications: boolean().default(true),
	lastRun: timestamp("last_run", { mode: 'string' }),
	nextRun: timestamp("next_run", { mode: 'string' }),
	status: text().default('idle'),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "cron_jobs_created_by_fkey"
		}),
]);

export const systemSettings = pgTable("system_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	section: text().notNull(),
	key: text().notNull(),
	value: jsonb().notNull(),
	description: text(),
	dataType: text("data_type").notNull(),
	isSecret: boolean("is_secret").default(false),
	updatedBy: integer("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "system_settings_updated_by_fkey"
		}),
]);

export const blogs = pgTable("blogs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	url: text().notNull(),
	category: text(),
	content: text(),
	year: integer(),
	month: integer(),
	day: integer(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("blogs_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("blogs_date_idx").using("btree", table.date.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("blogs_date_url_idx").using("btree", table.date.asc().nullsLast().op("timestamp_ops"), table.url.asc().nullsLast().op("text_ops")),
	index("blogs_url_idx").using("btree", table.url.asc().nullsLast().op("text_ops")),
	index("blogs_year_idx").using("btree", table.year.asc().nullsLast().op("int4_ops")),
]);

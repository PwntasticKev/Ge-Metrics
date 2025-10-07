import { pgTable, index, uuid, integer, text, jsonb, inet, timestamp, boolean, unique, uniqueIndex, serial, bigint, varchar, char, time, doublePrecision } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const auditLog = pgTable("audit_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id"),
	action: text().notNull(),
	resource: text().notNull(),
	resourceId: text("resource_id"),
	details: jsonb(),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("audit_log_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("audit_log_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const securityEvents = pgTable("security_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventType: text("event_type").notNull(),
	severity: text().notNull(),
	description: text().notNull(),
	details: jsonb(),
	ipAddress: inet("ip_address"),
	userId: integer("user_id"),
	resolved: boolean().default(false),
	resolvedBy: integer("resolved_by"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolution: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("security_events_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("security_events_resolved_idx").using("btree", table.resolved.asc().nullsLast().op("bool_ops")),
]);

export const apiUsageLogs = pgTable("api_usage_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id"),
	endpoint: text().notNull(),
	method: text().notNull(),
	statusCode: integer("status_code").notNull(),
	responseTime: integer("response_time"),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("api_usage_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("api_usage_logs_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const userSessions = pgTable("user_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	sessionToken: text("session_token").notNull(),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	lastAccessed: timestamp("last_accessed", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("user_sessions_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	index("user_sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	unique("user_sessions_session_token_key").on(table.sessionToken),
]);

export const formulas = pgTable("formulas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	description: text().notNull(),
	formula: text().notNull(),
	parameters: jsonb(),
	examples: jsonb(),
	complexity: text().default('beginner'),
	tags: text().array(),
	isActive: boolean("is_active").default(true),
	createdBy: integer("created_by"),
	updatedBy: integer("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("formulas_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("formulas_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
]);

export const cronJobs = pgTable("cron_jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	schedule: text().notNull(),
	command: text().notNull(),
	category: text().default('general'),
	enabled: boolean().default(true),
	status: text().default('idle'),
	timeout: integer().default(300),
	retries: integer().default(3),
	notifications: boolean().default(true),
	lastRun: timestamp("last_run", { mode: 'string' }),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("cron_jobs_enabled_idx").using("btree", table.enabled.asc().nullsLast().op("bool_ops")),
	index("cron_jobs_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("cron_jobs_name_key").on(table.name),
]);

export const cronJobLogs = pgTable("cron_job_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobName: text("job_name").notNull(),
	jobType: text("job_type"),
	status: text().notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	duration: integer(),
	logs: text(),
	errorMessage: text("error_message"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("cron_job_logs_job_name_idx").using("btree", table.jobName.asc().nullsLast().op("text_ops")),
	index("cron_job_logs_started_at_idx").using("btree", table.startedAt.asc().nullsLast().op("timestamp_ops")),
]);

export const userInvitations = pgTable("user_invitations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	role: text().default('user'),
	invitedBy: integer("invited_by").notNull(),
	status: text().default('pending'),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	acceptedAt: timestamp("accepted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("user_invitations_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("user_invitations_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("user_invitations_token_key").on(table.token),
]);

export const itemPriceHistory = pgTable("item_price_history", {
	id: serial().primaryKey().notNull(),
	itemId: integer("item_id").notNull(),
	timestamp: timestamp({ precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	highPrice: integer("high_price"),
	lowPrice: integer("low_price"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	volume: bigint({ mode: "number" }),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("item_price_history_item_id_idx").using("btree", table.itemId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("item_price_history_item_id_timestamp_key").using("btree", table.itemId.asc().nullsLast().op("int4_ops"), table.timestamp.asc().nullsLast().op("timestamptz_ops")),
	index("item_price_history_timestamp_idx").using("btree", table.timestamp.asc().nullsLast().op("timestamptz_ops")),
	index("item_price_history_volume_idx").using("btree", table.volume.asc().nullsLast().op("int8_ops")),
]);

export const prismaMigrations = pgTable("_prisma_migrations", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	checksum: varchar({ length: 64 }).notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text(),
	rolledBackAt: timestamp("rolled_back_at", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
});

export const favorites = pgTable("favorites", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	visibility: boolean(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }),
});

export const goals = pgTable("goals", {
	id: integer().primaryKey().notNull(),
	userId: integer("user_id"),
	goalPrice: integer("goal_price"),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }),
});

export const subscriptions = pgTable("subscriptions", {
	id: integer().primaryKey().notNull(),
	userId: integer("user_id"),
	plan: char({ length: 1 }),
	startDate: timestamp("start_date", { precision: 6, withTimezone: true, mode: 'string' }),
	endDate: timestamp("end_date", { precision: 6, withTimezone: true, mode: 'string' }),
	status: char({ length: 1 }),
	paymentMethod: char("payment_method", { length: 1 }),
	lastPaymentDate: timestamp("last_payment_date", { precision: 6, withTimezone: true, mode: 'string' }),
	nextPaymentDate: timestamp("next_payment_date", { precision: 6, withTimezone: true, mode: 'string' }),
	autoRenewal: char("auto_renewal", { length: 1 }),
});

export const transactions = pgTable("transactions", {
	id: serial().notNull(),
	userId: integer("user_id"),
	date: timestamp({ precision: 6, withTimezone: true, mode: 'string' }),
	description: varchar({ length: 300 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	amount: bigint({ mode: "number" }),
	notes: char({ length: 1 }),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { precision: 6, mode: 'string' }),
});

export const parties = pgTable("parties", {
	partyId: integer("party_id").primaryKey().notNull(),
	userId: integer("user_id"),
	clanId: integer("clan_id"),
	creatorId: integer("creator_id"),
	isInviteOnly: boolean("is_invite_only"),
});

export const partyItems = pgTable("party_items", {
	id: integer().primaryKey().notNull(),
	itemId: integer("item_id"),
	partyId: integer("party_id"),
});

export const partyMembers = pgTable("party_members", {
	id: integer().primaryKey().notNull(),
	userId: integer("user_id"),
	partyId: integer("party_id"),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 50 }),
	runescapeName: varchar("runescape_name", { length: 50 }),
	membership: integer(),
	email: text().notNull(),
	img: text(),
	password: text().notNull(),
	timezone: varchar(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }),
	deletedAt: time("deleted_at", { precision: 6 }),
	updatedAt: time("updated_at", { precision: 6 }),
	firebaseUid: varchar("firebase_uid", { length: 100 }),
	access: boolean().default(false).notNull(),
	approvedAt: timestamp("approved_at", { precision: 6, mode: 'string' }),
	approvedBy: integer("approved_by"),
	backupCodes: text("backup_codes"),
	mailchimpApiKey: varchar("mailchimp_api_key", { length: 255 }),
	masterPasswordHash: varchar("master_password_hash", { length: 255 }),
	otpEnabled: boolean("otp_enabled").default(false).notNull(),
	otpSecret: varchar("otp_secret", { length: 255 }),
	phoneNumber: varchar("phone_number", { length: 20 }),
	role: varchar({ length: 20 }).default('user'),
}, (table) => [
	uniqueIndex("users_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
]);

export const watchlist = pgTable("watchlist", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	itemId: integer("item_id").notNull(),
	itemName: varchar("item_name", { length: 255 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	volumeThreshold: bigint("volume_threshold", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	priceDropThreshold: bigint("price_drop_threshold", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	priceSpikeThreshold: bigint("price_spike_threshold", { mode: "number" }),
	abnormalActivity: boolean("abnormal_activity").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("watchlist_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("watchlist_item_id_idx").using("btree", table.itemId.asc().nullsLast().op("int4_ops")),
	index("watchlist_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("watchlist_user_id_item_id_key").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.itemId.asc().nullsLast().op("int4_ops")),
]);

export const volumeAlerts = pgTable("volume_alerts", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	itemId: integer("item_id").notNull(),
	alertType: varchar("alert_type", { length: 50 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	triggeredVolume: bigint("triggered_volume", { mode: "number" }),
	triggeredPrice: integer("triggered_price"),
	priceDropPercent: doublePrecision("price_drop_percent"),
	alertSent: boolean("alert_sent").default(false).notNull(),
	emailSentAt: timestamp("email_sent_at", { precision: 6, withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("volume_alerts_alert_sent_idx").using("btree", table.alertSent.asc().nullsLast().op("bool_ops")),
	index("volume_alerts_alert_type_idx").using("btree", table.alertType.asc().nullsLast().op("text_ops")),
	index("volume_alerts_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("volume_alerts_item_id_idx").using("btree", table.itemId.asc().nullsLast().op("int4_ops")),
	index("volume_alerts_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const alertCooldowns = pgTable("alert_cooldowns", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	itemId: integer("item_id").notNull(),
	alertType: varchar("alert_type", { length: 50 }).notNull(),
	cooldownUntil: timestamp("cooldown_until", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("alert_cooldowns_cooldown_until_idx").using("btree", table.cooldownUntil.asc().nullsLast().op("timestamptz_ops")),
	index("alert_cooldowns_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("alert_cooldowns_user_id_item_id_alert_type_key").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.itemId.asc().nullsLast().op("int4_ops"), table.alertType.asc().nullsLast().op("int4_ops")),
]);

export const abnormalActivityPatterns = pgTable("abnormal_activity_patterns", {
	id: serial().primaryKey().notNull(),
	itemId: integer("item_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	avgVolume24H: bigint("avg_volume_24h", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	avgVolume7D: bigint("avg_volume_7d", { mode: "number" }),
	avgPriceChange24H: doublePrecision("avg_price_change_24h"),
	priceVolatility: doublePrecision("price_volatility"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	volumeSpikeThreshold: bigint("volume_spike_threshold", { mode: "number" }),
	lastCalculated: timestamp("last_calculated", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("abnormal_activity_patterns_item_id_idx").using("btree", table.itemId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("abnormal_activity_patterns_item_id_key").using("btree", table.itemId.asc().nullsLast().op("int4_ops")),
	index("abnormal_activity_patterns_last_calculated_idx").using("btree", table.lastCalculated.asc().nullsLast().op("timestamptz_ops")),
]);

export const otpTokens = pgTable("otp_tokens", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	token: varchar({ length: 10 }).notNull(),
	tokenType: varchar("token_type", { length: 20 }).notNull(),
	expiresAt: timestamp("expires_at", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	used: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("otp_tokens_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("otp_tokens_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("otp_tokens_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const masterAccessLogs = pgTable("master_access_logs", {
	id: serial().primaryKey().notNull(),
	adminUserId: integer("admin_user_id").notNull(),
	targetUserId: integer("target_user_id").notNull(),
	accessReason: text("access_reason"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	sessionDuration: integer("session_duration"),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("master_access_logs_admin_user_id_idx").using("btree", table.adminUserId.asc().nullsLast().op("int4_ops")),
	index("master_access_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("master_access_logs_target_user_id_idx").using("btree", table.targetUserId.asc().nullsLast().op("int4_ops")),
]);

export const systemSettings = pgTable("systemSettings", {
	id: serial().primaryKey().notNull(),
	section: varchar({ length: 50 }).notNull(),
	key: varchar({ length: 50 }).notNull(),
	value: jsonb().notNull(),
	description: text(),
	dataType: varchar({ length: 20 }).notNull(),
	isSecret: boolean().default(false).notNull(),
	updatedBy: integer(),
	createdAt: timestamp({ precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 6, withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("systemSettings_isSecret_idx").using("btree", table.isSecret.asc().nullsLast().op("bool_ops")),
	index("systemSettings_section_idx").using("btree", table.section.asc().nullsLast().op("text_ops")),
	uniqueIndex("systemSettings_section_key_key").using("btree", table.section.asc().nullsLast().op("text_ops"), table.key.asc().nullsLast().op("text_ops")),
]);

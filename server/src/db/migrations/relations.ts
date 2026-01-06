import { relations } from "drizzle-orm/relations";
import { users, clans, clanMembers, itemMapping, itemPriceHistory, favorites, refreshTokens, otps, userAchievements, auditLog, clanInvites, userGoals, userProfits, userTransactions, userWatchlists, apiUsageLogs, adminActions, securityEvents, stripeEvents, subscriptions, userSettings, userInvitations, userSessions, formulas, cronJobs, systemSettings } from "./schema";

export const clansRelations = relations(clans, ({one, many}) => ({
	user: one(users, {
		fields: [clans.ownerId],
		references: [users.id]
	}),
	clanMembers: many(clanMembers),
	clanInvites: many(clanInvites),
}));

export const usersRelations = relations(users, ({many}) => ({
	clans: many(clans),
	clanMembers: many(clanMembers),
	favorites: many(favorites),
	refreshTokens: many(refreshTokens),
	otps: many(otps),
	userAchievements: many(userAchievements),
	auditLogs: many(auditLog),
	clanInvites_inviterId: many(clanInvites, {
		relationName: "clanInvites_inviterId_users_id"
	}),
	clanInvites_invitedUserId: many(clanInvites, {
		relationName: "clanInvites_invitedUserId_users_id"
	}),
	userGoals: many(userGoals),
	userProfits: many(userProfits),
	userTransactions: many(userTransactions),
	userWatchlists: many(userWatchlists),
	apiUsageLogs: many(apiUsageLogs),
	adminActions_adminUserId: many(adminActions, {
		relationName: "adminActions_adminUserId_users_id"
	}),
	adminActions_targetUserId: many(adminActions, {
		relationName: "adminActions_targetUserId_users_id"
	}),
	securityEvents_userId: many(securityEvents, {
		relationName: "securityEvents_userId_users_id"
	}),
	securityEvents_resolvedBy: many(securityEvents, {
		relationName: "securityEvents_resolvedBy_users_id"
	}),
	stripeEvents: many(stripeEvents),
	subscriptions: many(subscriptions),
	userSettings: many(userSettings),
	userInvitations: many(userInvitations),
	userSessions: many(userSessions),
	formulas: many(formulas),
	cronJobs: many(cronJobs),
	systemSettings: many(systemSettings),
}));

export const clanMembersRelations = relations(clanMembers, ({one}) => ({
	clan: one(clans, {
		fields: [clanMembers.clanId],
		references: [clans.id]
	}),
	user: one(users, {
		fields: [clanMembers.userId],
		references: [users.id]
	}),
}));

export const itemPriceHistoryRelations = relations(itemPriceHistory, ({one}) => ({
	itemMapping: one(itemMapping, {
		fields: [itemPriceHistory.itemId],
		references: [itemMapping.id]
	}),
}));

export const itemMappingRelations = relations(itemMapping, ({many}) => ({
	itemPriceHistories: many(itemPriceHistory),
}));

export const favoritesRelations = relations(favorites, ({one}) => ({
	user: one(users, {
		fields: [favorites.userId],
		references: [users.id]
	}),
}));

export const refreshTokensRelations = relations(refreshTokens, ({one}) => ({
	user: one(users, {
		fields: [refreshTokens.userId],
		references: [users.id]
	}),
}));

export const otpsRelations = relations(otps, ({one}) => ({
	user: one(users, {
		fields: [otps.userId],
		references: [users.id]
	}),
}));

export const userAchievementsRelations = relations(userAchievements, ({one}) => ({
	user: one(users, {
		fields: [userAchievements.userId],
		references: [users.id]
	}),
}));

export const auditLogRelations = relations(auditLog, ({one}) => ({
	user: one(users, {
		fields: [auditLog.userId],
		references: [users.id]
	}),
}));

export const clanInvitesRelations = relations(clanInvites, ({one}) => ({
	clan: one(clans, {
		fields: [clanInvites.clanId],
		references: [clans.id]
	}),
	user_inviterId: one(users, {
		fields: [clanInvites.inviterId],
		references: [users.id],
		relationName: "clanInvites_inviterId_users_id"
	}),
	user_invitedUserId: one(users, {
		fields: [clanInvites.invitedUserId],
		references: [users.id],
		relationName: "clanInvites_invitedUserId_users_id"
	}),
}));

export const userGoalsRelations = relations(userGoals, ({one}) => ({
	user: one(users, {
		fields: [userGoals.userId],
		references: [users.id]
	}),
}));

export const userProfitsRelations = relations(userProfits, ({one}) => ({
	user: one(users, {
		fields: [userProfits.userId],
		references: [users.id]
	}),
}));

export const userTransactionsRelations = relations(userTransactions, ({one}) => ({
	user: one(users, {
		fields: [userTransactions.userId],
		references: [users.id]
	}),
}));

export const userWatchlistsRelations = relations(userWatchlists, ({one}) => ({
	user: one(users, {
		fields: [userWatchlists.userId],
		references: [users.id]
	}),
}));

export const apiUsageLogsRelations = relations(apiUsageLogs, ({one}) => ({
	user: one(users, {
		fields: [apiUsageLogs.userId],
		references: [users.id]
	}),
}));

export const adminActionsRelations = relations(adminActions, ({one}) => ({
	user_adminUserId: one(users, {
		fields: [adminActions.adminUserId],
		references: [users.id],
		relationName: "adminActions_adminUserId_users_id"
	}),
	user_targetUserId: one(users, {
		fields: [adminActions.targetUserId],
		references: [users.id],
		relationName: "adminActions_targetUserId_users_id"
	}),
}));

export const securityEventsRelations = relations(securityEvents, ({one}) => ({
	user_userId: one(users, {
		fields: [securityEvents.userId],
		references: [users.id],
		relationName: "securityEvents_userId_users_id"
	}),
	user_resolvedBy: one(users, {
		fields: [securityEvents.resolvedBy],
		references: [users.id],
		relationName: "securityEvents_resolvedBy_users_id"
	}),
}));

export const stripeEventsRelations = relations(stripeEvents, ({one}) => ({
	user: one(users, {
		fields: [stripeEvents.userId],
		references: [users.id]
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({one}) => ({
	user: one(users, {
		fields: [subscriptions.userId],
		references: [users.id]
	}),
}));

export const userSettingsRelations = relations(userSettings, ({one}) => ({
	user: one(users, {
		fields: [userSettings.userId],
		references: [users.id]
	}),
}));

export const userInvitationsRelations = relations(userInvitations, ({one}) => ({
	user: one(users, {
		fields: [userInvitations.invitedBy],
		references: [users.id]
	}),
}));

export const userSessionsRelations = relations(userSessions, ({one}) => ({
	user: one(users, {
		fields: [userSessions.userId],
		references: [users.id]
	}),
}));

export const formulasRelations = relations(formulas, ({one}) => ({
	user: one(users, {
		fields: [formulas.createdBy],
		references: [users.id]
	}),
}));

export const cronJobsRelations = relations(cronJobs, ({one}) => ({
	user: one(users, {
		fields: [cronJobs.createdBy],
		references: [users.id]
	}),
}));

export const systemSettingsRelations = relations(systemSettings, ({one}) => ({
	user: one(users, {
		fields: [systemSettings.updatedBy],
		references: [users.id]
	}),
}));
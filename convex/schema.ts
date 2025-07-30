import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Users table
  users: defineTable({
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
    runescape_name: v.optional(v.string()),
    membership: v.optional(v.number()),
    img: v.optional(v.string()),
    timezone: v.optional(v.string()),
    mailchimp_api_key: v.optional(v.string()),
    access: v.boolean(),
    role: v.optional(v.string()),
    approved_by: v.optional(v.number()),
    approved_at: v.optional(v.number()),
    phone_number: v.optional(v.string()),
    otp_enabled: v.boolean(),
    otp_secret: v.optional(v.string()),
    backup_codes: v.optional(v.string()),
    master_password_hash: v.optional(v.string()),
    created_at: v.optional(v.number()),
    deleted_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
    firebase_uid: v.optional(v.string())
  })
    .index('by_email', ['email'])
    .index('by_role', ['role'])
    .index('by_access', ['access']),

  // Favorites table
  favorites: defineTable({
    user_id: v.optional(v.number()),
    visibility: v.optional(v.boolean()),
    updated_at: v.optional(v.number())
  })
    .index('by_user_id', ['user_id']),

  // Goals table
  goals: defineTable({
    user_id: v.optional(v.number()),
    goal_price: v.optional(v.number()),
    updated_at: v.optional(v.number())
  })
    .index('by_user_id', ['user_id']),

  // Subscriptions table
  subscriptions: defineTable({
    user_id: v.optional(v.number()),
    plan: v.optional(v.string()),
    start_date: v.optional(v.number()),
    end_date: v.optional(v.number()),
    status: v.optional(v.string()),
    payment_method: v.optional(v.string()),
    last_payment_date: v.optional(v.number()),
    next_payment_date: v.optional(v.number()),
    auto_renewal: v.optional(v.string())
  })
    .index('by_user_id', ['user_id'])
    .index('by_status', ['status']),

  // Parties table
  parties: defineTable({
    user_id: v.optional(v.number()),
    clan_id: v.optional(v.number()),
    creator_id: v.optional(v.number()),
    is_invite_only: v.optional(v.boolean())
  })
    .index('by_user_id', ['user_id'])
    .index('by_creator_id', ['creator_id']),

  // Party items table
  party_items: defineTable({
    item_id: v.optional(v.number()),
    party_id: v.optional(v.number())
  })
    .index('by_party_id', ['party_id'])
    .index('by_item_id', ['item_id']),

  // Party members table
  party_members: defineTable({
    user_id: v.optional(v.number()),
    party_id: v.optional(v.number())
  })
    .index('by_party_id', ['party_id'])
    .index('by_user_id', ['user_id']),

  // Item price history table
  item_price_history: defineTable({
    item_id: v.number(),
    timestamp: v.number(),
    high_price: v.optional(v.number()),
    low_price: v.optional(v.number()),
    volume: v.optional(v.number()),
    created_at: v.number()
  })
    .index('by_item_id', ['item_id'])
    .index('by_timestamp', ['timestamp'])
    .index('by_volume', ['volume'])
    .index('by_item_timestamp', ['item_id', 'timestamp']),

  // Watchlist table
  watchlist: defineTable({
    user_id: v.number(),
    item_id: v.number(),
    item_name: v.string(),
    volume_threshold: v.optional(v.number()),
    price_drop_threshold: v.optional(v.number()),
    price_spike_threshold: v.optional(v.number()),
    abnormal_activity: v.boolean(),
    is_active: v.boolean(),
    created_at: v.number(),
    updated_at: v.number()
  })
    .index('by_user_id', ['user_id'])
    .index('by_item_id', ['item_id'])
    .index('by_is_active', ['is_active'])
    .index('by_user_item', ['user_id', 'item_id']),

  // Volume alerts table
  volume_alerts: defineTable({
    user_id: v.number(),
    item_id: v.number(),
    alert_type: v.string(),
    triggered_volume: v.optional(v.number()),
    triggered_price: v.optional(v.number()),
    price_drop_percent: v.optional(v.number()),
    alert_sent: v.boolean(),
    email_sent_at: v.optional(v.number()),
    created_at: v.number()
  })
    .index('by_user_id', ['user_id'])
    .index('by_item_id', ['item_id'])
    .index('by_alert_type', ['alert_type'])
    .index('by_alert_sent', ['alert_sent'])
    .index('by_created_at', ['created_at']),

  // Alert cooldowns table
  alert_cooldowns: defineTable({
    user_id: v.number(),
    item_id: v.number(),
    alert_type: v.string(),
    cooldown_until: v.number(),
    created_at: v.number()
  })
    .index('by_user_id', ['user_id'])
    .index('by_cooldown_until', ['cooldown_until'])
    .index('by_user_item_type', ['user_id', 'item_id', 'alert_type']),

  // Abnormal activity patterns table
  abnormal_activity_patterns: defineTable({
    item_id: v.number(),
    avg_volume_24h: v.optional(v.number()),
    avg_volume_7d: v.optional(v.number()),
    avg_price_change_24h: v.optional(v.number()),
    price_volatility: v.optional(v.number()),
    volume_spike_threshold: v.optional(v.number()),
    last_calculated: v.number(),
    created_at: v.number()
  })
    .index('by_item_id', ['item_id'])
    .index('by_last_calculated', ['last_calculated']),

  // OTP tokens table
  otp_tokens: defineTable({
    user_id: v.number(),
    token: v.string(),
    token_type: v.string(),
    expires_at: v.number(),
    used: v.boolean(),
    created_at: v.number()
  })
    .index('by_user_id', ['user_id'])
    .index('by_token', ['token'])
    .index('by_expires_at', ['expires_at']),

  // Master access logs table
  master_access_logs: defineTable({
    admin_user_id: v.number(),
    target_user_id: v.number(),
    access_reason: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    user_agent: v.optional(v.string()),
    session_duration: v.optional(v.number()),
    created_at: v.number()
  })
    .index('by_admin_user_id', ['admin_user_id'])
    .index('by_target_user_id', ['target_user_id'])
    .index('by_created_at', ['created_at'])
})

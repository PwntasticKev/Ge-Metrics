import { z } from 'zod'
import { eq, sql, and, gte, lte, desc, count, avg, sum, or, like } from 'drizzle-orm'
import { 
  db, 
  users, 
  auditLog,
  systemSettings
} from '../db/index.js'
import { adminProcedure, router } from './trpc.js'

export const adminSystemSettingsRouter = router({
  // Get all system settings grouped by section
  getAllSettings: adminProcedure
    .query(async () => {
      const allSettings = await db.select().from(systemSettings).orderBy(systemSettings.section, systemSettings.key)
      
      // Group settings by section
      const settingsBySection = allSettings.reduce((acc, setting) => {
        if (!acc[setting.section]) {
          acc[setting.section] = {}
        }
        acc[setting.section][setting.key] = setting.value
        return acc
      }, {} as Record<string, Record<string, any>>)
      
      return settingsBySection
    }),

  // Get settings for a specific section
  getSettingsBySection: adminProcedure
    .input(z.object({
      section: z.string()
    }))
    .query(async ({ input }) => {
      const { section } = input
      
      const sectionSettings = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.section, section))
        .orderBy(systemSettings.key)
      
      const settingsObj = sectionSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {} as Record<string, any>)
      
      return settingsObj
    }),

  // Update multiple settings for a section
  updateSectionSettings: adminProcedure
    .input(z.object({
      section: z.string(),
      settings: z.record(z.any())
    }))
    .mutation(async ({ input, ctx }) => {
      const { section, settings } = input
      
      const updatedSettings = []
      
      // Update each setting in the section
      for (const [key, value] of Object.entries(settings)) {
        // Check if setting exists
        const [existingSetting] = await db.select()
          .from(systemSettings)
          .where(and(
            eq(systemSettings.section, section),
            eq(systemSettings.key, key)
          ))
          .limit(1)
        
        if (existingSetting) {
          // Update existing setting
          const [updated] = await db
            .update(systemSettings)
            .set({
              value,
              updatedBy: ctx.user.id,
              updatedAt: new Date()
            })
            .where(and(
              eq(systemSettings.section, section),
              eq(systemSettings.key, key)
            ))
            .returning()
          
          updatedSettings.push(updated)
        } else {
          // Create new setting
          const [created] = await db.insert(systemSettings).values({
            section,
            key,
            value,
            dataType: typeof value === 'object' ? 'json' : typeof value,
            updatedBy: ctx.user.id
          }).returning()
          
          updatedSettings.push(created)
        }
      }

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'update_system_settings',
        resource: 'system_settings',
        resourceId: section,
        details: {
          section,
          updatedKeys: Object.keys(settings),
          settingsCount: Object.keys(settings).length
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return updatedSettings
    }),

  // Update a single setting
  updateSetting: adminProcedure
    .input(z.object({
      section: z.string(),
      key: z.string(),
      value: z.any(),
      description: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { section, key, value, description } = input
      
      // Check if setting exists
      const [existingSetting] = await db.select()
        .from(systemSettings)
        .where(and(
          eq(systemSettings.section, section),
          eq(systemSettings.key, key)
        ))
        .limit(1)
      
      let updatedSetting
      
      if (existingSetting) {
        // Update existing setting
        const [updated] = await db
          .update(systemSettings)
          .set({
            value,
            description: description || existingSetting.description,
            updatedBy: ctx.user.id,
            updatedAt: new Date()
          })
          .where(and(
            eq(systemSettings.section, section),
            eq(systemSettings.key, key)
          ))
          .returning()
        
        updatedSetting = updated
      } else {
        // Create new setting
        const [created] = await db.insert(systemSettings).values({
          section,
          key,
          value,
          description,
          dataType: typeof value === 'object' ? 'json' : typeof value,
          updatedBy: ctx.user.id
        }).returning()
        
        updatedSetting = created
      }

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'update_setting',
        resource: 'system_setting',
        resourceId: `${section}.${key}`,
        details: {
          section,
          key,
          oldValue: existingSetting?.value,
          newValue: value
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return updatedSetting
    }),

  // Delete a setting
  deleteSetting: adminProcedure
    .input(z.object({
      section: z.string(),
      key: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const { section, key } = input
      
      // Get setting before deletion for logging
      const [setting] = await db.select()
        .from(systemSettings)
        .where(and(
          eq(systemSettings.section, section),
          eq(systemSettings.key, key)
        ))
      
      if (!setting) {
        throw new Error('Setting not found')
      }

      // Delete the setting
      await db.delete(systemSettings)
        .where(and(
          eq(systemSettings.section, section),
          eq(systemSettings.key, key)
        ))

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'delete_setting',
        resource: 'system_setting',
        resourceId: `${section}.${key}`,
        details: {
          section,
          key,
          deletedValue: setting.value
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return { success: true, message: 'Setting deleted successfully' }
    }),

  // Get available sections
  getSections: adminProcedure
    .query(async () => {
      const sections = await db
        .selectDistinct({ section: systemSettings.section })
        .from(systemSettings)
        .orderBy(systemSettings.section)
      
      const predefinedSections = ['general', 'database', 'security', 'api', 'notifications']
      const allSections = [...new Set([...predefinedSections, ...sections.map(s => s.section)])]
      
      return allSections
    }),

  // Reset section to defaults
  resetSectionToDefaults: adminProcedure
    .input(z.object({
      section: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const { section } = input
      
      // Get current settings for logging
      const currentSettings = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.section, section))
      
      // Delete all settings in the section
      await db.delete(systemSettings)
        .where(eq(systemSettings.section, section))
      
      // Insert default settings based on section
      const defaultSettings = getDefaultSettingsForSection(section)
      const insertedSettings = []
      
      for (const [key, config] of Object.entries(defaultSettings)) {
        const [inserted] = await db.insert(systemSettings).values({
          section,
          key,
          value: config.value,
          description: config.description,
          dataType: config.dataType,
          isSecret: config.isSecret || false,
          updatedBy: ctx.user.id
        }).returning()
        
        insertedSettings.push(inserted)
      }

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'reset_section_settings',
        resource: 'system_settings',
        resourceId: section,
        details: {
          section,
          resetSettingsCount: currentSettings.length,
          defaultSettingsCount: insertedSettings.length
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return insertedSettings
    })
})

// Helper function to get default settings for each section
function getDefaultSettingsForSection(section: string): Record<string, any> {
  const defaults: Record<string, Record<string, any>> = {
    general: {
      siteName: { value: 'GE Metrics', description: 'Site name', dataType: 'string' },
      siteDescription: { value: 'Live Market Data for Old School RuneScape', description: 'Site description', dataType: 'string' },
      maintenanceMode: { value: false, description: 'Enable maintenance mode', dataType: 'boolean' },
      allowRegistration: { value: true, description: 'Allow new user registration', dataType: 'boolean' },
      maxUsersPerDay: { value: 100, description: 'Maximum new users per day', dataType: 'number' },
      sessionTimeout: { value: 30, description: 'Session timeout in minutes', dataType: 'number' }
    },
    database: {
      connectionPoolSize: { value: 20, description: 'Database connection pool size', dataType: 'number' },
      queryTimeout: { value: 30000, description: 'Query timeout in milliseconds', dataType: 'number' },
      autoBackup: { value: true, description: 'Enable automatic backups', dataType: 'boolean' },
      backupInterval: { value: 24, description: 'Backup interval in hours', dataType: 'number' },
      retentionDays: { value: 30, description: 'Backup retention in days', dataType: 'number' }
    },
    security: {
      enforceHttps: { value: true, description: 'Enforce HTTPS', dataType: 'boolean' },
      requireEmailVerification: { value: true, description: 'Require email verification', dataType: 'boolean' },
      enableTwoFactor: { value: true, description: 'Enable two-factor authentication', dataType: 'boolean' },
      passwordMinLength: { value: 8, description: 'Minimum password length', dataType: 'number' },
      maxLoginAttempts: { value: 5, description: 'Maximum login attempts', dataType: 'number' },
      lockoutDuration: { value: 15, description: 'Lockout duration in minutes', dataType: 'number' },
      enableRateLimiting: { value: true, description: 'Enable rate limiting', dataType: 'boolean' },
      rateLimit: { value: 100, description: 'Requests per minute', dataType: 'number' }
    },
    api: {
      enableApiKeys: { value: true, description: 'Enable API keys', dataType: 'boolean' },
      defaultRateLimit: { value: 1000, description: 'Default rate limit per hour', dataType: 'number' },
      enableCors: { value: true, description: 'Enable CORS', dataType: 'boolean' },
      corsOrigins: { value: 'http://localhost:3000,https://gemetrics.com', description: 'CORS origins', dataType: 'string' },
      enableCompression: { value: true, description: 'Enable compression', dataType: 'boolean' },
      cacheTimeout: { value: 300, description: 'Cache timeout in seconds', dataType: 'number' }
    },
    notifications: {
      enableEmailNotifications: { value: true, description: 'Enable email notifications', dataType: 'boolean' },
      enablePushNotifications: { value: false, description: 'Enable push notifications', dataType: 'boolean' },
      enableSlackIntegration: { value: false, description: 'Enable Slack integration', dataType: 'boolean' },
      slackWebhookUrl: { value: '', description: 'Slack webhook URL', dataType: 'string', isSecret: true },
      notifyOnErrors: { value: true, description: 'Notify on errors', dataType: 'boolean' },
      notifyOnHighUsage: { value: true, description: 'Notify on high usage', dataType: 'boolean' }
    }
  }
  
  return defaults[section] || {}
}
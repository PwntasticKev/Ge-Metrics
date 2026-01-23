#!/usr/bin/env node

/**
 * GE-Metrics Backup Scheduler
 * Automatically schedules and manages database backups
 */

import BackupService from '../src/services/backupService.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { readFileSync } = require('fs')
const { join } = require('path')

// Load configuration
let config = {}
try {
  const configPath = process.env.BACKUP_CONFIG || './backup-config.json'
  config = JSON.parse(readFileSync(configPath, 'utf8'))
} catch (error) {
  console.log('📝 Using default backup configuration')
  config = {
    schedules: {
      daily: { enabled: true, time: '02:00', type: 'incremental' },
      weekly: { enabled: true, day: 'sunday', time: '03:00', type: 'full' },
      monthly: { enabled: true, day: 1, time: '04:00', type: 'full' }
    },
    retention: {
      daily: 7,    // Keep 7 daily backups
      weekly: 4,   // Keep 4 weekly backups  
      monthly: 12  // Keep 12 monthly backups
    },
    notifications: {
      email: {
        enabled: process.env.EMAIL_NOTIFICATIONS === 'true',
        recipients: (process.env.NOTIFICATION_EMAILS || '').split(',').filter(Boolean),
        onSuccess: true,
        onFailure: true
      },
      slack: {
        enabled: process.env.SLACK_NOTIFICATIONS === 'true',
        webhook: process.env.SLACK_WEBHOOK,
        onSuccess: false,
        onFailure: true
      }
    },
    cloudBackup: {
      enabled: process.env.CLOUD_BACKUP === 'true',
      provider: process.env.CLOUD_PROVIDER || 's3',
      dailyBackups: true,
      weeklyBackups: true,
      monthlyBackups: true
    }
  }
}

// Initialize backup service
const backupService = new BackupService({
  // Override with environment variables
  databaseUrl: process.env.DATABASE_URL,
  backupDirectory: process.env.BACKUP_DIR || './backups',
  maxBackups: config.retention.daily + config.retention.weekly + config.retention.monthly,
  compression: process.env.COMPRESSION !== 'false',
  encryption: process.env.BACKUP_ENCRYPTION === 'true',
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
  cloudStorage: {
    enabled: config.cloudBackup.enabled,
    provider: config.cloudBackup.provider,
    bucket: process.env.CLOUD_BUCKET,
    region: process.env.CLOUD_REGION
  }
})

// Setup notification handlers
backupService.setNotificationHandler(async (notification) => {
  console.log(`[${new Date().toISOString()}] ${notification.type.toUpperCase()}: ${notification.message}`)
  
  // Email notifications
  if (config.notifications.email.enabled) {
    if (notification.type === 'success' && config.notifications.email.onSuccess) {
      await sendEmailNotification(notification)
    }
    if (notification.type === 'error' && config.notifications.email.onFailure) {
      await sendEmailNotification(notification)
    }
  }
  
  // Slack notifications
  if (config.notifications.slack.enabled) {
    if (notification.type === 'success' && config.notifications.slack.onSuccess) {
      await sendSlackNotification(notification)
    }
    if (notification.type === 'error' && config.notifications.slack.onFailure) {
      await sendSlackNotification(notification)
    }
  }
})

async function sendEmailNotification(notification) {
  try {
    // This would integrate with actual email service
    console.log('📧 Sending email notification to:', config.notifications.email.recipients)
  } catch (error) {
    console.error('❌ Failed to send email notification:', error.message)
  }
}

async function sendSlackNotification(notification) {
  try {
    // This would integrate with Slack webhook
    console.log('💬 Sending Slack notification')
  } catch (error) {
    console.error('❌ Failed to send Slack notification:', error.message)
  }
}

// Start the scheduler
async function startScheduler() {
  console.log('🚀 Starting GE-Metrics Backup Scheduler')
  
  try {
    // Test database connection
    await backupService.testDatabaseConnection()
    console.log('✅ Database connection verified')
    
    // Start scheduled backups
    const schedules = {}
    
    if (config.schedules.daily.enabled) {
      schedules.daily = true
      schedules.time = config.schedules.daily.time
    }
    
    if (config.schedules.weekly.enabled) {
      schedules.weekly = true
      schedules.weekDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(config.schedules.weekly.day.toLowerCase())
      schedules.time = config.schedules.weekly.time
    }
    
    if (config.schedules.monthly.enabled) {
      schedules.monthly = true
      schedules.monthDay = config.schedules.monthly.day
      schedules.time = config.schedules.monthly.time
    }
    
    backupService.startScheduler(schedules)
    
    console.log('📅 Backup schedules configured:')
    if (config.schedules.daily.enabled) {
      console.log(`  - Daily ${config.schedules.daily.type} backups at ${config.schedules.daily.time}`)
    }
    if (config.schedules.weekly.enabled) {
      console.log(`  - Weekly ${config.schedules.weekly.type} backups on ${config.schedules.weekly.day} at ${config.schedules.weekly.time}`)
    }
    if (config.schedules.monthly.enabled) {
      console.log(`  - Monthly ${config.schedules.monthly.type} backups on day ${config.schedules.monthly.day} at ${config.schedules.monthly.time}`)
    }
    
    // Setup point-in-time recovery if enabled
    if (process.env.ENABLE_PITR === 'true') {
      console.log('🕐 Setting up point-in-time recovery...')
      await backupService.setupPointInTimeRecovery()
    }
    
    // Keep the process running
    console.log('✅ Backup scheduler is running. Press Ctrl+C to stop.')
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backup scheduler...')
      backupService.stopScheduler()
      process.exit(0)
    })
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down...')
      backupService.stopScheduler()
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ Failed to start backup scheduler:', error.message)
    process.exit(1)
  }
}

// Handle command line arguments
const command = process.argv[2]

switch (command) {
  case 'start':
  case undefined:
    await startScheduler()
    break
    
  case 'backup':
    const type = process.argv[3] || 'full'
    console.log(`🚀 Creating ${type} backup...`)
    const result = await backupService.createBackup(type)
    if (result.success) {
      console.log(`✅ Backup created: ${result.filename}`)
    } else {
      console.error(`❌ Backup failed: ${result.error}`)
      process.exit(1)
    }
    break
    
  case 'list':
    const backups = await backupService.listBackups()
    console.log(`📋 Found ${backups.length} backup(s):`)
    backups.forEach((backup, index) => {
      console.log(`  ${index + 1}. ${backup.filename} (${backup.sizeFormatted}) - ${backup.age}`)
    })
    break
    
  case 'cleanup':
    console.log('🧹 Cleaning up old backups...')
    await backupService.cleanupOldBackups()
    console.log('✅ Cleanup completed')
    break
    
  case 'verify':
    const backupFile = process.argv[3]
    if (!backupFile) {
      console.error('❌ Please provide a backup file to verify')
      process.exit(1)
    }
    console.log(`🔍 Verifying backup: ${backupFile}`)
    const verification = await backupService.verifyBackup(backupFile)
    if (verification.valid) {
      console.log('✅ Backup integrity verified')
    } else {
      console.error(`❌ Backup verification failed: ${verification.error}`)
      process.exit(1)
    }
    break
    
  case 'status':
    const stats = backupService.getBackupStatistics()
    console.log('📊 Backup Status:')
    console.log(`  Total backups: ${stats.totalBackups}`)
    console.log(`  Successful: ${stats.successfulBackups}`)
    console.log(`  Failed: ${stats.failedBackups}`)
    if (stats.lastBackup) {
      console.log(`  Last backup: ${stats.lastBackup.filename} (${stats.lastBackup.timestamp.toLocaleString()})`)
    }
    break
    
  case 'help':
  case '--help':
  case '-h':
    console.log(`
🛠️  GE-Metrics Backup Scheduler

Usage: node backup-schedule.js [command]

Commands:
  start     Start the backup scheduler (default)
  backup    Create a manual backup
  list      List available backups
  cleanup   Clean up old backups
  verify    Verify backup integrity
  status    Show backup statistics
  help      Show this help message

Environment Variables:
  DATABASE_URL              PostgreSQL connection string
  BACKUP_DIR               Backup directory path
  BACKUP_ENCRYPTION        Enable backup encryption (true/false)
  BACKUP_ENCRYPTION_KEY    Encryption key for backups
  CLOUD_BACKUP            Enable cloud backup (true/false)
  CLOUD_PROVIDER          Cloud provider (s3/gcs/azure)
  CLOUD_BUCKET            Cloud storage bucket name
  EMAIL_NOTIFICATIONS     Enable email notifications (true/false)
  NOTIFICATION_EMAILS     Comma-separated list of email addresses
  SLACK_NOTIFICATIONS     Enable Slack notifications (true/false)
  SLACK_WEBHOOK           Slack webhook URL
  ENABLE_PITR             Enable point-in-time recovery (true/false)

Examples:
  node backup-schedule.js start           # Start scheduler
  node backup-schedule.js backup full     # Create full backup
  node backup-schedule.js list            # List backups
  node backup-schedule.js verify backup.sql.gz  # Verify backup
`)
    break
    
  default:
    console.error(`❌ Unknown command: ${command}. Use 'help' for usage information.`)
    process.exit(1)
}
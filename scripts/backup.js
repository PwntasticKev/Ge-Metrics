#!/usr/bin/env node

/**
 * GE-Metrics Database Backup CLI
 * Easy-to-use command line interface for database backup and restore operations
 */

import { program } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import BackupService from './backupService.js'
import path from 'path'
import fs from 'fs/promises'

// Initialize backup service
const backupService = new BackupService()

// Setup notification handler for CLI output
backupService.setNotificationHandler((notification) => {
  switch (notification.type) {
    case 'success':
      console.log(chalk.green('✅ ' + notification.message))
      break
    case 'error':
      console.log(chalk.red('❌ ' + notification.message))
      break
    case 'warning':
      console.log(chalk.yellow('⚠️ ' + notification.message))
      break
    case 'info':
      console.log(chalk.blue('ℹ️ ' + notification.message))
      break
  }
})

// CLI Program setup
program
  .name('backup')
  .description('GE-Metrics Database Backup and Recovery Tool')
  .version('1.0.0')

// Backup command
program
  .command('create')
  .alias('backup')
  .description('Create a database backup')
  .option('-t, --type <type>', 'Backup type (full, schema, data, incremental)', 'full')
  .option('-o, --output <path>', 'Output directory for backup file')
  .option('--exclude-tables <tables>', 'Comma-separated list of tables to exclude')
  .option('--include-tables <tables>', 'Comma-separated list of tables to include')
  .option('--no-compression', 'Disable compression')
  .option('--encrypt', 'Encrypt the backup')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('🚀 Starting database backup...'))
      
      const backupOptions = {}
      
      if (options.excludeTables) {
        backupOptions.excludeTables = options.excludeTables.split(',').map(t => t.trim())
      }
      
      if (options.includeTables) {
        backupOptions.includeTables = options.includeTables.split(',').map(t => t.trim())
      }
      
      // Override service config if needed
      if (options.output) {
        backupService.config.backupDirectory = options.output
      }
      
      if (!options.compression) {
        backupService.config.compression = false
      }
      
      if (options.encrypt) {
        backupService.config.encryption = true
        if (!backupService.config.encryptionKey) {
          const { key } = await inquirer.prompt([
            {
              type: 'password',
              name: 'key',
              message: 'Enter encryption key:',
              mask: '*'
            }
          ])
          backupService.config.encryptionKey = key
        }
      }
      
      const result = await backupService.createBackup(options.type, backupOptions)
      
      if (result.success) {
        console.log(chalk.green(`\n✅ Backup created successfully!`))
        console.log(chalk.gray(`📁 File: ${result.filename}`))
        console.log(chalk.gray(`📊 Size: ${result.sizeFormatted}`))
        console.log(chalk.gray(`⏱️  Duration: ${result.duration}s`))
        if (result.checksum) {
          console.log(chalk.gray(`🔐 Checksum: ${result.checksum}`))
        }
      } else {
        console.log(chalk.red(`\n❌ Backup failed: ${result.error}`))
        process.exit(1)
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Backup error:'), error.message)
      process.exit(1)
    }
  })

// Restore command
program
  .command('restore')
  .description('Restore database from backup')
  .argument('<backup-file>', 'Path to backup file or URL for cloud restore')
  .option('--drop', 'Drop and recreate database before restore')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (backupFile, options) => {
    try {
      console.log(chalk.cyan('🔄 Starting database restore...'))
      
      // Check if this is a cloud URL
      const isCloudUrl = backupFile.startsWith('s3://') || backupFile.startsWith('gs://') || backupFile.startsWith('azure://')
      
      if (!options.confirm && !isCloudUrl) {
        // Show backup info and confirm
        try {
          const stats = await fs.stat(backupFile)
          const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2)
          
          console.log(chalk.yellow('\n⚠️  RESTORE CONFIRMATION'))
          console.log(chalk.gray(`📁 Backup file: ${path.basename(backupFile)}`))
          console.log(chalk.gray(`📊 Size: ${sizeInMB} MB`))
          console.log(chalk.gray(`📅 Created: ${stats.mtime.toLocaleString()}`))
          console.log(chalk.gray(`🎯 Target database: ${backupService.config.databaseName}`))
          
          const { confirmed } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmed',
              message: 'This will overwrite your current database. Continue?',
              default: false
            }
          ])
          
          if (!confirmed) {
            console.log(chalk.yellow('Operation cancelled'))
            return
          }
          
        } catch (error) {
          console.error(chalk.red('❌ Cannot read backup file:'), error.message)
          process.exit(1)
        }
      }
      
      const restoreOptions = {
        dropDatabase: options.drop
      }
      
      let result
      
      if (isCloudUrl) {
        result = await backupService.restoreFromCloud(backupFile, restoreOptions)
      } else {
        result = await backupService.restoreBackup(backupFile, restoreOptions)
      }
      
      if (result.success) {
        console.log(chalk.green('\n✅ Database restored successfully!'))
        console.log(chalk.gray(`⏱️  Completed at: ${result.timestamp.toLocaleString()}`))
      } else {
        console.log(chalk.red(`\n❌ Restore failed: ${result.error}`))
        process.exit(1)
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Restore error:'), error.message)
      process.exit(1)
    }
  })

// List command
program
  .command('list')
  .alias('ls')
  .description('List available backups')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('📋 Listing available backups...\n'))
      
      const backups = await backupService.listBackups()
      
      if (backups.length === 0) {
        console.log(chalk.yellow('No backups found'))
        return
      }
      
      backups.forEach((backup, index) => {
        const typeColor = backup.type === 'full' ? 'green' : 
                         backup.type === 'incremental' ? 'blue' : 
                         backup.type === 'schema' ? 'yellow' : 'gray'
        
        console.log(`${chalk.gray((index + 1).toString().padStart(2))}. ${chalk[typeColor](backup.type.toUpperCase())} ${backup.filename}`)
        
        if (options.verbose) {
          console.log(`    ${chalk.gray('Size:')} ${backup.sizeFormatted}`)
          console.log(`    ${chalk.gray('Date:')} ${backup.date.toLocaleString()}`)
          console.log(`    ${chalk.gray('Age:')} ${backup.age}`)
          console.log(`    ${chalk.gray('Path:')} ${backup.filepath}`)
          console.log()
        } else {
          console.log(`    ${chalk.gray(backup.sizeFormatted)} • ${backup.age}`)
        }
      })
      
    } catch (error) {
      console.error(chalk.red('❌ List error:'), error.message)
      process.exit(1)
    }
  })

// Verify command
program
  .command('verify')
  .description('Verify backup integrity')
  .argument('<backup-file>', 'Path to backup file')
  .action(async (backupFile) => {
    try {
      console.log(chalk.cyan('🔍 Verifying backup integrity...'))
      
      const result = await backupService.verifyBackup(backupFile)
      
      if (result.valid) {
        console.log(chalk.green('✅ Backup integrity verified'))
        if (result.checksum) {
          console.log(chalk.gray(`🔐 Checksum: ${result.checksum}`))
        }
      } else {
        console.log(chalk.red(`❌ Backup integrity check failed: ${result.error}`))
        process.exit(1)
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Verify error:'), error.message)
      process.exit(1)
    }
  })

// Cleanup command
program
  .command('cleanup')
  .description('Clean up old backups')
  .option('--dry-run', 'Show what would be deleted without actually deleting')
  .option('--keep <number>', 'Number of backups to keep', backupService.config.maxBackups)
  .action(async (options) => {
    try {
      console.log(chalk.cyan('🧹 Cleaning up old backups...'))
      
      const originalMaxBackups = backupService.config.maxBackups
      
      if (options.keep) {
        backupService.config.maxBackups = parseInt(options.keep)
      }
      
      if (options.dryRun) {
        const backups = await backupService.listBackups()
        const backupsToDelete = backups.slice(backupService.config.maxBackups)
        
        if (backupsToDelete.length === 0) {
          console.log(chalk.green('No backups need to be cleaned up'))
          return
        }
        
        console.log(chalk.yellow(`Would delete ${backupsToDelete.length} backup(s):`))
        backupsToDelete.forEach(backup => {
          console.log(`  ${chalk.red('×')} ${backup.filename} (${backup.sizeFormatted})`)
        })
        
      } else {
        await backupService.cleanupOldBackups()
        console.log(chalk.green('✅ Cleanup completed'))
      }
      
      // Restore original config
      backupService.config.maxBackups = originalMaxBackups
      
    } catch (error) {
      console.error(chalk.red('❌ Cleanup error:'), error.message)
      process.exit(1)
    }
  })

// Schedule command
program
  .command('schedule')
  .description('Manage backup schedules')
  .option('--daily [time]', 'Schedule daily backups at specified time (default: 02:00)')
  .option('--weekly [day]', 'Schedule weekly backups on specified day (default: sunday)')
  .option('--monthly [day]', 'Schedule monthly backups on specified day (default: 1)')
  .option('--stop', 'Stop all scheduled backups')
  .action(async (options) => {
    try {
      if (options.stop) {
        backupService.stopScheduler()
        console.log(chalk.green('✅ All scheduled backups stopped'))
        return
      }
      
      const schedule = {}
      
      if (options.daily) {
        schedule.daily = true
        schedule.time = options.daily === true ? '02:00' : options.daily
      }
      
      if (options.weekly) {
        schedule.weekly = true
        const weekDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const dayName = options.weekly === true ? 'sunday' : options.weekly.toLowerCase()
        schedule.weekDay = weekDays.indexOf(dayName)
        if (schedule.weekDay === -1) schedule.weekDay = 0 // Default to Sunday
      }
      
      if (options.monthly) {
        schedule.monthly = true
        schedule.monthDay = options.monthly === true ? 1 : parseInt(options.monthly)
      }
      
      if (Object.keys(schedule).length === 0) {
        console.log(chalk.yellow('No schedule options provided. Use --daily, --weekly, or --monthly'))
        return
      }
      
      backupService.startScheduler(schedule)
      console.log(chalk.green('✅ Backup schedule configured'))
      
    } catch (error) {
      console.error(chalk.red('❌ Schedule error:'), error.message)
      process.exit(1)
    }
  })

// Status command
program
  .command('status')
  .description('Show backup service status and statistics')
  .action(async () => {
    try {
      console.log(chalk.cyan('📊 Backup Service Status\n'))
      
      const stats = backupService.getBackupStatistics()
      const backups = await backupService.listBackups()
      
      console.log(chalk.green('📈 Statistics:'))
      console.log(`  Total backups: ${stats.totalBackups}`)
      console.log(`  Successful: ${chalk.green(stats.successfulBackups)}`)
      console.log(`  Failed: ${chalk.red(stats.failedBackups)}`)
      console.log(`  Available backups: ${backups.length}`)
      
      if (stats.lastBackup) {
        console.log(chalk.green('\n✅ Last successful backup:'))
        console.log(`  File: ${stats.lastBackup.filename}`)
        console.log(`  Type: ${stats.lastBackup.type}`)
        console.log(`  Size: ${stats.lastBackup.sizeFormatted}`)
        console.log(`  Date: ${stats.lastBackup.timestamp.toLocaleString()}`)
      }
      
      if (stats.lastFailure) {
        console.log(chalk.red('\n❌ Last failure:'))
        console.log(`  Date: ${stats.lastFailure.timestamp.toLocaleString()}`)
        console.log(`  Error: ${stats.lastFailure.error}`)
      }
      
      console.log(chalk.blue('\n⚙️  Configuration:'))
      console.log(`  Database: ${backupService.config.databaseName}`)
      console.log(`  Backup directory: ${backupService.config.backupDirectory}`)
      console.log(`  Max backups: ${backupService.config.maxBackups}`)
      console.log(`  Compression: ${backupService.config.compression ? '✅' : '❌'}`)
      console.log(`  Encryption: ${backupService.config.encryption ? '✅' : '❌'}`)
      console.log(`  Cloud storage: ${backupService.config.cloudStorage.enabled ? '✅' : '❌'}`)
      
    } catch (error) {
      console.error(chalk.red('❌ Status error:'), error.message)
      process.exit(1)
    }
  })

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Interactive backup management')
  .action(async () => {
    try {
      console.log(chalk.cyan('🎮 Interactive Backup Management\n'))
      
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '📦 Create a backup', value: 'create' },
            { name: '🔄 Restore from backup', value: 'restore' },
            { name: '📋 List available backups', value: 'list' },
            { name: '🔍 Verify backup integrity', value: 'verify' },
            { name: '🧹 Clean up old backups', value: 'cleanup' },
            { name: '📊 View status and statistics', value: 'status' },
            { name: '⚙️  Manage schedules', value: 'schedule' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ])
      
      switch (action) {
        case 'create':
          const { type, compression, encryption } = await inquirer.prompt([
            {
              type: 'list',
              name: 'type',
              message: 'Backup type:',
              choices: ['full', 'schema', 'data', 'incremental']
            },
            {
              type: 'confirm',
              name: 'compression',
              message: 'Enable compression?',
              default: true
            },
            {
              type: 'confirm',
              name: 'encryption',
              message: 'Enable encryption?',
              default: false
            }
          ])
          
          backupService.config.compression = compression
          backupService.config.encryption = encryption
          
          if (encryption) {
            const { key } = await inquirer.prompt([
              {
                type: 'password',
                name: 'key',
                message: 'Enter encryption key:',
                mask: '*'
              }
            ])
            backupService.config.encryptionKey = key
          }
          
          console.log(chalk.cyan('\n🚀 Creating backup...'))
          const result = await backupService.createBackup(type)
          
          if (result.success) {
            console.log(chalk.green(`\n✅ Backup created: ${result.filename}`))
          } else {
            console.log(chalk.red(`\n❌ Backup failed: ${result.error}`))
          }
          break
          
        case 'list':
          const backups = await backupService.listBackups()
          console.log(chalk.cyan('\n📋 Available backups:'))
          backups.forEach((backup, index) => {
            console.log(`${index + 1}. ${backup.filename} (${backup.sizeFormatted}) - ${backup.age}`)
          })
          break
          
        case 'status':
          const stats = backupService.getBackupStatistics()
          console.log(chalk.cyan('\n📊 Status:'))
          console.log(`Total: ${stats.totalBackups}, Successful: ${stats.successfulBackups}, Failed: ${stats.failedBackups}`)
          break
          
        case 'exit':
          console.log(chalk.green('👋 Goodbye!'))
          break
          
        default:
          console.log(chalk.yellow('Feature coming soon!'))
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Interactive mode error:'), error.message)
      process.exit(1)
    }
  })

// Error handling
program.on('command:*', () => {
  console.error(chalk.red('❌ Invalid command. Use --help to see available commands.'))
  process.exit(1)
})

// Parse arguments
program.parse()

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
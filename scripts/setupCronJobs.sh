#!/bin/bash

# GE Metrics Cron Jobs Setup Script
# This script sets up all necessary cron jobs for automated data collection and monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/path/to/ge-metrics"  # Update this to your actual project path
LOG_DIR="$PROJECT_DIR/logs"
BACKUP_DIR="$PROJECT_DIR/backups"

echo -e "${BLUE}🚀 Setting up GE Metrics Cron Jobs...${NC}"

# Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p "$LOG_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p "$PROJECT_DIR/data"

# Function to add cron job
add_cron_job() {
    local schedule="$1"
    local command="$2"
    local description="$3"
    
    echo -e "${BLUE}⏰ Adding: $description${NC}"
    echo "# $description"
    echo "$schedule cd $PROJECT_DIR && $command"
    echo ""
}

# Create the cron jobs file
CRON_FILE="/tmp/ge-metrics-cron.txt"

cat > "$CRON_FILE" << EOF
# GE Metrics Automated Tasks
# Generated on $(date)
# Project Directory: $PROJECT_DIR

EOF

# Add all cron jobs to the file
{
    add_cron_job "*/5 * * * *" "node scripts/monitorVolumeAlerts.js >> $LOG_DIR/volume-alerts.log 2>&1" "Volume Alerts Monitor (every 5 minutes)"
    
    add_cron_job "*/15 * * * *" "node scripts/monitorMarketWhales.js >> $LOG_DIR/whale-monitor.log 2>&1" "Market Whales Monitor (every 15 minutes)"
    
    add_cron_job "*/10 * * * *" "node scripts/collectCurrentPrices.js >> $LOG_DIR/price-collection.log 2>&1" "Current Prices Collection (every 10 minutes)"
    
    add_cron_job "0 */2 * * *" "node scripts/updateMarketAnalysis.js >> $LOG_DIR/market-analysis.log 2>&1" "Market Analysis Update (every 2 hours)"
    
    add_cron_job "0 6 * * *" "node scripts/updateFutureItems.js >> $LOG_DIR/future-items.log 2>&1" "Future Items Timeline Update (daily at 6 AM)"
    
    add_cron_job "30 3 * * *" "node scripts/cleanupOldData.js >> $LOG_DIR/cleanup.log 2>&1" "Old Data Cleanup (daily at 3:30 AM)"
    
    add_cron_job "0 2 * * 0" "node scripts/generateWeeklyReport.js >> $LOG_DIR/weekly-reports.log 2>&1" "Weekly Report Generation (Sunday at 2 AM)"
    
    add_cron_job "15 1 * * *" "node scripts/backupDatabase.js >> $LOG_DIR/backup.log 2>&1" "Database Backup (daily at 1:15 AM)"
    
    add_cron_job "0 4 * * 1" "node scripts/updateAIPredictions.js >> $LOG_DIR/ai-predictions.log 2>&1" "AI Predictions Model Update (Monday at 4 AM)"
    
    add_cron_job "45 23 * * *" "node scripts/rotateLogFiles.js >> $LOG_DIR/log-rotation.log 2>&1" "Log Files Rotation (daily at 11:45 PM)"
} >> "$CRON_FILE"

echo -e "${GREEN}📋 Cron jobs configuration created at: $CRON_FILE${NC}"
echo ""
echo -e "${YELLOW}📄 Preview of cron jobs:${NC}"
cat "$CRON_FILE"
echo ""

# Ask user if they want to install the cron jobs
echo -e "${BLUE}❓ Do you want to install these cron jobs? (y/N)${NC}"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    # Backup existing crontab
    echo -e "${YELLOW}💾 Backing up existing crontab...${NC}"
    crontab -l > "$BACKUP_DIR/crontab-backup-$(date +%Y%m%d-%H%M%S).txt" 2>/dev/null || echo "No existing crontab found"
    
    # Install new cron jobs
    echo -e "${YELLOW}⚙️ Installing cron jobs...${NC}"
    
    # Get existing crontab and append new jobs
    (crontab -l 2>/dev/null || echo "") | grep -v "# GE Metrics" > /tmp/existing-cron.txt
    cat /tmp/existing-cron.txt "$CRON_FILE" | crontab -
    
    echo -e "${GREEN}✅ Cron jobs installed successfully!${NC}"
    
    # Show installed cron jobs
    echo -e "${BLUE}📋 Current crontab:${NC}"
    crontab -l
    
else
    echo -e "${YELLOW}⏭️ Cron jobs not installed. You can manually install them later using:${NC}"
    echo "crontab $CRON_FILE"
fi

# Create log rotation script
echo -e "${BLUE}📝 Creating log rotation script...${NC}"

cat > "$PROJECT_DIR/scripts/rotateLogFiles.js" << 'EOF'
#!/usr/bin/env node

/**
 * Log Files Rotation Script
 * Rotates and compresses old log files to prevent disk space issues
 */

import fs from 'fs/promises'
import path from 'path'
import { createGzip } from 'zlib'
import { pipeline } from 'stream/promises'

const LOG_DIR = path.join(process.cwd(), 'logs')
const MAX_LOG_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_LOG_AGE_DAYS = 30

async function rotateLogFiles() {
    try {
        const files = await fs.readdir(LOG_DIR)
        
        for (const file of files) {
            if (!file.endsWith('.log')) continue
            
            const filePath = path.join(LOG_DIR, file)
            const stats = await fs.stat(filePath)
            
            // Check if file needs rotation
            if (stats.size > MAX_LOG_SIZE || stats.mtime < new Date(Date.now() - MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000)) {
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
                const rotatedName = `${file}.${timestamp}.gz`
                
                // Compress and move the file
                const readStream = createReadStream(filePath)
                const writeStream = createWriteStream(path.join(LOG_DIR, rotatedName))
                const gzipStream = createGzip()
                
                await pipeline(readStream, gzipStream, writeStream)
                
                // Create new empty log file
                await fs.writeFile(filePath, '')
                
                console.log(`Rotated ${file} to ${rotatedName}`)
            }
        }
        
        console.log('Log rotation completed successfully')
    } catch (error) {
        console.error('Error during log rotation:', error)
        process.exit(1)
    }
}

rotateLogFiles()
EOF

chmod +x "$PROJECT_DIR/scripts/rotateLogFiles.js"

# Create cleanup script
echo -e "${BLUE}🧹 Creating data cleanup script...${NC}"

cat > "$PROJECT_DIR/scripts/cleanupOldData.js" << 'EOF'
#!/usr/bin/env node

/**
 * Old Data Cleanup Script
 * Removes old data entries to prevent database bloat
 */

import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const MAX_DATA_AGE_DAYS = 90 // Keep data for 90 days

async function cleanupOldData() {
    try {
        console.log('Starting data cleanup...')
        
        // Clean up old whale activity data
        const whaleFile = path.join(DATA_DIR, 'whale-activity.json')
        if (await fs.access(whaleFile).then(() => true).catch(() => false)) {
            const data = JSON.parse(await fs.readFile(whaleFile, 'utf8'))
            
            // Filter out old entries
            if (data.analysis && data.analysis.timestamp) {
                const cutoffDate = new Date(Date.now() - MAX_DATA_AGE_DAYS * 24 * 60 * 60 * 1000)
                if (new Date(data.analysis.timestamp) < cutoffDate) {
                    console.log('Removing old whale activity data')
                    await fs.unlink(whaleFile)
                }
            }
        }
        
        // Clean up old compressed logs
        const logDir = path.join(process.cwd(), 'logs')
        const logFiles = await fs.readdir(logDir)
        
        for (const file of logFiles) {
            if (file.endsWith('.gz')) {
                const filePath = path.join(logDir, file)
                const stats = await fs.stat(filePath)
                const cutoffDate = new Date(Date.now() - MAX_DATA_AGE_DAYS * 24 * 60 * 60 * 1000)
                
                if (stats.mtime < cutoffDate) {
                    await fs.unlink(filePath)
                    console.log(`Removed old log file: ${file}`)
                }
            }
        }
        
        console.log('Data cleanup completed successfully')
    } catch (error) {
        console.error('Error during data cleanup:', error)
        process.exit(1)
    }
}

cleanupOldData()
EOF

chmod +x "$PROJECT_DIR/scripts/cleanupOldData.js"

# Create monitoring script
echo -e "${BLUE}📊 Creating system monitoring script...${NC}"

cat > "$PROJECT_DIR/scripts/systemHealthCheck.js" << 'EOF'
#!/usr/bin/env node

/**
 * System Health Check Script
 * Monitors system resources and application health
 */

import fs from 'fs/promises'
import { execSync } from 'child_process'

async function healthCheck() {
    try {
        const health = {
            timestamp: new Date().toISOString(),
            system: {},
            application: {},
            alerts: []
        }
        
        // Check disk space
        const diskUsage = execSync('df -h /', { encoding: 'utf8' })
        const diskLine = diskUsage.split('\n')[1]
        const diskPercent = parseInt(diskLine.split(/\s+/)[4])
        
        health.system.diskUsage = diskPercent
        if (diskPercent > 90) {
            health.alerts.push({ type: 'critical', message: `Disk usage at ${diskPercent}%` })
        }
        
        // Check memory usage
        const memInfo = execSync('free -m', { encoding: 'utf8' })
        const memLine = memInfo.split('\n')[1]
        const [, total, used] = memLine.split(/\s+/).map(Number)
        const memPercent = Math.round((used / total) * 100)
        
        health.system.memoryUsage = memPercent
        if (memPercent > 85) {
            health.alerts.push({ type: 'warning', message: `Memory usage at ${memPercent}%` })
        }
        
        // Check log file sizes
        const logDir = path.join(process.cwd(), 'logs')
        const logFiles = await fs.readdir(logDir)
        
        for (const file of logFiles) {
            if (file.endsWith('.log')) {
                const stats = await fs.stat(path.join(logDir, file))
                if (stats.size > 50 * 1024 * 1024) { // 50MB
                    health.alerts.push({ type: 'warning', message: `Large log file: ${file} (${Math.round(stats.size / 1024 / 1024)}MB)` })
                }
            }
        }
        
        // Save health report
        await fs.writeFile(
            path.join(process.cwd(), 'data', 'health-report.json'),
            JSON.stringify(health, null, 2)
        )
        
        // Log alerts
        if (health.alerts.length > 0) {
            console.log('🚨 Health check alerts:')
            health.alerts.forEach(alert => {
                console.log(`  ${alert.type.toUpperCase()}: ${alert.message}`)
            })
        } else {
            console.log('✅ System health check passed')
        }
        
    } catch (error) {
        console.error('Error during health check:', error)
        process.exit(1)
    }
}

healthCheck()
EOF

chmod +x "$PROJECT_DIR/scripts/systemHealthCheck.js"

# Final instructions
echo ""
echo -e "${GREEN}🎉 Setup completed!${NC}"
echo ""
echo -e "${BLUE}📋 Summary of created scripts:${NC}"
echo "  • Volume alerts monitoring (every 5 minutes)"
echo "  • Market whales detection (every 15 minutes)"
echo "  • Price data collection (every 10 minutes)"
echo "  • Future items timeline updates (daily)"
echo "  • Data cleanup and log rotation"
echo "  • System health monitoring"
echo ""
echo -e "${YELLOW}🔧 Next steps:${NC}"
echo "1. Update PROJECT_DIR in this script to your actual path"
echo "2. Test individual scripts before enabling cron jobs"
echo "3. Monitor log files in $LOG_DIR"
echo "4. Set up alerting for critical errors"
echo ""
echo -e "${BLUE}📖 To view current cron jobs: ${NC}crontab -l"
echo -e "${BLUE}📖 To edit cron jobs: ${NC}crontab -e"
echo -e "${BLUE}📖 To remove all cron jobs: ${NC}crontab -r"

# Cleanup
rm -f "$CRON_FILE" /tmp/existing-cron.txt

echo -e "${GREEN}✅ GE Metrics cron jobs setup complete!${NC}" 
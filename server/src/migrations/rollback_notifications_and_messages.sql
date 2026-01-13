-- Rollback Migration: Remove notifications and user_messages tables
-- Purpose: Rollback script for notifications and messaging system

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS user_messages CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- Note: This rollback will permanently delete all notification and message data
-- Make sure to backup data before running this rollback if needed
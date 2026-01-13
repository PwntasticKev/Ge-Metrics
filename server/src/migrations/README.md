# Database Migrations

This directory contains database migration files for the GE-Metrics application.

## Current Migrations

- `001_create_notifications_table.sql` - Creates the notifications table for system notifications
- `002_create_user_messages_table.sql` - Creates the user_messages table for user-to-user messaging
- `rollback_notifications_and_messages.sql` - Rollback script to remove both tables

## Usage

### Running Migrations

```bash
# Set your database URL
export DATABASE_URL="your_postgres_connection_string"

# Run all pending migrations
cd server/src/migrations
node run-migrations.js
```

### Rolling Back

```bash
# Rollback notifications and messaging tables
node run-migrations.js --rollback
```

### Manual Migration (Alternative)

You can also run migrations manually using psql:

```bash
# Apply migrations
psql $DATABASE_URL -f 001_create_notifications_table.sql
psql $DATABASE_URL -f 002_create_user_messages_table.sql

# Rollback if needed
psql $DATABASE_URL -f rollback_notifications_and_messages.sql
```

## Migration Tracking

The migration runner automatically creates a `_migrations` table to track which migrations have been applied. This prevents duplicate runs and ensures migrations are only applied once.

## Production Deployment

Migrations are automatically run by GitHub Actions when code is pushed to the main branch. See `.github/workflows/deploy.yml` for details.

## Safety Notes

- Always backup your database before running migrations in production
- Test migrations in a staging environment first
- Rollbacks will permanently delete data - use with caution
- The migration runner uses transactions to ensure atomicity
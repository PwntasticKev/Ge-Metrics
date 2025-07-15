-- Fix Ge-Metrics Database Schema
-- This script creates missing tables and fixes ID incrementing

-- Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on audit_log for better performance
CREATE INDEX IF NOT EXISTS audit_log_user_id_idx ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log(action);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at);

-- Create employees table if it doesn't exist
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'support',
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for employees table
CREATE INDEX IF NOT EXISTS employees_user_id_idx ON employees(user_id);
CREATE INDEX IF NOT EXISTS employees_role_idx ON employees(role);
CREATE INDEX IF NOT EXISTS employees_department_idx ON employees(department);

-- Update user_goals table to add missing columns
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS current_value INTEGER DEFAULT 0;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS description TEXT;

-- Update user_achievements table to add missing columns
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS achievement_id TEXT;
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Ensure all tables have proper auto-incrementing IDs
-- Note: PostgreSQL uses SERIAL which is auto-incrementing

-- Add any missing constraints
ALTER TABLE clans ADD CONSTRAINT IF NOT EXISTS clans_name_unique UNIQUE (name);

-- Verify the schema
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'subscriptions', 'audit_log', 'employees', 'user_goals', 'user_achievements')
ORDER BY table_name, ordinal_position; 
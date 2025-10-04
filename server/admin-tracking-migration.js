#!/usr/bin/env node

/**
 * ADMIN TRACKING TABLES MIGRATION
 * Creates comprehensive admin tracking infrastructure for analytics and monitoring
 */

import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

console.log('🚀 Creating comprehensive admin tracking tables...')

async function createAdminTrackingTables() {
  const databaseUrl = process.env.CORRECT_DATABASE_URL || process.env.DATABASE_URL
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    // Create API Usage Logs table
    console.log('📋 Creating api_usage_logs table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_usage_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id integer REFERENCES users(id),
        endpoint text NOT NULL,
        method text NOT NULL,
        status_code integer NOT NULL,
        response_time integer,
        ip_address text,
        user_agent text,
        request_size integer,
        response_size integer,
        error_message text,
        created_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS api_usage_logs_user_id_idx ON api_usage_logs(user_id);
      CREATE INDEX IF NOT EXISTS api_usage_logs_endpoint_idx ON api_usage_logs(endpoint);
      CREATE INDEX IF NOT EXISTS api_usage_logs_created_at_idx ON api_usage_logs(created_at);
      CREATE INDEX IF NOT EXISTS api_usage_logs_status_code_idx ON api_usage_logs(status_code);
    `)

    // Create Admin Actions table
    console.log('📋 Creating admin_actions table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_actions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_user_id integer NOT NULL REFERENCES users(id),
        action_type text NOT NULL,
        target_user_id integer REFERENCES users(id),
        target_resource text,
        target_resource_id text,
        action_details jsonb,
        previous_state jsonb,
        new_state jsonb,
        ip_address text,
        user_agent text,
        success boolean DEFAULT true NOT NULL,
        error_message text,
        created_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS admin_actions_admin_user_idx ON admin_actions(admin_user_id);
      CREATE INDEX IF NOT EXISTS admin_actions_target_user_idx ON admin_actions(target_user_id);
      CREATE INDEX IF NOT EXISTS admin_actions_action_type_idx ON admin_actions(action_type);
      CREATE INDEX IF NOT EXISTS admin_actions_created_at_idx ON admin_actions(created_at);
    `)

    // Create Security Events table
    console.log('📋 Creating security_events table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id integer REFERENCES users(id),
        event_type text NOT NULL,
        severity text DEFAULT 'low' NOT NULL,
        ip_address text,
        user_agent text,
        details jsonb,
        resolved boolean DEFAULT false,
        resolved_by integer REFERENCES users(id),
        resolved_at timestamp without time zone,
        created_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS security_events_user_id_idx ON security_events(user_id);
      CREATE INDEX IF NOT EXISTS security_events_event_type_idx ON security_events(event_type);
      CREATE INDEX IF NOT EXISTS security_events_severity_idx ON security_events(severity);
      CREATE INDEX IF NOT EXISTS security_events_created_at_idx ON security_events(created_at);
    `)

    // Create System Metrics table
    console.log('📋 Creating system_metrics table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_metrics (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_type text NOT NULL,
        value integer NOT NULL,
        unit text,
        metadata jsonb,
        created_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS system_metrics_metric_type_idx ON system_metrics(metric_type);
      CREATE INDEX IF NOT EXISTS system_metrics_created_at_idx ON system_metrics(created_at);
    `)

    // Create Cron Job Logs table
    console.log('📋 Creating cron_job_logs table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS cron_job_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        job_name text NOT NULL,
        job_type text NOT NULL,
        status text NOT NULL,
        started_at timestamp without time zone DEFAULT now() NOT NULL,
        completed_at timestamp without time zone,
        duration integer,
        records_processed integer,
        errors_count integer DEFAULT 0,
        error_message text,
        logs text,
        metadata jsonb
      )
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS cron_job_logs_job_name_idx ON cron_job_logs(job_name);
      CREATE INDEX IF NOT EXISTS cron_job_logs_status_idx ON cron_job_logs(status);
      CREATE INDEX IF NOT EXISTS cron_job_logs_started_at_idx ON cron_job_logs(started_at);
    `)

    // Create Stripe Events table
    console.log('📋 Creating stripe_events table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS stripe_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        stripe_event_id text NOT NULL UNIQUE,
        event_type text NOT NULL,
        user_id integer REFERENCES users(id),
        stripe_customer_id text,
        stripe_subscription_id text,
        amount integer,
        currency text,
        status text NOT NULL,
        processed_at timestamp without time zone,
        error_message text,
        raw_data jsonb,
        created_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS stripe_events_stripe_event_id_idx ON stripe_events(stripe_event_id);
      CREATE INDEX IF NOT EXISTS stripe_events_event_type_idx ON stripe_events(event_type);
      CREATE INDEX IF NOT EXISTS stripe_events_user_id_idx ON stripe_events(user_id);
      CREATE INDEX IF NOT EXISTS stripe_events_created_at_idx ON stripe_events(created_at);
    `)

    // Create Revenue Analytics table
    console.log('📋 Creating revenue_analytics table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS revenue_analytics (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        date timestamp without time zone NOT NULL,
        period_type text NOT NULL,
        total_revenue integer DEFAULT 0,
        new_subscriptions integer DEFAULT 0,
        canceled_subscriptions integer DEFAULT 0,
        trial_conversions integer DEFAULT 0,
        refund_amount integer DEFAULT 0,
        churn_rate integer DEFAULT 0,
        created_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `)
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS revenue_analytics_date_idx ON revenue_analytics(date);
      CREATE INDEX IF NOT EXISTS revenue_analytics_period_type_idx ON revenue_analytics(period_type);
    `)

    console.log('✅ All admin tracking tables created successfully!')

    // Insert some sample data for testing
    console.log('📋 Adding sample data for testing...')
    
    // Sample API usage logs
    await client.query(`
      INSERT INTO api_usage_logs (endpoint, method, status_code, response_time, ip_address)
      VALUES 
        ('/trpc/auth.me', 'GET', 200, 45, '127.0.0.1'),
        ('/trpc/billing.getSubscription', 'GET', 200, 120, '127.0.0.1'),
        ('/trpc/items.getAllItems', 'GET', 200, 89, '127.0.0.1')
      ON CONFLICT DO NOTHING
    `)

    // Sample system metrics
    await client.query(`
      INSERT INTO system_metrics (metric_type, value, unit)
      VALUES 
        ('api_response_time', 95, 'ms'),
        ('active_connections', 12, 'count'),
        ('memory_usage', 512, 'MB')
      ON CONFLICT DO NOTHING
    `)

    // Sample cron job logs
    await client.query(`
      INSERT INTO cron_job_logs (job_name, job_type, status, records_processed)
      VALUES 
        ('data_scraper', 'data_scraping', 'completed', 1500),
        ('price_updater', 'data_scraping', 'completed', 892),
        ('email_notifications', 'notifications', 'completed', 25)
      ON CONFLICT DO NOTHING
    `)

    console.log('✅ Sample data added successfully!')

    // Verify table creation
    console.log('🔍 Verifying table creation...')
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'api_usage_logs', 'admin_actions', 'security_events', 
        'system_metrics', 'cron_job_logs', 'stripe_events', 'revenue_analytics'
      )
      ORDER BY table_name
    `)

    console.log('📊 Created admin tracking tables:')
    tables.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`)
    })

    console.log('\n🎉 Admin tracking infrastructure setup completed!')
    console.log('📈 Ready for comprehensive analytics and monitoring!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await client.end()
  }
}

createAdminTrackingTables()
  .then(() => {
    console.log('\n🚀 Admin tracking migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error.message)
    process.exit(1)
  })
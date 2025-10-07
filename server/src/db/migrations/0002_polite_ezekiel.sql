CREATE TABLE "admin_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" integer NOT NULL,
	"action_type" text NOT NULL,
	"target_user_id" integer,
	"target_resource" text,
	"target_resource_id" text,
	"action_details" jsonb,
	"previous_state" jsonb,
	"new_state" jsonb,
	"ip_address" text,
	"user_agent" text,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"status_code" integer NOT NULL,
	"response_time" integer,
	"ip_address" text,
	"user_agent" text,
	"request_size" integer,
	"response_size" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cron_job_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_name" text NOT NULL,
	"job_type" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration" integer,
	"records_processed" integer,
	"errors_count" integer DEFAULT 0,
	"error_message" text,
	"logs" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "cron_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"schedule" text NOT NULL,
	"schedule_description" text,
	"command" text NOT NULL,
	"category" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"timeout" integer DEFAULT 300,
	"retries" integer DEFAULT 3,
	"notifications" boolean DEFAULT true,
	"last_run" timestamp,
	"next_run" timestamp,
	"status" text DEFAULT 'idle',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formulas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"formula" text NOT NULL,
	"parameters" jsonb,
	"examples" jsonb,
	"notes" text,
	"tags" jsonb,
	"complexity" text DEFAULT 'beginner' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"period_type" text NOT NULL,
	"total_revenue" integer DEFAULT 0,
	"new_subscriptions" integer DEFAULT 0,
	"canceled_subscriptions" integer DEFAULT 0,
	"trial_conversions" integer DEFAULT 0,
	"refund_amount" integer DEFAULT 0,
	"churn_rate" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer,
	"event_type" text NOT NULL,
	"severity" text DEFAULT 'low' NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"details" jsonb,
	"resolved" boolean DEFAULT false,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"user_id" integer,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"amount" integer,
	"currency" text,
	"status" text NOT NULL,
	"processed_at" timestamp,
	"error_message" text,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "system_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_type" text NOT NULL,
	"value" integer NOT NULL,
	"unit" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"data_type" text NOT NULL,
	"is_secret" boolean DEFAULT false,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"invited_by" integer NOT NULL,
	"invitation_token" text NOT NULL,
	"trial_days" integer DEFAULT 14 NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"email_sent" boolean DEFAULT false,
	"email_sent_at" timestamp,
	"accepted_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_invitations_invitation_token_unique" UNIQUE("invitation_token")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"session_token" text NOT NULL,
	"refresh_token" text,
	"ip_address" text,
	"user_agent" text,
	"device_info" jsonb,
	"location" jsonb,
	"is_active" boolean DEFAULT true,
	"last_activity" timestamp DEFAULT now() NOT NULL,
	"login_method" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_session_token_unique" UNIQUE("session_token"),
	CONSTRAINT "user_sessions_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
ALTER TABLE "employees" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "employees" CASCADE;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_start" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_end" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_days" integer DEFAULT 14;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "is_trialing" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_extended_by" integer;--> statement-breakpoint
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cron_jobs" ADD CONSTRAINT "cron_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formulas" ADD CONSTRAINT "formulas_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_events" ADD CONSTRAINT "stripe_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_actions_admin_user_idx" ON "admin_actions" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "admin_actions_target_user_idx" ON "admin_actions" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "admin_actions_action_type_idx" ON "admin_actions" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "admin_actions_created_at_idx" ON "admin_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_usage_logs_user_id_idx" ON "api_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_usage_logs_endpoint_idx" ON "api_usage_logs" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "api_usage_logs_created_at_idx" ON "api_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_usage_logs_status_code_idx" ON "api_usage_logs" USING btree ("status_code");--> statement-breakpoint
CREATE INDEX "cron_job_logs_job_name_idx" ON "cron_job_logs" USING btree ("job_name");--> statement-breakpoint
CREATE INDEX "cron_job_logs_status_idx" ON "cron_job_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cron_job_logs_started_at_idx" ON "cron_job_logs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "cron_jobs_category_idx" ON "cron_jobs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "cron_jobs_enabled_idx" ON "cron_jobs" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "cron_jobs_status_idx" ON "cron_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cron_jobs_next_run_idx" ON "cron_jobs" USING btree ("next_run");--> statement-breakpoint
CREATE INDEX "cron_jobs_created_by_idx" ON "cron_jobs" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "formulas_category_idx" ON "formulas" USING btree ("category");--> statement-breakpoint
CREATE INDEX "formulas_complexity_idx" ON "formulas" USING btree ("complexity");--> statement-breakpoint
CREATE INDEX "formulas_is_active_idx" ON "formulas" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "formulas_created_by_idx" ON "formulas" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "revenue_analytics_date_idx" ON "revenue_analytics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "revenue_analytics_period_type_idx" ON "revenue_analytics" USING btree ("period_type");--> statement-breakpoint
CREATE INDEX "security_events_user_id_idx" ON "security_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_events_event_type_idx" ON "security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "security_events_severity_idx" ON "security_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "security_events_created_at_idx" ON "security_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stripe_events_stripe_event_id_idx" ON "stripe_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "stripe_events_event_type_idx" ON "stripe_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "stripe_events_user_id_idx" ON "stripe_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stripe_events_created_at_idx" ON "stripe_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "system_metrics_metric_type_idx" ON "system_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "system_metrics_created_at_idx" ON "system_metrics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "system_settings_section_key_idx" ON "system_settings" USING btree ("section","key");--> statement-breakpoint
CREATE INDEX "system_settings_section_idx" ON "system_settings" USING btree ("section");--> statement-breakpoint
CREATE INDEX "system_settings_is_secret_idx" ON "system_settings" USING btree ("is_secret");--> statement-breakpoint
CREATE INDEX "user_invitations_email_idx" ON "user_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_invitations_token_idx" ON "user_invitations" USING btree ("invitation_token");--> statement-breakpoint
CREATE INDEX "user_invitations_status_idx" ON "user_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_invitations_expires_at_idx" ON "user_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_session_token_idx" ON "user_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "user_sessions_is_active_idx" ON "user_sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "user_sessions_last_activity_idx" ON "user_sessions" USING btree ("last_activity");--> statement-breakpoint
CREATE INDEX "subscriptions_trial_end_idx" ON "subscriptions" USING btree ("trial_end");
ALTER TABLE "user_settings" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "permissions" jsonb;
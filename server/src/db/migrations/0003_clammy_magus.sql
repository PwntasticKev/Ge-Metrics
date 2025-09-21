ALTER TABLE "potion_volumes" ADD COLUMN "hourly_volume" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "potion_volumes" ADD COLUMN "hourly_high_volume" integer;--> statement-breakpoint
ALTER TABLE "potion_volumes" ADD COLUMN "hourly_low_volume" integer;--> statement-breakpoint
ALTER TABLE "potion_volumes" ADD COLUMN "total_volume" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token_expires_at" timestamp;
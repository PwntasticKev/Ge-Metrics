-- Create favorites table if it doesn't exist
CREATE TABLE IF NOT EXISTS "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"item_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "favorites_user_id_idx" ON "favorites" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "favorites_unique_idx" ON "favorites" ("user_id", "item_id", "item_type");

-- Add foreign key constraint
ALTER TABLE "favorites" ADD CONSTRAINT IF NOT EXISTS "favorites_user_id_users_id_fk" 
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;


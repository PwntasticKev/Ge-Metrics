DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('admin', 'user');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "item_volumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"high_price_volume" integer NOT NULL,
	"low_price_volume" integer NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "item_volumes_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_volumes_item_id_idx" ON "item_volumes" ("item_id");

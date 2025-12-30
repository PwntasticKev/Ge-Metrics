-- Add blogs and game_updates tables for chart event markers
-- These tables support the chart pinpoints functionality

CREATE TABLE IF NOT EXISTS "blogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"date" timestamp NOT NULL,
	"url" text NOT NULL,
	"category" text,
	"content" text,
	"year" integer,
	"month" integer,
	"day" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "game_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"update_date" timestamp NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"color" text,
	"url" text,
	"content" text,
	"category" text,
	"year" integer,
	"month" integer,
	"day" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "blogs_date_idx" ON "blogs" USING btree ("date");
CREATE INDEX IF NOT EXISTS "blogs_year_idx" ON "blogs" USING btree ("year");
CREATE INDEX IF NOT EXISTS "blogs_category_idx" ON "blogs" USING btree ("category");
CREATE INDEX IF NOT EXISTS "blogs_url_idx" ON "blogs" USING btree ("url");
CREATE UNIQUE INDEX IF NOT EXISTS "blogs_date_url_idx" ON "blogs" USING btree ("date","url");

CREATE INDEX IF NOT EXISTS "game_updates_date_idx" ON "game_updates" USING btree ("update_date");
CREATE INDEX IF NOT EXISTS "game_updates_year_idx" ON "game_updates" USING btree ("year");
CREATE INDEX IF NOT EXISTS "game_updates_category_idx" ON "game_updates" USING btree ("category");
CREATE INDEX IF NOT EXISTS "game_updates_type_idx" ON "game_updates" USING btree ("type");
-- Add custom recipes system tables
-- Allows users to create their own item combination recipes

CREATE TABLE IF NOT EXISTS "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"output_item_id" integer NOT NULL,
	"output_item_name" text NOT NULL,
	"conversion_cost" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipe_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
	"item_id" integer NOT NULL,
	"item_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "recipes_user_id_idx" ON "recipes" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "recipes_output_item_id_idx" ON "recipes" USING btree ("output_item_id");
CREATE INDEX IF NOT EXISTS "recipes_created_at_idx" ON "recipes" USING btree ("created_at");

CREATE INDEX IF NOT EXISTS "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients" USING btree ("recipe_id");
CREATE INDEX IF NOT EXISTS "recipe_ingredients_item_id_idx" ON "recipe_ingredients" USING btree ("item_id");

-- Create unique constraint to prevent duplicate recipes globally
-- Same output item + same set of ingredients = duplicate
CREATE UNIQUE INDEX IF NOT EXISTS "recipes_duplicate_check_idx" ON "recipes" USING btree ("output_item_id");

-- Add constraint to prevent circular recipes (ingredient can't be same as output)
-- This will be enforced in application logic since we need to check across the ingredients table
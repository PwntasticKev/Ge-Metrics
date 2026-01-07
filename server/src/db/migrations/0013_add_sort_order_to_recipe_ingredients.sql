ALTER TABLE "recipe_ingredients" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
CREATE INDEX IF NOT EXISTS "recipe_ingredients_sort_order_idx" ON "recipe_ingredients" ("recipe_id", "sort_order");

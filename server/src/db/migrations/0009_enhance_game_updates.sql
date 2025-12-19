-- Enhance gameUpdates table with additional fields for better filtering and linking
ALTER TABLE game_updates
ADD COLUMN IF NOT EXISTS url TEXT,
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS month INTEGER,
ADD COLUMN IF NOT EXISTS day INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS game_updates_date_idx ON game_updates(update_date);
CREATE INDEX IF NOT EXISTS game_updates_year_idx ON game_updates(year);
CREATE INDEX IF NOT EXISTS game_updates_category_idx ON game_updates(category);
CREATE INDEX IF NOT EXISTS game_updates_type_idx ON game_updates(type);


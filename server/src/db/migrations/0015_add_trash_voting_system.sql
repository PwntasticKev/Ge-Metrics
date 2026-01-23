-- Migration: Add trash voting system
-- Created: 2026-01-20

-- User trash votes - one vote per user per item
CREATE TABLE IF NOT EXISTS user_trash_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Ensure one vote per user per item
  UNIQUE(user_id, item_id)
);

-- Admin override to clear trash votes and mark item as clean
CREATE TABLE IF NOT EXISTS item_admin_clean (
  item_id INTEGER PRIMARY KEY,
  cleaned_by INTEGER NOT NULL REFERENCES users(id),
  cleaned_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_trash_votes_user_id_idx ON user_trash_votes(user_id);
CREATE INDEX IF NOT EXISTS user_trash_votes_item_id_idx ON user_trash_votes(item_id);
CREATE INDEX IF NOT EXISTS user_trash_votes_created_at_idx ON user_trash_votes(created_at);
CREATE INDEX IF NOT EXISTS item_admin_clean_cleaned_by_idx ON item_admin_clean(cleaned_by);
CREATE INDEX IF NOT EXISTS item_admin_clean_cleaned_at_idx ON item_admin_clean(cleaned_at);

-- Add comments for documentation
COMMENT ON TABLE user_trash_votes IS 'Stores user votes marking items as trash/unreliable';
COMMENT ON TABLE item_admin_clean IS 'Admin overrides to clear trash status and prevent further voting';
COMMENT ON COLUMN user_trash_votes.user_id IS 'User who marked the item as trash';
COMMENT ON COLUMN user_trash_votes.item_id IS 'OSRS item ID that was marked as trash';
COMMENT ON COLUMN user_trash_votes.item_name IS 'Item name for easier debugging and admin review';
COMMENT ON COLUMN item_admin_clean.item_id IS 'Item that admin has marked as definitely not trash';
COMMENT ON COLUMN item_admin_clean.cleaned_by IS 'Admin user who cleared the trash status';
-- Add voting system for money making methods
-- This migration creates tables for tracking user votes on money making methods

-- Create method_votes table
CREATE TABLE IF NOT EXISTS method_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method_id UUID NOT NULL REFERENCES money_making_methods(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('thumbsup', 'thumbsdown', 'heart', 'fire', 'star')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Ensure one vote per user per method
  UNIQUE(user_id, method_id)
);

-- Add indexes for performance
CREATE INDEX idx_method_votes_method_id ON method_votes(method_id);
CREATE INDEX idx_method_votes_user_id ON method_votes(user_id);
CREATE INDEX idx_method_votes_vote_type ON method_votes(vote_type);
CREATE INDEX idx_method_votes_created_at ON method_votes(created_at DESC);

-- Add vote counts column to money_making_methods table
ALTER TABLE money_making_methods 
ADD COLUMN IF NOT EXISTS vote_counts JSONB DEFAULT '{"thumbsup": 0, "thumbsdown": 0, "heart": 0, "fire": 0, "star": 0}'::jsonb;

-- Add index on vote_counts for sorting
CREATE INDEX IF NOT EXISTS idx_money_making_methods_vote_counts ON money_making_methods USING GIN(vote_counts);

-- Create function to update vote counts when a vote is added/changed/removed
CREATE OR REPLACE FUNCTION update_method_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the vote counts for the method
  UPDATE money_making_methods
  SET vote_counts = (
    SELECT jsonb_build_object(
      'thumbsup', COUNT(*) FILTER (WHERE vote_type = 'thumbsup'),
      'thumbsdown', COUNT(*) FILTER (WHERE vote_type = 'thumbsdown'),
      'heart', COUNT(*) FILTER (WHERE vote_type = 'heart'),
      'fire', COUNT(*) FILTER (WHERE vote_type = 'fire'),
      'star', COUNT(*) FILTER (WHERE vote_type = 'star')
    )
    FROM method_votes
    WHERE method_id = COALESCE(NEW.method_id, OLD.method_id)
  )
  WHERE id = COALESCE(NEW.method_id, OLD.method_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update vote counts
CREATE TRIGGER update_vote_counts_on_insert
  AFTER INSERT ON method_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_method_vote_counts();

CREATE TRIGGER update_vote_counts_on_update
  AFTER UPDATE ON method_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_method_vote_counts();

CREATE TRIGGER update_vote_counts_on_delete
  AFTER DELETE ON method_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_method_vote_counts();

-- Create function to get voters for a method (for display)
CREATE OR REPLACE FUNCTION get_method_voters(p_method_id UUID)
RETURNS TABLE(
  vote_type TEXT,
  voters JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mv.vote_type,
    jsonb_agg(
      jsonb_build_object(
        'userId', u.id,
        'username', u.username,
        'avatar', u.avatar,
        'votedAt', mv.created_at
      ) ORDER BY mv.created_at DESC
    ) as voters
  FROM method_votes mv
  JOIN users u ON u.id = mv.user_id
  WHERE mv.method_id = p_method_id
  GROUP BY mv.vote_type;
END;
$$ LANGUAGE plpgsql;

-- Add notification preferences for vote notifications
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS notify_on_method_votes BOOLEAN DEFAULT true;

-- Add sample data for testing (optional - remove in production)
-- INSERT INTO method_votes (user_id, method_id, vote_type)
-- SELECT 
--   u.id,
--   m.id,
--   CASE (RANDOM() * 4)::INT
--     WHEN 0 THEN 'thumbsup'
--     WHEN 1 THEN 'thumbsdown'
--     WHEN 2 THEN 'heart'
--     WHEN 3 THEN 'fire'
--     ELSE 'star'
--   END
-- FROM users u
-- CROSS JOIN money_making_methods m
-- WHERE m.status = 'approved'
-- LIMIT 50
-- ON CONFLICT DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE method_votes IS 'Stores user votes/reactions on money making methods';
COMMENT ON COLUMN method_votes.vote_type IS 'Type of vote: thumbsup, thumbsdown, heart, fire, star';
COMMENT ON FUNCTION get_method_voters IS 'Returns all voters grouped by vote type for a specific method';
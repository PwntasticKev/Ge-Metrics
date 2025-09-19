-- Create potion_volumes table manually
CREATE TABLE IF NOT EXISTS potion_volumes (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  dose INTEGER NOT NULL CHECK (dose >= 1 AND dose <= 4),
  base_name TEXT NOT NULL,
  volume INTEGER DEFAULT 0,
  high_price_volume INTEGER,
  low_price_volume INTEGER,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  rank INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS potion_volumes_item_id_idx ON potion_volumes (item_id);
CREATE INDEX IF NOT EXISTS potion_volumes_base_name_idx ON potion_volumes (base_name);
CREATE INDEX IF NOT EXISTS potion_volumes_rank_idx ON potion_volumes (rank);
CREATE INDEX IF NOT EXISTS potion_volumes_last_updated_idx ON potion_volumes (last_updated);
CREATE INDEX IF NOT EXISTS potion_volumes_is_active_idx ON potion_volumes (is_active);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_potion_volumes_updated_at ON potion_volumes;
CREATE TRIGGER update_potion_volumes_updated_at
    BEFORE UPDATE ON potion_volumes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

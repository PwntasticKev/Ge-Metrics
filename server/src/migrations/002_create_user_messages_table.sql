-- Migration: Create user_messages table
-- Created: 2026-01-12  
-- Purpose: Add user-to-user messaging system

CREATE TABLE IF NOT EXISTS user_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_broadcast BOOLEAN NOT NULL DEFAULT FALSE,
    parent_message_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_message_id) REFERENCES user_messages(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_messages_to_user_id ON user_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_from_user_id ON user_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_to_user_is_read ON user_messages(to_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_messages_created_at ON user_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_messages_conversation ON user_messages(from_user_id, to_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_messages_parent ON user_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_broadcast ON user_messages(is_broadcast, created_at);

-- Add comments
COMMENT ON TABLE user_messages IS 'User-to-user messaging system';
COMMENT ON COLUMN user_messages.is_broadcast IS 'True for admin broadcast messages';
COMMENT ON COLUMN user_messages.parent_message_id IS 'For threading/reply functionality';
COMMENT ON COLUMN user_messages.subject IS 'Optional message subject line';
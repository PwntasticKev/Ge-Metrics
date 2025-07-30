-- Insert demo user into the auth_db database
-- This script creates a demo user with the credentials from .env file

-- First, check if the user already exists and delete if found
DELETE FROM users WHERE email = 'demo@example.com';

-- Insert the demo user
INSERT INTO users (
    email,
    username,
    password,
    display_name,
    avatar_url,
    is_verified,
    created_at,
    updated_at
) VALUES (
    'demo@example.com',
    'demo_user',
    '$2a$12$placeholder.password.hash.for.ChangeMe123!',
    'Demo User',
    'https://example.com/demo-avatar.jpg',
    true,
    NOW(),
    NOW()
);

-- Verify the user was inserted
SELECT * FROM users WHERE email = 'demo@example.com';

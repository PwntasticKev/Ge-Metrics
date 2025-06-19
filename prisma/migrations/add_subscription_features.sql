-- Migration: Add subscription and user features
-- Description: Adds tables for subscription management, user watchlists, and transaction tracking

-- Add subscription management
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    status TEXT NOT NULL DEFAULT 'inactive', -- active, inactive, canceled, past_due
    plan TEXT NOT NULL DEFAULT 'free', -- free, premium
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add indexes for subscriptions
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_idx ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_idx ON subscriptions(stripe_subscription_id);

-- Add user watchlists for price alerts
CREATE TABLE IF NOT EXISTS user_watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    target_price INTEGER,
    alert_type TEXT NOT NULL DEFAULT 'price', -- price, volume, manipulation
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add indexes for watchlists
CREATE INDEX IF NOT EXISTS user_watchlists_user_id_idx ON user_watchlists(user_id);
CREATE INDEX IF NOT EXISTS user_watchlists_item_id_idx ON user_watchlists(item_id);

-- Add user transactions for profit tracking
CREATE TABLE IF NOT EXISTS user_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- buy, sell
    quantity INTEGER NOT NULL,
    price INTEGER NOT NULL,
    profit INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add indexes for transactions
CREATE INDEX IF NOT EXISTS user_transactions_user_id_idx ON user_transactions(user_id);
CREATE INDEX IF NOT EXISTS user_transactions_item_id_idx ON user_transactions(item_id);
CREATE INDEX IF NOT EXISTS user_transactions_created_at_idx ON user_transactions(created_at);

-- Update users table to track subscription status (for quick access)
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_watchlists_updated_at BEFORE UPDATE ON user_watchlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some constraints
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'inactive', 'canceled', 'past_due'));
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check CHECK (plan IN ('free', 'premium'));
ALTER TABLE user_watchlists ADD CONSTRAINT user_watchlists_alert_type_check CHECK (alert_type IN ('price', 'volume', 'manipulation'));
ALTER TABLE user_transactions ADD CONSTRAINT user_transactions_type_check CHECK (transaction_type IN ('buy', 'sell'));
ALTER TABLE user_transactions ADD CONSTRAINT user_transactions_quantity_positive CHECK (quantity > 0);
ALTER TABLE user_transactions ADD CONSTRAINT user_transactions_price_positive CHECK (price > 0); 
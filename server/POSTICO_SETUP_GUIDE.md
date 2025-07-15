# 🗄️ Postico 2 Setup Guide for Ge-Metrics

## 📋 Prerequisites

1. **PostgreSQL installed and running**
   - macOS: `brew install postgresql && brew services start postgresql`
   - Ubuntu: `sudo apt install postgresql postgresql-contrib`

2. **Postico 2 installed**
   - Download from: https://eggerapps.at/postico2/

## 🚀 Quick Setup

### Step 1: Create Environment File
Create a `.env` file in the `server/` directory:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/auth_db"

# JWT Secrets
JWT_ACCESS_SECRET="your-super-secret-access-token-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key-change-this-in-production"

# Token Expiration
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Server
PORT=4000
NODE_ENV="development"

# CORS
FRONTEND_URL="http://localhost:5173"
```

### Step 2: Run Database Setup
```bash
cd server
./setup-database.sh
```

### Step 3: Test Database
```bash
cd server
node test-database.js
```

## 🔗 Postico 2 Connection Settings

### New Connection Details:
- **Name:** `Ge-Metrics Local DB`
- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `auth_db`
- **Username:** `postgres` (or your PostgreSQL username)
- **Password:** `password` (or your PostgreSQL password)

### Connection Steps:
1. Open Postico 2
2. Click "New Connection"
3. Fill in the details above
4. Click "Connect"

## 📊 Database Schema Overview

Your database contains the following tables:

### 1. `users` - User accounts
- `id` (UUID, Primary Key)
- `email` (Text, Unique)
- `password_hash` (Text)
- `salt` (Text)
- `google_id` (Text)
- `name` (Text)
- `avatar` (Text)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### 2. `refresh_tokens` - JWT refresh tokens
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users)
- `token` (Text, Unique)
- `expires_at` (Timestamp)
- `created_at` (Timestamp)

### 3. `subscriptions` - User subscription data
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users)
- `stripe_customer_id` (Text)
- `stripe_subscription_id` (Text)
- `stripe_price_id` (Text)
- `status` (Text: active, inactive, canceled, past_due)
- `plan` (Text: free, premium)
- `current_period_start` (Timestamp)
- `current_period_end` (Timestamp)
- `cancel_at_period_end` (Boolean)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### 4. `user_watchlists` - User item watchlists
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users)
- `item_id` (Text)
- `item_name` (Text)
- `target_price` (Integer)
- `alert_type` (Text: price, volume, manipulation)
- `is_active` (Boolean)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### 5. `user_transactions` - User trading history
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users)
- `item_id` (Text)
- `item_name` (Text)
- `transaction_type` (Text: buy, sell)
- `quantity` (Integer)
- `price` (Integer)
- `profit` (Integer)
- `notes` (Text)
- `created_at` (Timestamp)

## 🧪 Testing Database Functionality

### Run Comprehensive Tests:
```bash
cd server
node test-database.js
```

This will test:
- ✅ Database connection
- ✅ Table creation and schema
- ✅ User CRUD operations
- ✅ Watchlist operations
- ✅ Transaction operations

### Manual Testing in Postico 2:

#### 1. Test User Creation:
```sql
INSERT INTO users (id, email, password_hash, salt, name) 
VALUES (
  gen_random_uuid(), 
  'test@example.com', 
  'hashedpassword', 
  'salt', 
  'Test User'
);
```

#### 2. Test User Query:
```sql
SELECT * FROM users WHERE email = 'test@example.com';
```

#### 3. Test Watchlist Creation:
```sql
INSERT INTO user_watchlists (id, user_id, item_id, item_name, target_price, alert_type)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE email = 'test@example.com'),
  '12345',
  'Test Item',
  1000,
  'price'
);
```

#### 4. Test Transaction Creation:
```sql
INSERT INTO user_transactions (id, user_id, item_id, item_name, transaction_type, quantity, price)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE email = 'test@example.com'),
  '67890',
  'Test Item',
  'buy',
  100,
  500
);
```

## 🔧 Troubleshooting

### Common Issues:

#### 1. "Connection refused"
- Ensure PostgreSQL is running: `brew services start postgresql`
- Check if port 5432 is available: `lsof -i :5432`

#### 2. "Database does not exist"
- Create database: `createdb auth_db`
- Or run the setup script: `./setup-database.sh`

#### 3. "Authentication failed"
- Check your PostgreSQL username/password
- Try: `psql -U postgres -d auth_db`

#### 4. "Tables don't exist"
- Run migrations: `npm run db:push`
- Or run the setup script: `./setup-database.sh`

### Useful Commands:

```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Connect to database
psql -U postgres -d auth_db

# List all tables
\dt

# Describe table structure
\d users

# Exit psql
\q
```

## 🎯 Next Steps

After successful connection:

1. **Explore the schema** - Browse all tables and their relationships
2. **Test CRUD operations** - Try creating, reading, updating, and deleting data
3. **Monitor application data** - Watch how your React app interacts with the database
4. **Set up queries** - Create saved queries for common operations
5. **Export data** - Use Postico 2's export features for data analysis

## 📈 Performance Tips

- Use indexes for frequently queried columns
- Monitor query performance with EXPLAIN ANALYZE
- Set up connection pooling for production
- Regular database backups
- Monitor table sizes and growth

---

**🎉 You're all set! Your Ge-Metrics database is ready for development with Postico 2.** 
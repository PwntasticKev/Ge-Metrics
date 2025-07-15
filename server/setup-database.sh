#!/bin/bash

# Database Setup Script for Ge-Metrics
echo "🚀 Setting up Ge-Metrics Database..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    echo "   On macOS: brew services start postgresql"
    echo "   On Ubuntu: sudo systemctl start postgresql"
    exit 1
fi

# Create database if it doesn't exist
echo "📦 Creating database 'auth_db'..."
createdb auth_db 2>/dev/null || echo "Database 'auth_db' already exists"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate database schema
echo "🔧 Generating database schema..."
npm run db:generate

# Push schema to database
echo "🚀 Pushing schema to database..."
npm run db:push

echo "✅ Database setup complete!"
echo ""
echo "📊 Your database is ready for Postico 2 connection:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: auth_db"
echo "   Username: postgres (or your PostgreSQL username)"
echo "   Password: password (or your PostgreSQL password)"
echo ""
echo "🔗 Connect using Postico 2 with these settings" 
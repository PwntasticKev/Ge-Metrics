#!/bin/bash

echo "🚀 Manual Database Synchronization Script"

PROD_DB="postgres://neondb_owner:npg_iQY84EglFCPR@ep-summer-term-afp8o014-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"
LOCAL_DB="postgresql://postgres:postgres@localhost:5432/auth_db"

echo "📥 Getting production table list..."
DATABASE_URL="$PROD_DB" psql -t -c "
SELECT 
    'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' || 
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'TEXT'
            WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP DEFAULT NOW()'
            WHEN data_type = 'boolean' THEN 'BOOLEAN DEFAULT FALSE'
            WHEN data_type = 'integer' THEN 'INTEGER'
            WHEN data_type = 'uuid' THEN 'UUID DEFAULT gen_random_uuid()'
            WHEN data_type = 'jsonb' THEN 'JSONB'
            ELSE data_type
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
        ', '
    ) || ');'
FROM information_schema.columns 
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
" > create_tables.sql

echo "📝 Generated table creation script:"
cat create_tables.sql

echo ""
echo "🔧 Applying to local database..."
DATABASE_URL="$LOCAL_DB" psql -f create_tables.sql

echo ""
echo "✅ Database sync complete! Checking result..."
DATABASE_URL="$LOCAL_DB" psql -c "SELECT COUNT(*) as local_tables FROM information_schema.tables WHERE table_schema = 'public';"

rm create_tables.sql
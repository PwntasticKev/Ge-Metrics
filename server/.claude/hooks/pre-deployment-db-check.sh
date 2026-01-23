#!/bin/bash

# Pre-deployment Database Schema Sync Check
# Automatically runs before deployment to ensure local/production schema sync

set -e

echo "🔍 Running pre-deployment database schema check..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database URLs
LOCAL_DB="postgresql://postgres:postgres@localhost:5432/auth_db"
PROD_DB="postgres://neondb_owner:npg_iQY84EglFCPR@ep-summer-term-afp8o014-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"

# Function to get table count
get_table_count() {
    local db_url=$1
    local count=$(DATABASE_URL="$db_url" psql -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    echo "$count"
}

# Function to get table list  
get_table_list() {
    local db_url=$1
    DATABASE_URL="$db_url" psql -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>/dev/null | tr -d ' ' | grep -v '^$'
}

# Function to check if critical tables exist
check_critical_tables() {
    local db_url=$1
    local critical_tables=("users" "user_sessions" "user_trash_votes" "item_admin_clean")
    local missing_tables=()
    
    for table in "${critical_tables[@]}"; do
        local exists=$(DATABASE_URL="$db_url" psql -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>/dev/null | tr -d ' ')
        if [[ "$exists" != "t" ]]; then
            missing_tables+=("$table")
        fi
    done
    
    if [[ ${#missing_tables[@]} -gt 0 ]]; then
        echo -e "${RED}❌ Missing critical tables: ${missing_tables[*]}${NC}"
        return 1
    else
        echo -e "${GREEN}✅ All critical tables present${NC}"
        return 0
    fi
}

echo "📊 Checking database connectivity..."

# Check local database
if ! DATABASE_URL="$LOCAL_DB" psql -c '\q' &>/dev/null; then
    echo -e "${RED}❌ Cannot connect to local database${NC}"
    exit 1
fi

# Check production database  
if ! DATABASE_URL="$PROD_DB" psql -c '\q' &>/dev/null; then
    echo -e "${YELLOW}⚠️ Cannot connect to production database - skipping comparison${NC}"
    # Still check local tables exist
    if check_critical_tables "$LOCAL_DB"; then
        echo -e "${GREEN}✅ Local database check passed${NC}"
        exit 0
    else
        exit 1
    fi
fi

# Get table counts
LOCAL_COUNT=$(get_table_count "$LOCAL_DB")
PROD_COUNT=$(get_table_count "$PROD_DB")

echo "📋 Schema comparison:"
echo "  Local tables: $LOCAL_COUNT"
echo "  Production tables: $PROD_COUNT"

# Check critical tables in both databases
echo ""
echo "🔍 Checking critical tables..."
echo "Local database:"
check_critical_tables "$LOCAL_DB"
local_result=$?

echo "Production database:"  
check_critical_tables "$PROD_DB"
prod_result=$?

# Compare table lists for differences
echo ""
echo "📑 Detailed table comparison:"
LOCAL_TABLES=$(get_table_list "$LOCAL_DB")
PROD_TABLES=$(get_table_list "$PROD_DB")

# Find missing tables in local
missing_in_local=$(comm -23 <(echo "$PROD_TABLES" | sort) <(echo "$LOCAL_TABLES" | sort))
if [[ -n "$missing_in_local" ]]; then
    echo -e "${YELLOW}⚠️ Tables in production but not in local:${NC}"
    echo "$missing_in_local" | sed 's/^/  - /'
fi

# Find extra tables in local
extra_in_local=$(comm -13 <(echo "$PROD_TABLES" | sort) <(echo "$LOCAL_TABLES" | sort))  
if [[ -n "$extra_in_local" ]]; then
    echo -e "${YELLOW}ℹ️ Tables in local but not in production:${NC}"
    echo "$extra_in_local" | sed 's/^/  - /'
fi

# Final result
if [[ $local_result -eq 0 && $prod_result -eq 0 ]]; then
    if [[ -z "$missing_in_local" ]]; then
        echo -e "${GREEN}🎉 Database schemas are in sync!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️ Schemas have differences but critical tables are present${NC}"
        echo -e "${YELLOW}💡 Run: node scripts/sync-database-schema.js${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ Critical tables are missing!${NC}"
    echo -e "${RED}🔧 Run database migrations before deployment${NC}"
    exit 1
fi
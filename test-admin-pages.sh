#!/bin/bash

echo "Testing Admin Pages Accessibility..."
echo "=================================="

# Base URL
BASE_URL="http://localhost:8000"

# Admin pages to test
PAGES=(
    "/admin"
    "/admin/user-management" 
    "/admin/billing"
    "/admin/security"
    "/admin/cron-jobs"
    "/admin/formulas"
    "/admin/settings"
)

# Function to test a page
test_page() {
    local page=$1
    local url="${BASE_URL}${page}"
    
    echo -n "Testing ${page}... "
    
    # Use curl to get the HTTP status code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status_code" = "200" ]; then
        echo "✅ OK (${status_code})"
        return 0
    else
        echo "❌ FAILED (${status_code})"
        return 1
    fi
}

# Test all pages
failed_count=0
total_count=${#PAGES[@]}

for page in "${PAGES[@]}"; do
    if ! test_page "$page"; then
        ((failed_count++))
    fi
done

echo "=================================="
echo "Results: $((total_count - failed_count))/${total_count} pages accessible"

if [ $failed_count -eq 0 ]; then
    echo "🎉 All admin pages are accessible!"
    exit 0
else
    echo "⚠️  ${failed_count} pages failed to load"
    exit 1
fi
#!/bin/bash

# GE-Metrics Test Runner Skill
# Runs after implementing features to verify everything works

echo "🧪 GE-Metrics Test Runner"
echo "========================="
echo ""

# Track failures
FAILED=0

# 1. TypeScript Check
echo "🔍 Running TypeScript check..."
if npx tsc --noEmit 2>&1; then
    echo "✅ TypeScript check passed"
else
    echo "❌ TypeScript check failed"
    FAILED=1
fi
echo ""

# 2. Unit Tests
echo "🧪 Running unit tests..."
if npm run test:unit:run 2>&1; then
    echo "✅ Unit tests passed"
else
    echo "❌ Unit tests failed"
    FAILED=1
fi
echo ""

# 3. Summary
echo "========================="
echo "Test Results:"
echo "-------------"
if [ $FAILED -eq 0 ]; then
    echo "✅ All checks passed! Ready to mark task complete."
    echo ""
    echo "Next steps:"
    echo "- Review changes"
    echo "- Commit if needed"
    echo "- Move to next task"
else
    echo "❌ Some checks failed. Fix issues before marking complete."
    echo ""
    echo "To fix:"
    echo "- Review error messages above"
    echo "- Fix TypeScript/test issues"
    echo "- Re-run: /test-ge-metrics"
    exit 1
fi
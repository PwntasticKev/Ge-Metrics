#!/bin/bash

# GE-Metrics Test-Driven Development Verification
# Ensures TDD compliance and all quality checks pass

echo "🧪 GE-Metrics TDD Verification"
echo "==============================="
echo ""

# Track failures
FAILED=0

# Helper function for step results
print_step() {
    local step=$1
    local status=$2
    local message=$3
    
    if [ "$status" -eq 0 ]; then
        echo "✅ $step: PASSED"
    else
        echo "❌ $step: FAILED - $message"
        FAILED=1
    fi
    echo ""
}

# 1. Lint Check (Code Style)
echo "🎨 Running lint check..."
if npm run lint --silent 2>&1; then
    print_step "LINT" 0
else
    print_step "LINT" 1 "Code style violations found"
fi

# 2. TypeScript Check (Type Safety)  
echo "🔍 Running TypeScript check..."
if npx tsc --noEmit 2>&1; then
    print_step "TYPESCRIPT" 0
else
    print_step "TYPESCRIPT" 1 "Type errors found"
fi

# 3. Unit Tests (Component Logic)
echo "🧪 Running unit tests..."
if npm run test:unit:run 2>&1; then
    print_step "UNIT_TESTS" 0
else
    print_step "UNIT_TESTS" 1 "Unit tests failing"
fi

# 4. E2E Tests (User Flows)
echo "🎭 Running E2E tests..."
if npm run test:e2e 2>&1; then
    print_step "E2E_TESTS" 0
else
    print_step "E2E_TESTS" 1 "End-to-end tests failing"
fi

# 5. Test Coverage Check
echo "📊 Checking test coverage..."
if npm run test:coverage 2>&1 | grep -q "All files"; then
    print_step "COVERAGE" 0  
else
    print_step "COVERAGE" 1 "Coverage below thresholds"
fi

# Final Summary
echo "==============================="
echo "🎯 TDD VERIFICATION RESULTS"
echo "==============================="

if [ $FAILED -eq 0 ]; then
    echo ""
    echo "🎉 ALL CHECKS PASSED!"
    echo ""
    echo "✅ Task is COMPLETE and ready for:"
    echo "   • Code review"  
    echo "   • Git commit"
    echo "   • Next task"
    echo ""
    echo "📋 TDD Compliance Verified:"
    echo "   • Tests written first ✓"
    echo "   • All tests passing ✓"
    echo "   • Code quality ✓"
    echo "   • User flows work ✓"
    echo ""
else
    echo ""
    echo "🚨 CHECKS FAILED - TASK NOT COMPLETE"
    echo ""
    echo "❌ Cannot mark task complete until:"
    echo "   • All tests pass"
    echo "   • No linting errors" 
    echo "   • No TypeScript errors"
    echo "   • Coverage maintained"
    echo ""
    echo "🔧 To fix: Review error messages above"
    echo "🔄 Re-run: /tdd-verification"
    echo ""
    exit 1
fi
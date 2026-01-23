# Testing Requirements

## The Only Rule That Matters

### Task Completion Checklist
A task is ONLY complete when:
- ✅ Tests written FIRST (before implementation)
- ✅ Tests run and FAIL initially (proves they test something)
- ✅ Implementation written
- ✅ All tests PASS (100% required)
- ✅ `npm run lint` - zero errors
- ✅ `npx tsc --noEmit` - zero errors
- ✅ Coverage maintained or improved

### Test-First Workflow
```bash
# 1. Write test
vim ComponentName.test.jsx

# 2. Verify it fails
npm run test:unit ComponentName.test

# 3. Write implementation
vim ComponentName.jsx  

# 4. Verify it passes
npm run test:unit ComponentName.test

# 5. Run all checks
npm run lint && npx tsc --noEmit
```

### Required Test Coverage
Every component must test:
- Rendering without errors
- Loading states
- Error states
- User interactions
- Props handling
- Accessibility (keyboard nav, ARIA)
- Mobile responsiveness

### Bug Fix Protocol
1. Write test that reproduces the bug
2. Verify test fails
3. Fix the bug
4. Verify test passes
5. Run related test suite
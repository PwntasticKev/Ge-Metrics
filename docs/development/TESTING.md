# GE-Metrics Testing Documentation

## 🚀 Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run all tests before committing
npm run test:all

# Development with TDD
npm run test:watch
```

## 📋 Testing Checklist

### Before Writing Code
- [ ] Write test first (TDD)
- [ ] Define expected behavior
- [ ] Consider edge cases

### While Coding
- [ ] Run tests in watch mode
- [ ] Keep tests green
- [ ] Refactor with confidence

### Before Committing
- [ ] All tests pass (`npm run test:all`)
- [ ] Coverage meets thresholds (80% lines)
- [ ] No TypeScript errors
- [ ] E2E tests for user flows

## 🧪 Test Types

### Unit Tests (Vitest)
Fast, isolated tests for functions and components.

```typescript
// Example: src/utils/calculations.test.ts
import { calculateROI } from './calculations'

describe('calculateROI', () => {
  it('calculates positive ROI', () => {
    expect(calculateROI(100, 150)).toBe(50)
  })
})
```

### Integration Tests (Vitest + TRPC)
Test API endpoints and database operations.

```typescript
// Example: server/src/trpc/flips.test.ts
import { createCaller } from './router'

describe('Flips API', () => {
  it('creates a flip', async () => {
    const flip = await caller.flips.create({
      itemId: 1,
      buyPrice: 100,
      sellPrice: 150
    })
    expect(flip.profit).toBe(50)
  })
})
```

### E2E Tests (Playwright)
Test complete user journeys.

```typescript
// Example: e2e/auth.spec.ts
test('user can login', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Login')
  await page.fill('[name=email]', 'test@example.com')
  await page.fill('[name=password]', 'password')
  await page.click('button[type=submit]')
  await expect(page).toHaveURL('/profile')
})
```

## 🛠️ Test Utilities

### Data Factories
Generate test data consistently:

```typescript
import { createFlip, createOSRSItem } from '@/test/factories'

const testFlip = createFlip({
  profit: 1000000
})
```

### Custom Render
Wrap components with providers:

```typescript
import { render, screen } from '@/test/utils/test-utils'

render(<MyComponent />)
expect(screen.getByText('Hello')).toBeInTheDocument()
```

## 📊 Coverage Reports

```bash
# Generate coverage report
npm run coverage

# View HTML report
npm run coverage:report
```

### Coverage Thresholds
- Lines: 80%
- Branches: 70%
- Functions: 70%
- Statements: 80%

## 🔄 CI/CD Pipeline

Every push triggers:

1. **Linting**: Code quality checks
2. **Type Check**: TypeScript validation
3. **Unit Tests**: Component & utility tests
4. **Integration Tests**: API & database tests
5. **E2E Tests**: Browser automation
6. **Coverage**: Ensure thresholds met
7. **Security Scan**: Vulnerability detection

## 🎯 Best Practices

### DO ✅
- Write tests before code (TDD)
- Test happy path AND edge cases
- Use descriptive test names
- Keep tests simple and focused
- Mock external dependencies
- Test user behavior, not implementation

### DON'T ❌
- Test implementation details
- Write brittle selectors
- Ignore failing tests
- Skip error scenarios
- Test third-party code
- Commit with failing tests

## 🐛 Debugging Tests

```bash
# Debug Vitest tests
npm run test:ui

# Debug Playwright tests
npm run test:e2e:debug

# Run specific test file
npm test src/utils/calculations.test.ts

# Run tests matching pattern
npm test -- --grep="ROI"
```

## 📈 Performance Testing

Monitor performance in tests:

```typescript
import { PerformanceMonitor } from '@/utils/monitoring'

test('renders quickly', () => {
  const monitor = new PerformanceMonitor()
  monitor.mark('start')
  
  render(<ExpensiveComponent />)
  
  const duration = monitor.measure('render', 'start')
  expect(duration).toBeLessThan(100) // ms
})
```

## 🔗 Resources

- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)
- [Testing Library](https://testing-library.com)
- [MSW (API Mocking)](https://mswjs.io)

## 💡 Tips

1. **Run tests frequently** - Use watch mode during development
2. **Test behavior, not implementation** - Focus on what users see
3. **Keep tests fast** - Mock heavy operations
4. **Use data factories** - Consistent test data
5. **Test accessibility** - Include ARIA queries
6. **Document complex tests** - Add comments for clarity

---

Remember: **Good tests give confidence to ship fast!** 🚀
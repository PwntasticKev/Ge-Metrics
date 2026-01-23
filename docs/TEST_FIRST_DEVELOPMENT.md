# Test-First Development Methodology for GE-Metrics

## Overview

This document establishes **Test-First Development (TFD)** as a core methodology for GE-Metrics development. Tests must be written **before** implementing features to ensure reliability, maintainability, and quality.

## Core Principles

### 🔴 Red-Green-Refactor Cycle

1. **🔴 RED**: Write a failing test first
2. **🟢 GREEN**: Write minimal code to make test pass
3. **🔵 REFACTOR**: Improve code quality without breaking tests

### ✅ Test Coverage Requirements

- **Minimum 80% line coverage** for all new code
- **100% coverage** for critical business logic (authentication, payment, data integrity)
- **90% coverage** for API endpoints and database operations

### 🧪 Test Pyramid Structure

```
    /\     E2E Tests (10%)
   /  \    Integration Tests (30%)  
  /____\   Unit Tests (60%)
```

## Testing Categories

### 1. Unit Tests (60%)
**Location**: `src/**/*.test.{js,jsx,ts,tsx}`

**Test individual functions, components, and methods in isolation**

```javascript
// Example: src/utils/calculateProfit.test.js
import { describe, it, expect } from 'vitest'
import { calculateProfit } from './calculateProfit.js'

describe('calculateProfit', () => {
  it('should calculate basic profit correctly', () => {
    expect(calculateProfit(1000, 800)).toBe(200)
  })
  
  it('should handle negative profits', () => {
    expect(calculateProfit(800, 1000)).toBe(-200)
  })
  
  it('should throw error for invalid inputs', () => {
    expect(() => calculateProfit(null, 100)).toThrow()
  })
})
```

### 2. Integration Tests (30%)
**Location**: `src/**/*.integration.test.{js,jsx,ts,tsx}`

**Test interactions between components, API calls, and database operations**

```javascript
// Example: src/services/userService.integration.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { userService } from './userService.js'
import { setupTestDatabase, cleanupTestDatabase } from '../test/helpers.js'

describe('UserService Integration', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })
  
  afterEach(async () => {
    await cleanupTestDatabase()
  })
  
  it('should create user with valid data', async () => {
    const userData = { email: 'test@example.com', name: 'Test User' }
    const user = await userService.createUser(userData)
    
    expect(user).toMatchObject(userData)
    expect(user.id).toBeDefined()
  })
})
```

### 3. End-to-End Tests (10%)
**Location**: `e2e/**/*.spec.ts`

**Test complete user workflows across the entire application**

```javascript
// Example: e2e/flip-tracking.spec.ts
import { test, expect } from '@playwright/test'

test('complete flip tracking workflow', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[data-testid="email"]', 'user@example.com')
  await page.fill('[data-testid="password"]', 'password')
  await page.click('[data-testid="login-button"]')
  
  await page.goto('/profile')
  await page.click('[data-testid="add-flip"]')
  await page.fill('[data-testid="item-name"]', 'Dragon Scimitar')
  await page.fill('[data-testid="buy-price"]', '100000')
  await page.fill('[data-testid="sell-price"]', '120000')
  await page.click('[data-testid="save-flip"]')
  
  await expect(page.getByText('Flip added successfully')).toBeVisible()
  await expect(page.getByText('Dragon Scimitar')).toBeVisible()
})
```

## Test-First Workflow

### 🚀 Feature Development Process

1. **📋 Understand Requirements**
   - Break down feature into small, testable units
   - Identify edge cases and error conditions
   - Define acceptance criteria

2. **✍️ Write Tests First**
   - Start with failing tests that describe desired behavior
   - Cover happy path, edge cases, and error scenarios
   - Use descriptive test names and clear assertions

3. **💻 Implement Feature**
   - Write minimal code to pass tests
   - Avoid over-engineering or adding untested features
   - Focus on making tests green

4. **🔧 Refactor & Optimize**
   - Improve code quality while keeping tests green
   - Add more tests if new edge cases discovered
   - Update tests if requirements change

### 📝 Pre-Implementation Checklist

Before writing any production code:

- [ ] Requirements clearly understood
- [ ] Test cases written and failing
- [ ] Test data and mocks prepared
- [ ] Integration points identified
- [ ] Error scenarios considered

### ✅ Pre-Commit Checklist

Before committing code:

- [ ] All tests passing
- [ ] Coverage requirements met
- [ ] No test skipping (`.skip()` or `xit()`)
- [ ] No debug code or console.logs
- [ ] Tests are deterministic (no random failures)

## Testing Tools & Configuration

### 🛠️ Testing Stack

- **Unit/Integration**: Vitest with jsdom
- **E2E**: Playwright with Chromium/Firefox/Safari
- **Coverage**: Vitest built-in coverage (v8)
- **Mocking**: Vitest mocks and MSW for API mocking

### ⚙️ Configuration Files

- `vitest.config.ts` - Main test configuration
- `vitest.config.integration.ts` - Integration test setup
- `playwright.config.ts` - E2E test configuration
- `src/test/setup.ts` - Global test setup and helpers

### 📊 Coverage Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      },
      exclude: [
        'src/test/**',
        '**/*.config.*',
        '**/*.d.ts',
        'dist/**'
      ]
    }
  }
})
```

## Best Practices

### ✨ Writing Good Tests

#### 1. **Arrange-Act-Assert (AAA) Pattern**
```javascript
it('should calculate flip profit correctly', () => {
  // Arrange
  const buyPrice = 1000
  const sellPrice = 1200
  const quantity = 5
  
  // Act
  const profit = calculateFlipProfit(buyPrice, sellPrice, quantity)
  
  // Assert
  expect(profit).toBe(1000) // (1200 - 1000) * 5
})
```

#### 2. **Descriptive Test Names**
```javascript
// ❌ Bad
it('should work', () => {})

// ✅ Good
it('should return validation error when email format is invalid', () => {})
```

#### 3. **Independent Tests**
```javascript
// ❌ Bad - tests depend on each other
describe('User management', () => {
  let userId
  
  it('creates user', () => {
    userId = createUser() // State shared between tests
  })
  
  it('deletes user', () => {
    deleteUser(userId) // Depends on previous test
  })
})

// ✅ Good - independent tests
describe('User management', () => {
  it('creates user successfully', () => {
    const user = createUser({ email: 'test@example.com' })
    expect(user.id).toBeDefined()
  })
  
  it('deletes user successfully', () => {
    const user = createUser({ email: 'test2@example.com' })
    const result = deleteUser(user.id)
    expect(result.success).toBe(true)
  })
})
```

#### 4. **Mock External Dependencies**
```javascript
// Mock API calls
vi.mock('../services/apiService', () => ({
  fetchItemPrice: vi.fn().mockResolvedValue(150000)
}))

// Mock database operations
vi.mock('../db/userRepository', () => ({
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
}))
```

### 🎯 Testing Strategies by Domain

#### Frontend Components
```javascript
// Test props, state changes, user interactions
import { render, screen, fireEvent } from '@testing-library/react'

it('should show error when form is submitted with invalid data', async () => {
  render(<FlipForm onSubmit={mockSubmit} />)
  
  fireEvent.click(screen.getByRole('button', { name: /save/i }))
  
  expect(screen.getByText('Item name is required')).toBeInTheDocument()
  expect(mockSubmit).not.toHaveBeenCalled()
})
```

#### API Endpoints (tRPC)
```javascript
// Test input validation, business logic, error handling
describe('flips.addFlip', () => {
  it('should add flip with valid data', async () => {
    const input = { itemId: '123', buyPrice: 1000, sellPrice: 1200 }
    const result = await caller.flips.addFlip(input)
    
    expect(result.id).toBeDefined()
    expect(result.profit).toBe(200)
  })
  
  it('should throw error for negative prices', async () => {
    const input = { itemId: '123', buyPrice: -100, sellPrice: 1200 }
    
    await expect(caller.flips.addFlip(input)).rejects.toThrow('Invalid price')
  })
})
```

#### Database Operations
```javascript
// Test CRUD operations, constraints, transactions
describe('FlipRepository', () => {
  it('should create flip with all required fields', async () => {
    const flipData = { userId: 1, itemId: '123', buyPrice: 1000 }
    const flip = await flipRepository.create(flipData)
    
    expect(flip.id).toBeDefined()
    expect(flip.createdAt).toBeInstanceOf(Date)
  })
})
```

#### Business Logic
```javascript
// Test calculations, algorithms, complex workflows
describe('ProfitCalculator', () => {
  it('should calculate ROI percentage correctly', () => {
    const roi = calculateROI(1000, 1200) // buy: 1000, sell: 1200
    expect(roi).toBe(20) // 20% return
  })
  
  it('should account for GE tax in profit calculation', () => {
    const profit = calculateProfitWithTax(1000, 1200)
    expect(profit).toBe(199) // 200 - 1 (0.5% tax)
  })
})
```

## Test Data Management

### 🏗️ Test Fixtures
```javascript
// src/test/fixtures/users.js
export const testUsers = {
  basicUser: {
    email: 'user@example.com',
    name: 'Test User',
    emailVerified: true
  },
  adminUser: {
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    emailVerified: true
  }
}
```

### 🗄️ Test Database Setup
```javascript
// src/test/helpers/database.js
export async function setupTestDatabase() {
  await db.migrate.latest()
  await db.seed.run()
}

export async function cleanupTestDatabase() {
  await db.raw('TRUNCATE TABLE users CASCADE')
  await db.raw('TRUNCATE TABLE flips CASCADE')
}
```

### 🎭 Mock Strategies
```javascript
// API Mocking with MSW
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('https://prices.runescape.wiki/api/v1/osrs/latest', (req, res, ctx) => {
    return res(ctx.json({ data: { '4151': { high: 150000, low: 149000 } } }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## Continuous Integration

### 🔄 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit:run
      - run: npm run test:integration:run
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3
```

### 📊 Coverage Reports

Tests automatically generate coverage reports:
- **HTML Report**: `coverage/index.html`
- **JSON Report**: `coverage/coverage-final.json`
- **LCOV Report**: `coverage/lcov.info`

Coverage badges are automatically updated in README.md.

## Quality Gates

### 🚫 Blocking Conditions

The following conditions will **block** PR merges:

1. **Test Failures**: Any failing tests
2. **Coverage Drop**: Coverage below threshold
3. **Missing Tests**: New features without tests
4. **Skipped Tests**: Uncommitted `.skip()` or `xit()`
5. **Performance**: Tests taking longer than 30 seconds

### ✅ Review Checklist

Before approving PRs:

- [ ] All tests pass in CI
- [ ] Coverage requirements met
- [ ] Tests are meaningful and test behavior, not implementation
- [ ] No test pollution (tests affecting each other)
- [ ] Mocks are appropriate and realistic
- [ ] E2E tests cover critical user paths

## Common Patterns & Examples

### 🔧 Testing Utilities

```javascript
// src/test/utils/renderWithProviders.jsx
export function renderWithProviders(ui, options = {}) {
  const { user = testUsers.basicUser } = options
  
  const AllProviders = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <AuthContext.Provider value={{ user }}>
          {children}
        </AuthContext.Provider>
      </MantineProvider>
    </QueryClientProvider>
  )
  
  return render(ui, { wrapper: AllProviders, ...options })
}
```

### 🎯 Testing Hooks

```javascript
// src/hooks/useFlipCalculator.test.js
import { renderHook } from '@testing-library/react'
import { useFlipCalculator } from './useFlipCalculator'

it('should calculate profit correctly', () => {
  const { result } = renderHook(() => useFlipCalculator())
  
  act(() => {
    result.current.calculate(1000, 1200, 5)
  })
  
  expect(result.current.profit).toBe(1000)
  expect(result.current.roi).toBe(20)
})
```

### 🔒 Testing Authentication

```javascript
// src/components/ProtectedRoute.test.jsx
it('should redirect to login when user is not authenticated', () => {
  renderWithProviders(<ProtectedRoute><Dashboard /></ProtectedRoute>, {
    user: null
  })
  
  expect(mockNavigate).toHaveBeenCalledWith('/login')
})
```

## Troubleshooting

### 🐛 Common Issues

#### 1. **Flaky Tests**
```javascript
// ❌ Bad - timing dependent
it('should update after delay', async () => {
  triggerUpdate()
  setTimeout(() => {
    expect(getValue()).toBe('updated')
  }, 100)
})

// ✅ Good - wait for condition
it('should update after delay', async () => {
  triggerUpdate()
  await waitFor(() => {
    expect(getValue()).toBe('updated')
  })
})
```

#### 2. **Memory Leaks**
```javascript
// Always cleanup in afterEach
afterEach(() => {
  vi.clearAllMocks()
  cleanup()
  server.resetHandlers()
})
```

#### 3. **Test Pollution**
```javascript
// Use fresh instances for each test
beforeEach(() => {
  mockService.reset()
  cache.clear()
})
```

### 🔍 Debugging Tests

```javascript
// Add debug helpers
import { screen, prettyDOM } from '@testing-library/react'

it('debug test', () => {
  render(<Component />)
  console.log(prettyDOM()) // See rendered HTML
  screen.debug() // Alternative debug method
})
```

### ⚡ Performance Optimization

```javascript
// Parallelize independent tests
describe.concurrent('Independent tests', () => {
  it.concurrent('test 1', async () => { /* ... */ })
  it.concurrent('test 2', async () => { /* ... */ })
})

// Use test.each for similar test cases
test.each([
  { input: 100, expected: 200 },
  { input: 200, expected: 400 },
])('should double $input to equal $expected', ({ input, expected }) => {
  expect(double(input)).toBe(expected)
})
```

## Conclusion

Test-First Development is **mandatory** for all GE-Metrics features. This methodology ensures:

- **🛡️ Reliability**: Catch bugs before production
- **📚 Documentation**: Tests serve as living documentation
- **🔧 Refactoring Safety**: Change code with confidence
- **⚡ Faster Development**: Less debugging, more building
- **🎯 Focused Design**: Build only what's needed

**Remember**: If it's not tested, it's not done. Write tests first, implement features second, and maintain high standards throughout the development lifecycle.

---

*For questions or clarifications on testing practices, refer to this document or reach out to the development team.*
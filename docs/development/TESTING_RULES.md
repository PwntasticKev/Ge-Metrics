# 🚨 GE-Metrics Testing Rules - MANDATORY COMPLIANCE

## ⛔ ZERO TOLERANCE POLICY
**NO CODE WITHOUT TESTS. NO EXCEPTIONS. NO EXCUSES.**

---

## 📋 The Golden Rules

### Rule #1: Test-Driven Development (TDD) is LAW
```
1. RED   → Write test first, watch it fail
2. GREEN → Write minimum code to pass
3. REFACTOR → Clean up while keeping tests green
```

### Rule #2: 100% Component Coverage Required
- **EVERY** component MUST have a `.test.jsx` or `.test.tsx` file
- Missing test = Blocked commit
- No test = Task incomplete

### Rule #3: Test File Naming Convention
```
Component: ProfileModern.jsx
Test File: ProfileModern.test.jsx (SAME directory)
```

---

## 🎯 What Every Test MUST Cover

### Mandatory Test Cases (ALL Required)
```typescript
describe('ComponentName', () => {
  // 1. RENDERING - Does it render?
  it('renders without crashing', () => {
    render(<Component />)
    expect(screen.getByTestId('component')).toBeInTheDocument()
  })
  
  // 2. PROPS - Are all props handled?
  it('handles all props correctly', () => {
    render(<Component prop1="value" prop2={123} />)
    expect(screen.getByText('value')).toBeInTheDocument()
  })
  
  // 3. LOADING - Is loading state shown?
  it('shows loading state while fetching data', () => {
    render(<Component />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
  
  // 4. ERROR - Are errors handled gracefully?
  it('displays error message on failure', async () => {
    // Mock API error
    render(<Component />)
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
  
  // 5. INTERACTIONS - Do buttons/inputs work?
  it('handles user interactions correctly', async () => {
    const { user } = render(<Component />)
    const button = screen.getByRole('button')
    await user.click(button)
    expect(mockFunction).toHaveBeenCalled()
  })
  
  // 6. FORMS - Is validation working?
  it('validates form inputs', async () => {
    const { user } = render(<FormComponent />)
    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)
    expect(screen.getByText(/required/i)).toBeInTheDocument()
  })
  
  // 7. ACCESSIBILITY - Can keyboard users navigate?
  it('is fully keyboard accessible', async () => {
    const { user } = render(<Component />)
    await user.tab()
    expect(screen.getByRole('button')).toHaveFocus()
  })
  
  // 8. ARIA - Are screen readers supported?
  it('has proper ARIA labels', () => {
    render(<Component />)
    expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
  })
  
  // 9. MOBILE - Does it work on small screens?
  it('renders correctly on mobile viewport', () => {
    // Set mobile viewport
    window.innerWidth = 375
    render(<Component />)
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
  })
  
  // 10. API - Do real API calls work?
  it('successfully fetches data from API', async () => {
    render(<Component />)
    await waitFor(() => {
      expect(screen.getByText('Data from API')).toBeInTheDocument()
    })
  })
})
```

---

## 🔥 Integration Testing with Real TRPC

### Test Real API Calls
```typescript
import { trpc } from '@/utils/trpc'

it('creates a flip with real database', async () => {
  const { user } = render(<FlipForm />)
  
  // Fill form
  await user.type(screen.getByLabelText('Item'), 'Abyssal whip')
  await user.type(screen.getByLabelText('Buy Price'), '2500000')
  await user.type(screen.getByLabelText('Sell Price'), '2750000')
  
  // Submit
  await user.click(screen.getByRole('button', { name: /save/i }))
  
  // Verify in database
  await waitFor(() => {
    expect(screen.getByText('Flip saved successfully')).toBeInTheDocument()
  })
  
  // Check actual database
  const flips = await trpc.flips.getAll.query()
  expect(flips).toContainEqual(
    expect.objectContaining({
      itemName: 'Abyssal whip'
    })
  )
})
```

---

## 📊 Coverage Requirements

### Minimum Thresholds (CI/CD Enforced)
- **Components**: 100% (EVERY component has test file)
- **Lines**: 80%
- **Branches**: 70%
- **Functions**: 70%
- **Statements**: 80%

### Check Coverage
```bash
npm run test:coverage
```

Coverage below threshold = **BUILD FAILS**

---

## 🚀 Testing Commands

### Development
```bash
npm run test:watch          # TDD mode - instant feedback
npm run test:unit           # Run all unit tests
npm run test:e2e            # Run E2E tests
npm run test:coverage       # Generate coverage report
```

### Before Commit
```bash
npm run test:all            # MUST PASS 100%
```

---

## 📁 Test File Organization

### Co-located Tests (Preferred)
```
src/
├── components/
│   ├── NavBar/
│   │   ├── NavBar.jsx
│   │   ├── NavBar.test.jsx    ← Test next to component
│   │   └── NavBar.styles.css
│   └── Footer/
│       ├── Footer.jsx
│       └── Footer.test.jsx     ← Test next to component
└── pages/
    ├── Profile/
    │   ├── ProfileModern.jsx
    │   └── ProfileModern.test.jsx  ← Test next to page
    └── Settings/
        ├── index.jsx
        └── index.test.jsx           ← Test next to page
```

---

## 🎯 Component Test Checklist

Before marking ANY component complete, verify:

- [ ] Test file exists (ComponentName.test.jsx)
- [ ] Test runs and PASSES
- [ ] Renders without crashing
- [ ] All props tested
- [ ] Loading state tested
- [ ] Error state tested
- [ ] User interactions tested
- [ ] Form validation tested (if applicable)
- [ ] Keyboard accessible
- [ ] ARIA labels present
- [ ] Mobile responsive tested
- [ ] Real API calls tested
- [ ] Coverage meets thresholds

---

## 🔴 Common Test Failures & Fixes

### "Cannot find module"
```bash
# Fix: Install test dependencies
npm install -D @testing-library/react vitest happy-dom
```

### "ReferenceError: window is not defined"
```javascript
// Fix: Add to test file
import { vi } from 'vitest'

beforeAll(() => {
  global.window = { ...window }
})
```

### "Failed to fetch"
```javascript
// Fix: Mock fetch or use real test database
vi.mock('fetch', () => ({
  default: vi.fn(() => Promise.resolve({ data: 'test' }))
}))
```

---

## 🎬 E2E Testing Requirements

### Critical User Paths (MUST have E2E tests)
1. **Authentication Flow**
   - Register → Email verify → Login → Logout

2. **Flip Tracking**
   - Add flip → View profit → Edit → Delete

3. **Potion Calculator**
   - Select potions → Calculate → View profit

4. **Data Loading**
   - Search items → Filter → Sort → Paginate

### E2E Test Example
```typescript
test('complete flip workflow', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('[name=email]', 'test@example.com')
  await page.fill('[name=password]', 'password')
  await page.click('button[type=submit]')
  
  // Add flip
  await page.click('text=Add Flip')
  await page.fill('[name=item]', 'Dragon bones')
  await page.fill('[name=buyPrice]', '2000')
  await page.fill('[name=sellPrice]', '2500')
  await page.click('text=Save')
  
  // Verify
  await expect(page.locator('text=500gp profit')).toBeVisible()
})
```

---

## 🚨 Enforcement Mechanisms

### Pre-commit Hook (Automatic)
```bash
✓ TypeScript check
✓ ESLint check
✓ Test coverage check
✓ All tests passing
✗ Missing test files → COMMIT BLOCKED
```

### CI/CD Pipeline (GitHub Actions)
```yaml
- Tests don't pass → PR blocked
- Coverage drops → Build fails
- Missing tests → Deploy prevented
```

---

## 📝 Test Documentation Template

When creating a new test, include:
```javascript
/**
 * @component ComponentName
 * @description Tests for ComponentName component
 * @coverage 
 *   - Rendering: ✅
 *   - Props: ✅
 *   - Loading: ✅
 *   - Errors: ✅
 *   - Interactions: ✅
 *   - Accessibility: ✅
 *   - Mobile: ✅
 *   - API: ✅
 */
```

---

## ⚡ Quick Test Template

Copy-paste starter for new tests:
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import { ComponentName } from './ComponentName'

describe('ComponentName', () => {
  it('renders without crashing', () => {
    render(<ComponentName />)
    expect(screen.getByTestId('component-name')).toBeInTheDocument()
  })
  
  it('shows loading state', () => {
    render(<ComponentName />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
  
  it('handles errors gracefully', async () => {
    // Mock error
    render(<ComponentName />)
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
  
  it('handles user interactions', async () => {
    const { user } = render(<ComponentName />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText(/success/i)).toBeInTheDocument()
  })
})
```

---

## 🏆 The Testing Manifesto

> "If it's not tested, it's broken."
> 
> "A test today saves a bug tomorrow."
> 
> "Red, Green, Refactor - The holy trinity of TDD."

**Remember**: Tests are not optional. They are MANDATORY. Every. Single. Time.

---

## 📞 Questions?

If unclear about testing requirements:
1. Check this document
2. Look at existing test examples
3. Run tests in watch mode for instant feedback
4. When in doubt, write MORE tests, not less

**NO UNTESTED CODE ENTERS PRODUCTION. PERIOD.**
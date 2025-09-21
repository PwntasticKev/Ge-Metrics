# Testing Standards - Jest and Playwright

## Testing Framework Standards
- **Unit Tests**: Jest with React Testing Library
- **Integration Tests**: Jest with React Testing Library
- **End-to-End Tests**: Playwright
- **Component Tests**: Jest + React Testing Library
- **API Tests**: Jest with supertest
- **Database Tests**: Jest with test database

## File Structure
```
src/
├── __tests__/              # Unit tests
├── components/
│   └── ComponentName/
│       ├── Component.jsx
│       └── Component.test.jsx
├── services/
│   └── serviceName.js
│   └── serviceName.test.js
tests/
├── e2e/                    # Playwright E2E tests
├── integration/            # Integration tests
└── fixtures/               # Test data
```

## Testing Conventions

### Unit Tests (Jest + RTL)
- **File naming**: `*.test.js` or `*.test.jsx`
- **Location**: Same directory as component or in `__tests__/`
- **Coverage target**: >80% for business logic
- **Mock external dependencies**: Always mock API calls, external services

### E2E Tests (Playwright)
- **File naming**: `*.spec.js`
- **Location**: `tests/e2e/`
- **Test real user workflows**: Signup, login, core features
- **Multiple browsers**: Chrome, Firefox, Safari
- **Mobile testing**: Include mobile viewport tests

### Integration Tests
- **File naming**: `*.integration.test.js`
- **Location**: `tests/integration/`
- **Test component interactions**: Full user flows
- **Mock only external services**: Keep internal logic real

## Test Categories

### Authentication Tests (Critical)
- User registration workflow
- Email verification process
- Login/logout functionality
- Password reset flow
- Google OAuth integration
- Session management
- Role-based access control
- Trial system workflow

### Component Tests
- Render without crashing
- Props handling
- User interactions (clicks, form inputs)
- Conditional rendering
- Error states
- Loading states

### Service Tests
- API calls and responses
- Error handling
- Data transformation
- Business logic
- Cache behavior

### Database Tests
- CRUD operations
- Data integrity
- Migrations
- Relationships
- Constraints

## Test Patterns

### Arrange-Act-Assert (AAA)
```javascript
describe('ComponentName', () => {
  test('should handle user interaction', () => {
    // Arrange
    const mockProps = { onSubmit: jest.fn() }
    
    // Act
    render(<ComponentName {...mockProps} />)
    fireEvent.click(screen.getByRole('button'))
    
    // Assert
    expect(mockProps.onSubmit).toHaveBeenCalled()
  })
})
```

### Page Object Model (Playwright)
```javascript
// tests/pages/LoginPage.js
export class LoginPage {
  constructor(page) {
    this.page = page
    this.emailInput = page.locator('[data-testid="email"]')
    this.passwordInput = page.locator('[data-testid="password"]')
    this.loginButton = page.locator('[data-testid="login-button"]')
  }

  async login(email, password) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }
}
```

### Test Data Management
```javascript
// tests/fixtures/users.js
export const testUsers = {
  admin: {
    email: 'admin@ge-metrics-test.com',
    password: 'Noob1234',
    role: 'admin'
  },
  normalUser: {
    email: 'user@ge-metrics-test.com',
    password: 'Noob1234',
    role: 'user'
  }
}
```

## Mock Patterns

### API Mocking
```javascript
// Mock external APIs
jest.mock('../services/apiService', () => ({
  fetchData: jest.fn().mockResolvedValue({ data: 'mock data' }),
  postData: jest.fn().mockResolvedValue({ success: true })
}))
```

### Database Mocking
```javascript
// Use test database for integration tests
beforeEach(async () => {
  await setupTestDatabase()
})

afterEach(async () => {
  await cleanupTestDatabase()
})
```

## Test Commands
```bash
# Unit tests
npm run test                    # Run all tests
npm run test:watch             # Watch mode
npm run test:coverage          # With coverage

# E2E tests
npm run test:e2e              # Run Playwright tests
npm run test:e2e:headed       # Run with browser UI
npm run test:e2e:debug        # Debug mode

# All tests
npm run test:all              # Run unit + E2E tests
```

## Required Test Coverage

### Critical Paths (100% coverage)
- Authentication flows
- Payment processing
- User registration
- Admin access controls
- Trial system

### Standard Paths (80% coverage)
- Component rendering
- User interactions
- API integrations
- Business logic

### Nice-to-Have (60% coverage)
- Edge cases
- Error scenarios
- Performance tests

## Test Environment Setup
- **Test Database**: Separate from development
- **Mock External APIs**: Use MSW or similar
- **Environment Variables**: Test-specific configs
- **Cleanup**: Reset state between tests
- **Fixtures**: Reusable test data

## Continuous Integration
- Run tests on every PR
- Block merges if tests fail
- Generate coverage reports
- Run E2E tests on staging
- Performance regression testing

## Best Practices
- Write tests before fixing bugs
- Keep tests simple and focused
- Use descriptive test names
- Test user behavior, not implementation
- Mock external dependencies
- Clean up after tests
- Use data-testid for reliable selectors
- Test accessibility requirements

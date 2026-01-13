# CLAUDE - GE-Metrics Development Guide

## 🎯 Project Overview
GE-Metrics is a full-stack Old School RuneScape (OSRS) Grand Exchange analytics platform for tracking flips, analyzing potion profits, and providing real-time market data.

**Tech Stack**: React + Vite, TRPC, PostgreSQL, Mantine UI, Node.js + TypeScript

---

## 🏗️ Architecture & Key Files

### Frontend Structure
```
src/
├── components/auth/           # Authentication components
├── pages/Profile/            # User dashboard & flip tracking
├── pages/PotionCombinations/ # Potion profit calculator
├── hooks/                    # Custom React hooks
├── utils/                    # Utility functions & TRPC config
└── contexts/                 # React contexts
```

### Backend Structure
```
server/src/
├── trpc/                     # API routes
│   ├── items.ts             # OSRS Wiki API integration
│   ├── flips.ts             # Flip tracking CRUD
│   └── auth.ts              # Authentication
├── db/                       # Database schema & connection
└── services/                 # Business logic
```

### Critical Files to Know
- `src/pages/Profile/ProfileModern.jsx` - Main user dashboard
- `src/pages/PotionCombinations/index.jsx` - Potion calculator
- `server/src/trpc/items.ts` - External API integration
- `server/src/trpc/flips.ts` - User flip management
- `src/utils/trpc.jsx` - TRPC client configuration

---

## 🔧 Development Patterns

### TRPC Usage
```javascript
// Query (GET data)
const { data, isLoading, error } = trpc.items.getAllItems.useQuery()

// Mutation (POST/PUT/DELETE)
const mutation = trpc.flips.addFlip.useMutation()

// Real-time updates
const utils = trpc.useUtils()
utils.flips.getFlips.invalidate() // Refresh data after changes
```

### Mantine UI Patterns
```javascript
// Use Group instead of Badge leftIcon
<Group spacing={4}>
  <IconCoin size={14} />
  <Badge>Content</Badge>
</Group>

// Form handling
const form = useForm({
  initialValues: { ... },
  validate: { ... }
})
```

### Error Handling
```javascript
// Frontend: Always handle loading & error states
if (isLoading) return <Loader />
if (error) return <Alert color="red">{error.message}</Alert>

// Backend: Use proper TRPC errors
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: 'User-friendly message'
})
```

---

## 🚀 Common Development Tasks

### Adding New Features
1. **Backend**: Create TRPC procedure in appropriate router
2. **Database**: Update schema with Drizzle if needed  
3. **Frontend**: Build React component with Mantine
4. **Types**: Add TypeScript interfaces
5. **Error Handling**: Implement loading/error states

### Database Operations
```bash
# Generate migration
DATABASE_URL="..." npx drizzle-kit generate

# Push to database  
DATABASE_URL="..." npx drizzle-kit push
```

### Running the App
```bash
npm run dev        # Frontend (Vite)
npm run dev:server # Backend (Node.js)
```

---

## 📋 Current Priorities & Tasks

### 🔥 Immediate (P0)
- [ ] **Fix production potion combinations loading**
  - Debug external API connectivity in production
  - Add comprehensive error logging
  - Implement fallback data sources
- [ ] **Mobile responsiveness audit**
  - Profile page mobile optimization
  - Chart responsiveness on small screens
  - Touch-friendly interface improvements
- [ ] **Performance optimizations**
  - React.memo for expensive components
  - Database query optimization
  - Bundle size reduction with code splitting

### ⚡ High Priority (P1)
- [ ] **Enhanced error handling**
  - Centralized error boundary
  - Standardized error messages
  - Retry mechanisms for failed requests
- [ ] **Notification system**
  - Toast notifications for user actions
  - Real-time price alerts
  - Email notifications for events
- [ ] **Advanced search functionality**
  - Search filters and sorting
  - Keyboard shortcuts
  - Search history and suggestions

### 📊 Medium Priority (P2)
- [ ] **Analytics enhancements**
  - Historical trend analysis
  - ROI calculations
  - Performance benchmarking
- [ ] **Testing implementation**
  - Unit tests for utilities
  - Integration tests for TRPC
  - E2E tests for critical flows
- [ ] **Security improvements**
  - Two-factor authentication
  - Rate limiting
  - Security audit logging

### 🎯 Future Features (P3)
- [ ] **Subscription system** (Stripe integration)
- [ ] **Mobile application** (React Native)
- [ ] **Machine learning** (Price predictions)
- [ ] **API marketplace** (Developer access)

---

## 🐛 Known Issues & Fixes

### Current Issues
- **Badge leftIcon prop warnings**: Replace with Group wrapper
- **Chart rendering issues**: Fix responsiveness on window resize
- **Form validation inconsistencies**: Standardize error messages

### Production Debugging
1. Check network tab for API failures
2. Verify database connectivity
3. Monitor external API status (OSRS Wiki)
4. Check server logs for backend errors

---

## 📐 Project Roadmap

### Phase 1: Foundation ✅ (Completed)
- Core platform with trading features
- Real-time data integration
- User authentication with email verification
- Flip tracking system
- Potion profit calculator

### Phase 2: Enhanced UX 🔄 (Current)
- Advanced analytics and reporting
- Improved mobile experience
- Performance optimizations
- Social features and sharing

### Phase 3: Monetization 📋 (Next)
- Stripe subscription system
- Premium feature gates
- Mobile application
- Advanced historical data

### Phase 4: AI & Scale 🎯 (Future)
- Machine learning integration
- Predictive analytics
- Enterprise features
- Multi-game expansion

---

## 🔒 Security & Best Practices

### Authentication Flow
- JWT tokens in localStorage
- Email verification required
- Protected routes check auth status
- Secure password hashing with bcrypt

### Development Standards
- **TypeScript**: Strict typing, avoid `any`
- **React**: Functional components, proper hooks usage
- **Database**: Parameterized queries, proper indexing
- **API**: Rate limiting, input validation, error handling

### Performance Guidelines
- Use React.memo for expensive renders
- Implement useMemo/useCallback for calculations
- Optimize database queries with proper indexes
- Cache frequently accessed data

---

## 🚨 Emergency Procedures

### Production Issues
1. **API Down**: Check OSRS Wiki API status, enable fallback data
2. **Database Issues**: Verify connection strings, check query performance
3. **Auth Problems**: Check JWT validity, verify email service
4. **Performance**: Monitor server resources, check for memory leaks

### Quick Fixes
```bash
# Restart development servers
pkill -f "npm run dev"
npm run dev & npm run dev:server

# Database connection test
DATABASE_URL="..." npx drizzle-kit introspect

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 🧪 Testing Strategy

### Test Types & Commands
```bash
npm run test:unit        # Run unit tests with Vitest
npm run test:e2e         # Run E2E tests with Playwright
npm run test:coverage    # Generate coverage report
npm run test:watch       # Watch mode for TDD
npm run test:all         # Run all test suites
```

### 🚨 MANDATORY Testing Requirements - NO EXCEPTIONS 🚨
**CRITICAL**: Test-Driven Development (TDD) is REQUIRED for ALL changes:

#### The ONLY Acceptable Development Process:
1. **WRITE TEST FIRST** - Before ANY implementation code
2. **RUN TEST** - Watch it fail (Red phase)
3. **WRITE CODE** - Minimum code to pass test
4. **RUN TEST** - Watch it pass (Green phase)
5. **REFACTOR** - Improve code while keeping tests green
6. **MARK COMPLETE** - ONLY when all tests pass

#### Absolute Requirements:
- **100% Component Coverage** - EVERY component MUST have a test file
- **NO CODE WITHOUT TESTS** - Zero tolerance policy
- **Tests Must Pass Before Commit** - Pre-commit hooks enforce this
- **Integration Tests with Real TRPC** - Test actual API calls and database operations
- **Coverage Thresholds**: 100% components, 80% lines, 70% branches

### Test Structure
```
src/
├── test/
│   ├── setup.ts           # Test configuration
│   ├── utils/             # Test utilities
│   └── factories/         # Data factories
├── **/*.test.{ts,tsx}     # Unit tests (co-located)
└── **/*.spec.{ts,tsx}     # Integration tests

e2e/
├── auth.spec.ts           # Authentication flows
├── flips.spec.ts          # Flip tracking tests
└── fixtures/              # Test data & helpers
```

### Writing Tests - MANDATORY for Every Component
```typescript
// EVERY component test MUST include ALL of these test cases:
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@/test/utils/test-utils'
import { ComponentName } from './ComponentName'

describe('ComponentName', () => {
  // 1. REQUIRED: Component renders
  it('renders without crashing', () => {})
  
  // 2. REQUIRED: Data display
  it('displays all data correctly', async () => {})
  
  // 3. REQUIRED: Loading state
  it('shows loading state while fetching', () => {})
  
  // 4. REQUIRED: Error handling
  it('handles and displays errors gracefully', () => {})
  
  // 5. REQUIRED: User interactions
  it('handles all user interactions (clicks, inputs)', async () => {})
  
  // 6. REQUIRED: Accessibility
  it('is fully keyboard navigable', () => {})
  it('has proper ARIA labels', () => {})
  
  // 7. REQUIRED: Mobile responsiveness
  it('renders correctly on mobile devices', () => {})
})
```

#### Test Coverage Requirements Per Component:
- ✅ Rendering without errors
- ✅ All props handled correctly
- ✅ Loading states displayed
- ✅ Error states displayed
- ✅ User interactions work
- ✅ Form validations work
- ✅ Accessibility compliant
- ✅ Mobile responsive
- ✅ Real TRPC calls succeed
- ✅ Database operations verified

### CI/CD Pipeline
Every push/PR triggers:
1. **Linting & TypeScript** checks
2. **Unit tests** with coverage
3. **Integration tests** with test database
4. **E2E tests** across browsers
5. **Performance tests** with Lighthouse
6. **Security scanning** with Trivy

### Pre-commit Hooks
Automatic checks before commit:
- TypeScript compilation
- ESLint validation
- Unit test execution
- Coverage thresholds

## 🤖 MANDATORY Rules for AI Assistants (Claude, GitHub Copilot, etc.)

### YOU MUST FOLLOW THESE RULES - NO EXCEPTIONS:
1. **ALWAYS write test FIRST** - Never write implementation before test
2. **ALWAYS run test after writing it** - Verify it fails (Red phase)
3. **ONLY THEN write implementation** - Minimum code to pass test
4. **ALWAYS run test after implementation** - Verify it passes (Green phase)
5. **NEVER mark task complete without passing tests** - Tests are proof of completion
6. **EVERY component change needs test update** - No untested code
7. **Track all tasks in TASKS.md** - Document test file paths

### AI Assistant Workflow:
```bash
# 1. Create/update test file
vim ComponentName.test.jsx  # Write test FIRST

# 2. Run test to see it fail
npm run test:watch ComponentName.test

# 3. Implement feature
vim ComponentName.jsx  # NOW write the code

# 4. Run test to see it pass
npm run test:watch ComponentName.test

# 5. Update TASKS.md
echo "✅ Task: [Feature] | Test: ComponentName.test.jsx | Status: PASSING" >> TASKS.md
```

## 📞 Development Workflow

### Before Starting Work
1. Pull latest changes
2. Run `npm run test:unit:run` to verify ALL tests pass
3. Check for TypeScript errors: `npx tsc --noEmit`
4. Review current task priorities
5. Check TASKS.md for context

### During Development
1. Use TodoWrite tool to track progress
2. **WRITE TEST FIRST** (TDD is mandatory)
3. Run `npm run test:watch` for instant feedback
4. Follow existing code patterns
5. Test on multiple screen sizes
6. Handle loading and error states
7. Update test when changing ANY component

### Before Committing
1. Run `npm run test:all` - 100% MUST pass
2. Fix all TypeScript errors
3. Ensure test coverage meets thresholds
4. Test core functionality manually
5. Check mobile responsiveness
6. Update TASKS.md with completed task
7. Update documentation if needed

### Test-Driven Development
```bash
# 1. Write failing test
npm run test:watch

# 2. Implement feature
# 3. Make test pass
# 4. Refactor with confidence
# 5. Commit when all tests green
```

---

## 📚 Detailed Documentation

For comprehensive information, see files in the `claude/` directory:
- `claude/PRD.md` - Product Requirements Document
- `claude/planning.md` - Development roadmap and milestones
- `claude/tasks.md` - Detailed task breakdown and sprint planning
- `claude/claude.md` - Extended technical guide

This guide provides everything needed for effective development on GE-Metrics.
---

## 📚 Claude Code Documentation

Local Claude Code documentation is automatically synced and available in:
- `docs/claude-code/` - Complete Claude Code documentation
- Updated daily via GitHub Actions
- See [docs/claude-code/README.md](docs/claude-code/README.md) for structure

Quick reference: `docs/claude-code/claude-code-docs.txt` contains the full documentation map.


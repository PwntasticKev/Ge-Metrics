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

## 📞 Development Workflow

### Before Starting Work
1. Pull latest changes
2. Check for TypeScript errors: `npx tsc --noEmit`
3. Run tests if available
4. Review current task priorities

### During Development
1. Use TodoWrite tool to track progress
2. Follow existing code patterns
3. Test on multiple screen sizes
4. Handle loading and error states

### Before Committing
1. Fix all TypeScript errors
2. Test core functionality
3. Check mobile responsiveness
4. Update documentation if needed

---

## 📚 Detailed Documentation

For comprehensive information, see files in the `claude/` directory:
- `claude/PRD.md` - Product Requirements Document
- `claude/planning.md` - Development roadmap and milestones
- `claude/tasks.md` - Detailed task breakdown and sprint planning
- `claude/claude.md` - Extended technical guide

This guide provides everything needed for effective development on GE-Metrics.
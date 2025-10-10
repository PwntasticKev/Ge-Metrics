# Claude Code Guide for GE-Metrics

## Project Overview

GE-Metrics is a full-stack Old School RuneScape (OSRS) Grand Exchange analytics platform built with React, TRPC, and PostgreSQL. This guide provides context and patterns for future Claude Code sessions.

## Architecture & Technology Stack

### Frontend
- **Framework**: React 18 with Vite
- **UI Library**: Mantine v6 (components, forms, notifications)
- **Type Safety**: TRPC for end-to-end TypeScript
- **Routing**: React Router v6
- **Charts**: Recharts for data visualization
- **State**: React hooks + TRPC queries/mutations

### Backend
- **Runtime**: Node.js with TypeScript
- **API**: TRPC router with procedures
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT with bcrypt password hashing
- **External APIs**: OSRS Wiki API integration

### Key Directories
```
├── src/
│   ├── components/          # Reusable React components
│   ├── pages/              # Page-level components
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── contexts/           # React contexts
│   └── assets/             # Static assets
├── server/
│   ├── src/
│   │   ├── trpc/          # TRPC routers and procedures
│   │   ├── db/            # Database schema and connection
│   │   ├── services/      # Business logic services
│   │   └── middleware/    # Auth and other middleware
```

## Development Patterns

### Component Structure
- Use functional components with hooks
- Follow Mantine component patterns
- Implement proper TypeScript interfaces
- Use forwardRef for complex components requiring refs

### TRPC Patterns
- **Queries**: Use for data fetching (`trpc.items.getAllItems.useQuery()`)
- **Mutations**: Use for data modification (`trpc.flips.addFlip.useMutation()`)
- **Invalidation**: Invalidate queries after mutations for real-time updates
- **Error Handling**: Use TRPCError with proper error codes

### Authentication Flow
- JWT tokens stored in localStorage
- AuthProvider context manages global auth state
- Protected routes check authentication status
- Email verification required for new users

## Key Features & Components

### 1. Flip Tracking System
- **Location**: `src/pages/Profile/ProfileModern.jsx`
- **Features**: Add, edit, delete flips with real-time chart updates
- **Components**: Modal forms, autocomplete item search with images
- **Backend**: `server/src/trpc/flips.ts`

### 2. Potion Combinations
- **Location**: `src/pages/PotionCombinations/`
- **Features**: Profit calculations, volume analysis, filtering
- **Data Processing**: `src/utils/potion-calculation.js`
- **Components**: PotionCard, filtering controls

### 3. Item Data Management
- **API Integration**: OSRS Wiki API via `server/src/trpc/items.ts`
- **Caching**: Database caching of volume data
- **Real-time Updates**: Periodic data refresh

### 4. User Authentication
- **Registration**: Email verification flow
- **Login**: JWT with optional 2FA
- **Components**: SignupFlow, LoginFlow, EmailVerificationNotice

## Common Development Tasks

### Adding New Features
1. Create TRPC procedures in appropriate router
2. Add database schema changes with Drizzle
3. Build React components following Mantine patterns
4. Implement proper error handling and loading states
5. Add TypeScript interfaces for type safety

### Database Operations
- **Schema**: Defined in `server/src/db/schema.js`
- **Migrations**: Use Drizzle Kit for schema changes
- **Queries**: Use Drizzle ORM with SQL-like syntax
- **Connection**: Environment-based connection strings

### API Integration
- **External APIs**: Always include User-Agent headers
- **Error Handling**: Wrap in try-catch with TRPCError
- **Rate Limiting**: Respect API limits and implement backoff
- **Fallbacks**: Handle API unavailability gracefully

## Code Quality Standards

### TypeScript
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use Zod for runtime validation
- Avoid `any` types, prefer proper typing

### React Best Practices
- Use React hooks appropriately
- Implement proper useEffect dependencies
- Use useMemo/useCallback for performance optimization
- Handle loading and error states consistently

### Mantine UI Patterns
- Use Mantine components over custom HTML
- Follow Mantine theming and styling patterns
- Implement responsive design with Mantine breakpoints
- Use Mantine form hooks for form management

### Error Handling
- Frontend: Display user-friendly error messages
- Backend: Use proper HTTP status codes and TRPCError
- Logging: Console.log for debugging, structured logging for production
- Fallbacks: Graceful degradation when services unavailable

## Environment & Deployment

### Development Setup
```bash
npm install              # Install dependencies
npm run dev             # Start frontend
npm run dev:server      # Start backend
```

### Environment Variables
- Database connection strings
- API keys and external service credentials
- JWT secrets and authentication settings

### Production Considerations
- Database hosted on Neon (PostgreSQL)
- Frontend deployment with static asset optimization
- Environment-specific configuration
- Performance monitoring and error tracking

## Debugging & Troubleshooting

### Common Issues
1. **TRPC Errors**: Check network tab, verify procedure names
2. **Database Issues**: Verify connection strings and schema sync
3. **Auth Problems**: Check JWT token validity and expiration
4. **API Failures**: Verify external API status and rate limits

### Development Tools
- React DevTools for component debugging
- Network tab for API request analysis
- Database admin tools for data verification
- TypeScript compiler for type checking

### Production Debugging
- Check server logs for backend errors
- Monitor external API status and response times
- Verify database connectivity and query performance
- Use error tracking for production issues

## Data Flow

### Real-Time Updates
1. External API data fetched periodically
2. Database updated with latest prices/volumes
3. Frontend queries database via TRPC
4. Charts and tables update automatically

### User Interactions
1. User performs action (add flip, search item)
2. Frontend sends TRPC mutation/query
3. Backend processes request and updates database
4. Frontend invalidates queries and refetches data
5. UI updates with new data

## Testing Strategy

### Frontend Testing
- Component unit tests with React Testing Library
- Integration tests for critical user flows
- E2E tests for complete workflows

### Backend Testing
- Unit tests for TRPC procedures
- Database integration tests
- API integration tests with external services

## Performance Optimization

### Frontend
- React.memo for expensive components
- useMemo/useCallback for expensive calculations
- Lazy loading for routes and components
- Image optimization and caching

### Backend
- Database query optimization with indexes
- Caching frequently accessed data
- Connection pooling for database
- Rate limiting for API protection

## Future Development Guidelines

### Scalability Considerations
- Design components for reusability
- Plan for database schema evolution
- Consider API versioning for breaking changes
- Implement proper monitoring and alerting

### Feature Development
- Follow existing patterns and conventions
- Maintain type safety throughout the stack
- Implement proper error handling and user feedback
- Consider mobile responsiveness from the start

### Code Organization
- Keep components focused and single-purpose
- Extract business logic into utility functions
- Use consistent naming conventions
- Document complex logic and algorithms

## Key Files to Reference

### Frontend Entry Points
- `src/pages/Profile/ProfileModern.jsx` - User dashboard and flip tracking
- `src/pages/PotionCombinations/index.jsx` - Potion profit calculator
- `src/components/auth/` - Authentication components

### Backend Entry Points
- `server/src/trpc/items.ts` - Item data and external API integration
- `server/src/trpc/flips.ts` - User flip tracking and analytics
- `server/src/trpc/auth.ts` - Authentication and user management

### Configuration
- `package.json` - Dependencies and scripts
- `server/src/db/schema.js` - Database schema
- `src/utils/trpc.jsx` - TRPC client configuration

This guide should provide sufficient context for future development sessions while maintaining the established patterns and architecture.
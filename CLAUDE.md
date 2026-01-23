# GE-Metrics

OSRS Grand Exchange analytics platform for tracking flips and market data.

## Essential Commands
- **Test**: `npm run test:unit` (must pass 100% before marking complete)
- **Lint**: `npm run lint`
- **Type Check**: `npx tsc --noEmit`
- **Database Migrations**: `DATABASE_URL="..." npx drizzle-kit push`

## Documentation
- [Testing Requirements](docs/ai-instructions/testing.md) - **READ FIRST**
- [Architecture](docs/ai-instructions/architecture.md)
- [Development Patterns](docs/ai-instructions/patterns.md)
- [Emergency Procedures](docs/ai-instructions/emergency.md)

## Critical Rule
**Never mark a task complete without running tests.** See [testing requirements](docs/ai-instructions/testing.md).
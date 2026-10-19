# GE-Metrics

OSRS Grand Exchange analytics platform for tracking flips and market data.

## Essential Commands
- **Test**: `npm run test:unit` (must pass 100% before marking complete)
- **Lint**: `npm run lint`
- **Type Check**: `npx tsc --noEmit`
- **Database Migrations**: `DATABASE_URL="..." npx drizzle-kit push`
- **Local Dev**: Must start BOTH servers:
  1. `npx vite --port 8000` (frontend on :8000)
  2. `node server/dist/index.js` (backend on :4000, build first with `bun run build:server`)
  - Vite proxies `/trpc` and `/api` → `localhost:4000`. Without backend running, all API calls return empty responses → "Failed to execute 'json' on 'Response'" crash.

## Documentation
- [Testing Requirements](docs/ai-instructions/testing.md) - **READ FIRST**
- [Architecture](docs/ai-instructions/architecture.md)
- [Development Patterns](docs/ai-instructions/patterns.md)
- [Emergency Procedures](docs/ai-instructions/emergency.md)

## Critical Rules
- **Never mark a task complete without running tests.** See [testing requirements](docs/ai-instructions/testing.md).
- **Never import `src/config/environment.js` from client code.** It uses `process.env` (Node-only). Use `src/config/featureFlags.js` for client-side feature flags.
- **Every Express server MUST have a 404 catch-all route** after all routes and before the error handler. Missing this causes empty responses → `Failed to execute 'json' on 'Response': Unexpected end of JSON input` on the client. See `server/src/index.ts`.
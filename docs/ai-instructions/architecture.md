# Architecture & Key Files

## Project Structure
```
src/
├── pages/Profile/ProfileModern.jsx      # User dashboard
├── pages/PotionCombinations/index.jsx   # Potion calculator
├── hooks/                                # Custom React hooks
├── utils/trpc.jsx                       # TRPC client config
└── components/                           # Reusable components

server/src/
├── trpc/items.ts                        # OSRS Wiki API integration
├── trpc/flips.ts                        # Flip tracking
├── trpc/auth.ts                         # Authentication
└── db/                                  # Database schema
```

## Tech Stack
- Frontend: React + Vite + Mantine UI
- Backend: Node.js + TypeScript + TRPC
- Database: PostgreSQL + Drizzle ORM
- Auth: JWT + bcrypt

## Key Integration Points
- OSRS Wiki API: Real-time price data
- TRPC: Type-safe API layer
- Drizzle: Database migrations and schema
# GE-Metrics

A comprehensive Old School RuneScape (OSRS) Grand Exchange analytics platform for tracking flips, analyzing potion profits, and providing real-time market data.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev        # Frontend (http://localhost:8000)
npm run dev:server # Backend (http://localhost:4000)
```

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** - Essential commands and AI instructions
- **[docs/](docs/)** - Complete documentation (setup, development, references)
- **[TASKS.md](TASKS.md)** - Current project tasks and priorities

## 🧪 Testing

```bash
# Run comprehensive test suite (recommended after any changes)
/tdd-verification   # Claude skill for full TDD verification

# Manual testing
npm run lint        # Code style
npx tsc --noEmit    # TypeScript check
npm run test:unit:run # Unit tests
npm run test:e2e    # End-to-end tests
```

## 🛠️ Tech Stack

- **Frontend**: React + Vite, Mantine UI, TRPC
- **Backend**: Node.js + TypeScript, TRPC, PostgreSQL
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT with email verification

## 📁 Project Structure

```
├── src/                      # Frontend React application
├── server/                   # Backend Node.js API
├── claude/                   # Claude Code documentation
├── docs/                     # Project documentation
│   ├── setup/               # Setup and configuration guides
│   ├── legacy/              # Historical documentation
│   └── testing/             # Test files and scripts
├── scripts/                 # Utility scripts
└── CLAUDE.md               # Main development guide
```

## 🔧 Key Features

- **Real-time GE Data**: Live prices and volume tracking
- **Flip Tracking**: Comprehensive transaction management
- **Potion Calculator**: Profit analysis for potion combinations
- **User Authentication**: Secure login with email verification
- **Analytics Dashboard**: Charts and performance metrics

## 📖 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Main development guide for Claude Code sessions
- **[claude/](./claude/)** - Detailed technical documentation and planning
- **[docs/setup/](./docs/setup/)** - Setup and configuration guides

## 🚀 Development

### Prerequisites
- Node.js 18+
- PostgreSQL database
- OSRS Wiki API access

### Environment Setup
1. Copy environment template: `cp docs/setup/ENV_LOCAL_TEMPLATE.md .env.local`
2. Configure database connection and API keys
3. Run database migrations: `npm run db:push`

### Available Scripts
- `npm run dev` - Start frontend development server
- `npm run dev:server` - Start backend development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔒 Security

- JWT authentication with secure token storage
- Email verification for new accounts
- Input validation and sanitization
- Rate limiting and CORS protection

## 📊 Current Status

✅ **Phase 1 Complete**: Core platform with flip tracking and potion calculator  
🔄 **Phase 2 In Progress**: Enhanced UX and mobile optimization  
📋 **Phase 3 Planned**: Subscription system and premium features  

## 🤝 Contributing

1. Review the [CLAUDE.md](./CLAUDE.md) development guide
2. Check current priorities in the guide
3. Follow established patterns and conventions
4. Ensure TypeScript compliance and test coverage

## 📄 License

Private project - All rights reserved

---

For detailed development information, see [CLAUDE.md](./CLAUDE.md)
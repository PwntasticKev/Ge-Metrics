# Ge-Metrics Development Guide

## 🚀 Quick Start

**Option 1: One Command (Recommended)**
```bash
./start-dev.sh
```

**Option 2: Manual (Two Terminals)**

Terminal 1 - Backend:
```bash
cd server && npm run dev:full
```

Terminal 2 - Frontend:
```bash
npm run dev
```

Both options will start:
- **Backend**: http://localhost:4000 (Express + PostgreSQL)
- **Frontend**: http://localhost:8000 (Vite React app)

Press `Ctrl+C` to stop the servers.

## 📊 Architecture

- **Database**: PostgreSQL with Drizzle ORM
- **Backend**: Express.js with tRPC
- **Frontend**: React with Vite
- **State Management**: React Query + tRPC
- **UI Library**: Mantine v6

## 🔗 API Endpoints

- Health: `GET /health`
- Potion Volumes: `GET /api/potion-volumes`
- Cache Status: `GET /api/potion-volumes/status`
- Manual Refresh: `POST /api/potion-volumes/refresh`

## 🗄️ Database

The app uses your existing PostgreSQL database (`auth_db`) with the following key tables:
- `users` - User authentication
- `potion_volumes` - Cached volume data (refreshes every 2.5 minutes)
- `item_mapping` - OSRS item definitions
- `item_price_history` - Historical price data

## 🧪 Testing

```bash
npm test           # Run tests
npm run test:run   # Run tests once
```

## 📝 Notes

- The potion volume cache automatically refreshes every 2.5 minutes
- Volume data is fetched from the OSRS Wiki API
- All Convex dependencies have been removed
- The app now uses standard REST APIs with React Query

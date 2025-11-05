# RuneLite Plugin Integration - Tasks

## Phase 1: Planning & Setup ✅
- [x] Finalize architecture decisions
- [x] Create context documentation
- [x] Set up monorepo structure (`runelite-plugin/` folder)
- [x] Create project folder structure
- [x] Set up build system (Gradle for RuneLite plugin)
- [ ] Review RuneLite Plugin Hub requirements

## Phase 2: Backend API ✅
- [x] Design API endpoints (`POST /api/runelite/trades`)
- [x] Implement authentication (JWT + refresh tokens)
- [x] Create database schema:
  - [x] `osrs_accounts` table
  - [x] `trade_events` table
  - [x] `trade_matches` table
  - [x] `open_positions` table
  - [x] `all_trades_admin` table
  - [ ] `trade_archives` tables (partitioned by year)
- [x] Implement trade ingestion endpoint
- [x] Implement FIFO matching algorithm
- [x] Implement partial fill aggregation logic
- [ ] Create archive system (daily cron + yearly cron)
- [x] Implement rate limiting (5000 trades/day per user)
- [x] Add security measures (SQL injection prevention, audit logging)
- [ ] Implement WebSocket for real-time updates
- [x] Add pagination for trade history (cursor-based)

## Phase 3: Plugin Development 🚧
- [x] Set up RuneLite plugin project structure
- [ ] Implement authentication UI (login/create account)
- [ ] Implement OSRS username detection from RuneLite
- [ ] Implement GE event listener (`GrandExchangeOfferChanged`)
- [ ] Implement trade data collection and formatting
- [ ] Implement API communication (HTTP POST to backend)
- [ ] Implement offline queue (store trades when offline)
- [ ] Implement reconnection logic (send missed trades)
- [ ] Create plugin settings panel
- [ ] Add error handling and user notifications
- [ ] Test plugin in RuneLite client
- [ ] Fix any integration issues

## Phase 4: Frontend Integration
- [ ] Implement WebSocket connection in frontend
- [ ] Add real-time trade updates to UI
- [ ] Implement notification system (top-right corner)
- [ ] Add notification preferences (configurable)
- [ ] Update trade history page to use pagination
- [ ] Add open positions display
- [ ] Add per-account trade filtering

## Phase 5: Integration & Testing
- [ ] Test end-to-end flow (plugin → backend → frontend)
- [ ] Test multi-client/multi-account handling
- [ ] Test offline/online scenarios
- [ ] Test FIFO matching algorithm (edge cases)
- [ ] Test partial fill aggregation
- [ ] Test rate limiting
- [ ] Performance testing (large datasets)
- [ ] Security testing (SQL injection, rate limiting)

## Phase 6: Plugin Hub Submission
- [ ] Review RuneLite Plugin Hub requirements checklist
- [ ] Prepare plugin for submission
- [ ] Write plugin description
- [ ] Create plugin icon (64x64 PNG)
- [ ] Submit to RuneLite Plugin Hub
- [ ] Handle review process and feedback


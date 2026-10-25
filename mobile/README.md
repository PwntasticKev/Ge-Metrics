# GE Metrics (iOS)

Expo app for flipping on the Old School RuneScape Grand Exchange: combination sets
and single items ranked by what you can make in one 4-hour buy-limit window.

- Prices: OSRS Wiki real-time prices API, refreshed every minute.
- Math: shared with the website, from `../src/domain/flipping` (exposed to Metro as `@ge/engine`).
- No account or backend. Settings and the watchlist live on the device.
- Design: `../docs/design/mobile-app-blue.html` (light A, dark B).

## Run

```bash
npm install
npx expo run:ios                 # debug build on the simulator
npm run ios:release              # release build, no Metro needed
```

## Ship to TestFlight (local build, no EAS)

```bash
GEM_ASC_KEY_ID=... GEM_ASC_ISSUER_ID=... npm run testflight
```

See `scripts/upload-testflight.sh` for the one-time setup it expects.

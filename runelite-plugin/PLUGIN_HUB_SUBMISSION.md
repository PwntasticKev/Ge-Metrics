# GE Metrics - Plugin Hub Submission

## Plugin information

- **Name**: GE Metrics
- **Package**: `com.gemetrics.plugin`
- **Main class**: `com.gemetrics.plugin.GeMetricsPlugin`
- **Version**: 1.1.0

## Description

Live GE prices, GE item set profits and a buy assist from GE-Metrics.com, plus automatic trade tracking and sync.

## Features

- **Prices tab**: search any tradeable item and see its latest low/high price.
- **Sets tab**: GE item sets ranked by flip profit after tax (combine or split).
- **Buy assist**: queue an item from the panel. It is shown at the top of the GE item search, and a hotkey types the queued quantity/price into the chatbox prompt. The player still clicks the item, presses Enter and confirms the offer.
- **Trade tracking**: GE offers are synced to GE-Metrics.com. Trades are queued in a local JSON file while offline.

## Hub requirements

| Requirement | Status |
| --- | --- |
| No automated game input (clicks, menu entries, key presses) | Yes. The buy assist only shows the item and fills the chatbox text; the player performs every action. This is the same approach as Flipping Copilot. |
| Uses RuneLite's injected `OkHttpClient` and `Gson` | Yes |
| No native or unverified dependencies | Yes. SQLite was replaced with a JSON file; the plugin has no runtime dependencies. |
| Background work stops on shutdown | Yes. Price polling, token refresh and sync tasks are cancelled in `shutDown()`. |
| OSRS Wiki API used with a descriptive User-Agent | Yes (`PriceService.USER_AGENT`) |
| Icon (`icon.png`, max 48x72) | Yes, 48x48 |

## Data sent off-client

The Hub asks plugins to disclose this. With the user logged in to GE Metrics, the plugin sends:
- their GE offers (item, price, quantity, state) and OSRS display name to `ge-metrics.com`
- their GE Metrics login email/password, only when they log in from the panel

Price lookups go to `ge-metrics.com` (when logged in) or `prices.runescape.wiki`.

## Still to do before submitting

1. The production backend at `https://www.ge-metrics.com` must be up. As of 2026-10-27 Vercel returns `DEPLOYMENT_NOT_FOUND`.
2. Push this folder to its own public GitHub repo, or use a subdirectory build. The Hub builds from a repo + commit hash.
3. Open a PR to [runelite/plugin-hub](https://github.com/runelite/plugin-hub) adding `plugins/ge-metrics` with:
   ```
   repository=https://github.com/<owner>/<repo>.git
   commit=<full commit hash>
   ```
4. Test it in-game in the dev client (`./gradlew run`): log in, buy and sell something, and use the buy assist.

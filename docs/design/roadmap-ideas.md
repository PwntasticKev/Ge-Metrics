# GE Metrics: ideas for the app and the website

Written 2026-10-26. The goal behind every idea: open GE Metrics and know in a
few seconds what to buy, what to pay and what to sell it for.

Ground rules carried over from earlier decisions:

- No server or database for core features. Everything runs on the OSRS Wiki
  prices API plus on-device storage.
- The website's look stays as it is. Web changes are speed and correctness
  only unless asked.
- Blue palette, no red for losses, no RuneScape fonts.

## Done in this round (app)

| Feature | What it does |
|---|---|
| Buy now tab | Home screen. Ranked picks for the next 4 hours and for overnight, with buy price, sell price and amount. |
| Last-hour check | A pick's prices are the more careful of live and last-hour average, so one spike can't fake a margin. |
| Overnight picks | Offers at the 24h typical low/high, sized to fill over 8 hours; skips items that moved away. |
| Bought tab + reminders | Log what you bought; see profit if sold now; local notification when the buy limit resets. |
| Tap to copy prices | Tap a price in any expanded row to copy it for the GE on OSRS mobile. |
| Instant start | Last prices cached on the phone; lists draw in about a second, then refresh. Works offline. |
| Set sell price on rows | Collapsed set rows show the sell price under the profit. |
| Search shows everything | Item search is a price lookup and includes losing items. |
| Orientation setting | Auto, vertical or horizontal. |
| Plan my cash | Splits the cash stack across up to 8 GE slots for the most total profit. |
| Dips | Liquid items trading 5%+ under the day's typical low for an hour, while the highs hold. |
| Item details sheet | 1D/1W/1M/1Y chart, copyable prices, limits, per-side volume, alch profit, sets. Opens from any row or a `gemetrics:///?item=ID` link. |
| Chart upgrade | Drag to read any point, sell and buy lines, volume bars, min/max, % change; 1D/1W/1M/3M/1Y. |
| Game update markers | Game updates and dev blogs from the wiki as dots on the chart; posts that mention the item stand out. Tap for the post. |
| Update movers | Tools view: items named in the latest posts with their price move since the post and current margin. |
| Tab re-press | Tapping the active tab scrolls its list to the top; Tools pops to the hub first. |
| Trade timing | Item details: best buy and sell hour (local time) when the pattern held on most of the last 15 days, a 24-bar hour heatmap, a steady weekday, fill time for one buy limit and GP/h per GE slot. |
| GP/h per slot sort | Buy now (Next 4 hours, Dips): sort by profit per hour a GE slot is busy, from each side's trade flow. |
| Sell helper | Bought tab: "Sell now X or list Y, ~2h (+Z)" per holding, using the 24h typical high and the sell-side flow. |
| Flip journal | "Mark sold" asks how many and at what price; partial sells keep the rest open. Every sale is kept with buy and sell price, GE tax, hold time, ROI and GP/h of hold. Older saved sales migrate in place. |
| Profit view | Watchlist, Profit: realized profit for today / 7 / 30 days / all, daily bars (blue up, grey down) with a running total, best and worst flips, per-item leaderboard (profit, flips, win rate, average hold), open lots at the instant-sell price after tax. |
| Trading insights | Items you lose on (negative average over 2+ flips), hold time against the 4h buy-limit window and what long holds earn, GE tax paid as a share of margin. |
| CSV export and restore | Share sheet export of the whole journal; restore from a picked CSV adds what's missing without duplicating. |
| Home and lock screen widget (iOS) | Small, medium and lock screen sizes. Edit the widget to show Buy now picks, Watchlist or Bought items. The app shares which items to show through an App Group; the widget fetches live wiki prices itself every ~20 minutes. Tap opens the item. |
| Mini window (PiP) | Up to 5 live prices (watchlist items, Buy now picks or holdings) in a Picture in Picture window over the game. Optional auto-open when leaving the app. Native refresh every minute while it's up. |

## Done in this round (web)

| Change | Effect |
|---|---|
| Lazy-load the last eager pages | Main JS 431 KB to 215 KB gzipped. Charts no longer load on first visit. |
| Working CI | npm + vitest (742 tests) + vite build + iOS typecheck; first green run since the relaunch. |

## Next for the app, highest value first

1. **Margin alerts without a server.** iOS background fetch
   (`expo-background-task`) checks watched items every ~15 to 30 minutes and
   fires a local notification when a margin crosses a threshold you set. Not
   real time (iOS decides when it runs), but no server.
2. **Profit history follow-ups.** Shipped as the Profit view; next is a
   widget line for today's profit and per-item notes ("why I
   bought") on journal entries.
3. **Update alerts.** Shipped as chart markers and Update movers; next is a
   local notification when a new post mentions a watched item.
4. **Share a pick.** Share sheet with an image of a pick (item, prices,
   profit) for clan chats.
5. **iPad and landscape layouts.** Two columns: list on the left, item page
    on the right.

## Mini window notes (Picture in Picture)

iOS has no floating windows for normal apps, so the mini window is a
Picture in Picture "video" whose frames are the ticker
(`AVPictureInPictureController` with a sample-buffer content source, iOS 15+).
Native code lives in `mobile/modules/pip-ticker`.

- **Background refresh is native.** While the app is in the background the
  JS side can't be relied on: React Query stops refetching when the app loses
  focus (see `useAppFocus` in `_layout.tsx`), and iOS may suspend the JS
  thread. So the Swift side fetches `/latest?id=` for each shown item every
  60 s (same User-Agent as the app) and redraws. JS pushes fresh rows
  whenever it has them, e.g. after you come back to the app.
- **Audio session.** PiP needs the `.playback` category and the `audio`
  background mode. We use `.mixWithOthers` and never play sound, so the
  game's audio keeps playing.
- **Pause** in the PiP window pauses the price refresh.
- **App Review risk.** Apple documents PiP for video. Ticker-style PiP apps
  exist on the store, but a reviewer could cite guideline 2.5.4 (background
  modes used only for their intended purpose). Mention in review notes that
  the mini window is user-started and shows live prices.
- **Device only.** Must be checked on a real iPhone (TestFlight) for
  auto-start and background refresh; see the PR for steps.

## Next for the website (no visual change unless asked)

1. **Shared engine.** Point the web's Combination Sets and All Items tables
   at `src/domain/flipping` so both platforms compute tax, limits and margins
   the same way. Same table, same columns, more accurate numbers.
2. **Image weight.** `gehd.png` is 2.1 MB and the two music files are 5 to
   6 MB each. Serve the image as WebP and stream the audio only when played.
3. **Prices cache.** Persist the last `/latest` and `/mapping` responses in
   localStorage (like the app) so a return visit paints instantly.
4. **Buy now page.** The app's Buy now list as a web page, if the website
   should get new features later.

## New tools worth adding

The app already has 23 processing tools (planks, enchanting, tablets,
tanning, bows, gems, battlestaves, bars, d'hide, Sailing parts and more) plus
decanting, herb cleaning, unf potions, high alchemy and 269 wiki money makers.
Gaps worth filling:

- **Barrows and moons repair costs** at your Smithing level (the web has
  Barrows repair; the app doesn't).
- **Potion making** (unf + secondary into finished potion), the step after
  the existing unf tool.
- **Cooking and fletching** high-volume methods (karambwans, darts, arrows)
  with live input and output prices.
- **Sailing-era recipes** as the wiki fills them in (`npm run data:refresh`
  already pulls new money-making guides).

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

## Done in this round (web)

| Change | Effect |
|---|---|
| Lazy-load the last eager pages | Main JS 431 KB to 215 KB gzipped. Charts no longer load on first visit. |

## Next for the app, highest value first

1. **Home screen widget (iOS WidgetKit).** Top 3 Buy now picks on the home
   screen without opening the app. Needs a native widget extension and an
   App Group to share cached prices; local build only, no EAS.
2. **Item page.** Tap an item name for a full page: 24h / 7d / 30d chart,
   buy limit, high alch, daily volume per side, and which sets or recipes it
   is part of. Today each list shows only a sparkline.
3. **Margin alerts without a server.** iOS background fetch
   (`expo-background-task`) checks watched items every ~15 to 30 minutes and
   fires a local notification when a margin crosses a threshold you set. Not
   real time (iOS decides when it runs), but no server.
4. **Sell-side helper for holdings.** For each holding: "sell now at X" vs
   "list at the 24h high Y and wait". Show the expected wait from the last
   day's sell volume.
5. **Profit history.** Chart of sales from the Bought tab by day and by item,
   plus best and worst flips. Export as CSV.
6. **Cash planner.** Given your cash stack, fill it across the best picks
   (greedy by profit per GP, respecting each buy limit) so the whole stack is
   working, not just the top item.
7. **"Dump" detector.** Items whose live low is far under the 24h average low
   on high volume. Often the best quick buys after a game update.
8. **Game update awareness.** Pull the wiki's update posts and flag items
   mentioned in the latest update; their prices move most that week.
9. **Share a pick.** Share sheet with an image of a pick (item, prices,
   profit) for clan chats.
10. **iPad and landscape layouts.** Two columns: list on the left, item page
    on the right.

## Next for the website (no visual change unless asked)

1. **Shared engine.** Point the web's Combination Sets and All Items tables
   at `src/domain/flipping` so both platforms compute tax, limits and margins
   the same way. Same table, same columns, more accurate numbers.
2. **Fix CI.** The workflow calls `bun`, `bunx` and `biome`, which CI doesn't
   install, and runs DB jobs against a database that no longer exists. Switch
   to npm + vitest and drop the DB jobs so checks mean something again.
3. **Image weight.** `gehd.png` is 2.1 MB and the two music files are 5 to
   6 MB each. Serve the image as WebP and stream the audio only when played.
4. **Prices cache.** Persist the last `/latest` and `/mapping` responses in
   localStorage (like the app) so a return visit paints instantly.
5. **Buy now page.** The app's Buy now list as a web page, if the website
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

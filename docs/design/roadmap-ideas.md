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
| Coming up | Tools view: items named in dev blogs, polls and "next week" news before they ship, with the sentence, a direction guess, 7d change, volume, a Late flag (10%+ since the post) and released vs not out yet. |
| Pumps & dumps | Thin-volume spike detector: badge on item rows and the item sheet, pumps left out of Buy now, Tools list with a 7-day sigma check. |
| Tab re-press | Tapping the active tab scrolls its list to the top; Tools pops to the hub first. |

## Done in this round (web)

| Change | Effect |
|---|---|
| Lazy-load the last eager pages | Main JS 431 KB to 215 KB gzipped. Charts no longer load on first visit. |
| Working CI | npm + vitest (742 tests) + vite build + iOS typecheck; first green run since the relaunch. |

## Next for the app, highest value first

1. **Home screen widget (iOS WidgetKit).** Top 3 Buy now picks on the home
   screen without opening the app. Needs a native widget extension and an
   App Group to share cached prices; local build only, no EAS.
2. **Margin alerts without a server.** iOS background fetch
   (`expo-background-task`) checks watched items every ~15 to 30 minutes and
   fires a local notification when a margin crosses a threshold you set. Not
   real time (iOS decides when it runs), but no server.
3. **Sell-side helper for holdings.** For each holding: "sell now at X" vs
   "list at the 24h high Y and wait". Show the expected wait from the last
   day's sell volume.
4. **Profit history.** Chart of sales from the Bought tab by day and by item,
   plus best and worst flips. Export as CSV.
5. **Update alerts.** Shipped as chart markers and Update movers; next is a
   local notification when a new post mentions a watched item.
6. **Share a pick.** Share sheet with an image of a pick (item, prices,
   profit) for clan chats.
7. **iPad and landscape layouts.** Two columns: list on the left, item page
    on the right.

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

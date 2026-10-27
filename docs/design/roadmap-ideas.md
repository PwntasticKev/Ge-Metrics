# GE Metrics: ideas for the app and the website

Written 2026-10-26. The goal behind every idea: open GE Metrics and know in a
few seconds what to buy, what to pay and what to sell it for.

Ground rules carried over from earlier decisions:

- No server or database for core features. Everything runs on the OSRS Wiki
  prices API plus on-device storage.
- The website's look stays as it is. Web changes are speed and correctness
  only unless asked.
- Blue palette, no red for losses, no RuneScape fonts.

## Current development status (2026-10-27)

**Update annotation — 2026-10-27, reconciled at `af44e45`.** The wrapper's
`.claude/feature-loop-state.json` release record supersedes the earlier
TestFlight 13 statement: the user authorized TestFlight **1.0.0 (14)** from
source `1d35f5a`, including work through
[PR #87](https://github.com/PwntasticKev/Ge-Metrics/pull/87). Apple processing is
`VALID`, the Internal group includes build 14, and en-US test notes are recorded.
**Availability is not a native UI pass:** hands-on TestFlight/native validation
remains pending. Build 14 was built with the widget disabled.

Later drafts are outside build 14: processing session history
([#88](https://github.com/PwntasticKev/Ge-Metrics/pull/88)), the bounded cooking
output-yield threshold ([#89](https://github.com/PwntasticKev/Ge-Metrics/pull/89))
and custom ingredient purchase-price scenarios
([#90](https://github.com/PwntasticKev/Ge-Metrics/pull/90)). Automated checks,
reviews and JS exports do not establish native validation or release inclusion.
The earlier capability summary and tables below preserve historical wording;
this annotation governs release status, including their “draft,” “done” and
“shipped” descriptions. An implemented feature or open PR alone is not proof
of a release.

Current capabilities, grouped by the decision they support:

- **Plan production and cash:** Processing Lab, inventory/shopping batches,
  set attribution, bounded make-or-buy routes, mixed-dose Prayer baskets and
  confirmed-cash Plan integration ([#40–45](https://github.com/PwntasticKev/Ge-Metrics/pull/45)).
  These model quotes and explicit allowances; they do not confirm fills.
- **Record evidence:** local RuneLite recorder/import preview
  ([#46](https://github.com/PwntasticKev/Ge-Metrics/pull/46),
  [#47](https://github.com/PwntasticKev/Ge-Metrics/pull/47)), actual processing
  sessions and related-item price explanations
  ([#50](https://github.com/PwntasticKev/Ge-Metrics/pull/50),
  [#51](https://github.com/PwntasticKev/Ge-Metrics/pull/51)); opt-in recorded pace
  and results summaries ([#53](https://github.com/PwntasticKev/Ge-Metrics/pull/53),
  [#63](https://github.com/PwntasticKev/Ge-Metrics/pull/63),
  [#65](https://github.com/PwntasticKev/Ge-Metrics/pull/65)).
- **Inspect boundaries:** ingredient ceilings, output floors, remaining
  allowances, shared two-batch inputs and price sensitivity
  ([#56](https://github.com/PwntasticKev/Ge-Metrics/pull/56),
  [#59–62](https://github.com/PwntasticKev/Ge-Metrics/pull/62)); route and shared
  Prayer allowances plus owned-only dose handling have follow-ups
  ([#68–71](https://github.com/PwntasticKev/Ge-Metrics/pull/71), excluding research #70).
- **Compare conversions:** a narrow Dharok's platelegs Barrows repair comparison
  and break-even Smithing threshold are implemented
  ([#66](https://github.com/PwntasticKev/Ge-Metrics/pull/66),
  [#67](https://github.com/PwntasticKev/Ge-Metrics/pull/67)); manual versus paid
  blue-scale and unicorn-horn grinding are in the Lab
  ([#72](https://github.com/PwntasticKev/Ge-Metrics/pull/72),
  [#78](https://github.com/PwntasticKev/Ge-Metrics/pull/78)). No general Moons
  repair coverage follows from the single Barrows pair.
- **Recent draft stack:** session profit explanations, conflict-safe saves,
  immutable initial plans and same-quantity quote comparisons (#73–76);
  market-clock aging and selected-source freshness (#79–80); owned-input
  sell-versus-process and player-entered time alternatives (#81–82);
  RuneLite item timelines and session labels (#83–84).
  See [#73](https://github.com/PwntasticKev/Ge-Metrics/pull/73),
  [#76](https://github.com/PwntasticKev/Ge-Metrics/pull/76),
  [#80](https://github.com/PwntasticKev/Ge-Metrics/pull/80),
  [#84](https://github.com/PwntasticKev/Ge-Metrics/pull/84).

**Validation is the next useful work.** The earlier reconciliation recorded
PRs #73–76 and #78–84 as drafts with native validation pending; the release
annotation above updates their build inclusion, without claiming a UI pass.
Existing iOS attachment/ownership attempts
were blocked (`DEVICE_IN_USE`); an unused simulator eventually booted but
device attachment failed. Android SDK command-line tools are missing. Automated checks, reviews and JS exports recorded in
the ledger are not a native QA pass. Validate populated sessions, save/retry/
conflict paths, quote provenance, picker context and light/dark interactions
on an exclusively attached runtime; later drafts still need native validation.
PR #46 still needs real-game RuneLite evidence and Plugin Hub readiness;
fixture imports and #83's observation timeline do not establish either.
See the [RuneLite counter semantics finding](runelite-counter-semantics.md)
for primary-source support and the unresolved accounting boundaries.

Keep the no-server/database core, local builds **without EAS**, existing web
look and blue/grey presentation. Historical walk-forward results include
ranking losses; neither those results nor current quote scenarios guarantee
profit, executable liquidity or future ranking performance.

## Done in this round (app)

| Feature | What it does |
|---|---|
| Buy now tab | Home screen. Ranked picks for the next 4 hours and for overnight, with buy price, sell price and amount. |
| Last-hour check | A pick's prices are the more careful of live and last-hour average, so one spike can't fake a margin. |
| Overnight picks | Offers at the 24h typical low/high, sized to fill over 8 hours; skips items that moved away. |
| Fill-aware picks and scanner | Prices come from recent hours that traded with volume (never one print); Buy now amounts are cut to what the fill-time model says buys and sells within the list's window (Plan my cash splits those), and scanner rows show fill time for one buy limit. Anything whose sell takes longer than the Settings limit (default 1h, from a 14-day backtest) sits in a collapsed Slow to fill section with the reason; items under 10K trades a day are left out. |
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
| Market scanner | Tools view: margins well above the item's own norm (24h, then 7-day hourly median with a robust z), steady 7-day trends (line fit with R²), range-bound items sharply under their 30-day mean, and a market card (share of liquid items up vs down, top-100 value-weighted index vs 24h and 7d, index movers, risk-on/off). |
| Tab re-press | Tapping the active tab scrolls its list to the top; Tools pops to the hub first. |
| Trade timing | Item details: best buy and sell hour (local time) when the pattern held on most of the last 15 days, a 24-bar hour heatmap, a steady weekday, fill time for one buy limit and GP/h per GE slot. |
| GP/h per slot sort | Buy now (Next 4 hours, Dips): sort by profit per hour a GE slot is busy, from each side's trade flow. |
| Realistic item sheet | Item details lead with the fill-aware buy and sell (same rules as Buy now, the scanner and GE slots), margin after tax, the amount that fills in the window and "fills in ~Xh"; the instant live prices stay below, tap to copy. Place buy / Place sell and Log buy use the realistic prices and amount. |
| Share a pick | "Share pick" on a Buy now row and in item details: an image card (icon, name, buy, sell, amount, profit after tax, fills in, time, GE Metrics wordmark) through the share sheet. |
| Walk-forward defaults | From the 60-day out-of-sample test (PR #33): Next 4 hours and Plan size for 2h, slowest sell to show defaults to 30m (still a setting), and a risk-off warning on Next 4 hours and Plan from the scanner's market breadth. |
| Processing profit lab | Compare one upfront batch across 23 methods using cash and active minutes; independently try instant/patient inputs and outputs, see tax, cash/time/buy-limit bottlenecks and modeled extra GE waits. Recipes without a trusted rate stay in a separate GP/action view. Quotes and daily averages have separate download ages, and cached refresh failures are shown. |
| Sell helper | Bought tab: "Sell now X or list Y, ~2h (+Z)" per holding, using the 24h typical high and the sell-side flow. |
| Flip journal | "Mark sold" asks how many and at what price; partial sells keep the rest open. Every sale is kept with buy and sell price, GE tax, hold time, ROI and GP/h of hold. Older saved sales migrate in place. |
| Profit view | Watchlist, Profit: realized profit for today / 7 / 30 days / all, daily bars (blue up, grey down) with a running total, best and worst flips, per-item leaderboard (profit, flips, win rate, average hold), open lots at the instant-sell price after tax. |
| Trading insights | Items you lose on (negative average over 2+ flips), hold time against the 4h buy-limit window and what long holds earn, GE tax paid as a share of margin. |
| CSV export and restore | Share sheet export of the whole journal; restore from a picked CSV adds what's missing without duplicating. |
| Home and lock screen widget (iOS) | Small, medium and lock screen sizes. Edit the widget to show Buy now picks, Watchlist, Bought items or GE slots. The app shares which items to show (and, for GE slots, each offer with the advice it last computed) through an App Group; the widget fetches live wiki prices itself every ~20 minutes. GE slot rows show side, price, filled/amount, the advice word (Filling, Raise, Lower, Relist, Cancel; action words in blue) and the live price; a filling offer past 4h turns to Relist on the widget too. Tap opens the item or the slot. |
| Mini window (PiP) | Up to 5 live prices (watchlist items, Buy now picks or holdings) in a Picture in Picture window over the game. Optional auto-open when leaving the app. Native refresh every minute while it's up. |
| Price and margin alerts | Per-item rules (price at/below or at/above on the buy or sell side, margin after tax, 1h dump/pump %) with a cooldown. Checked on every refresh while open and by `expo-background-task` when iOS allows; local notification opens the item. Tools, Alerts lists rules, buy limit resets and recent triggers. |
| My GE slots | Mirrors the 8 GE slots (3 for F2P). Place a buy from any pick or item, or a sell from a Bought lot, in one tap with the recommended price. Steppers record fills; buy fills land on the Bought list, sells from a lot go to the Profit journal on close. Live advice per slot from the same per-side prices as Buy now (live, and the last hour only when that side traded a fair share of a normal hour, else the day; asks capped at the lower of the two) plus the fill-time model: Filling, Behind market (raise to X, +Y, still Z profit), Market fell (lower ask or hold), Stale over 4h (relist), Margin gone (cancel). Update offer records each change. Optional local notification when a slot needs action, hourly cooldown per slot, on the alerts refresh and background task. Card on Buy now and in Tools, While you play; a GE slots source for the mini window. |

## Done in this round (web)

| Change | Effect |
|---|---|
| Lazy-load the last eager pages | Main JS 431 KB to 215 KB gzipped. Charts no longer load on first visit. |
| Working CI | npm + vitest (742 tests) + vite build + iOS typecheck; first green run since the relaunch. |

## Earlier app follow-ups (after validation above)

1. **Alerts follow-ups.** Price and margin alerts shipped (see above). Next:
   alerts for a whole watchlist at once, and a widget showing the last trigger.
2. **Profit history follow-ups.** Shipped as the Profit view; next is a
   widget line for today's profit and per-item notes ("why I
   bought") on journal entries.
3. **Update alerts.** Shipped as chart markers and Update movers; next is a
   local notification when a new post mentions a watched item.
4. **iPad and landscape layouts.** Two columns: list on the left, item page
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
Coverage and remaining candidates (implementation status matters):

- **Barrows repair is now implemented** for one verified Dharok pair, with
  NPC/stand fees and a Smithing threshold (see current status). Moons repair
  remains a separate coverage decision, supported only by research here.
- **Finished potions:** [bounded research](finished-potion-research.md)
  ([#55](https://github.com/PwntasticKev/Ge-Metrics/pull/55)), not a new implemented
  unf + secondary tool. Observed scenarios lost GP; any later training-cost
  comparison needs explicit recipe and allowance scope.
- **Cooking/fletching:** [research](cooking-fletching-research.md)
  ([#57](https://github.com/PwntasticKev/Ge-Metrics/pull/57)) added no recipes.
  Karambwans and other cooking already exist; no-burn disclosures were added
  in [#58](https://github.com/PwntasticKev/Ge-Metrics/pull/58). The four researched
  arrow/dart assembly recipes remain deferred after losing quote scenarios.
- **Sailing-era recipes:** extend existing coverage only when verified wiki
  mechanics justify it (`npm run data:refresh` already pulls money-making guides).

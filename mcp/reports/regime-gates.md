# Regime gates: when not to trade

Generated 2026-10-26 by `npm run backtest -- --regime-gates --now <end>` for each period, then `--regime-report` (code: `mcp/src/backtest/regime`, gate logic: `mcp/src/analysis/regime`). Same simulator, fill model, folds and no-lookahead views as the walk-forward reports (`walk-forward-2026-10-26.md`, `walk-forward-older-periods.md`).

## Question

The walk-forward found the defaults lose less than before but are not robustly profitable: Oct–Dec 2025 lost for almost every strategy, and app quick lost in both older periods. Does a "know when not to trade" gate fix that out of sample?

## Setup

- **Periods** (60 days of decisions every 4h, 26 folds: train 7d, test the next 2d, step 2d): Aug–Oct 2026 (to 2026-10-26), Apr–Jun 2026 (to 2026-06-21), Oct–Dec 2025 (to 2025-12-21). 50M stack, 8 slots, 25% queue share, dump after 24h.
- **Strategies gated** (what ships now): `plan_flips` 2h/10k with ask cap, `top_flips` 2h/10k with ask cap, and the app's Buy now lists as on master: quick 2h, overnight 8h, dips 4h; sell limit 0.5h; 10K/day (`mobile/src/lib/pickFill.ts`, `fillAware.ts`; the backtest replays the vendored fill model).
- **What a gate does**: at each decision it either lets the strategy decide as usual, gives it only a share of its free cash (size 0.5), or opens nothing (size 0). Open offers always run to completion. "Trading" in the tables = mean size over test-window decisions.
- **Gate candidates** (`src/backtest/regime/configs.ts`):
  - (a) **breadth**: market_breadth risk-off (skip, or half size); the top-100 index 24h change <= -1% / -2%; its 7d change <= -2% / -5%. Same logic as the `market_breadth` tool (`src/analysis/scanner/breadth.ts`).
  - (b) **update**: stand aside from N days before to M days after a big game update (`public/data/game-updates.json`, category game). Windows -0/+1, -0/+3, -1/+1, -1/+3, -2/+2, -3/+3, -1/+7, -3/+7 days. "Big" = title keywords (`out today`, `launch`, `is out`, `release`, Christmas/Halloween/Easter/birthday, `Leagues N:`), or, as a second variant, keywords or 20+ items mentioned. Updates count as live at 12:00 UTC on the post date.
  - (c) **volatility**: realized volatility of the top-100 value-weighted index (hourly log returns over 24h) vs the median of the same measure over the trailing week (sampled every 4h); skip above 1.25x / 1.5x / 2x / 3x, or half size above 1.5x.
  - (d) **equity**: the ungated strategy's own closed flips. Stop for 24h after 2 / 3 / 4 losses in a row (or 12h after 3), or stand aside while flips closed in the last 24h / 48h lost money net.
- **Walk-forward**: per fold and per group, the candidate (or "off") with the most training-window profit trades the test window. "Off" is listed first, so if no candidate beat it in training (for example the gate never fired), the fold trades ungated. Combined gates OR together each group's per-fold choice: `market` = breadth + update + volatility, `all` = all four; `any` = the single best candidate from any group.
- **No lookahead** (tests in `test/regime.test.ts`): market signals read only closed /1h windows through `guardHistory` (a spy test asserts no read at or after t); equity rules see a flip only after the hour it closed in has ended; training scores use only hours before the test window (same as the walk-forward). The one assumption: the "before" side of the update window uses the release date, which is announced well ahead for big releases (Sailing, Leagues, The Red Reef); the title classification is read from the post.
- **"Robust"** (pre-set before the runs): the walk-forward gate is at least as good as no gate in all three periods and better in one. The user's goal on top: positive in all three periods, or a much smaller Oct–Dec loss, without gutting Aug–Oct.

## Verdict

**No gate robustly helps `plan_flips` or `top_flips`. MCP defaults stay as they are (no gating by default).** Every gate that cuts `plan_flips`' Oct–Dec loss costs it 6–23M of Aug–Oct profit, and most also cost a little in Apr–Jun. For `top_flips` it is the same, except breadth (below):

| Walk-forward gate | plan_flips Aug–Oct | Apr–Jun | Oct–Dec | top_flips Aug–Oct | Apr–Jun | Oct–Dec |
|---|---:|---:|---:|---:|---:|---:|
| none (shipped) | 115.24M | 20.56M | -25.47M | 101.22M | 23.06M | -5.82M |
| update | 99.63M | 17.11M | -340k | 88.85M | 20.87M | 5.42M |
| equity | 109.59M | 19.05M | -9.66M | 98.82M | 22.81M | 7.37M |
| breadth | 112.30M | 22.10M | -35.55M | 100.67M | 24.83M | 6.68M |
| all four | 92.16M | 18.29M | 567k | 80.29M | 20.86M | 9.45M |

- The closest call is **breadth on `top_flips`**: positive in all three periods (100.7M / 24.8M / 6.7M vs 101.2M / 23.1M / -5.8M). It misses "robust" by 0.55M in Aug–Oct, which is noise. But the same gate makes `plan_flips` worse in Oct–Dec (-10.1M), and nearly all of its Oct–Dec gain comes from one week. That is not enough to gate by default.
- **The Oct–Dec loss is one event.** The two test windows starting 2025-11-20 and 11-22 (Sailing launch, 19 Nov) hold -33.5M of `plan_flips`' -25.5M (the other 24 windows made +8.0M), -16.7M of `top_flips`' -5.8M, -23.7M of app quick's -30.4M and -41.4M of overnight's -17.6M. The update gate's Oct–Dec gain is mostly standing aside that week. One big release is too small a sample to trade a 15M Aug–Oct cost for, given Aug–Oct's own releases (the Crab Quest on 8 Sep, The Fractured Archive on 20 Oct) were fine for these picks.
- **Volatility and the market combos** follow the same pattern: they save money in Oct–Dec and cost more in Aug–Oct (`plan_flips` volatility even loses in Oct–Dec).
- **App overnight and dips**: no robust gate. With the update, volatility, `market`, `all` or `any` gates, overnight gains 25–39M in Oct–Dec but loses 13–24M in Aug–Oct. Equity costs it 7M in Apr–Jun. For dips, every gate costs money or changes nothing in every period.

**One robust result: the app's quick list (Next 4 hours).** The walk-forward `market` gate (breadth + update + volatility, thresholds re-chosen every fold) beats no gate in all three periods, and so does `all`:

| App quick | Aug–Oct | Apr–Jun | Oct–Dec | Trading | Worst window (Aug / Apr / Oct) |
|---|---:|---:|---:|---:|---|
| no gate (shipped) | 54.46M | -7.01M | -30.37M | 100% | -16.62M / -5.43M / -21.17M |
| walk-forward `market` | 68.70M (+14.24M) | 4.53M (+11.55M) | -9.19M (+21.18M) | 75% / 69% / 60% | -636k / -1.73M / -5.87M |
| walk-forward `all` | 66.19M (+11.72M) | 3.03M (+10.05M) | -2.42M (+27.96M) | 68% / 61% / 45% | -918k / -817k / -2.86M |
| fixed: update -1d/+7d + risk-off x0.5 (live default) | 66.0M (+11.5M) | 0.1M (+7.1M) | -9.1M (+21.3M) | 71% / 66% / 44% | -0.1M / -2.5M / -7.0M |

- Goal check: Apr–Jun turns positive, the Oct–Dec loss falls by 70–90%, and Aug–Oct goes **up**, not down. Max drawdown falls from 18% / 22% / 68% to 6% / 8% / 29% (`market`). Oct–Dec is still not positive.
- Quick flips are the list whose positions get caught when a release reprices items in its first days. The 2h MCP picks hold a similar horizon but trade fewer, more liquid items. They gain less from sitting out and give up more of their steady profit in normal weeks.
- The thresholds the folds chose vary by period (see "What the folds chose"), so the evidence is that **standing aside around big releases plus a market filter helps the quick list**, not that any one threshold is right. The fixed live default (-1 day to +7 days around keyword releases, half size when risk-off) was picked after seeing all three periods, so its line is hindsight. The walk-forward rows above are the clean evidence for the idea.

## What ships in this PR (MCP)

- New tool **`market_regime(upcoming?)`**: `state` (trade / caution / stand-aside), `size` (1 / 0.5 / 0), `reasons`, `rules`, `signals` (mood, index 24h/7d, last and next major update), `warnings`. Rules: stand aside from 1 day before to 7 days after a keyword-major game update, half size when market_breadth is risk-off (`LIVE_REGIME_RULES` in `src/tools/regime.ts`). The update feed only has published posts, so the 1-day pre-release side only fires for releases the caller passes in `upcoming` (date + title). Volatility is not read live: it would need ~200 hourly snapshots per call, and it did not help on its own.
- **`plan_flips` / `top_flips`** now return a `regime` object (same fields plus `applied`). Per the verdict, they **do not gate by default**. `apply_regime=true` opts in: `plan_flips` plans with `cash x size` and returns `standAside: true` with no slots at size 0; `top_flips` returns no rows at size 0. Both accept `upcoming`. Defaults (2h, 10k, ask cap) are unchanged.
- Backtest: `--regime-gates` / `--regime-report` CLI modes, and `--prefetch` to fill the snapshot cache only. The walk-forward timeline now loads 14 days of hourly lookback (it was 7) for the volatility median; this doesn't change any existing result (only extra earlier hours are loaded).

## App follow-up spec (mobile; not edited here)

For the quick list (mode `quick`, "Next 4 hours", and `plan`, which uses the same horizon) only. Leave overnight and dips ungated: gates lost money for both.

1. **Regime hook** `mobile/src/api/useMarketRegime.ts`: `{ state: 'trade' | 'caution' | 'stand-aside', size: 1 | 0.5 | 0, reason: string | null }` from:
   - `useMarketMood(prices.market)` (exists): `risk-off` -> caution, size 0.5.
   - `useGameUpdates()` (exists, `src/api/gameUpdates.ts`): updates with `kind === 'game'` whose title matches `/\b(out today|launch(?:es|ed)?|live today|is out|release[sd]?|christmas|halloween|easter|birthday|deadman|leagues? [ivx]+:)/i` (same as `MAJOR_UPDATE_TITLE` in `mcp/src/analysis/regime/gates.ts`). Live time = post date 12:00 UTC (`GameUpdate.date` is midnight UTC, + 12h). Stand aside while `now < live + 7 days`.
   - Pre-release (`now >= live - 1 day`): only if the app knows the date ahead. Optional: a small `UPCOMING_RELEASES` list in remote config. Skip it if there is none; the +7d side is automatic.
   - Stand-aside beats caution. Put the pure logic in `mobile/src/lib/regime.ts` with unit tests: a 7-day boundary test, a test that a release isn't read before its live time, and a risk-off-only case.
2. **Buy now banner** (`src/app/index.tsx`, where `riskOffNote` renders today, same `styles.warn`, `accessibilityRole="alert"`):
   - stand-aside: **"Stand aside: big game update (The Fractured Archive, 20 Oct). Quick flips lost most in the week after big releases. Overnight and Dips are still listed."** Keep the list visible but collapsed behind "Show anyway". Don't hide data.
   - caution: replace the current `riskOffNote` copy with **"Market is risk-off: quick amounts are halved."**
3. **Shrink quick sizes** in caution: in `src/lib/picks.ts` (where quick/plan amounts are sized), multiply each pick's `maxQty` by `size` (floor, min 1) and recompute `potential` / `cost` (same as `resize` in `mcp/src/backtest/strategies/appFill.ts`). For Plan, multiply the cash used by `size`. At stand-aside with "Show anyway", show amounts at full size.
4. **Setting**: `settings.regimeGate: boolean` (default true) under Settings > Buy now: "Pause quick picks around big updates".
5. **Copy for the quick-mode info text** (`MODE_INFO.quick`): add "In a three-period backtest, sitting out from a day before to a week after big releases, and halving size in risk-off markets, cut the worst period's loss by about 70% and lifted the best period too."
6. Don't change `PICK_HORIZON_HOURS`, `DEFAULT_MAX_SELL_HOURS` or `MIN_DAY_TRADES`.

## Caveats

- Three 60-day periods, one simulator. The quick-list result is consistent in direction but rests on a handful of big releases (Sailing, The Red Reef, Regional Worlds, Christmas, the Crab Quest, The Fractured Archive). The single worst week in the data (Sailing launch) dominates Oct–Dec.
- The app replay uses the vendored pre-#34 fill model (as in `walk-forward-older-periods.md`). Live app numbers will differ, but the comparison (gate vs no gate on the same model) is like for like.
- Title keywords are a crude "big update" detector. "New Regional Worlds Launch TODAY!" and "Sailing Technical Pre-Release" count as major; "Menu Entry Swapper Overhaul - Live Now!" does not. The 20+-items variant did not do better.
- The equity rules use the ungated strategy's flips as a shadow (standard for equity-curve filters). Gated runs differ slightly from what a user who paused would see.
- Fixed-gate tables and the live default were chosen after seeing all three periods. Only the walk-forward rows are out-of-sample.

Reproduce (the cache holds every snapshot, ~290 MB gzipped):

```bash
cd mcp && npm run build
for now in 2025-12-21T19:30:00Z 2026-06-21T19:30:00Z 2026-10-26T19:30:00Z; do node dist/backtest.js --regime-gates --now $now; done
node dist/backtest.js --regime-report Aug-Oct=.cache/backtest/regime-gates-2026-10-26.json,Apr-Jun=.cache/backtest/regime-gates-2026-06-21.json,Oct-Dec=.cache/backtest/regime-gates-2025-12-21.json --out /tmp/tables.md
```

Table columns: OOS profit = equity change over the 26 test windows (cash + holdings at the instant-sell price); Realized = after-tax profit of flips placed in test windows; Trading = mean gate size over test decisions; Worst window = worst 2-day test window; Max DD = worst peak-to-trough of the chained OOS equity.

## Signals per period (test windows)

| Period | Dates | Risk-off | Index 7d <= -5% | Vol > 1.5x median | Keyword-major updates |
|---|---|---:|---:|---:|---|
| Aug-Oct | 2026-08-25 to 2026-10-26 | 19% | 3% | 16% | 2026-09-08 A Ruff Situation & Crab Quest Out Today!; 2026-10-20 The Fractured Archive - Out Today |
| Apr-Jun | 2026-04-20 to 2026-06-21 | 9% | 0% | 9% | 2026-05-20 The Red Reef is Out Today!; 2026-06-03 New Regional Worlds Launch TODAY! |
| Oct-Dec | 2025-10-20 to 2025-12-21 | 35% | 10% | 13% | 2025-11-05 Sailing Technical Pre-Release; 2025-11-19 Sailing is OUT TODAY!; 2025-12-10 Christmas Event 2025 |

## Walk-forward gates vs no gate

| Family | Gate | Aug-Oct vs none | Apr-Jun vs none | Oct-Dec vs none | Total | Robust |
|---|---|---:|---:|---:|---:|---|
| plan_flips | breadth | -2.94M | +1.54M | -10.09M | -11.48M | no |
| plan_flips | update | -15.61M | -3.44M | +25.13M | +6.07M | no |
| plan_flips | volatility | -3.16M | -1.01M | -12.25M | -16.42M | no |
| plan_flips | equity | -5.65M | -1.51M | +15.81M | +8.65M | no |
| plan_flips | market | -20.47M | -2.26M | +22.48M | -241k | no |
| plan_flips | all | -23.08M | -2.27M | +26.03M | +688k | no |
| plan_flips | any | -24.10M | -319k | -4.39M | -28.81M | no |
| top_flips | breadth | -550k | +1.77M | +12.50M | +13.72M | no |
| top_flips | update | -12.37M | -2.20M | +11.24M | -3.33M | no |
| top_flips | volatility | -14.22M | -1.13M | +17.45M | +2.09M | no |
| top_flips | equity | -2.40M | -257k | +13.19M | +10.53M | no |
| top_flips | market | -19.63M | -2.03M | +12.79M | -8.87M | no |
| top_flips | all | -20.93M | -2.20M | +15.27M | -7.86M | no |
| top_flips | any | -17.29M | -2.36M | +20.00M | +343k | no |
| app quick | breadth | +10.53M | +295k | -3.49M | +7.33M | no |
| app quick | update | -415k | +7.65M | +24.10M | +31.34M | no |
| app quick | volatility | +8.36M | +4.17M | -5.10M | +7.43M | no |
| app quick | equity | +3.30M | -1.69M | +23.04M | +24.65M | no |
| app quick | market | +14.24M | +11.55M | +21.18M | +46.97M | yes |
| app quick | all | +11.72M | +10.05M | +27.96M | +49.73M | yes |
| app quick | any | +4.09M | +7.84M | +4.11M | +16.04M | yes |
| app overnight | breadth | -6.94M | +613k | +6.84M | +515k | no |
| app overnight | update | -24.21M | -1.56M | +25.37M | -400k | no |
| app overnight | volatility | -19.30M | -4.08M | +35.33M | +11.95M | no |
| app overnight | equity | +0k | -7.08M | +30.23M | +23.16M | no |
| app overnight | market | -23.50M | -5.50M | +39.21M | +10.22M | no |
| app overnight | all | -23.28M | -9.44M | +37.10M | +4.38M | no |
| app overnight | any | -13.20M | -3.53M | +29.18M | +12.46M | no |
| app dips | breadth | -933k | +0k | -2.18M | -3.11M | no |
| app dips | update | -212k | -478k | -2.77M | -3.46M | no |
| app dips | volatility | -1.32M | +0k | -648k | -1.96M | no |
| app dips | equity | -90k | +0k | -1.85M | -1.94M | no |
| app dips | market | -1.79M | -478k | -4.32M | -6.60M | no |
| app dips | all | -1.88M | -478k | -5.88M | -8.25M | no |
| app dips | any | -875k | -478k | -4.94M | -6.29M | no |

## Per family

**plan_flips**

| Gate (walk-forward) | Period | OOS profit | vs none | Windows > 0 | Worst window | Max DD | Trading | Losing picks | Realized |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| none | Aug-Oct | 115.24M | +0k | 25/26 | -836k | 8% | 100% | 8% | 115.23M |
| none | Apr-Jun | 20.56M | +0k | 22/26 | -1.92M | 6% | 100% | 12% | 20.39M |
| none | Oct-Dec | -25.47M | +0k | 16/26 | -30.16M | 68% | 100% | 18% | -25.91M |
| breadth | Aug-Oct | 112.30M | -2.94M | 25/26 | -836k | 8% | 98% | 9% | 112.92M |
| breadth | Apr-Jun | 22.10M | +1.54M | 22/26 | -423k | 4% | 95% | 12% | 22.35M |
| breadth | Oct-Dec | -35.55M | -10.09M | 15/26 | -30.53M | 83% | 74% | 19% | -35.58M |
| update | Aug-Oct | 99.63M | -15.61M | 23/26 | -4.90M | 8% | 87% | 8% | 100.64M |
| update | Apr-Jun | 17.11M | -3.44M | 20/26 | -1.92M | 6% | 92% | 13% | 17.78M |
| update | Oct-Dec | -340k | +25.13M | 13/26 | -4.24M | 20% | 70% | 17% | -590k |
| volatility | Aug-Oct | 112.08M | -3.16M | 25/26 | -836k | 8% | 98% | 8% | 111.84M |
| volatility | Apr-Jun | 19.55M | -1.01M | 21/26 | -1.92M | 6% | 99% | 12% | 19.74M |
| volatility | Oct-Dec | -37.72M | -12.25M | 15/26 | -30.16M | 88% | 95% | 19% | -37.73M |
| equity | Aug-Oct | 109.59M | -5.65M | 25/26 | -1.97M | 9% | 98% | 9% | 109.25M |
| equity | Apr-Jun | 19.05M | -1.51M | 20/26 | -1.92M | 6% | 97% | 12% | 19.30M |
| equity | Oct-Dec | -9.66M | +15.81M | 14/26 | -14.29M | 36% | 70% | 17% | -11.37M |
| market | Aug-Oct | 94.78M | -20.47M | 23/26 | -4.90M | 8% | 83% | 8% | 95.23M |
| market | Apr-Jun | 18.30M | -2.26M | 20/26 | -423k | 5% | 87% | 13% | 19.06M |
| market | Oct-Dec | -2.98M | +22.48M | 11/26 | -4.76M | 21% | 53% | 18% | -3.36M |
| all | Aug-Oct | 92.16M | -23.08M | 23/26 | -4.24M | 8% | 81% | 8% | 92.60M |
| all | Apr-Jun | 18.29M | -2.27M | 20/26 | -451k | 5% | 84% | 12% | 18.85M |
| all | Oct-Dec | 567k | +26.03M | 11/26 | -4.58M | 11% | 41% | 18% | -731k |
| any | Aug-Oct | 91.14M | -24.10M | 23/26 | -4.90M | 9% | 81% | 8% | 91.99M |
| any | Apr-Jun | 20.24M | -319k | 20/26 | -451k | 5% | 88% | 12% | 20.84M |
| any | Oct-Dec | -29.86M | -4.39M | 13/26 | -30.53M | 73% | 70% | 18% | -30.04M |

**top_flips**

| Gate (walk-forward) | Period | OOS profit | vs none | Windows > 0 | Worst window | Max DD | Trading | Losing picks | Realized |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| none | Aug-Oct | 101.22M | +0k | 25/26 | -1.34M | 8% | 100% | 4% | 101.30M |
| none | Apr-Jun | 23.06M | +0k | 23/26 | -1.57M | 4% | 100% | 6% | 22.85M |
| none | Oct-Dec | -5.82M | +0k | 17/26 | -11.72M | 35% | 100% | 11% | -5.64M |
| breadth | Aug-Oct | 100.67M | -550k | 25/26 | -1.34M | 8% | 97% | 4% | 100.74M |
| breadth | Apr-Jun | 24.83M | +1.77M | 24/26 | -713k | 4% | 96% | 6% | 24.80M |
| breadth | Oct-Dec | 6.68M | +12.50M | 18/26 | -4.00M | 15% | 84% | 11% | 5.59M |
| update | Aug-Oct | 88.85M | -12.37M | 24/26 | -1.34M | 8% | 92% | 4% | 90.54M |
| update | Apr-Jun | 20.87M | -2.20M | 23/26 | -713k | 4% | 88% | 6% | 21.91M |
| update | Oct-Dec | 5.42M | +11.24M | 14/26 | -3.56M | 11% | 52% | 10% | 5.53M |
| volatility | Aug-Oct | 87.00M | -14.22M | 24/26 | -4.32M | 8% | 92% | 4% | 87.26M |
| volatility | Apr-Jun | 21.93M | -1.13M | 23/26 | -1.57M | 5% | 100% | 6% | 22.53M |
| volatility | Oct-Dec | 11.63M | +17.45M | 18/26 | -3.15M | 8% | 88% | 11% | 12.15M |
| equity | Aug-Oct | 98.82M | -2.40M | 25/26 | -1.34M | 8% | 94% | 4% | 98.82M |
| equity | Apr-Jun | 22.81M | -257k | 23/26 | -1.39M | 4% | 98% | 6% | 22.82M |
| equity | Oct-Dec | 7.37M | +13.19M | 18/26 | -6.78M | 21% | 76% | 9% | 12.23M |
| market | Aug-Oct | 81.59M | -19.63M | 24/26 | -4.32M | 9% | 86% | 4% | 81.64M |
| market | Apr-Jun | 21.03M | -2.03M | 23/26 | -713k | 4% | 88% | 6% | 21.63M |
| market | Oct-Dec | 6.97M | +12.79M | 14/26 | -3.56M | 11% | 45% | 11% | 7.45M |
| all | Aug-Oct | 80.29M | -20.93M | 23/26 | -4.32M | 9% | 81% | 4% | 80.12M |
| all | Apr-Jun | 20.86M | -2.20M | 23/26 | -713k | 4% | 88% | 6% | 21.46M |
| all | Oct-Dec | 9.45M | +15.27M | 13/26 | -1.15M | 7% | 35% | 9% | 8.63M |
| any | Aug-Oct | 83.93M | -17.29M | 24/26 | -4.32M | 8% | 86% | 4% | 84.10M |
| any | Apr-Jun | 20.70M | -2.36M | 23/26 | -713k | 4% | 89% | 6% | 22.12M |
| any | Oct-Dec | 14.18M | +20.00M | 18/26 | -938k | 6% | 64% | 9% | 13.64M |

**app quick**

| Gate (walk-forward) | Period | OOS profit | vs none | Windows > 0 | Worst window | Max DD | Trading | Losing picks | Realized |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| none | Aug-Oct | 54.46M | +0k | 24/26 | -16.62M | 18% | 100% | 12% | 55.19M |
| none | Apr-Jun | -7.01M | +0k | 13/26 | -5.43M | 22% | 100% | 19% | -7.55M |
| none | Oct-Dec | -30.37M | +0k | 12/26 | -21.17M | 68% | 100% | 24% | -30.72M |
| breadth | Aug-Oct | 64.99M | +10.53M | 22/26 | -4.16M | 8% | 89% | 12% | 59.86M |
| breadth | Apr-Jun | -6.72M | +295k | 14/26 | -5.40M | 21% | 95% | 18% | -6.10M |
| breadth | Oct-Dec | -33.86M | -3.49M | 11/26 | -19.51M | 72% | 88% | 26% | -37.94M |
| update | Aug-Oct | 54.05M | -415k | 21/26 | -11.19M | 16% | 85% | 11% | 54.80M |
| update | Apr-Jun | 639k | +7.65M | 14/26 | -2.26M | 10% | 81% | 18% | 1.08M |
| update | Oct-Dec | -6.27M | +24.10M | 11/26 | -6.64M | 25% | 68% | 20% | -18.14M |
| volatility | Aug-Oct | 62.82M | +8.36M | 24/26 | -12.07M | 12% | 91% | 11% | 62.76M |
| volatility | Apr-Jun | -2.85M | +4.17M | 14/26 | -5.43M | 20% | 88% | 18% | -3.62M |
| volatility | Oct-Dec | -35.48M | -5.10M | 10/26 | -21.17M | 77% | 91% | 26% | -48.38M |
| equity | Aug-Oct | 57.76M | +3.30M | 23/26 | -11.08M | 11% | 86% | 11% | 56.95M |
| equity | Apr-Jun | -8.71M | -1.69M | 11/26 | -5.57M | 25% | 81% | 19% | -7.58M |
| equity | Oct-Dec | -7.33M | +23.04M | 10/26 | -3.23M | 21% | 64% | 24% | -14.80M |
| market | Aug-Oct | 68.70M | +14.24M | 21/26 | -636k | 6% | 75% | 11% | 64.06M |
| market | Apr-Jun | 4.53M | +11.55M | 16/26 | -1.73M | 8% | 69% | 17% | 5.71M |
| market | Oct-Dec | -9.19M | +21.18M | 12/26 | -5.87M | 29% | 60% | 21% | -21.25M |
| all | Aug-Oct | 66.19M | +11.72M | 20/26 | -918k | 6% | 68% | 11% | 61.84M |
| all | Apr-Jun | 3.03M | +10.05M | 15/26 | -817k | 8% | 61% | 17% | 4.55M |
| all | Oct-Dec | -2.42M | +27.96M | 9/26 | -2.86M | 16% | 45% | 22% | -304k |
| any | Aug-Oct | 58.56M | +4.09M | 21/26 | -12.07M | 12% | 86% | 11% | 58.02M |
| any | Apr-Jun | 831k | +7.84M | 13/26 | -2.26M | 9% | 78% | 18% | 3.03M |
| any | Oct-Dec | -26.27M | +4.11M | 10/26 | -19.51M | 58% | 65% | 24% | -26.65M |

**app overnight**

| Gate (walk-forward) | Period | OOS profit | vs none | Windows > 0 | Worst window | Max DD | Trading | Losing picks | Realized |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| none | Aug-Oct | 118.47M | +0k | 25/26 | -10.84M | 11% | 100% | 4% | 121.56M |
| none | Apr-Jun | 25.45M | +0k | 21/26 | -2.62M | 7% | 100% | 9% | 25.59M |
| none | Oct-Dec | -17.58M | +0k | 17/26 | -28.78M | 70% | 100% | 10% | -17.67M |
| breadth | Aug-Oct | 111.53M | -6.94M | 25/26 | -13.04M | 10% | 89% | 4% | 108.70M |
| breadth | Apr-Jun | 26.06M | +613k | 21/26 | -2.62M | 6% | 99% | 10% | 26.02M |
| breadth | Oct-Dec | -10.74M | +6.84M | 19/26 | -21.42M | 60% | 90% | 10% | -11.64M |
| update | Aug-Oct | 94.27M | -24.21M | 24/26 | -10.84M | 12% | 89% | 4% | 97.94M |
| update | Apr-Jun | 23.89M | -1.56M | 22/26 | -2.07M | 7% | 88% | 9% | 22.33M |
| update | Oct-Dec | 7.79M | +25.37M | 14/26 | -10.74M | 28% | 68% | 9% | -17.64M |
| volatility | Aug-Oct | 99.17M | -19.30M | 24/26 | -10.84M | 11% | 93% | 4% | 99.87M |
| volatility | Apr-Jun | 21.37M | -4.08M | 21/26 | -3.62M | 11% | 97% | 9% | 19.72M |
| volatility | Oct-Dec | 17.75M | +35.33M | 16/26 | -3.41M | 21% | 90% | 10% | 17.16M |
| equity | Aug-Oct | 118.47M | +0k | 25/26 | -10.84M | 11% | 100% | 4% | 121.56M |
| equity | Apr-Jun | 18.37M | -7.08M | 20/26 | -3.32M | 14% | 87% | 9% | 14.22M |
| equity | Oct-Dec | 12.65M | +30.23M | 17/26 | -9.06M | 29% | 76% | 9% | -14.91M |
| market | Aug-Oct | 94.98M | -23.50M | 23/26 | -13.04M | 10% | 79% | 4% | 92.62M |
| market | Apr-Jun | 19.95M | -5.50M | 22/26 | -3.82M | 10% | 85% | 9% | 17.30M |
| market | Oct-Dec | 21.63M | +39.21M | 15/26 | -1.86M | 10% | 63% | 8% | 23.22M |
| all | Aug-Oct | 95.19M | -23.28M | 23/26 | -13.04M | 10% | 79% | 4% | 92.63M |
| all | Apr-Jun | 16.01M | -9.44M | 20/26 | -3.84M | 11% | 74% | 9% | 13.14M |
| all | Oct-Dec | 19.51M | +37.10M | 16/26 | -1.28M | 10% | 50% | 8% | 20.53M |
| any | Aug-Oct | 105.27M | -13.20M | 25/26 | -13.04M | 10% | 90% | 4% | 107.17M |
| any | Apr-Jun | 21.92M | -3.53M | 22/26 | -2.07M | 7% | 84% | 9% | 18.84M |
| any | Oct-Dec | 11.60M | +29.18M | 16/26 | -10.74M | 30% | 76% | 9% | -14.40M |

**app dips**

| Gate (walk-forward) | Period | OOS profit | vs none | Windows > 0 | Worst window | Max DD | Trading | Losing picks | Realized |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| none | Aug-Oct | 10.75M | +0k | 25/26 | -402k | 2% | 100% | 7% | 10.72M |
| none | Apr-Jun | 8.84M | +0k | 26/26 | 194k | 1% | 100% | 3% | 8.84M |
| none | Oct-Dec | 15.54M | +0k | 25/26 | -31k | 2% | 100% | 8% | 15.80M |
| breadth | Aug-Oct | 9.82M | -933k | 25/26 | -402k | 2% | 96% | 7% | 9.86M |
| breadth | Apr-Jun | 8.84M | +0k | 26/26 | 194k | 1% | 100% | 3% | 8.84M |
| breadth | Oct-Dec | 13.36M | -2.18M | 25/26 | -31k | 1% | 91% | 8% | 14.15M |
| update | Aug-Oct | 10.54M | -212k | 25/26 | -402k | 2% | 100% | 7% | 10.61M |
| update | Apr-Jun | 8.36M | -478k | 25/26 | 0k | 1% | 93% | 2% | 8.34M |
| update | Oct-Dec | 12.77M | -2.77M | 21/26 | -115k | 2% | 84% | 8% | 13.94M |
| volatility | Aug-Oct | 9.43M | -1.32M | 24/26 | -402k | 2% | 95% | 7% | 9.66M |
| volatility | Apr-Jun | 8.84M | +0k | 26/26 | 194k | 1% | 100% | 3% | 8.84M |
| volatility | Oct-Dec | 14.90M | -648k | 25/26 | -31k | 2% | 99% | 8% | 15.77M |
| equity | Aug-Oct | 10.66M | -90k | 25/26 | -492k | 2% | 99% | 7% | 10.38M |
| equity | Apr-Jun | 8.84M | +0k | 26/26 | 194k | 1% | 100% | 3% | 8.84M |
| equity | Oct-Dec | 13.70M | -1.85M | 25/26 | -31k | 2% | 96% | 8% | 14.41M |
| market | Aug-Oct | 8.95M | -1.79M | 24/26 | -402k | 2% | 91% | 7% | 9.20M |
| market | Apr-Jun | 8.36M | -478k | 25/26 | 0k | 1% | 93% | 2% | 8.34M |
| market | Oct-Dec | 11.22M | -4.32M | 21/26 | -115k | 1% | 75% | 8% | 12.25M |
| all | Aug-Oct | 8.86M | -1.88M | 24/26 | -492k | 2% | 90% | 7% | 8.85M |
| all | Apr-Jun | 8.36M | -478k | 25/26 | 0k | 1% | 93% | 2% | 8.34M |
| all | Oct-Dec | 9.66M | -5.88M | 21/26 | -115k | 1% | 72% | 8% | 10.95M |
| any | Aug-Oct | 9.87M | -875k | 25/26 | -492k | 2% | 95% | 7% | 9.65M |
| any | Apr-Jun | 8.36M | -478k | 25/26 | 0k | 1% | 93% | 2% | 8.34M |
| any | Oct-Dec | 10.61M | -4.94M | 21/26 | -115k | 1% | 76% | 8% | 12.00M |

## Fixed gates (hindsight across periods)

**plan_flips** (top 8 by worst period; chosen with hindsight across periods)

| Fixed gate | Aug-Oct vs none | trading | Apr-Jun vs none | trading | Oct-Dec vs none | trading |
|---|---:|---:|---:|---:|---:|---:|
| update -1d/+1d kw | -1.81M | 92% | -1.50M | 92% | +2.61M | 88% |
| update -1d/+1d kw|20+items | -1.85M | 89% | +286k | 88% | +3.91M | 85% |
| 3 losses->12h | -2.04M | 99% | -419k | 98% | +3.71M | 91% |
| 3 losses->24h | -2.06M | 98% | -864k | 96% | +7.86M | 84% |
| 4 losses->24h | -2.06M | 98% | +0k | 100% | +4.74M | 96% |
| index24h<-2.0% | -2.30M | 98% | -200k | 99% | +6.05M | 92% |
| update -0d/+1d kw|20+items | -5.57M | 94% | -1.51M | 94% | +4.95M | 92% |
| update -0d/+1d kw | -5.70M | 96% | -814k | 96% | +2.62M | 94% |

**top_flips** (top 8 by worst period; chosen with hindsight across periods)

| Fixed gate | Aug-Oct vs none | trading | Apr-Jun vs none | trading | Oct-Dec vs none | trading |
|---|---:|---:|---:|---:|---:|---:|
| index24h<-2.0% | -178k | 98% | +284k | 99% | +12.83M | 92% |
| 3 losses->12h | +0k | 100% | -712k | 99% | +11.61M | 97% |
| 3 losses->24h | +0k | 100% | -796k | 98% | +12.76M | 95% |
| 4 losses->24h | +0k | 100% | -796k | 98% | +0k | 100% |
| update -1d/+1d kw | +497k | 92% | -1.35M | 92% | -3.67M | 88% |
| update -0d/+1d kw | -4.00M | 96% | -377k | 96% | -1.69M | 94% |
| update -1d/+1d kw|20+items | -833k | 89% | +490k | 88% | -4.18M | 85% |
| update -0d/+1d kw|20+items | -4.54M | 94% | -266k | 94% | +60k | 92% |

**app quick** (top 8 by worst period; chosen with hindsight across periods)

| Fixed gate | Aug-Oct vs none | trading | Apr-Jun vs none | trading | Oct-Dec vs none | trading |
|---|---:|---:|---:|---:|---:|---:|
| proposed: update -1d/+7d kw + risk-off x0.5 | +11.55M | 71% | +7.12M | 66% | +21.27M | 44% |
| update -1d/+7d kw | +12.46M | 77% | +7.10M | 69% | +12.98M | 54% |
| update -3d/+7d kw | +8.86M | 69% | +7.01M | 62% | +26.00M | 42% |
| update -2d/+2d kw | +10.86M | 85% | +3.86M | 85% | +4.06M | 77% |
| update -3d/+3d kw | +11.63M | 77% | +3.49M | 77% | +6.78M | 65% |
| update -1d/+7d kw|20+items | +3.49M | 65% | +8.88M | 65% | +15.38M | 40% |
| update -2d/+2d kw|20+items | +8.91M | 79% | +5.53M | 79% | +3.37M | 69% |
| proposed: update +-2d kw + risk-off x0.5 + vol>3x | +15.28M | 74% | +3.20M | 81% | +7.30M | 63% |

**app overnight** (top 8 by worst period; chosen with hindsight across periods)

| Fixed gate | Aug-Oct vs none | trading | Apr-Jun vs none | trading | Oct-Dec vs none | trading |
|---|---:|---:|---:|---:|---:|---:|
| 4 losses->24h | +0k | 100% | +0k | 100% | +0k | 100% |
| index24h<-1.0% | -402k | 92% | +941k | 98% | +6.19M | 77% |
| 3 losses->24h | +0k | 100% | -909k | 96% | -1.73M | 96% |
| index24h<-2.0% | -2.81M | 98% | -436k | 99% | +6.80M | 92% |
| 3 losses->12h | +0k | 100% | -2.43M | 97% | -5.53M | 98% |
| update -0d/+1d kw | -5.29M | 96% | -5.89M | 96% | -4.09M | 94% |
| update -0d/+1d kw|20+items | -5.95M | 94% | -6.85M | 94% | -6.39M | 92% |
| update -1d/+1d kw | +7.47M | 92% | -6.91M | 92% | -6.92M | 88% |

**app dips** (top 8 by worst period; chosen with hindsight across periods)

| Fixed gate | Aug-Oct vs none | trading | Apr-Jun vs none | trading | Oct-Dec vs none | trading |
|---|---:|---:|---:|---:|---:|---:|
| risk-off x0.5 | +0k | 91% | +0k | 95% | +0k | 82% |
| vol>1.5x x0.5 | +0k | 92% | +0k | 96% | +0k | 93% |
| update -0d/+1d kw | -400k | 96% | -448k | 96% | -473k | 94% |
| 3 losses->12h | +0k | 100% | +0k | 100% | -637k | 99% |
| update -0d/+1d kw|20+items | -539k | 94% | -624k | 94% | -790k | 92% |
| index7d<-5.0% | -77k | 97% | +0k | 100% | -805k | 90% |
| pnl48h<0 | -579k | 98% | +0k | 100% | -836k | 98% |
| index24h<-2.0% | -103k | 98% | -54k | 99% | -968k | 92% |

## What the folds chose

**plan_flips**

| Period | Gate | Most chosen per fold (count of folds) |
|---|---|---|
| Aug-Oct | breadth | off 22; index7d<-2.0% 2; index24h<-1.0% 1 |
| Aug-Oct | update | off 12; update -0d/+3d kw 4; update -1d/+1d kw|20+items 2 |
| Aug-Oct | volatility | vol>3x 12; off 10; vol>1.5x 3 |
| Aug-Oct | equity | off 17; pnl24h<0 4; 3 losses->24h 3 |
| Aug-Oct | market | vol>3x 4; off 3; update -0d/+3d kw 3 |
| Aug-Oct | all | vol>3x 4; off 2; vol>1.5x 2 |
| Aug-Oct | any | vol>3x 8; update -0d/+3d kw 4; pnl24h<0 3 |
| Apr-Jun | breadth | off 17; risk-off 6; risk-off x0.5 3 |
| Apr-Jun | update | off 13; update -1d/+7d kw 8; update -3d/+7d kw 1 |
| Apr-Jun | volatility | off 22; vol>1.25x 3; vol>3x 1 |
| Apr-Jun | equity | off 11; 3 losses->24h 7; pnl24h<0 3 |
| Apr-Jun | market | off 8; update -1d/+7d kw 6; risk-off 3 |
| Apr-Jun | all | off 6; update -1d/+7d kw + pnl24h<0 3; update -1d/+7d kw + 3 losses->24h 2 |
| Apr-Jun | any | off 6; risk-off 5; update -1d/+7d kw 3 |
| Oct-Dec | breadth | index24h<-1.0% 6; index7d<-5.0% 5; risk-off 5 |
| Oct-Dec | update | off 6; update -1d/+7d kw 5; update -2d/+2d kw 3 |
| Oct-Dec | volatility | vol>1.5x x0.5 7; off 6; vol>3x 6 |
| Oct-Dec | equity | off 7; 2 losses->24h 6; pnl48h<0 5 |
| Oct-Dec | market | index24h<-1.0% + vol>1.5x x0.5 2; risk-off x0.5 + update -3d/+3d kw + vol>3x 2; risk-off + update -0d/+1d kw|20+items + vol>3x 2 |
| Oct-Dec | all | risk-off + update -0d/+1d kw|20+items + vol>3x + 3 losses->12h 2; index24h<-1.0% + vol>1.5x x0.5 + pnl48h<0 1; index24h<-1.0% + vol>1.5x x0.5 1 |
| Oct-Dec | any | index7d<-5.0% 4; vol>1.5x x0.5 3; risk-off 3 |

**top_flips**

| Period | Gate | Most chosen per fold (count of folds) |
|---|---|---|
| Aug-Oct | breadth | off 22; risk-off 4 |
| Aug-Oct | update | off 19; update -2d/+2d kw|20+items 4; update -3d/+3d kw 1 |
| Aug-Oct | volatility | off 14; vol>3x 9; vol>2x 2 |
| Aug-Oct | equity | off 21; pnl24h<0 3; 2 losses->24h 2 |
| Aug-Oct | market | off 9; vol>3x 5; risk-off 4 |
| Aug-Oct | all | off 6; vol>3x 5; update -2d/+2d kw|20+items + vol>3x 4 |
| Aug-Oct | any | vol>3x 8; off 6; pnl24h<0 3 |
| Apr-Jun | breadth | off 21; risk-off x0.5 4; risk-off 1 |
| Apr-Jun | update | update -1d/+7d kw 9; off 6; update -0d/+3d kw 5 |
| Apr-Jun | volatility | off 20; vol>1.25x 4; vol>1.5x 1 |
| Apr-Jun | equity | off 18; pnl48h<0 3; 3 losses->24h 2 |
| Apr-Jun | market | update -1d/+7d kw 8; off 4; vol>1.25x 2 |
| Apr-Jun | all | update -1d/+7d kw 7; off 4; vol>1.25x 2 |
| Apr-Jun | any | update -1d/+7d kw 7; off 4; update -0d/+3d kw 4 |
| Oct-Dec | breadth | risk-off 7; risk-off x0.5 6; off 4 |
| Oct-Dec | update | update -1d/+7d kw 11; off 4; update -3d/+7d kw 4 |
| Oct-Dec | volatility | off 9; vol>1.25x 8; vol>1.5x x0.5 6 |
| Oct-Dec | equity | off 10; 2 losses->24h 6; pnl48h<0 5 |
| Oct-Dec | market | index7d<-5.0% + update -1d/+7d kw + vol>1.25x 3; off 2; risk-off + update -2d/+2d kw 2 |
| Oct-Dec | all | index7d<-5.0% + update -1d/+7d kw + vol>1.25x + pnl48h<0 3; off 2; index24h<-1.0% + update -1d/+7d kw + vol>1.25x + pnl24h<0 2 |
| Oct-Dec | any | update -1d/+7d kw 6; 2 losses->24h 5; risk-off x0.5 3 |

**app quick**

| Period | Gate | Most chosen per fold (count of folds) |
|---|---|---|
| Aug-Oct | breadth | risk-off x0.5 15; off 7; risk-off 2 |
| Aug-Oct | update | update -0d/+1d kw 9; off 5; update -1d/+1d kw 3 |
| Aug-Oct | volatility | vol>1.5x x0.5 13; vol>3x 9; vol>1.25x 2 |
| Aug-Oct | equity | off 16; pnl48h<0 5; 3 losses->12h 3 |
| Aug-Oct | market | risk-off x0.5 + update -0d/+1d kw + vol>1.5x x0.5 6; vol>3x 3; update -1d/+1d kw + vol>3x 2 |
| Aug-Oct | all | risk-off x0.5 + update -0d/+1d kw + vol>1.5x x0.5 3; vol>3x 3; risk-off x0.5 + update -0d/+1d kw + vol>1.5x x0.5 + pnl48h<0 2 |
| Aug-Oct | any | vol>3x 8; vol>1.5x x0.5 6; risk-off 2 |
| Apr-Jun | breadth | risk-off 11; off 9; risk-off x0.5 6 |
| Apr-Jun | update | off 11; update -2d/+2d kw 4; update -3d/+7d kw 4 |
| Apr-Jun | volatility | off 14; vol>1.25x 8; vol>1.5x 4 |
| Apr-Jun | equity | off 11; pnl24h<0 8; pnl48h<0 3 |
| Apr-Jun | market | off 7; risk-off 3; risk-off + update -3d/+7d kw + vol>1.25x 3 |
| Apr-Jun | all | off 7; risk-off + update -3d/+7d kw + vol>1.25x + pnl24h<0 3; risk-off 2 |
| Apr-Jun | any | off 7; update -2d/+2d kw 4; risk-off 3 |
| Oct-Dec | breadth | index7d<-2.0% 6; risk-off 5; index24h<-1.0% 4 |
| Oct-Dec | update | update -2d/+2d kw 7; update -3d/+3d kw 6; off 3 |
| Oct-Dec | volatility | vol>1.25x 7; vol>1.5x 6; vol>2x 6 |
| Oct-Dec | equity | pnl24h<0 7; 3 losses->12h 6; 2 losses->24h 5 |
| Oct-Dec | market | index7d<-2.0% + update -3d/+7d kw + vol>2x 3; index7d<-2.0% + update -0d/+1d kw|20+items + vol>1.25x 2; risk-off + update -2d/+2d kw + vol>1.5x 2 |
| Oct-Dec | all | index7d<-2.0% + update -3d/+7d kw + vol>2x + 2 losses->24h 3; index7d<-2.0% + update -0d/+1d kw|20+items + vol>1.25x + 3 losses->12h 2; index24h<-1.0% + vol>1.25x + 2 losses->24h 1 |
| Oct-Dec | any | update -3d/+3d kw 5; risk-off 4; pnl48h<0 3 |

**app overnight**

| Period | Gate | Most chosen per fold (count of folds) |
|---|---|---|
| Aug-Oct | breadth | risk-off x0.5 13; off 5; index24h<-1.0% 5 |
| Aug-Oct | update | off 15; update -1d/+1d kw|20+items 4; update -1d/+3d kw 4 |
| Aug-Oct | volatility | off 12; vol>1.5x x0.5 10; vol>1.5x 1 |
| Aug-Oct | equity | off 23; pnl24h<0 3 |
| Aug-Oct | market | risk-off x0.5 + vol>1.5x x0.5 5; risk-off x0.5 4; vol>1.5x x0.5 2 |
| Aug-Oct | all | risk-off x0.5 + vol>1.5x x0.5 4; risk-off x0.5 4; update -1d/+3d kw 2 |
| Aug-Oct | any | risk-off x0.5 11; index24h<-1.0% 5; update -1d/+3d kw 3 |
| Apr-Jun | breadth | off 14; risk-off x0.5 7; risk-off 5 |
| Apr-Jun | update | update -1d/+7d kw 9; update -0d/+3d kw 8; off 7 |
| Apr-Jun | volatility | off 18; vol>1.25x 3; vol>2x 3 |
| Apr-Jun | equity | pnl24h<0 12; off 5; 3 losses->24h 4 |
| Apr-Jun | market | off 7; risk-off x0.5 + update -1d/+7d kw 4; update -1d/+7d kw 3 |
| Apr-Jun | all | update -1d/+7d kw + pnl24h<0 3; risk-off x0.5 + update -1d/+7d kw + pnl24h<0 3; off 2 |
| Apr-Jun | any | pnl24h<0 7; update -0d/+3d kw 5; update -1d/+7d kw 3 |
| Oct-Dec | breadth | index7d<-2.0% 7; risk-off x0.5 5; off 3 |
| Oct-Dec | update | update -1d/+7d kw 7; off 6; update -3d/+7d kw 4 |
| Oct-Dec | volatility | vol>1.25x 9; vol>1.5x x0.5 8; vol>2x 4 |
| Oct-Dec | equity | off 12; pnl24h<0 8; 2 losses->24h 3 |
| Oct-Dec | market | vol>1.5x x0.5 2; risk-off x0.5 + update -1d/+7d kw + vol>1.5x x0.5 2; index24h<-1.0% + update -1d/+7d kw + vol>1.25x 2 |
| Oct-Dec | all | vol>1.5x x0.5 2; risk-off x0.5 + update -1d/+7d kw + vol>1.5x x0.5 2; index24h<-1.0% + update -1d/+7d kw + vol>1.25x + pnl24h<0 2 |
| Oct-Dec | any | update -1d/+7d kw 4; vol>1.5x x0.5 3; update -1d/+1d kw 3 |

**app dips**

| Period | Gate | Most chosen per fold (count of folds) |
|---|---|---|
| Aug-Oct | breadth | off 18; risk-off 4; index24h<-1.0% 3 |
| Aug-Oct | update | off 24; update -0d/+3d kw 1; update -1d/+1d kw 1 |
| Aug-Oct | volatility | off 18; vol>2x 4; vol>1.25x 2 |
| Aug-Oct | equity | off 25; 2 losses->24h 1 |
| Aug-Oct | market | off 13; risk-off 3; index24h<-1.0% + vol>2x 2 |
| Aug-Oct | all | off 12; risk-off 3; index24h<-1.0% + vol>2x 2 |
| Aug-Oct | any | off 12; risk-off 4; vol>2x 4 |
| Apr-Jun | breadth | off 26 |
| Apr-Jun | update | off 24; update -3d/+3d kw 1; update -1d/+1d kw|20+items 1 |
| Apr-Jun | volatility | off 25; vol>1.25x 1 |
| Apr-Jun | equity | off 26 |
| Apr-Jun | market | off 23; vol>1.25x 1; update -3d/+3d kw 1 |
| Apr-Jun | all | off 23; vol>1.25x 1; update -3d/+3d kw 1 |
| Apr-Jun | any | off 23; vol>1.25x 1; update -3d/+3d kw 1 |
| Oct-Dec | breadth | off 20; risk-off 2; index7d<-2.0% 2 |
| Oct-Dec | update | off 19; update -1d/+1d kw 2; update -3d/+3d kw 1 |
| Oct-Dec | volatility | off 24; vol>1.5x 1; vol>1.25x 1 |
| Oct-Dec | equity | off 19; pnl24h<0 4; 2 losses->24h 1 |
| Oct-Dec | market | off 16; risk-off 2; update -3d/+3d kw 1 |
| Oct-Dec | all | off 11; pnl24h<0 3; risk-off 2 |
| Oct-Dec | any | off 11; pnl24h<0 4; risk-off 2 |

# GE Metrics walk-forward validation

Generated 2026-10-26 19:30Z by `npm run backtest -- --walk-forward` (mcp/src/backtest/walkforward). Same simulator, fill model and no-lookahead views as the 14-day backtest (reports/backtest-2026-10-26.md).

## Setup

- History: the wiki's /1h?timestamp= (and /5m) returned full snapshots (~3,000 items) at every probe back to 730 days ago, so history is not the limit; this run uses the last ~60 days plus 7 days of lookback.
- 60 days of decisions every 4h, 2026-08-25 16:00Z to 2026-10-24 16:00Z; simulation runs to 2026-10-26 18:00Z. Stack 50.00M, 8 slots, 8h buy timeout, dump after 24h, 25% queue share unless stated.
- 260 variants (grid below), each run once over the whole period. 26 folds: train 7d, then test the next 2d, step 2d. Test windows don't overlap and together cover 52 days.
- Per fold, the variant with the most profit on the training window (equity change: cash + holdings marked at the instant-sell price; ties to lower drawdown) trades the test window. The training score uses only hours that closed before the test starts (tested: rewriting everything after the split changes no choice).
- OOS = test windows only. Losing picks = OOS picks that bought anything and lost money after tax. Max DD = worst peak-to-trough of the OOS equity chained across test windows.
- Consensus = every knob at the value the folds chose most often. It is picked with all folds' training data, so its OOS line is slightly optimistic; the walk-forward line is the clean number.
- Decision-time market mood (market_breadth logic): 18 risk-on, 276 mixed, 67 risk-off.

## Out-of-sample results

| Strategy | Parameters | OOS profit | per day | Windows > 0 | Losing picks | Max DD |
|---|---|---:|---:|---:|---:|---:|
| plan_flips | walk-forward (re-tuned each fold) | 101.60M | 1.95M | 25/26 | 9% | 9.1% |
| | shipped default: max_fill_hours=8 min_volume=10000 ask_cap=true | 38.69M | 744k | 17/26 | 26% | 11.1% |
| | consensus: max_fill_hours=2 min_volume=5000 ask_cap=true (beat default in 26/26) | 116.97M | 2.25M | 25/26 | 8% | 8.3% |
| | hindsight best per window (not tradable) | 138.18M | | | | |
| top_flips | walk-forward (re-tuned each fold) | 85.77M | 1.65M | 25/26 | 7% | 13.2% |
| | shipped default: max_fill_hours=8 min_volume=1000 ask_cap=true | 20.57M | 396k | 18/26 | 12% | 20.7% |
| | consensus: max_fill_hours=2 min_volume=5000 ask_cap=false (beat default in 24/26) | 102.59M | 1.97M | 25/26 | 6% | 11.9% |
| | hindsight best per window (not tradable) | 138.91M | | | | |
| app quick | walk-forward (re-tuned each fold) | 48.06M | 924k | 22/26 | 14% | 18.0% |
| | shipped default: horizon_hours=4 max_sell_hours=1 min_day_trades=10000 | 29.91M | 575k | 21/26 | 22% | 19.4% |
| | consensus: horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 (beat default in 21/26) | 54.46M | 1.05M | 24/26 | 12% | 18.3% |
| | hindsight best per window (not tradable) | 92.91M | | | | |
| app overnight | walk-forward (re-tuned each fold) | 98.09M | 1.89M | 24/26 | 5% | 18.3% |
| | shipped default: horizon_hours=8 max_sell_hours=1 min_day_trades=10000 | 107.90M | 2.07M | 23/26 | 7% | 10.7% |
| | consensus: horizon_hours=4 max_sell_hours=0.5 min_day_trades=5000 (beat default in 19/26) | 114.24M | 2.20M | 24/26 | 4% | 12.4% |
| | hindsight best per window (not tradable) | 138.49M | | | | |
| app dips | walk-forward (re-tuned each fold) | 12.70M | 244k | 25/26 | 8% | 4.3% |
| | shipped default: horizon_hours=4 max_sell_hours=1 min_day_trades=10000 | 11.44M | 220k | 25/26 | 7% | 2.6% |
| | consensus: horizon_hours=8 max_sell_hours=4 min_day_trades=2000 (beat default in 20/26) | 12.64M | 243k | 25/26 | 10% | 4.9% |
| | hindsight best per window (not tradable) | 17.98M | | | | |

## Conclusions (analyst notes on this run)

"Shipped default" rows are the defaults before this PR: plan_flips 8h / 10k, top_flips 8h / 1k, and the app's fill-aware lists as merged in #26 (quick 4h, overnight 8h, dips 4h; sell limit 1h; 10K/day floor).

1. **The in-sample fixes hold up out of sample, mostly.** Over 52 unseen days:
   - The **10K/day floor** is robust. For plan_flips, 1k alone fell to 7.3M OOS vs 38.7M at 10k. For the app lists, 10k beats 2k, 25k and 50k with the other knobs at default. 5k is a coin flip against 10k: slightly ahead for quick (+4.0M, 18/26 windows), behind for overnight (-15.7M). Keep 10K.
   - The **ask cap** is robust. Turning it off cost plan_flips 14.6M (10/26 windows better). For top_flips it is a wash (the folds split 13/13).
   - The **1h sell limit** is right in direction: 2h and 4h lose 16-62M OOS on quick and overnight. 0.5h does a bit better still (see 3).
   - The **25% queue share** assumption doesn't drive any conclusion. Re-running the whole walk-forward at 10% and 50% picks the same knobs for plan_flips, top_flips and quick, and the same order between default and alternative.
   - **4h patience** is the fix that does not hold: shorter is better (see 2 and 3).
2. **MCP: change plan_flips and top_flips (done in this PR).**
   - **plan_flips: max_fill_hours 8 -> 2.** The training windows chose 2h in 25/26 folds. Moved alone, 2h beat 8h in **26/26** test windows: 115.2M vs 38.7M OOS, losing picks 8% vs 26% (max DD 8.3% vs 11.1% for 2h/5k). It still wins at 10% and 50% queue share. min_volume stays 10k: 5k vs 10k is 117.0M vs 115.2M at 2h, which is noise, and 10k is safer at longer horizons.
   - **top_flips: min_volume 1k -> 10k, max_fill_hours 8 -> 2.** 1k was chosen in 1 of 26 folds. Every higher floor beats it OOS: 10k alone gives +58.6M and wins 22/26 windows. 2h alone gives +31.1M, wins 22/26, and was the most chosen (58%). The pre-set rule says "keep" only because the folds split their floor across 5k, 10k, 25k and 50k. They agree 1k is wrong, so this takes the best single-knob floor, which also matches plan_flips. With both changes (consensus row, ask cap aside) top_flips makes about 95-103M OOS (nearest measured variants: 2h/10k without the ask cap, 2h/5k with it) vs 20.6M, and 24/26 windows are up.
   - Walk-forward re-tuning itself (the clean OOS number) is 2.6x (plan_flips) and 4.2x (top_flips) the old defaults. The new defaults land close to the re-tuned result, so there is little left to gain from re-tuning live.
3. **App: recommended defaults for a follow-up PR on master** (`mobile/src/lib/pickFill.ts`, `mobile/src/lib/fillAware.ts`; not edited here).
   - **Next 4 hours (quick), and Plan my cash, which uses the same horizon:** `PICK_HORIZON_HOURS.quick` and `.plan` 4 -> **2**. The folds chose 2h in 22/26. Alone it gives +16.9M and wins 19/26 windows; 4h -> 2h also cut losing picks from 22% to 16%. That makes the list "Next 2 hours" in effect. Keeping the 4h buy-limit framing in the UI is fine, but size for 2h.
   - **Slowest sell to show:** `DEFAULT_MAX_SELL_HOURS` 1 -> **0.5**. Add 0.5 to `MAX_SELL_HOUR_OPTIONS`. With quick at 2h it adds +7.7M (54.5M vs 46.8M). For overnight it adds +10.6M alone (16/26 windows, losing picks 7% -> 4%). For dips it costs 0.7M (dips is the smallest list either way). The folds chose 0.5h in 77% (quick) and 65% (overnight). Confidence: moderate. The gain is consistent in direction at all three queue shares, but per-window wins are 16/26 for overnight.
   - **Overnight:** keep the 8h horizon and 10K floor. Re-tuning per fold did worse than the default (98.1M vs 107.9M), and the folds split between 4h and 12h.
   - **Dips:** keep. The folds preferred an 8h horizon (96%), but it is worth only +1.0M over 52 days (20/26 windows), and none of the dips variants moved much.
   - Keep `MIN_DAY_TRADES` = 10,000.
4. **Regime (market_breadth mood at the decision).** Most decisions were "mixed" (276), then risk-off (67), then risk-on (18), so the risk-on rows are thin.
   - In **risk-off**, **app quick loses money** even when re-tuned: -8.3M with 25% losing picks, and -11.2M with 34% losing at the defaults.
   - The MCP pickers stay positive in risk-off: plan_flips +28.9M re-tuned, 10% losing. The old top_flips default lost 2.6M there; re-tuned it made +16.4M.
   - Suggestion for the app follow-up: when market_breadth reads risk-off, warn on Next 4 hours, or point users to Overnight (+14.9M in risk-off at defaults).
5. **Dump-after hours.**
   - **12h** hurts every strategy (for example plan_flips 2h/5k 117M -> 83M; quick consensus 54M -> 34M).
   - **48h** is mixed: slightly better for the old 8h defaults, slightly worse for the short-horizon variants.
   - 24h stays the simulator default. Users should not panic-dump early.
6. **Caveats.**
   - This is one 60-day market path (Aug 25 - Oct 26 2026) and one simulator. Fills are hourly and volume-capped, with buy limits and mapping as of today.
   - The consensus rows are chosen with all folds' training data, so they are slightly optimistic; the per-fold walk-forward rows are not.
   - Every variant runs continuously, so a test window inherits open positions from that variant's own past. That is what trading it all along would look like, and it uses no test-window data for the choice.
   - The wiki serves /1h and /5m snapshots at least 2 years back, so the next step is to re-run on a second, older 60-day window before trusting the app numbers to a decimal.

## Are the defaults robust?

Rule: change a default only if re-tuning every fold beats it OOS, the consensus variant beats it OOS in total and wins at least 60% of test windows, and each changed knob was the folds' top choice at least 50% of the time.

- **plan_flips**: CHANGE (max_fill_hours=2 min_volume=5000 ask_cap=true). re-tuning each fold beat the default OOS (101.60M vs 38.69M); consensus beat the default OOS (116.97M vs 38.69M); won 26/26 test windows (need 60%); max_fill_hours=2 chosen in 96% of folds; min_volume=5000 chosen in 65% of folds.
- **top_flips**: keep (max_fill_hours=8 min_volume=1000 ask_cap=true). re-tuning each fold beat the default OOS (85.77M vs 20.57M); consensus beat the default OOS (102.59M vs 20.57M); won 24/26 test windows (need 60%); max_fill_hours=2 chosen in 58% of folds; min_volume=5000 chosen in 38% of folds; ask_cap=false chosen in 50% of folds.
- **app quick**: CHANGE (horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000). re-tuning each fold beat the default OOS (48.06M vs 29.91M); consensus beat the default OOS (54.46M vs 29.91M); won 21/26 test windows (need 60%); horizon_hours=2 chosen in 85% of folds; max_sell_hours=0.5 chosen in 77% of folds.
- **app overnight**: keep (horizon_hours=8 max_sell_hours=1 min_day_trades=10000). re-tuning each fold did not beat the default OOS (98.09M vs 107.90M); consensus beat the default OOS (114.24M vs 107.90M); won 19/26 test windows (need 60%); horizon_hours=4 chosen in 50% of folds; max_sell_hours=0.5 chosen in 65% of folds; min_day_trades=5000 chosen in 50% of folds.
- **app dips**: keep (horizon_hours=4 max_sell_hours=1 min_day_trades=10000). re-tuning each fold beat the default OOS (12.70M vs 11.44M); consensus beat the default OOS (12.64M vs 11.44M); won 20/26 test windows (need 60%); horizon_hours=8 chosen in 96% of folds; max_sell_hours=4 chosen in 69% of folds; min_day_trades=2000 chosen in 38% of folds.

## One knob at a time

Each knob moved alone, the others held at the shipped default and then at the consensus, scored on the same test windows (fixed parameters, not re-tuned).

**plan_flips**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | max_fill_hours | 2 | 115.24M | +76.55M | 26/26 | 8% |
| default | max_fill_hours | 4 | 81.86M | +43.17M | 26/26 | 16% |
| default | max_fill_hours | 8 (default) | 38.69M | +0 | 0/26 | 26% |
| default | max_fill_hours | 12 | 18.18M | -20.52M | 9/26 | 29% |
| default | min_volume | 1000 | 7.26M | -31.44M | 10/26 | 27% |
| default | min_volume | 5000 | 34.48M | -4.21M | 12/26 | 26% |
| default | min_volume | 10000 (default) | 38.69M | +0 | 0/26 | 26% |
| default | min_volume | 25000 | 22.23M | -16.46M | 8/26 | 24% |
| default | min_volume | 50000 | 24.72M | -13.97M | 11/26 | 23% |
| default | ask_cap | true (default) | 38.69M | +0 | 0/26 | 26% |
| default | ask_cap | false | 24.12M | -14.58M | 10/26 | 31% |
| consensus | max_fill_hours | 2 (consensus) | 116.97M | +78.27M | 26/26 | 8% |
| consensus | max_fill_hours | 4 | 77.01M | +38.31M | 25/26 | 16% |
| consensus | max_fill_hours | 8 | 34.48M | -4.21M | 12/26 | 26% |
| consensus | max_fill_hours | 12 | 17.66M | -21.03M | 7/26 | 29% |
| consensus | min_volume | 1000 | 74.48M | +35.79M | 22/26 | 10% |
| consensus | min_volume | 5000 (consensus) | 116.97M | +78.27M | 26/26 | 8% |
| consensus | min_volume | 10000 | 115.24M | +76.55M | 26/26 | 8% |
| consensus | min_volume | 25000 | 56.11M | +17.42M | 20/26 | 9% |
| consensus | min_volume | 50000 | 55.25M | +16.56M | 20/26 | 9% |
| consensus | ask_cap | true (consensus) | 116.97M | +78.27M | 26/26 | 8% |
| consensus | ask_cap | false | 109.77M | +71.08M | 25/26 | 10% |

**top_flips**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | max_fill_hours | 2 | 51.64M | +31.07M | 22/26 | 5% |
| default | max_fill_hours | 4 | 57.77M | +37.21M | 18/26 | 9% |
| default | max_fill_hours | 8 (default) | 20.57M | +0 | 0/26 | 12% |
| default | max_fill_hours | 12 | 22.02M | +1.45M | 11/26 | 13% |
| default | min_volume | 1000 (default) | 20.57M | +0 | 0/26 | 12% |
| default | min_volume | 5000 | 73.80M | +53.23M | 22/26 | 10% |
| default | min_volume | 10000 | 79.16M | +58.59M | 22/26 | 10% |
| default | min_volume | 25000 | 36.14M | +15.57M | 18/26 | 11% |
| default | min_volume | 50000 | 37.72M | +17.15M | 17/26 | 10% |
| default | ask_cap | true (default) | 20.57M | +0 | 0/26 | 12% |
| default | ask_cap | false | 17.86M | -2.71M | 11/26 | 15% |
| consensus | max_fill_hours | 2 (consensus) | 102.59M | +82.02M | 24/26 | 6% |
| consensus | max_fill_hours | 4 | 77.78M | +57.21M | 19/26 | 10% |
| consensus | max_fill_hours | 8 | 45.46M | +24.89M | 15/26 | 15% |
| consensus | max_fill_hours | 12 | 54.13M | +33.56M | 16/26 | 14% |
| consensus | min_volume | 1000 | 55.06M | +34.49M | 18/26 | 8% |
| consensus | min_volume | 5000 (consensus) | 102.59M | +82.02M | 24/26 | 6% |
| consensus | min_volume | 10000 | 94.72M | +74.15M | 21/26 | 6% |
| consensus | min_volume | 25000 | 60.21M | +39.65M | 19/26 | 6% |
| consensus | min_volume | 50000 | 57.69M | +37.12M | 19/26 | 6% |
| consensus | ask_cap | true | 100.24M | +79.67M | 24/26 | 4% |
| consensus | ask_cap | false (consensus) | 102.59M | +82.02M | 24/26 | 6% |

**app quick**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | horizon_hours | 2 | 46.77M | +16.87M | 19/26 | 16% |
| default | horizon_hours | 4 (default) | 29.91M | +0 | 0/26 | 22% |
| default | horizon_hours | 8 | 19.92M | -9.98M | 8/26 | 23% |
| default | max_sell_hours | 0.5 | 33.70M | +3.79M | 16/26 | 15% |
| default | max_sell_hours | 1 (default) | 29.91M | +0 | 0/26 | 22% |
| default | max_sell_hours | 2 | 13.89M | -16.02M | 6/26 | 27% |
| default | max_sell_hours | 4 | 11.62M | -18.29M | 7/26 | 30% |
| default | min_day_trades | 2000 | 18.92M | -10.99M | 10/26 | 23% |
| default | min_day_trades | 5000 | 33.90M | +4.00M | 18/26 | 20% |
| default | min_day_trades | 10000 (default) | 29.91M | +0 | 0/26 | 22% |
| default | min_day_trades | 25000 | 6.35M | -23.56M | 11/26 | 23% |
| default | min_day_trades | 50000 | 5.72M | -24.19M | 10/26 | 22% |
| consensus | horizon_hours | 2 (consensus) | 54.46M | +24.56M | 21/26 | 12% |
| consensus | horizon_hours | 4 | 33.70M | +3.79M | 16/26 | 15% |
| consensus | horizon_hours | 8 | 19.61M | -10.30M | 11/26 | 16% |
| consensus | max_sell_hours | 0.5 (consensus) | 54.46M | +24.56M | 21/26 | 12% |
| consensus | max_sell_hours | 1 | 46.77M | +16.87M | 19/26 | 16% |
| consensus | max_sell_hours | 2 | 36.63M | +6.73M | 15/26 | 20% |
| consensus | max_sell_hours | 4 | 36.63M | +6.73M | 15/26 | 20% |
| consensus | min_day_trades | 2000 | 19.79M | -10.12M | 15/26 | 12% |
| consensus | min_day_trades | 5000 | 47.01M | +17.10M | 19/26 | 13% |
| consensus | min_day_trades | 10000 (consensus) | 54.46M | +24.56M | 21/26 | 12% |
| consensus | min_day_trades | 25000 | 12.38M | -17.53M | 14/26 | 15% |
| consensus | min_day_trades | 50000 | 14.68M | -15.23M | 14/26 | 14% |

**app overnight**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | horizon_hours | 4 | 111.59M | +3.69M | 15/26 | 6% |
| default | horizon_hours | 8 (default) | 107.90M | +0 | 0/26 | 7% |
| default | horizon_hours | 12 | 104.13M | -3.77M | 10/26 | 7% |
| default | max_sell_hours | 0.5 | 118.47M | +10.58M | 16/26 | 4% |
| default | max_sell_hours | 1 (default) | 107.90M | +0 | 0/26 | 7% |
| default | max_sell_hours | 2 | 75.74M | -32.15M | 7/26 | 10% |
| default | max_sell_hours | 4 | 45.56M | -62.33M | 4/26 | 16% |
| default | min_day_trades | 2000 | 95.05M | -12.85M | 11/26 | 7% |
| default | min_day_trades | 5000 | 92.24M | -15.65M | 20/26 | 7% |
| default | min_day_trades | 10000 (default) | 107.90M | +0 | 0/26 | 7% |
| default | min_day_trades | 25000 | 41.23M | -66.67M | 7/26 | 8% |
| default | min_day_trades | 50000 | 40.68M | -67.21M | 10/26 | 8% |
| consensus | horizon_hours | 4 (consensus) | 114.24M | +6.35M | 19/26 | 4% |
| consensus | horizon_hours | 8 | 112.42M | +4.53M | 19/26 | 4% |
| consensus | horizon_hours | 12 | 114.89M | +7.00M | 19/26 | 4% |
| consensus | max_sell_hours | 0.5 (consensus) | 114.24M | +6.35M | 19/26 | 4% |
| consensus | max_sell_hours | 1 | 97.92M | -9.98M | 17/26 | 6% |
| consensus | max_sell_hours | 2 | 92.65M | -15.24M | 7/26 | 10% |
| consensus | max_sell_hours | 4 | 73.51M | -34.38M | 6/26 | 11% |
| consensus | min_day_trades | 2000 | 105.29M | -2.60M | 15/26 | 5% |
| consensus | min_day_trades | 5000 (consensus) | 114.24M | +6.35M | 19/26 | 4% |
| consensus | min_day_trades | 10000 | 118.61M | +10.71M | 16/26 | 4% |
| consensus | min_day_trades | 25000 | 45.30M | -62.60M | 12/26 | 4% |
| consensus | min_day_trades | 50000 | 40.89M | -67.01M | 12/26 | 4% |

**app dips**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | horizon_hours | 2 | 8.25M | -3.18M | 1/26 | 6% |
| default | horizon_hours | 4 (default) | 11.44M | +0 | 0/26 | 7% |
| default | horizon_hours | 8 | 12.47M | +1.04M | 20/26 | 7% |
| default | max_sell_hours | 0.5 | 10.75M | -690k | 6/26 | 7% |
| default | max_sell_hours | 1 (default) | 11.44M | +0 | 0/26 | 7% |
| default | max_sell_hours | 2 | 11.10M | -334k | 13/26 | 8% |
| default | max_sell_hours | 4 | 11.12M | -316k | 14/26 | 8% |
| default | min_day_trades | 2000 | 11.48M | +37k | 15/26 | 8% |
| default | min_day_trades | 5000 | 11.62M | +183k | 15/26 | 7% |
| default | min_day_trades | 10000 (default) | 11.44M | +0 | 0/26 | 7% |
| default | min_day_trades | 25000 | 11.07M | -372k | 10/26 | 5% |
| default | min_day_trades | 50000 | 10.53M | -911k | 8/26 | 5% |
| consensus | horizon_hours | 2 | 8.28M | -3.16M | 2/26 | 7% |
| consensus | horizon_hours | 4 | 10.94M | -500k | 14/26 | 8% |
| consensus | horizon_hours | 8 (consensus) | 12.64M | +1.20M | 20/26 | 10% |
| consensus | max_sell_hours | 0.5 | 12.07M | +631k | 14/26 | 7% |
| consensus | max_sell_hours | 1 | 12.61M | +1.17M | 16/26 | 9% |
| consensus | max_sell_hours | 2 | 12.46M | +1.03M | 19/26 | 9% |
| consensus | max_sell_hours | 4 (consensus) | 12.64M | +1.20M | 20/26 | 10% |
| consensus | min_day_trades | 2000 (consensus) | 12.64M | +1.20M | 20/26 | 10% |
| consensus | min_day_trades | 5000 | 13.51M | +2.07M | 21/26 | 9% |
| consensus | min_day_trades | 10000 | 12.70M | +1.26M | 22/26 | 9% |
| consensus | min_day_trades | 25000 | 12.76M | +1.32M | 20/26 | 7% |
| consensus | min_day_trades | 50000 | 12.02M | +582k | 20/26 | 6% |

## Parameter stability across folds

| Strategy | Knob | Default | Folds choosing each value (* = default) | Top share |
|---|---|---|---|---:|
| plan_flips | max_fill_hours | 8 | 2: 25, 4: 1 | 96% |
| plan_flips | min_volume | 10000 | 5000: 17, 50000: 5, 10000*: 4 | 65% |
| plan_flips | ask_cap | true | true*: 19, false: 7 | 73% |
| top_flips | max_fill_hours | 8 | 2: 15, 4: 7, 8*: 4 | 58% |
| top_flips | min_volume | 1000 | 5000: 10, 10000: 7, 25000: 5, 50000: 3, 1000*: 1 | 38% |
| top_flips | ask_cap | true | false: 13, true*: 13 | 50% |
| app quick | horizon_hours | 4 | 2: 22, 8: 2, 4*: 2 | 85% |
| app quick | max_sell_hours | 1 | 0.5: 20, 1*: 6 | 77% |
| app quick | min_day_trades | 10000 | 10000*: 11, 5000: 8, 50000: 3, 2000: 3, 25000: 1 | 42% |
| app overnight | horizon_hours | 8 | 4: 13, 12: 12, 8*: 1 | 50% |
| app overnight | max_sell_hours | 1 | 0.5: 17, 1*: 7, 2: 2 | 65% |
| app overnight | min_day_trades | 10000 | 5000: 13, 2000: 6, 50000: 5, 10000*: 2 | 50% |
| app dips | horizon_hours | 4 | 8: 25, 4*: 1 | 96% |
| app dips | max_sell_hours | 1 | 4: 18, 2: 4, 1*: 3, 0.5: 1 | 69% |
| app dips | min_day_trades | 10000 | 2000: 10, 10000*: 9, 5000: 4, 25000: 3 | 38% |

- plan_flips: shipped default ranked median 19 of 40 on the training windows (best 10, worst 32).
- top_flips: shipped default ranked median 34 of 40 on the training windows (best 10, worst 40).
- app quick: shipped default ranked median 24 of 60 on the training windows (best 5, worst 49).
- app overnight: shipped default ranked median 23 of 60 on the training windows (best 3, worst 39).
- app dips: shipped default ranked median 22 of 60 on the training windows (best 10, worst 44).

## Regime split (risk-on vs risk-off decisions)

Realized profit of OOS picks grouped by the market mood at the decision that placed them.

| Strategy | Mood at decision | Decisions | WF picks | WF realized | WF losing | Default picks | Default realized | Default losing |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| plan_flips | risk-on | 13 | 66 | 8.14M | 3% | 47 | 4.18M | 22% |
| plan_flips | mixed | 243 | 1026 | 65.17M | 10% | 640 | 27.18M | 26% |
| plan_flips | risk-off | 56 | 218 | 28.89M | 10% | 147 | 7.77M | 27% |
| top_flips | risk-on | 13 | 50 | 7.82M | 0% | 41 | 3.94M | 17% |
| top_flips | mixed | 243 | 959 | 64.01M | 7% | 825 | 18.58M | 12% |
| top_flips | risk-off | 56 | 217 | 16.44M | 7% | 186 | -2.56M | 13% |
| app quick | risk-on | 13 | 70 | 5.79M | 3% | 43 | 4.03M | 15% |
| app quick | mixed | 243 | 927 | 50.02M | 12% | 739 | 37.28M | 19% |
| app quick | risk-off | 56 | 170 | -8.25M | 25% | 157 | -11.19M | 34% |
| app overnight | risk-on | 13 | 63 | 9.13M | 2% | 61 | 9.12M | 5% |
| app overnight | mixed | 243 | 1146 | 93.37M | 5% | 1079 | 87.70M | 6% |
| app overnight | risk-off | 56 | 250 | -676k | 8% | 252 | 14.86M | 9% |
| app dips | risk-on | 13 | 35 | 1.35M | 0% | 38 | 1.06M | 0% |
| app dips | mixed | 243 | 681 | 9.15M | 8% | 761 | 7.97M | 6% |
| app dips | risk-off | 56 | 186 | 2.74M | 9% | 189 | 2.52M | 9% |

## Sensitivity: queue share and dump-after hours

OOS profit over the same test windows for the shipped default and the consensus variant, re-simulated with a different simulator queue share or max hold (parameters not re-tuned).

| Strategy | Variant | queue share 10% | queue share 25% | queue share 50% | dump after 12h | dump after 48h |
|---|---|---:|---:|---:|---:|---:|
| plan_flips | default | 14.36M (29% lose, 15/26 up) | 38.69M (26% lose, 17/26 up) | 61.28M (21% lose, 19/26 up) | 26.75M (33% lose, 15/26 up) | 42.06M (18% lose, 20/26 up) |
| plan_flips | consensus | 98.19M (9% lose, 25/26 up) | 116.97M (8% lose, 25/26 up) | 125.12M (7% lose, 25/26 up) | 83.49M (13% lose, 22/26 up) | 99.46M (5% lose, 25/26 up) |
| top_flips | default | 20.16M (14% lose, 16/26 up) | 20.57M (12% lose, 18/26 up) | 39.76M (13% lose, 19/26 up) | 3.32M (17% lose, 16/26 up) | 20.19M (9% lose, 16/26 up) |
| top_flips | consensus | 81.89M (7% lose, 25/26 up) | 102.59M (6% lose, 25/26 up) | 101.25M (6% lose, 25/26 up) | 58.27M (10% lose, 23/26 up) | 84.66M (4% lose, 25/26 up) |
| app quick | default | 17.67M (24% lose, 16/26 up) | 29.91M (22% lose, 21/26 up) | 26.94M (21% lose, 20/26 up) | 16.05M (26% lose, 18/26 up) | 24.46M (18% lose, 19/26 up) |
| app quick | consensus | 46.28M (13% lose, 22/26 up) | 54.46M (12% lose, 24/26 up) | 51.25M (13% lose, 22/26 up) | 33.82M (17% lose, 22/26 up) | 34.05M (12% lose, 20/26 up) |
| app overnight | default | 92.12M (7% lose, 24/26 up) | 107.90M (7% lose, 23/26 up) | 110.94M (6% lose, 23/26 up) | 77.43M (11% lose, 23/26 up) | 100.09M (4% lose, 24/26 up) |
| app overnight | consensus | 110.71M (4% lose, 24/26 up) | 114.24M (4% lose, 24/26 up) | 114.78M (4% lose, 24/26 up) | 79.20M (8% lose, 23/26 up) | 110.09M (2% lose, 25/26 up) |
| app dips | default | 8.96M (8% lose, 25/26 up) | 11.44M (7% lose, 25/26 up) | 13.21M (6% lose, 25/26 up) | 10.04M (12% lose, 25/26 up) | 10.97M (5% lose, 25/26 up) |
| app dips | consensus | 6.96M (12% lose, 24/26 up) | 12.64M (10% lose, 25/26 up) | 14.91M (9% lose, 25/26 up) | 8.90M (16% lose, 24/26 up) | 9.95M (7% lose, 23/26 up) |

The whole walk-forward re-run (grid re-tuned per fold) under other queue shares:

| Strategy | Queue share | WF OOS | Default OOS | Consensus | Consensus beat default | Rule says |
|---|---:|---:|---:|---|---:|---|
| plan_flips | 10% | 87.99M (25/26 up) | 14.36M (15/26 up) | max_fill_hours=2 min_volume=5000 ask_cap=true | 25/26 | change |
| top_flips | 10% | 69.51M (24/26 up) | 20.16M (16/26 up) | max_fill_hours=2 min_volume=5000 ask_cap=true | 24/26 | keep |
| app quick | 10% | 46.34M (23/26 up) | 17.67M (16/26 up) | horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 | 21/26 | keep |
| app overnight | 10% | 105.37M (22/26 up) | 92.12M (24/26 up) | horizon_hours=8 max_sell_hours=0.5 min_day_trades=5000 | 20/26 | keep |
| app dips | 10% | 6.96M (23/26 up) | 8.96M (25/26 up) | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 13/26 | keep |
| plan_flips | 50% | 111.43M (25/26 up) | 61.28M (19/26 up) | max_fill_hours=2 min_volume=5000 ask_cap=true | 23/26 | change |
| top_flips | 50% | 95.65M (25/26 up) | 39.76M (19/26 up) | max_fill_hours=2 min_volume=10000 ask_cap=true | 23/26 | keep |
| app quick | 50% | 38.72M (19/26 up) | 26.94M (20/26 up) | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | 21/26 | change |
| app overnight | 50% | 93.07M (23/26 up) | 110.94M (23/26 up) | horizon_hours=4 max_sell_hours=0.5 min_day_trades=5000 | 14/26 | keep |
| app dips | 50% | 14.86M (25/26 up) | 13.21M (25/26 up) | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 17/26 | keep |

## Folds

**plan_flips**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 09-01 to 09-03 | max_fill_hours=2 min_volume=10000 ask_cap=true | 915k | 983k | -947k | 1.44M |
| 2 | 09-03 to 09-05 | max_fill_hours=2 min_volume=10000 ask_cap=true | 1.98M | 669k | -250k | 1.06M |
| 3 | 09-05 to 09-07 | max_fill_hours=4 min_volume=50000 ask_cap=true | 2.80M | 364k | -178k | 1.72M |
| 4 | 09-07 to 09-09 | max_fill_hours=2 min_volume=5000 ask_cap=true | 3.56M | 499k | -611k | 910k |
| 5 | 09-09 to 09-11 | max_fill_hours=2 min_volume=50000 ask_cap=false | 3.56M | 231k | -411k | 975k |
| 6 | 09-11 to 09-13 | max_fill_hours=2 min_volume=5000 ask_cap=true | 3.62M | 1.57M | 110k | 1.90M |
| 7 | 09-13 to 09-15 | max_fill_hours=2 min_volume=50000 ask_cap=true | 4.18M | 115k | -1.40M | 605k |
| 8 | 09-15 to 09-17 | max_fill_hours=2 min_volume=5000 ask_cap=true | 3.38M | 1.58M | 292k | 1.58M |
| 9 | 09-17 to 09-19 | max_fill_hours=2 min_volume=5000 ask_cap=false | 4.44M | 1.24M | 583k | 1.37M |
| 10 | 09-19 to 09-21 | max_fill_hours=2 min_volume=5000 ask_cap=true | 4.33M | 1.18M | 156k | 1.65M |
| 11 | 09-21 to 09-23 | max_fill_hours=2 min_volume=5000 ask_cap=true | 4.89M | 1.08M | -1.03M | 1.08M |
| 12 | 09-23 to 09-25 | max_fill_hours=2 min_volume=5000 ask_cap=true | 4.50M | 1.19M | 669k | 1.54M |
| 13 | 09-25 to 09-27 | max_fill_hours=2 min_volume=5000 ask_cap=true | 4.62M | 1.43M | -745k | 1.53M |
| 14 | 09-27 to 09-29 | max_fill_hours=2 min_volume=50000 ask_cap=true | 4.23M | 1.61M | 586k | 1.92M |
| 15 | 09-29 to 10-01 | max_fill_hours=2 min_volume=50000 ask_cap=true | 4.88M | 497k | 232k | 2.81M |
| 16 | 10-01 to 10-03 | max_fill_hours=2 min_volume=5000 ask_cap=true | 6.10M | 9.76M | 3.50M | 11.04M |
| 17 | 10-03 to 10-05 | max_fill_hours=2 min_volume=5000 ask_cap=false | 16.15M | 8.41M | 3.31M | 8.41M |
| 18 | 10-05 to 10-07 | max_fill_hours=2 min_volume=5000 ask_cap=false | 22.78M | 7.65M | 6.88M | 11.77M |
| 19 | 10-07 to 10-09 | max_fill_hours=2 min_volume=5000 ask_cap=true | 31.07M | 4.64M | 1.58M | 5.60M |
| 20 | 10-09 to 10-11 | max_fill_hours=2 min_volume=5000 ask_cap=true | 27.48M | 12.48M | 5.95M | 13.55M |
| 21 | 10-11 to 10-13 | max_fill_hours=2 min_volume=5000 ask_cap=true | 32.95M | 6.39M | 6.28M | 15.18M |
| 22 | 10-13 to 10-15 | max_fill_hours=2 min_volume=5000 ask_cap=false | 36.47M | 10.31M | 8.95M | 17.09M |
| 23 | 10-15 to 10-17 | max_fill_hours=2 min_volume=5000 ask_cap=false | 38.77M | 9.13M | 4.04M | 11.46M |
| 24 | 10-17 to 10-19 | max_fill_hours=2 min_volume=10000 ask_cap=false | 42.30M | 9.58M | 2.68M | 9.58M |
| 25 | 10-19 to 10-21 | max_fill_hours=2 min_volume=5000 ask_cap=true | 38.33M | -1.62M | -6.74M | 915k |
| 26 | 10-21 to 10-23 | max_fill_hours=2 min_volume=10000 ask_cap=true | 25.21M | 10.67M | 5.22M | 11.50M |

**top_flips**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 09-01 to 09-03 | max_fill_hours=2 min_volume=10000 ask_cap=false | 1.61M | 947k | 1.32M | 1.76M |
| 2 | 09-03 to 09-05 | max_fill_hours=2 min_volume=25000 ask_cap=false | 2.30M | 800k | 657k | 1.89M |
| 3 | 09-05 to 09-07 | max_fill_hours=4 min_volume=10000 ask_cap=false | 3.59M | 870k | -1.06M | 2.17M |
| 4 | 09-07 to 09-09 | max_fill_hours=4 min_volume=25000 ask_cap=true | 4.60M | 635k | -6.19M | 1.13M |
| 5 | 09-09 to 09-11 | max_fill_hours=8 min_volume=25000 ask_cap=true | 4.30M | 1.27M | -2.01M | 1.28M |
| 6 | 09-11 to 09-13 | max_fill_hours=8 min_volume=25000 ask_cap=true | 4.81M | 1.60M | -688k | 1.66M |
| 7 | 09-13 to 09-15 | max_fill_hours=8 min_volume=25000 ask_cap=true | 5.17M | 381k | -1.55M | 1.94M |
| 8 | 09-15 to 09-17 | max_fill_hours=8 min_volume=50000 ask_cap=true | 4.16M | 1.09M | 1.47M | 1.84M |
| 9 | 09-17 to 09-19 | max_fill_hours=4 min_volume=1000 ask_cap=false | 5.65M | 767k | 1.03M | 1.81M |
| 10 | 09-19 to 09-21 | max_fill_hours=2 min_volume=50000 ask_cap=true | 4.66M | 1.03M | 264k | 1.15M |
| 11 | 09-21 to 09-23 | max_fill_hours=2 min_volume=5000 ask_cap=false | 4.91M | 710k | -435k | 1.70M |
| 12 | 09-23 to 09-25 | max_fill_hours=4 min_volume=50000 ask_cap=true | 4.48M | 1.45M | 867k | 2.20M |
| 13 | 09-25 to 09-27 | max_fill_hours=4 min_volume=10000 ask_cap=true | 5.26M | 924k | 29k | 1.92M |
| 14 | 09-27 to 09-29 | max_fill_hours=2 min_volume=5000 ask_cap=false | 4.38M | 2.02M | -1.45M | 2.37M |
| 15 | 09-29 to 10-01 | max_fill_hours=2 min_volume=5000 ask_cap=false | 5.65M | 2.34M | 1.52M | 4.66M |
| 16 | 10-01 to 10-03 | max_fill_hours=4 min_volume=10000 ask_cap=true | 8.16M | 7.16M | 3.67M | 10.28M |
| 17 | 10-03 to 10-05 | max_fill_hours=2 min_volume=5000 ask_cap=false | 15.41M | 7.78M | 1.50M | 7.78M |
| 18 | 10-05 to 10-07 | max_fill_hours=2 min_volume=5000 ask_cap=false | 21.23M | 8.28M | 5.59M | 11.12M |
| 19 | 10-07 to 10-09 | max_fill_hours=2 min_volume=5000 ask_cap=true | 28.34M | 1.77M | 2.41M | 4.86M |
| 20 | 10-09 to 10-11 | max_fill_hours=2 min_volume=10000 ask_cap=true | 22.85M | 12.33M | 5.60M | 12.33M |
| 21 | 10-11 to 10-13 | max_fill_hours=2 min_volume=10000 ask_cap=true | 27.92M | 5.83M | 3.70M | 14.62M |
| 22 | 10-13 to 10-15 | max_fill_hours=2 min_volume=5000 ask_cap=false | 32.15M | 8.80M | 8.20M | 14.96M |
| 23 | 10-15 to 10-17 | max_fill_hours=2 min_volume=10000 ask_cap=false | 33.12M | 7.23M | 6.55M | 9.47M |
| 24 | 10-17 to 10-19 | max_fill_hours=2 min_volume=5000 ask_cap=false | 38.45M | 8.95M | 306k | 8.95M |
| 25 | 10-19 to 10-21 | max_fill_hours=2 min_volume=5000 ask_cap=false | 33.13M | -7.29M | -13.35M | 5.50M |
| 26 | 10-21 to 10-23 | max_fill_hours=4 min_volume=5000 ask_cap=true | 20.69M | 8.08M | 2.62M | 9.53M |

**app quick**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 09-01 to 09-03 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=50000 | 2.10M | 983k | 430k | 1.80M |
| 2 | 09-03 to 09-05 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=50000 | 3.08M | 130k | -1.16M | 1.20M |
| 3 | 09-05 to 09-07 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=50000 | 2.08M | 1.61M | 214k | 2.57M |
| 4 | 09-07 to 09-09 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=25000 | 3.49M | -897k | -569k | 1.87M |
| 5 | 09-09 to 09-11 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=5000 | 3.19M | -3.17M | -2.22M | 269k |
| 6 | 09-11 to 09-13 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 | 2.36M | 450k | 1.09M | 1.33M |
| 7 | 09-13 to 09-15 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | 2.06M | -645k | 91k | 1.04M |
| 8 | 09-15 to 09-17 | horizon_hours=2 max_sell_hours=1 min_day_trades=5000 | 1.06M | 1.41M | 361k | 1.76M |
| 9 | 09-17 to 09-19 | horizon_hours=2 max_sell_hours=1 min_day_trades=5000 | 2.86M | 1.08M | 671k | 1.99M |
| 10 | 09-19 to 09-21 | horizon_hours=2 max_sell_hours=1 min_day_trades=2000 | 3.91M | 1.17M | -153k | 1.17M |
| 11 | 09-21 to 09-23 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 | 5.35M | 747k | 169k | 1.47M |
| 12 | 09-23 to 09-25 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 | 5.07M | 831k | 535k | 1.57M |
| 13 | 09-25 to 09-27 | horizon_hours=2 max_sell_hours=1 min_day_trades=2000 | 3.22M | 1.73M | 1.32M | 2.08M |
| 14 | 09-27 to 09-29 | horizon_hours=2 max_sell_hours=1 min_day_trades=2000 | 4.39M | 770k | 913k | 1.62M |
| 15 | 09-29 to 10-01 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=5000 | 5.06M | 74k | 1.55M | 2.21M |
| 16 | 10-01 to 10-03 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=10000 | 5.30M | 3.53M | 2.97M | 5.73M |
| 17 | 10-03 to 10-05 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | 9.45M | 3.21M | 2.25M | 5.01M |
| 18 | 10-05 to 10-07 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | 11.47M | 7.79M | 3.79M | 7.79M |
| 19 | 10-07 to 10-09 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | 18.17M | 2.08M | 663k | 4.51M |
| 20 | 10-09 to 10-11 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | 15.86M | 7.97M | 5.47M | 7.97M |
| 21 | 10-11 to 10-13 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | 19.55M | 10.59M | 6.38M | 11.11M |
| 22 | 10-13 to 10-15 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | 23.63M | 7.80M | 5.68M | 7.80M |
| 23 | 10-15 to 10-17 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | 26.09M | 13.68M | 9.91M | 13.68M |
| 24 | 10-17 to 10-19 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | 37.50M | 1.39M | 1.96M | 4.05M |
| 25 | 10-19 to 10-21 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | 27.29M | -16.62M | -17.35M | -3.60M |
| 26 | 10-21 to 10-23 | horizon_hours=2 max_sell_hours=1 min_day_trades=5000 | 6.46M | 373k | 4.93M | 4.93M |

**app overnight**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 09-01 to 09-03 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=5000 | 4.07M | 723k | -168k | 800k |
| 2 | 09-03 to 09-05 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=5000 | 2.87M | 773k | 804k | 2.22M |
| 3 | 09-05 to 09-07 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=5000 | 2.74M | 2.10M | 1.94M | 2.70M |
| 4 | 09-07 to 09-09 | horizon_hours=12 max_sell_hours=1 min_day_trades=50000 | 3.95M | 2.03M | 1.80M | 2.03M |
| 5 | 09-09 to 09-11 | horizon_hours=12 max_sell_hours=1 min_day_trades=50000 | 5.97M | -180k | 331k | 1.13M |
| 6 | 09-11 to 09-13 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=50000 | 4.87M | 864k | 1.13M | 1.76M |
| 7 | 09-13 to 09-15 | horizon_hours=12 max_sell_hours=1 min_day_trades=5000 | 4.77M | 381k | 218k | 1.47M |
| 8 | 09-15 to 09-17 | horizon_hours=12 max_sell_hours=2 min_day_trades=50000 | 3.88M | 690k | 809k | 1.63M |
| 9 | 09-17 to 09-19 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=2000 | 4.27M | 1.40M | 1.89M | 2.36M |
| 10 | 09-19 to 09-21 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=5000 | 4.63M | 824k | 483k | 940k |
| 11 | 09-21 to 09-23 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=2000 | 4.90M | 1.21M | 584k | 1.66M |
| 12 | 09-23 to 09-25 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 | 4.76M | 55k | -448k | 659k |
| 13 | 09-25 to 09-27 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=50000 | 3.56M | 1.23M | 993k | 1.62M |
| 14 | 09-27 to 09-29 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 | 3.56M | 1.29M | 1.34M | 1.69M |
| 15 | 09-29 to 10-01 | horizon_hours=4 max_sell_hours=1 min_day_trades=2000 | 3.62M | 3.13M | 2.58M | 3.68M |
| 16 | 10-01 to 10-03 | horizon_hours=4 max_sell_hours=2 min_day_trades=2000 | 6.26M | 7.28M | 8.96M | 9.46M |
| 17 | 10-03 to 10-05 | horizon_hours=4 max_sell_hours=1 min_day_trades=2000 | 14.87M | 10.26M | 9.55M | 10.26M |
| 18 | 10-05 to 10-07 | horizon_hours=4 max_sell_hours=1 min_day_trades=2000 | 23.49M | 10.64M | 10.55M | 13.86M |
| 19 | 10-07 to 10-09 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 | 34.71M | 4.75M | 5.28M | 5.64M |
| 20 | 10-09 to 10-11 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 | 32.02M | 2.82M | 2.61M | 3.81M |
| 21 | 10-11 to 10-13 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=10000 | 27.25M | 12.63M | 11.35M | 14.31M |
| 22 | 10-13 to 10-15 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=5000 | 29.11M | 12.20M | 12.00M | 12.59M |
| 23 | 10-15 to 10-17 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 | 28.29M | 16.63M | 16.27M | 17.10M |
| 24 | 10-17 to 10-19 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 | 46.60M | 12.22M | 12.43M | 12.98M |
| 25 | 10-19 to 10-21 | horizon_hours=4 max_sell_hours=1 min_day_trades=5000 | 49.20M | -26.44M | -11.77M | -6.44M |
| 26 | 10-21 to 10-23 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=10000 | 22.80M | 18.59M | 16.36M | 18.59M |

**app dips**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 09-01 to 09-03 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 2.29M | 708k | 486k | 713k |
| 2 | 09-03 to 09-05 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 2.21M | 523k | 908k | 978k |
| 3 | 09-05 to 09-07 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 2.57M | 654k | 496k | 654k |
| 4 | 09-07 to 09-09 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 2.67M | 905k | 835k | 957k |
| 5 | 09-09 to 09-11 | horizon_hours=8 max_sell_hours=4 min_day_trades=10000 | 2.77M | 589k | 428k | 664k |
| 6 | 09-11 to 09-13 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 2.90M | 838k | 799k | 901k |
| 7 | 09-13 to 09-15 | horizon_hours=8 max_sell_hours=4 min_day_trades=10000 | 2.73M | 281k | 197k | 324k |
| 8 | 09-15 to 09-17 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 2.23M | 504k | 422k | 504k |
| 9 | 09-17 to 09-19 | horizon_hours=8 max_sell_hours=4 min_day_trades=10000 | 2.16M | 245k | 102k | 245k |
| 10 | 09-19 to 09-21 | horizon_hours=8 max_sell_hours=4 min_day_trades=10000 | 1.48M | 631k | 463k | 655k |
| 11 | 09-21 to 09-23 | horizon_hours=8 max_sell_hours=4 min_day_trades=10000 | 1.40M | 567k | 529k | 694k |
| 12 | 09-23 to 09-25 | horizon_hours=8 max_sell_hours=4 min_day_trades=10000 | 1.90M | 1.26M | 749k | 1.29M |
| 13 | 09-25 to 09-27 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 2.59M | 504k | 607k | 825k |
| 14 | 09-27 to 09-29 | horizon_hours=8 max_sell_hours=4 min_day_trades=10000 | 3.19M | 266k | 235k | 490k |
| 15 | 09-29 to 10-01 | horizon_hours=8 max_sell_hours=4 min_day_trades=10000 | 2.72M | 421k | 344k | 458k |
| 16 | 10-01 to 10-03 | horizon_hours=8 max_sell_hours=4 min_day_trades=10000 | 2.16M | 454k | 255k | 589k |
| 17 | 10-03 to 10-05 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 1.38M | 247k | 288k | 628k |
| 18 | 10-05 to 10-07 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 1.70M | 680k | 401k | 720k |
| 19 | 10-07 to 10-09 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 2.09M | 225k | 148k | 335k |
| 20 | 10-09 to 10-11 | horizon_hours=8 max_sell_hours=1 min_day_trades=2000 | 1.96M | 545k | 295k | 636k |
| 21 | 10-11 to 10-13 | horizon_hours=8 max_sell_hours=1 min_day_trades=2000 | 2.19M | 726k | 673k | 741k |
| 22 | 10-13 to 10-15 | horizon_hours=8 max_sell_hours=1 min_day_trades=2000 | 1.92M | 339k | 263k | 517k |
| 23 | 10-15 to 10-17 | horizon_hours=8 max_sell_hours=4 min_day_trades=25000 | 2.15M | 505k | 388k | 574k |
| 24 | 10-17 to 10-19 | horizon_hours=8 max_sell_hours=2 min_day_trades=25000 | 2.11M | 838k | 592k | 1.04M |
| 25 | 10-19 to 10-21 | horizon_hours=8 max_sell_hours=2 min_day_trades=25000 | 2.25M | -1.90M | -841k | -28k |
| 26 | 10-21 to 10-23 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=5000 | 890k | 1.15M | 1.38M | 1.87M |

## Grid

- plan_flips (40): max_fill_hours {2, 4, 8, 12} x min_volume {1000, 5000, 10000, 25000, 50000} x ask_cap {true, false}
- top_flips (40): max_fill_hours {2, 4, 8, 12} x min_volume {1000, 5000, 10000, 25000, 50000} x ask_cap {true, false}
- app quick (60): horizon_hours {2, 4, 8} x max_sell_hours {0.5, 1, 2, 4} x min_day_trades {2000, 5000, 10000, 25000, 50000}
- app overnight (60): horizon_hours {4, 8, 12} x max_sell_hours {0.5, 1, 2, 4} x min_day_trades {2000, 5000, 10000, 25000, 50000}
- app dips (60): horizon_hours {2, 4, 8} x max_sell_hours {0.5, 1, 2, 4} x min_day_trades {2000, 5000, 10000, 25000, 50000}

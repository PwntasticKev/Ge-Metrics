# GE Metrics walk-forward validation

Generated 2026-06-21 19:30Z by `npm run backtest -- --walk-forward` (mcp/src/backtest/walkforward). Same simulator, fill model and no-lookahead views as the 14-day backtest (reports/backtest-2026-10-26.md).

## Setup

- History: the wiki's /1h?timestamp= (and /5m) returned full snapshots (~3,000 items) at every probe back to 730 days ago, so history is not the limit; this run uses the --days before --now (default: the last 60) plus 7 days of lookback.
- 60 days of decisions every 4h, 2026-04-20 16:00Z to 2026-06-19 16:00Z; simulation runs to 2026-06-21 18:00Z. Stack 50.00M, 8 slots, 8h buy timeout, dump after 24h, 25% queue share unless stated.
- 260 variants (grid below), each run once over the whole period. 26 folds: train 7d, then test the next 2d, step 2d. Test windows don't overlap and together cover 52 days.
- Per fold, the variant with the most profit on the training window (equity change: cash + holdings marked at the instant-sell price; ties to lower drawdown) trades the test window. The training score uses only hours that closed before the test starts (tested: rewriting everything after the split changes no choice).
- OOS = test windows only. Losing picks = OOS picks that bought anything and lost money after tax. Max DD = worst peak-to-trough of the OOS equity chained across test windows.
- Consensus = every knob at the value the folds chose most often. It is picked with all folds' training data, so its OOS line is slightly optimistic; the walk-forward line is the clean number.
- Decision-time market mood (market_breadth logic): 10 risk-on, 321 mixed, 30 risk-off.

## Out-of-sample results

| Strategy | Parameters | OOS profit | per day | Windows > 0 | Losing picks | Max DD |
|---|---|---:|---:|---:|---:|---:|
| plan_flips | walk-forward (re-tuned each fold) | 19.38M | 373k | 22/26 | 15% | 4.8% |
| | shipped default: max_fill_hours=2 min_volume=10000 ask_cap=true | 20.56M | 395k | 22/26 | 12% | 5.7% |
| | consensus: max_fill_hours=2 min_volume=5000 ask_cap=false (beat default in 13/26) | 12.52M | 241k | 21/26 | 17% | 17.3% |
| | hindsight best per window (not tradable) | 51.39M | | | | |
| top_flips | walk-forward (re-tuned each fold) | 11.47M | 221k | 19/26 | 11% | 13.8% |
| | shipped default: max_fill_hours=2 min_volume=10000 ask_cap=true | 23.06M | 444k | 23/26 | 6% | 4.5% |
| | consensus: max_fill_hours=2 min_volume=5000 ask_cap=false (beat default in 15/26) | 29.21M | 562k | 24/26 | 9% | 5.3% |
| | hindsight best per window (not tradable) | 59.33M | | | | |
| app quick | walk-forward (re-tuned each fold) | -15.96M | -307k | 12/26 | 22% | 38.3% |
| | shipped default: horizon_hours=4 max_sell_hours=1 min_day_trades=10000 | -19.55M | -376k | 10/26 | 24% | 42.1% |
| | consensus: horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 (beat default in 17/26) | -12.76M | -245k | 13/26 | 20% | 34.9% |
| | hindsight best per window (not tradable) | 34.95M | | | | |
| app overnight | walk-forward (re-tuned each fold) | 13.63M | 262k | 17/26 | 12% | 15.3% |
| | shipped default: horizon_hours=8 max_sell_hours=1 min_day_trades=10000 | 8.09M | 156k | 19/26 | 11% | 25.8% |
| | consensus: horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 (beat default in 19/26) | 25.29M | 486k | 22/26 | 10% | 9.7% |
| | hindsight best per window (not tradable) | 52.34M | | | | |
| app dips | walk-forward (re-tuned each fold) | 12.94M | 249k | 25/26 | 5% | 1.9% |
| | shipped default: horizon_hours=4 max_sell_hours=1 min_day_trades=10000 | 10.06M | 193k | 26/26 | 3% | 0.9% |
| | consensus: horizon_hours=8 max_sell_hours=4 min_day_trades=2000 (beat default in 21/26) | 13.36M | 257k | 25/26 | 6% | 1.9% |
| | hindsight best per window (not tradable) | 15.07M | | | | |

## Are the defaults robust?

Rule: change a default only if re-tuning every fold beats it OOS, the consensus variant beats it OOS in total and wins at least 60% of test windows, and each changed knob was the folds' top choice at least 50% of the time.

- **plan_flips**: keep (max_fill_hours=2 min_volume=10000 ask_cap=true). re-tuning each fold did not beat the default OOS (19.38M vs 20.56M); consensus did not beat the default OOS (12.52M vs 20.56M); won 13/26 test windows (need 60%); min_volume=5000 chosen in 65% of folds; ask_cap=false chosen in 50% of folds.
- **top_flips**: keep (max_fill_hours=2 min_volume=10000 ask_cap=true). re-tuning each fold did not beat the default OOS (11.47M vs 23.06M); consensus beat the default OOS (29.21M vs 23.06M); won 15/26 test windows (need 60%); min_volume=5000 chosen in 65% of folds; ask_cap=false chosen in 50% of folds.
- **app quick**: keep (horizon_hours=4 max_sell_hours=1 min_day_trades=10000). re-tuning each fold beat the default OOS (-15.96M vs -19.55M); consensus beat the default OOS (-12.76M vs -19.55M); won 17/26 test windows (need 60%); horizon_hours=2 chosen in 42% of folds; max_sell_hours=0.5 chosen in 62% of folds; min_day_trades=5000 chosen in 54% of folds.
- **app overnight**: keep (horizon_hours=8 max_sell_hours=1 min_day_trades=10000). re-tuning each fold beat the default OOS (13.63M vs 8.09M); consensus beat the default OOS (25.29M vs 8.09M); won 19/26 test windows (need 60%); horizon_hours=12 chosen in 65% of folds; max_sell_hours=0.5 chosen in 73% of folds; min_day_trades=5000 chosen in 31% of folds.
- **app dips**: CHANGE (horizon_hours=8 max_sell_hours=4 min_day_trades=2000). re-tuning each fold beat the default OOS (12.94M vs 10.06M); consensus beat the default OOS (13.36M vs 10.06M); won 21/26 test windows (need 60%); horizon_hours=8 chosen in 100% of folds; max_sell_hours=4 chosen in 62% of folds; min_day_trades=2000 chosen in 54% of folds.

## One knob at a time

Each knob moved alone, the others held at the shipped default and then at the consensus, scored on the same test windows (fixed parameters, not re-tuned).

**plan_flips**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | max_fill_hours | 2 (default) | 20.56M | +0 | 0/26 | 12% |
| default | max_fill_hours | 4 | 3.45M | -17.10M | 5/26 | 19% |
| default | max_fill_hours | 8 | -13.04M | -33.59M | 4/26 | 32% |
| default | max_fill_hours | 12 | -14.88M | -35.44M | 3/26 | 35% |
| default | min_volume | 1000 | 7.81M | -12.74M | 8/26 | 15% |
| default | min_volume | 5000 | 22.02M | +1.47M | 12/26 | 13% |
| default | min_volume | 10000 (default) | 20.56M | +0 | 0/26 | 12% |
| default | min_volume | 25000 | 19.11M | -1.44M | 12/26 | 12% |
| default | min_volume | 50000 | 18.09M | -2.46M | 8/26 | 12% |
| default | ask_cap | true (default) | 20.56M | +0 | 0/26 | 12% |
| default | ask_cap | false | 12.04M | -8.51M | 9/26 | 16% |
| consensus | max_fill_hours | 2 (consensus) | 12.52M | -8.04M | 13/26 | 17% |
| consensus | max_fill_hours | 4 | -14.32M | -34.87M | 4/26 | 27% |
| consensus | max_fill_hours | 8 | -28.22M | -48.78M | 4/26 | 40% |
| consensus | max_fill_hours | 12 | -30.43M | -50.99M | 2/26 | 44% |
| consensus | min_volume | 1000 | -2.47M | -23.03M | 9/26 | 17% |
| consensus | min_volume | 5000 (consensus) | 12.52M | -8.04M | 13/26 | 17% |
| consensus | min_volume | 10000 | 12.04M | -8.51M | 9/26 | 16% |
| consensus | min_volume | 25000 | 5.09M | -15.47M | 9/26 | 16% |
| consensus | min_volume | 50000 | 5.53M | -15.03M | 9/26 | 16% |
| consensus | ask_cap | true | 22.02M | +1.47M | 12/26 | 13% |
| consensus | ask_cap | false (consensus) | 12.52M | -8.04M | 13/26 | 17% |

**top_flips**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | max_fill_hours | 2 (default) | 23.06M | +0 | 0/26 | 6% |
| default | max_fill_hours | 4 | 20.19M | -2.87M | 16/26 | 9% |
| default | max_fill_hours | 8 | 15.06M | -8.00M | 11/26 | 11% |
| default | max_fill_hours | 12 | -6.33M | -29.39M | 9/26 | 14% |
| default | min_volume | 1000 | 13.93M | -9.13M | 8/26 | 8% |
| default | min_volume | 5000 | 26.79M | +3.73M | 20/26 | 6% |
| default | min_volume | 10000 (default) | 23.06M | +0 | 0/26 | 6% |
| default | min_volume | 25000 | 21.05M | -2.02M | 10/26 | 6% |
| default | min_volume | 50000 | 21.48M | -1.59M | 10/26 | 6% |
| default | ask_cap | true (default) | 23.06M | +0 | 0/26 | 6% |
| default | ask_cap | false | 17.24M | -5.83M | 11/26 | 9% |
| consensus | max_fill_hours | 2 (consensus) | 29.21M | +6.14M | 15/26 | 9% |
| consensus | max_fill_hours | 4 | 7.53M | -15.53M | 12/26 | 11% |
| consensus | max_fill_hours | 8 | -6.74M | -29.81M | 7/26 | 15% |
| consensus | max_fill_hours | 12 | -18.35M | -41.41M | 10/26 | 16% |
| consensus | min_volume | 1000 | 3.55M | -19.51M | 7/26 | 12% |
| consensus | min_volume | 5000 (consensus) | 29.21M | +6.14M | 15/26 | 9% |
| consensus | min_volume | 10000 | 17.24M | -5.83M | 11/26 | 9% |
| consensus | min_volume | 25000 | 18.41M | -4.66M | 11/26 | 8% |
| consensus | min_volume | 50000 | 18.84M | -4.22M | 11/26 | 8% |
| consensus | ask_cap | true | 26.79M | +3.73M | 20/26 | 6% |
| consensus | ask_cap | false (consensus) | 29.21M | +6.14M | 15/26 | 9% |

**app quick**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | horizon_hours | 2 | -14.86M | +4.70M | 18/26 | 20% |
| default | horizon_hours | 4 (default) | -19.55M | +0 | 0/26 | 24% |
| default | horizon_hours | 8 | -15.70M | +3.86M | 13/26 | 24% |
| default | max_sell_hours | 0.5 | -13.77M | +5.79M | 18/26 | 18% |
| default | max_sell_hours | 1 (default) | -19.55M | +0 | 0/26 | 24% |
| default | max_sell_hours | 2 | -21.58M | -2.03M | 9/26 | 31% |
| default | max_sell_hours | 4 | -24.18M | -4.63M | 8/26 | 38% |
| default | min_day_trades | 2000 | -20.55M | -998k | 13/26 | 26% |
| default | min_day_trades | 5000 | -22.68M | -3.13M | 18/26 | 25% |
| default | min_day_trades | 10000 (default) | -19.55M | +0 | 0/26 | 24% |
| default | min_day_trades | 25000 | -19.03M | +520k | 11/26 | 24% |
| default | min_day_trades | 50000 | -15.93M | +3.62M | 11/26 | 22% |
| consensus | horizon_hours | 2 (consensus) | -12.76M | +6.80M | 17/26 | 20% |
| consensus | horizon_hours | 4 | -15.48M | +4.07M | 17/26 | 18% |
| consensus | horizon_hours | 8 | -16.95M | +2.60M | 15/26 | 19% |
| consensus | max_sell_hours | 0.5 (consensus) | -12.76M | +6.80M | 17/26 | 20% |
| consensus | max_sell_hours | 1 | -16.77M | +2.79M | 18/26 | 22% |
| consensus | max_sell_hours | 2 | -21.74M | -2.18M | 11/26 | 28% |
| consensus | max_sell_hours | 4 | -21.74M | -2.18M | 11/26 | 28% |
| consensus | min_day_trades | 2000 | -22.57M | -3.01M | 17/26 | 20% |
| consensus | min_day_trades | 5000 (consensus) | -12.76M | +6.80M | 17/26 | 20% |
| consensus | min_day_trades | 10000 | -7.01M | +12.54M | 18/26 | 19% |
| consensus | min_day_trades | 25000 | -7.95M | +11.60M | 20/26 | 19% |
| consensus | min_day_trades | 50000 | -6.01M | +13.54M | 20/26 | 18% |

**app overnight**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | horizon_hours | 4 | 5.89M | -2.20M | 14/26 | 11% |
| default | horizon_hours | 8 (default) | 8.09M | +0 | 0/26 | 11% |
| default | horizon_hours | 12 | 5.48M | -2.62M | 11/26 | 11% |
| default | max_sell_hours | 0.5 | 25.45M | +17.36M | 21/26 | 9% |
| default | max_sell_hours | 1 (default) | 8.09M | +0 | 0/26 | 11% |
| default | max_sell_hours | 2 | 4.66M | -3.43M | 13/26 | 13% |
| default | max_sell_hours | 4 | -12.11M | -20.21M | 8/26 | 20% |
| default | min_day_trades | 2000 | 7.80M | -296k | 15/26 | 13% |
| default | min_day_trades | 5000 | 10.43M | +2.33M | 14/26 | 12% |
| default | min_day_trades | 10000 (default) | 8.09M | +0 | 0/26 | 11% |
| default | min_day_trades | 25000 | 233k | -7.86M | 9/26 | 11% |
| default | min_day_trades | 50000 | -1.07M | -9.16M | 6/26 | 10% |
| consensus | horizon_hours | 4 | 23.52M | +15.43M | 21/26 | 10% |
| consensus | horizon_hours | 8 | 26.86M | +18.76M | 19/26 | 9% |
| consensus | horizon_hours | 12 (consensus) | 25.29M | +17.20M | 19/26 | 10% |
| consensus | max_sell_hours | 0.5 (consensus) | 25.29M | +17.20M | 19/26 | 10% |
| consensus | max_sell_hours | 1 | 7.57M | -523k | 13/26 | 12% |
| consensus | max_sell_hours | 2 | -5.49M | -13.59M | 9/26 | 15% |
| consensus | max_sell_hours | 4 | -14.86M | -22.95M | 6/26 | 21% |
| consensus | min_day_trades | 2000 | 25.13M | +17.04M | 18/26 | 11% |
| consensus | min_day_trades | 5000 (consensus) | 25.29M | +17.20M | 19/26 | 10% |
| consensus | min_day_trades | 10000 | 28.15M | +20.06M | 20/26 | 9% |
| consensus | min_day_trades | 25000 | 14.59M | +6.50M | 14/26 | 8% |
| consensus | min_day_trades | 50000 | 14.24M | +6.14M | 14/26 | 8% |

**app dips**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | horizon_hours | 2 | 7.47M | -2.59M | 0/26 | 3% |
| default | horizon_hours | 4 (default) | 10.06M | +0 | 0/26 | 3% |
| default | horizon_hours | 8 | 11.61M | +1.55M | 23/26 | 3% |
| default | max_sell_hours | 0.5 | 8.84M | -1.22M | 3/26 | 3% |
| default | max_sell_hours | 1 (default) | 10.06M | +0 | 0/26 | 3% |
| default | max_sell_hours | 2 | 10.41M | +348k | 20/26 | 4% |
| default | max_sell_hours | 4 | 10.37M | +316k | 16/26 | 4% |
| default | min_day_trades | 2000 | 10.72M | +663k | 16/26 | 5% |
| default | min_day_trades | 5000 | 10.40M | +338k | 15/26 | 4% |
| default | min_day_trades | 10000 (default) | 10.06M | +0 | 0/26 | 3% |
| default | min_day_trades | 25000 | 9.33M | -724k | 6/26 | 3% |
| default | min_day_trades | 50000 | 8.79M | -1.27M | 4/26 | 4% |
| consensus | horizon_hours | 2 | 7.75M | -2.31M | 2/26 | 5% |
| consensus | horizon_hours | 4 | 10.89M | +828k | 16/26 | 5% |
| consensus | horizon_hours | 8 (consensus) | 13.36M | +3.30M | 21/26 | 6% |
| consensus | max_sell_hours | 0.5 | 9.77M | -287k | 13/26 | 4% |
| consensus | max_sell_hours | 1 | 12.29M | +2.24M | 22/26 | 5% |
| consensus | max_sell_hours | 2 | 13.32M | +3.26M | 21/26 | 6% |
| consensus | max_sell_hours | 4 (consensus) | 13.36M | +3.30M | 21/26 | 6% |
| consensus | min_day_trades | 2000 (consensus) | 13.36M | +3.30M | 21/26 | 6% |
| consensus | min_day_trades | 5000 | 12.87M | +2.81M | 22/26 | 6% |
| consensus | min_day_trades | 10000 | 12.50M | +2.44M | 23/26 | 5% |
| consensus | min_day_trades | 25000 | 11.27M | +1.21M | 17/26 | 5% |
| consensus | min_day_trades | 50000 | 11.11M | +1.05M | 17/26 | 4% |

## Parameter stability across folds

| Strategy | Knob | Default | Folds choosing each value (* = default) | Top share |
|---|---|---|---|---:|
| plan_flips | max_fill_hours | 2 | 2*: 26 | 100% |
| plan_flips | min_volume | 10000 | 5000: 17, 10000*: 5, 25000: 2, 1000: 2 | 65% |
| plan_flips | ask_cap | true | false: 13, true*: 13 | 50% |
| top_flips | max_fill_hours | 2 | 2*: 14, 4: 8, 8: 4 | 54% |
| top_flips | min_volume | 10000 | 5000: 17, 1000: 5, 50000: 3, 10000*: 1 | 65% |
| top_flips | ask_cap | true | false: 13, true*: 13 | 50% |
| app quick | horizon_hours | 4 | 2: 11, 8: 9, 4*: 6 | 42% |
| app quick | max_sell_hours | 1 | 0.5: 16, 1*: 4, 4: 3, 2: 3 | 62% |
| app quick | min_day_trades | 10000 | 5000: 14, 2000: 7, 25000: 2, 50000: 2, 10000*: 1 | 54% |
| app overnight | horizon_hours | 8 | 12: 17, 8*: 7, 4: 2 | 65% |
| app overnight | max_sell_hours | 1 | 0.5: 19, 4: 3, 1*: 2, 2: 2 | 73% |
| app overnight | min_day_trades | 10000 | 5000: 8, 2000: 8, 10000*: 6, 25000: 2, 50000: 2 | 31% |
| app dips | horizon_hours | 4 | 8: 26 | 100% |
| app dips | max_sell_hours | 1 | 4: 16, 2: 7, 1*: 3 | 62% |
| app dips | min_day_trades | 10000 | 2000: 14, 5000: 7, 10000*: 4, 50000: 1 | 54% |

- plan_flips: shipped default ranked median 4 of 40 on the training windows (best 1, worst 10).
- top_flips: shipped default ranked median 11 of 40 on the training windows (best 2, worst 29).
- app quick: shipped default ranked median 38 of 60 on the training windows (best 7, worst 57).
- app overnight: shipped default ranked median 25 of 60 on the training windows (best 3, worst 39).
- app dips: shipped default ranked median 24 of 60 on the training windows (best 11, worst 32).

## Regime split (risk-on vs risk-off decisions)

Realized profit of OOS picks grouped by the market mood at the decision that placed them.

| Strategy | Mood at decision | Decisions | WF picks | WF realized | WF losing | Default picks | Default realized | Default losing |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| plan_flips | risk-on | 9 | 30 | -609k | 14% | 35 | 1.49M | 9% |
| plan_flips | mixed | 273 | 933 | 19.41M | 15% | 973 | 20.11M | 12% |
| plan_flips | risk-off | 30 | 80 | -58k | 15% | 98 | -1.22M | 21% |
| top_flips | risk-on | 9 | 31 | 16k | 11% | 38 | 1.63M | 6% |
| top_flips | mixed | 273 | 971 | 14.66M | 11% | 1113 | 21.70M | 6% |
| top_flips | risk-off | 30 | 92 | -1.09M | 10% | 107 | -478k | 11% |
| app quick | risk-on | 9 | 32 | -233k | 26% | 27 | -380k | 32% |
| app quick | mixed | 273 | 810 | -12.39M | 21% | 724 | -15.15M | 23% |
| app quick | risk-off | 30 | 80 | -5.78M | 29% | 87 | -4.73M | 28% |
| app overnight | risk-on | 9 | 36 | -641k | 20% | 41 | 374k | 15% |
| app overnight | mixed | 273 | 990 | 14.12M | 11% | 974 | 6.79M | 11% |
| app overnight | risk-off | 30 | 107 | -933k | 13% | 102 | 1.42M | 13% |
| app dips | risk-on | 9 | 23 | 392k | 0% | 28 | 377k | 0% |
| app dips | mixed | 273 | 796 | 11.25M | 6% | 876 | 8.94M | 4% |
| app dips | risk-off | 30 | 93 | 1.20M | 5% | 94 | 742k | 4% |

## Sensitivity: queue share and dump-after hours

OOS profit over the same test windows for the shipped default and the consensus variant, re-simulated with a different simulator queue share or max hold (parameters not re-tuned).

| Strategy | Variant | queue share 10% | queue share 25% | queue share 50% | dump after 12h | dump after 48h |
|---|---|---:|---:|---:|---:|---:|
| plan_flips | default | 16.89M (14% lose, 22/26 up) | 20.56M (12% lose, 22/26 up) | 20.70M (12% lose, 21/26 up) | 10.89M (19% lose, 20/26 up) | 15.61M (9% lose, 22/26 up) |
| plan_flips | consensus | 15.38M (17% lose, 22/26 up) | 12.52M (17% lose, 21/26 up) | 14.70M (17% lose, 22/26 up) | 2.37M (24% lose, 18/26 up) | 7.13M (13% lose, 18/26 up) |
| top_flips | default | 20.38M (8% lose, 23/26 up) | 23.06M (6% lose, 23/26 up) | 23.09M (6% lose, 23/26 up) | 16.48M (11% lose, 23/26 up) | 19.15M (4% lose, 22/26 up) |
| top_flips | consensus | 27.06M (9% lose, 24/26 up) | 29.21M (9% lose, 24/26 up) | 32.64M (8% lose, 24/26 up) | 11.69M (15% lose, 20/26 up) | 14.89M (7% lose, 21/26 up) |
| app quick | default | -18.64M (26% lose, 6/26 up) | -19.55M (24% lose, 10/26 up) | -19.80M (23% lose, 8/26 up) | -21.79M (30% lose, 3/26 up) | -16.51M (21% lose, 10/26 up) |
| app quick | consensus | -12.15M (21% lose, 13/26 up) | -12.76M (20% lose, 13/26 up) | -10.40M (18% lose, 15/26 up) | -10.93M (24% lose, 11/26 up) | 164k (15% lose, 17/26 up) |
| app overnight | default | -1.00M (13% lose, 19/26 up) | 8.09M (11% lose, 19/26 up) | 7.72M (11% lose, 18/26 up) | 1.62M (17% lose, 17/26 up) | 9.33M (8% lose, 19/26 up) |
| app overnight | consensus | 21.46M (11% lose, 21/26 up) | 25.29M (10% lose, 22/26 up) | 28.40M (9% lose, 21/26 up) | 17.43M (15% lose, 20/26 up) | 24.90M (7% lose, 20/26 up) |
| app dips | default | 8.39M (3% lose, 26/26 up) | 10.06M (3% lose, 26/26 up) | 11.14M (3% lose, 26/26 up) | 9.54M (8% lose, 26/26 up) | 9.95M (2% lose, 26/26 up) |
| app dips | consensus | 10.05M (9% lose, 25/26 up) | 13.36M (6% lose, 25/26 up) | 16.45M (6% lose, 26/26 up) | 11.70M (12% lose, 25/26 up) | 12.79M (4% lose, 25/26 up) |

The whole walk-forward re-run (grid re-tuned per fold) under other queue shares:

| Strategy | Queue share | WF OOS | Default OOS | Consensus | Consensus beat default | Rule says |
|---|---:|---:|---:|---|---:|---|
| plan_flips | 10% | 12.71M (19/26 up) | 16.89M (22/26 up) | max_fill_hours=2 min_volume=5000 ask_cap=false | 15/26 | keep |
| top_flips | 10% | 21.14M (23/26 up) | 20.38M (23/26 up) | max_fill_hours=2 min_volume=5000 ask_cap=false | 17/26 | change |
| app quick | 10% | -10.47M (11/26 up) | -18.64M (6/26 up) | horizon_hours=8 max_sell_hours=0.5 min_day_trades=5000 | 15/26 | keep |
| app overnight | 10% | 11.63M (18/26 up) | -1.00M (19/26 up) | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 | 18/26 | keep |
| app dips | 10% | 10.16M (25/26 up) | 8.39M (26/26 up) | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 17/26 | keep |
| plan_flips | 50% | 18.22M (21/26 up) | 20.70M (21/26 up) | max_fill_hours=2 min_volume=5000 ask_cap=false | 16/26 | keep |
| top_flips | 50% | 21.99M (20/26 up) | 23.09M (23/26 up) | max_fill_hours=4 min_volume=5000 ask_cap=false | 13/26 | keep |
| app quick | 50% | -11.42M (13/26 up) | -19.80M (8/26 up) | horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 | 20/26 | keep |
| app overnight | 50% | 18.05M (19/26 up) | 7.72M (18/26 up) | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 | 20/26 | keep |
| app dips | 50% | 16.10M (26/26 up) | 11.14M (26/26 up) | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 23/26 | change |

## Folds

**plan_flips**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 04-27 to 04-29 | max_fill_hours=2 min_volume=5000 ask_cap=false | 3.67M | 2.44M | 1.43M | 2.44M |
| 2 | 04-29 to 05-01 | max_fill_hours=2 min_volume=5000 ask_cap=false | 5.49M | 367k | 717k | 1.11M |
| 3 | 05-01 to 05-03 | max_fill_hours=2 min_volume=5000 ask_cap=true | 4.43M | 822k | 841k | 1.90M |
| 4 | 05-03 to 05-05 | max_fill_hours=2 min_volume=5000 ask_cap=false | 4.37M | 989k | 1.20M | 2.30M |
| 5 | 05-05 to 05-07 | max_fill_hours=2 min_volume=10000 ask_cap=true | 3.34M | 1.52M | 1.52M | 2.89M |
| 6 | 05-07 to 05-09 | max_fill_hours=2 min_volume=5000 ask_cap=false | 4.98M | 569k | 573k | 953k |
| 7 | 05-09 to 05-11 | max_fill_hours=2 min_volume=5000 ask_cap=false | 4.79M | 684k | 852k | 852k |
| 8 | 05-11 to 05-13 | max_fill_hours=2 min_volume=5000 ask_cap=false | 4.94M | 759k | 485k | 836k |
| 9 | 05-13 to 05-15 | max_fill_hours=2 min_volume=5000 ask_cap=true | 3.70M | 1.12M | 1.09M | 2.39M |
| 10 | 05-15 to 05-17 | max_fill_hours=2 min_volume=5000 ask_cap=true | 3.31M | 257k | 432k | 590k |
| 11 | 05-17 to 05-19 | max_fill_hours=2 min_volume=5000 ask_cap=false | 2.71M | 2.23M | 1.92M | 2.23M |
| 12 | 05-19 to 05-21 | max_fill_hours=2 min_volume=5000 ask_cap=false | 4.34M | 406k | -307k | 428k |
| 13 | 05-21 to 05-23 | max_fill_hours=2 min_volume=5000 ask_cap=false | 3.51M | -91k | -464k | 2.54M |
| 14 | 05-23 to 05-25 | max_fill_hours=2 min_volume=5000 ask_cap=true | 3.04M | -522k | 206k | 206k |
| 15 | 05-25 to 05-27 | max_fill_hours=2 min_volume=5000 ask_cap=true | 1.64M | 708k | 1.02M | 1.36M |
| 16 | 05-27 to 05-29 | max_fill_hours=2 min_volume=10000 ask_cap=true | 859k | 182k | 182k | 394k |
| 17 | 05-29 to 05-31 | max_fill_hours=2 min_volume=10000 ask_cap=true | 2.33M | 2.71M | 2.71M | 2.81M |
| 18 | 05-31 to 06-02 | max_fill_hours=2 min_volume=10000 ask_cap=true | 2.49M | 1.19M | 1.19M | 1.19M |
| 19 | 06-02 to 06-04 | max_fill_hours=2 min_volume=10000 ask_cap=true | 4.43M | 995k | 995k | 1.70M |
| 20 | 06-04 to 06-06 | max_fill_hours=2 min_volume=5000 ask_cap=false | 6.30M | -238k | -23k | 1.83M |
| 21 | 06-06 to 06-08 | max_fill_hours=2 min_volume=5000 ask_cap=false | 4.37M | 599k | 1.49M | 1.79M |
| 22 | 06-08 to 06-10 | max_fill_hours=2 min_volume=25000 ask_cap=true | 4.00M | 944k | 1.60M | 1.60M |
| 23 | 06-10 to 06-12 | max_fill_hours=2 min_volume=25000 ask_cap=true | 4.04M | 1.30M | 1.27M | 5.94M |
| 24 | 06-12 to 06-14 | max_fill_hours=2 min_volume=5000 ask_cap=false | 5.08M | 699k | 1.07M | 7.07M |
| 25 | 06-14 to 06-16 | max_fill_hours=2 min_volume=1000 ask_cap=false | 10.31M | 1.29M | 482k | 3.00M |
| 26 | 06-16 to 06-18 | max_fill_hours=2 min_volume=1000 ask_cap=true | 12.19M | -2.55M | -1.92M | 1.03M |

**top_flips**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 04-27 to 04-29 | max_fill_hours=4 min_volume=1000 ask_cap=false | 4.77M | 1.79M | 1.22M | 3.79M |
| 2 | 04-29 to 05-01 | max_fill_hours=2 min_volume=1000 ask_cap=false | 7.25M | -1.78M | 646k | 1.05M |
| 3 | 05-01 to 05-03 | max_fill_hours=2 min_volume=5000 ask_cap=false | 5.79M | 821k | 837k | 2.18M |
| 4 | 05-03 to 05-05 | max_fill_hours=8 min_volume=5000 ask_cap=true | 5.87M | -362k | 1.22M | 1.22M |
| 5 | 05-05 to 05-07 | max_fill_hours=8 min_volume=10000 ask_cap=true | 3.54M | 756k | 952k | 3.71M |
| 6 | 05-07 to 05-09 | max_fill_hours=2 min_volume=5000 ask_cap=false | 4.92M | 297k | 650k | 1.14M |
| 7 | 05-09 to 05-11 | max_fill_hours=4 min_volume=5000 ask_cap=false | 5.27M | 451k | 933k | 1.12M |
| 8 | 05-11 to 05-13 | max_fill_hours=4 min_volume=5000 ask_cap=false | 5.82M | 758k | 516k | 1.99M |
| 9 | 05-13 to 05-15 | max_fill_hours=4 min_volume=5000 ask_cap=true | 4.48M | 1.18M | 904k | 2.56M |
| 10 | 05-15 to 05-17 | max_fill_hours=8 min_volume=5000 ask_cap=false | 4.03M | -650k | 1.06M | 1.19M |
| 11 | 05-17 to 05-19 | max_fill_hours=2 min_volume=5000 ask_cap=true | 3.25M | 1.96M | 1.53M | 2.04M |
| 12 | 05-19 to 05-21 | max_fill_hours=2 min_volume=5000 ask_cap=true | 4.94M | 601k | 472k | 1.06M |
| 13 | 05-21 to 05-23 | max_fill_hours=2 min_volume=5000 ask_cap=true | 4.05M | -486k | -509k | 2.13M |
| 14 | 05-23 to 05-25 | max_fill_hours=2 min_volume=5000 ask_cap=false | 4.02M | 1.09M | 1.67M | 2.07M |
| 15 | 05-25 to 05-27 | max_fill_hours=2 min_volume=1000 ask_cap=false | 3.68M | -6.50M | 1.39M | 1.75M |
| 16 | 05-27 to 05-29 | max_fill_hours=2 min_volume=5000 ask_cap=false | 3.19M | 783k | 598k | 1.39M |
| 17 | 05-29 to 05-31 | max_fill_hours=2 min_volume=5000 ask_cap=false | 5.05M | 2.80M | 2.30M | 2.85M |
| 18 | 05-31 to 06-02 | max_fill_hours=2 min_volume=5000 ask_cap=true | 4.63M | 1.64M | 1.51M | 1.64M |
| 19 | 06-02 to 06-04 | max_fill_hours=2 min_volume=5000 ask_cap=true | 5.60M | 1.73M | 1.47M | 1.73M |
| 20 | 06-04 to 06-06 | max_fill_hours=2 min_volume=5000 ask_cap=true | 6.28M | -463k | -713k | 1.71M |
| 21 | 06-06 to 06-08 | max_fill_hours=4 min_volume=50000 ask_cap=true | 5.12M | 1.82M | 1.28M | 1.92M |
| 22 | 06-08 to 06-10 | max_fill_hours=4 min_volume=50000 ask_cap=true | 4.51M | 1.40M | 1.97M | 2.13M |
| 23 | 06-10 to 06-12 | max_fill_hours=4 min_volume=50000 ask_cap=true | 5.59M | 1.18M | 582k | 5.94M |
| 24 | 06-12 to 06-14 | max_fill_hours=4 min_volume=5000 ask_cap=false | 6.68M | 426k | 768k | 6.08M |
| 25 | 06-14 to 06-16 | max_fill_hours=2 min_volume=1000 ask_cap=false | 8.26M | 644k | 1.37M | 3.53M |
| 26 | 06-16 to 06-18 | max_fill_hours=8 min_volume=1000 ask_cap=true | 11.22M | -407k | -1.57M | 1.44M |

**app quick**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 04-27 to 04-29 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 | 2.63M | 1.65M | -523k | 1.65M |
| 2 | 04-29 to 05-01 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 | 2.70M | 562k | -400k | 1.91M |
| 3 | 05-01 to 05-03 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 | 3.13M | 193k | -1.13M | 469k |
| 4 | 05-03 to 05-05 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 | 2.60M | -528k | -1.82M | 282k |
| 5 | 05-05 to 05-07 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=5000 | 1.11M | 2.18M | 1.24M | 2.18M |
| 6 | 05-07 to 05-09 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=5000 | 2.75M | 811k | 820k | 1.62M |
| 7 | 05-09 to 05-11 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=5000 | 3.42M | -34k | -809k | 879k |
| 8 | 05-11 to 05-13 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=2000 | 3.21M | -917k | -763k | 1.44M |
| 9 | 05-13 to 05-15 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=5000 | 3.38M | 402k | -146k | 1.20M |
| 10 | 05-15 to 05-17 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=25000 | 2.96M | -1.47M | -2.06M | 743k |
| 11 | 05-17 to 05-19 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=25000 | 1.58M | -913k | -1.35M | 1.04M |
| 12 | 05-19 to 05-21 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 | 683k | 543k | -2.35M | 543k |
| 13 | 05-21 to 05-23 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 | 684k | -1.25M | 1.24M | 2.54M |
| 14 | 05-23 to 05-25 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 | 694k | -340k | 457k | 2.75M |
| 15 | 05-25 to 05-27 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 2.41M | -9.04M | -6.90M | 336k |
| 16 | 05-27 to 05-29 | horizon_hours=4 max_sell_hours=4 min_day_trades=5000 | 1.01M | -3.84M | -3.57M | -1.58M |
| 17 | 05-29 to 05-31 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=2000 | -3.15M | 711k | 403k | 1.78M |
| 18 | 05-31 to 06-02 | horizon_hours=8 max_sell_hours=2 min_day_trades=5000 | -4.15M | -339k | -961k | 1.00M |
| 19 | 06-02 to 06-04 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | -1.92M | -459k | 762k | 1.06M |
| 20 | 06-04 to 06-06 | horizon_hours=2 max_sell_hours=1 min_day_trades=5000 | 2.43M | -1.44M | 196k | 2.43M |
| 21 | 06-06 to 06-08 | horizon_hours=2 max_sell_hours=2 min_day_trades=50000 | 1.56M | 378k | 122k | 994k |
| 22 | 06-08 to 06-10 | horizon_hours=4 max_sell_hours=2 min_day_trades=2000 | 1.91M | 453k | -1.97M | 781k |
| 23 | 06-10 to 06-12 | horizon_hours=8 max_sell_hours=4 min_day_trades=50000 | 1.84M | -5k | 22k | 4.92M |
| 24 | 06-12 to 06-14 | horizon_hours=8 max_sell_hours=1 min_day_trades=2000 | 3.89M | 567k | -428k | 1.68M |
| 25 | 06-14 to 06-16 | horizon_hours=8 max_sell_hours=1 min_day_trades=2000 | 4.80M | 509k | 539k | 1.56M |
| 26 | 06-16 to 06-18 | horizon_hours=8 max_sell_hours=1 min_day_trades=2000 | 5.21M | -4.34M | -175k | 743k |

**app overnight**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 04-27 to 04-29 | horizon_hours=4 max_sell_hours=1 min_day_trades=5000 | 9.69M | 1.41M | 550k | 2.15M |
| 2 | 04-29 to 05-01 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=2000 | 6.65M | 1.03M | 1.62M | 2.44M |
| 3 | 05-01 to 05-03 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=2000 | 5.54M | 249k | 395k | 1.31M |
| 4 | 05-03 to 05-05 | horizon_hours=12 max_sell_hours=4 min_day_trades=5000 | 5.21M | -663k | -291k | 1.60M |
| 5 | 05-05 to 05-07 | horizon_hours=12 max_sell_hours=4 min_day_trades=10000 | 3.30M | 1.27M | 2.92M | 5.54M |
| 6 | 05-07 to 05-09 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 8.70M | 2.51M | 1.74M | 2.51M |
| 7 | 05-09 to 05-11 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 9.32M | -97k | 639k | 1.43M |
| 8 | 05-11 to 05-13 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=5000 | 9.42M | 742k | 417k | 1.12M |
| 9 | 05-13 to 05-15 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=5000 | 6.25M | 3.20M | 2.23M | 3.42M |
| 10 | 05-15 to 05-17 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=5000 | 6.05M | 1.09M | 1.11M | 1.40M |
| 11 | 05-17 to 05-19 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=5000 | 5.80M | 2.07M | 875k | 2.07M |
| 12 | 05-19 to 05-21 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=5000 | 6.68M | 175k | -738k | 565k |
| 13 | 05-21 to 05-23 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=2000 | 4.67M | -3.55M | -3.27M | 130k |
| 14 | 05-23 to 05-25 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=25000 | 1.53M | 1.19M | 1.30M | 2.33M |
| 15 | 05-25 to 05-27 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=25000 | 2.10M | -4.56M | -8.56M | 954k |
| 16 | 05-27 to 05-29 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=10000 | 331k | -161k | -2.23M | 353k |
| 17 | 05-29 to 05-31 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=10000 | 2.38M | 2.17M | 1.83M | 2.42M |
| 18 | 05-31 to 06-02 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=10000 | 2.30M | 3.83M | 2.96M | 3.83M |
| 19 | 06-02 to 06-04 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=10000 | 5.67M | 1.31M | 642k | 1.59M |
| 20 | 06-04 to 06-06 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=5000 | 8.02M | -4.09M | -408k | 1.37M |
| 21 | 06-06 to 06-08 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=10000 | 4.85M | 2.43M | 1.54M | 2.93M |
| 22 | 06-08 to 06-10 | horizon_hours=12 max_sell_hours=4 min_day_trades=2000 | 5.24M | -1.45M | 206k | 1.39M |
| 23 | 06-10 to 06-12 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=50000 | 3.51M | 1.46M | 972k | 1.82M |
| 24 | 06-12 to 06-14 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=50000 | 4.05M | -179k | -1.33M | 3.27M |
| 25 | 06-14 to 06-16 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=2000 | 4.96M | 2.75M | 2.66M | 3.45M |
| 26 | 06-16 to 06-18 | horizon_hours=12 max_sell_hours=1 min_day_trades=2000 | 6.71M | -498k | 323k | 952k |

**app dips**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 04-27 to 04-29 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 1.67M | -44k | 154k | 212k |
| 2 | 04-29 to 05-01 | horizon_hours=8 max_sell_hours=4 min_day_trades=50000 | 1.32M | 321k | 307k | 405k |
| 3 | 05-01 to 05-03 | horizon_hours=8 max_sell_hours=1 min_day_trades=10000 | 993k | 428k | 303k | 558k |
| 4 | 05-03 to 05-05 | horizon_hours=8 max_sell_hours=1 min_day_trades=2000 | 1.23M | 351k | 264k | 376k |
| 5 | 05-05 to 05-07 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 1.20M | 497k | 427k | 521k |
| 6 | 05-07 to 05-09 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 1.57M | 427k | 472k | 557k |
| 7 | 05-09 to 05-11 | horizon_hours=8 max_sell_hours=2 min_day_trades=10000 | 1.90M | 735k | 544k | 919k |
| 8 | 05-11 to 05-13 | horizon_hours=8 max_sell_hours=2 min_day_trades=5000 | 2.01M | 518k | 405k | 544k |
| 9 | 05-13 to 05-15 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 2.19M | 936k | 628k | 936k |
| 10 | 05-15 to 05-17 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 2.73M | 423k | 368k | 433k |
| 11 | 05-17 to 05-19 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 2.23M | 687k | 439k | 727k |
| 12 | 05-19 to 05-21 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 2.32M | 1.01M | 597k | 1.01M |
| 13 | 05-21 to 05-23 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 2.72M | 312k | 286k | 352k |
| 14 | 05-23 to 05-25 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 2.24M | 370k | 320k | 452k |
| 15 | 05-25 to 05-27 | horizon_hours=8 max_sell_hours=4 min_day_trades=10000 | 1.93M | 362k | 260k | 636k |
| 16 | 05-27 to 05-29 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 2.11M | 152k | 223k | 343k |
| 17 | 05-29 to 05-31 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 1.38M | 736k | 674k | 857k |
| 18 | 05-31 to 06-02 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 1.86M | 487k | 231k | 524k |
| 19 | 06-02 to 06-04 | horizon_hours=8 max_sell_hours=4 min_day_trades=10000 | 1.64M | 234k | 310k | 359k |
| 20 | 06-04 to 06-06 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 1.65M | 535k | 266k | 535k |
| 21 | 06-06 to 06-08 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 1.91M | 519k | 464k | 594k |
| 22 | 06-08 to 06-10 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 1.66M | 559k | 316k | 559k |
| 23 | 06-10 to 06-12 | horizon_hours=8 max_sell_hours=1 min_day_trades=2000 | 1.68M | 746k | 664k | 851k |
| 24 | 06-12 to 06-14 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 2.49M | 578k | 440k | 578k |
| 25 | 06-14 to 06-16 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 2.14M | 404k | 244k | 550k |
| 26 | 06-16 to 06-18 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 2.29M | 657k | 454k | 684k |

## Grid

- plan_flips (40): max_fill_hours {2, 4, 8, 12} x min_volume {1000, 5000, 10000, 25000, 50000} x ask_cap {true, false}
- top_flips (40): max_fill_hours {2, 4, 8, 12} x min_volume {1000, 5000, 10000, 25000, 50000} x ask_cap {true, false}
- app quick (60): horizon_hours {2, 4, 8} x max_sell_hours {0.5, 1, 2, 4} x min_day_trades {2000, 5000, 10000, 25000, 50000}
- app overnight (60): horizon_hours {4, 8, 12} x max_sell_hours {0.5, 1, 2, 4} x min_day_trades {2000, 5000, 10000, 25000, 50000}
- app dips (60): horizon_hours {2, 4, 8} x max_sell_hours {0.5, 1, 2, 4} x min_day_trades {2000, 5000, 10000, 25000, 50000}

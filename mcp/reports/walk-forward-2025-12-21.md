# GE Metrics walk-forward validation

Generated 2025-12-21 19:30Z by `npm run backtest -- --walk-forward` (mcp/src/backtest/walkforward). Same simulator, fill model and no-lookahead views as the 14-day backtest (reports/backtest-2026-10-26.md).

## Setup

- History: the wiki's /1h?timestamp= (and /5m) returned full snapshots (~3,000 items) at every probe back to 730 days ago, so history is not the limit; this run uses the --days before --now (default: the last 60) plus 7 days of lookback.
- 60 days of decisions every 4h, 2025-10-20 16:00Z to 2025-12-19 16:00Z; simulation runs to 2025-12-21 18:00Z. Stack 50.00M, 8 slots, 8h buy timeout, dump after 24h, 25% queue share unless stated.
- 260 variants (grid below), each run once over the whole period. 26 folds: train 7d, then test the next 2d, step 2d. Test windows don't overlap and together cover 52 days.
- Per fold, the variant with the most profit on the training window (equity change: cash + holdings marked at the instant-sell price; ties to lower drawdown) trades the test window. The training score uses only hours that closed before the test starts (tested: rewriting everything after the split changes no choice).
- OOS = test windows only. Losing picks = OOS picks that bought anything and lost money after tax. Max DD = worst peak-to-trough of the OOS equity chained across test windows.
- Consensus = every knob at the value the folds chose most often. It is picked with all folds' training data, so its OOS line is slightly optimistic; the walk-forward line is the clean number.
- Decision-time market mood (market_breadth logic): 48 risk-on, 198 mixed, 115 risk-off.

## Out-of-sample results

| Strategy | Parameters | OOS profit | per day | Windows > 0 | Losing picks | Max DD |
|---|---|---:|---:|---:|---:|---:|
| plan_flips | walk-forward (re-tuned each fold) | -34.50M | -664k | 16/26 | 19% | 84.0% |
| | shipped default: max_fill_hours=2 min_volume=10000 ask_cap=true | -25.47M | -490k | 16/26 | 18% | 68.4% |
| | consensus: max_fill_hours=2 min_volume=5000 ask_cap=true (beat default in 12/26) | -23.14M | -445k | 13/26 | 20% | 60.5% |
| | hindsight best per window (not tradable) | 36.66M | | | | |
| top_flips | walk-forward (re-tuned each fold) | -59.37M | -1.14M | 14/26 | 12% | 118.8% |
| | shipped default: max_fill_hours=2 min_volume=10000 ask_cap=true | -5.82M | -112k | 17/26 | 11% | 34.9% |
| | consensus: max_fill_hours=2 min_volume=25000 ask_cap=true (beat default in 12/26) | -27.98M | -538k | 15/26 | 10% | 67.3% |
| | hindsight best per window (not tradable) | 35.51M | | | | |
| app quick | walk-forward (re-tuned each fold) | -37.58M | -723k | 9/26 | 25% | 78.6% |
| | shipped default: horizon_hours=4 max_sell_hours=1 min_day_trades=10000 | -34.47M | -663k | 7/26 | 30% | 71.6% |
| | consensus: horizon_hours=8 max_sell_hours=0.5 min_day_trades=10000 (beat default in 15/26) | -34.64M | -666k | 10/26 | 23% | 77.2% |
| | hindsight best per window (not tradable) | 36.10M | | | | |
| app overnight | walk-forward (re-tuned each fold) | 83k | 2k | 17/26 | 11% | 36.2% |
| | shipped default: horizon_hours=8 max_sell_hours=1 min_day_trades=10000 | -9.10M | -175k | 15/26 | 12% | 52.8% |
| | consensus: horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 (beat default in 16/26) | -20.26M | -390k | 16/26 | 9% | 74.1% |
| | hindsight best per window (not tradable) | 53.72M | | | | |
| app dips | walk-forward (re-tuned each fold) | 23.54M | 453k | 24/26 | 12% | 6.2% |
| | shipped default: horizon_hours=4 max_sell_hours=1 min_day_trades=10000 | 17.42M | 335k | 23/26 | 9% | 3.4% |
| | consensus: horizon_hours=8 max_sell_hours=4 min_day_trades=2000 (beat default in 18/26) | 20.40M | 392k | 21/26 | 14% | 9.4% |
| | hindsight best per window (not tradable) | 28.50M | | | | |

## Are the defaults robust?

Rule: change a default only if re-tuning every fold beats it OOS, the consensus variant beats it OOS in total and wins at least 60% of test windows, and each changed knob was the folds' top choice at least 50% of the time.

- **plan_flips**: keep (max_fill_hours=2 min_volume=10000 ask_cap=true). re-tuning each fold did not beat the default OOS (-34.50M vs -25.47M); consensus beat the default OOS (-23.14M vs -25.47M); won 12/26 test windows (need 60%); min_volume=5000 chosen in 35% of folds.
- **top_flips**: keep (max_fill_hours=2 min_volume=10000 ask_cap=true). re-tuning each fold did not beat the default OOS (-59.37M vs -5.82M); consensus did not beat the default OOS (-27.98M vs -5.82M); won 12/26 test windows (need 60%); min_volume=25000 chosen in 38% of folds.
- **app quick**: keep (horizon_hours=4 max_sell_hours=1 min_day_trades=10000). re-tuning each fold did not beat the default OOS (-37.58M vs -34.47M); consensus did not beat the default OOS (-34.64M vs -34.47M); won 15/26 test windows (need 60%); horizon_hours=8 chosen in 50% of folds; max_sell_hours=0.5 chosen in 46% of folds.
- **app overnight**: keep (horizon_hours=8 max_sell_hours=1 min_day_trades=10000). re-tuning each fold beat the default OOS (83k vs -9.10M); consensus did not beat the default OOS (-20.26M vs -9.10M); won 16/26 test windows (need 60%); horizon_hours=12 chosen in 65% of folds; max_sell_hours=0.5 chosen in 65% of folds; min_day_trades=5000 chosen in 27% of folds.
- **app dips**: keep (horizon_hours=4 max_sell_hours=1 min_day_trades=10000). re-tuning each fold beat the default OOS (23.54M vs 17.42M); consensus beat the default OOS (20.40M vs 17.42M); won 18/26 test windows (need 60%); horizon_hours=8 chosen in 100% of folds; max_sell_hours=4 chosen in 73% of folds; min_day_trades=2000 chosen in 46% of folds.

## One knob at a time

Each knob moved alone, the others held at the shipped default and then at the consensus, scored on the same test windows (fixed parameters, not re-tuned).

**plan_flips**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | max_fill_hours | 2 (default) | -25.47M | +0 | 0/26 | 18% |
| default | max_fill_hours | 4 | -33.39M | -7.93M | 5/26 | 28% |
| default | max_fill_hours | 8 | -30.12M | -4.66M | 6/26 | 33% |
| default | max_fill_hours | 12 | -27.74M | -2.27M | 5/26 | 36% |
| default | min_volume | 1000 | -25.10M | +364k | 11/26 | 20% |
| default | min_volume | 5000 (consensus) | -23.14M | +2.32M | 12/26 | 20% |
| default | min_volume | 10000 (default) | -25.47M | +0 | 0/26 | 18% |
| default | min_volume | 25000 | -25.57M | -107k | 9/26 | 19% |
| default | min_volume | 50000 | -22.83M | +2.63M | 13/26 | 18% |
| default | ask_cap | true (default) | -25.47M | +0 | 0/26 | 18% |
| default | ask_cap | false | -39.62M | -14.16M | 11/26 | 26% |
| consensus | max_fill_hours | 2 (consensus) | -23.14M | +2.32M | 12/26 | 20% |
| consensus | max_fill_hours | 4 | -22.27M | +3.20M | 9/26 | 30% |
| consensus | max_fill_hours | 8 | -31.43M | -5.96M | 6/26 | 35% |
| consensus | max_fill_hours | 12 | -25.30M | +163k | 7/26 | 36% |
| consensus | min_volume | 1000 | -25.10M | +364k | 11/26 | 20% |
| consensus | min_volume | 5000 (consensus) | -23.14M | +2.32M | 12/26 | 20% |
| consensus | min_volume | 10000 (default) | -25.47M | +0 | 0/26 | 18% |
| consensus | min_volume | 25000 | -25.57M | -107k | 9/26 | 19% |
| consensus | min_volume | 50000 | -22.83M | +2.63M | 13/26 | 18% |
| consensus | ask_cap | true (consensus) | -23.14M | +2.32M | 12/26 | 20% |
| consensus | ask_cap | false | -36.94M | -11.47M | 12/26 | 26% |

**top_flips**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | max_fill_hours | 2 (default) | -5.82M | +0 | 0/26 | 11% |
| default | max_fill_hours | 4 | -49.24M | -43.42M | 8/26 | 10% |
| default | max_fill_hours | 8 | -38.98M | -33.17M | 6/26 | 15% |
| default | max_fill_hours | 12 | -34.44M | -28.63M | 5/26 | 15% |
| default | min_volume | 1000 | -47.19M | -41.37M | 6/26 | 13% |
| default | min_volume | 5000 | -15.72M | -9.91M | 10/26 | 11% |
| default | min_volume | 10000 (default) | -5.82M | +0 | 0/26 | 11% |
| default | min_volume | 25000 (consensus) | -27.98M | -22.16M | 12/26 | 10% |
| default | min_volume | 50000 | 3.54M | +9.36M | 15/26 | 10% |
| default | ask_cap | true (default) | -5.82M | +0 | 0/26 | 11% |
| default | ask_cap | false | -48.94M | -43.13M | 12/26 | 13% |
| consensus | max_fill_hours | 2 (consensus) | -27.98M | -22.16M | 12/26 | 10% |
| consensus | max_fill_hours | 4 | -48.60M | -42.78M | 10/26 | 10% |
| consensus | max_fill_hours | 8 | -44.10M | -38.29M | 8/26 | 15% |
| consensus | max_fill_hours | 12 | -38.00M | -32.19M | 9/26 | 13% |
| consensus | min_volume | 1000 | -47.19M | -41.37M | 6/26 | 13% |
| consensus | min_volume | 5000 | -15.72M | -9.91M | 10/26 | 11% |
| consensus | min_volume | 10000 (default) | -5.82M | +0 | 0/26 | 11% |
| consensus | min_volume | 25000 (consensus) | -27.98M | -22.16M | 12/26 | 10% |
| consensus | min_volume | 50000 | 3.54M | +9.36M | 15/26 | 10% |
| consensus | ask_cap | true (consensus) | -27.98M | -22.16M | 12/26 | 10% |
| consensus | ask_cap | false | -45.93M | -40.12M | 10/26 | 14% |

**app quick**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | horizon_hours | 2 | -31.93M | +2.55M | 14/26 | 32% |
| default | horizon_hours | 4 (default) | -34.47M | +0 | 0/26 | 30% |
| default | horizon_hours | 8 | -32.11M | +2.36M | 14/26 | 28% |
| default | max_sell_hours | 0.5 | -31.19M | +3.28M | 15/26 | 22% |
| default | max_sell_hours | 1 (default) | -34.47M | +0 | 0/26 | 30% |
| default | max_sell_hours | 2 | -34.06M | +409k | 11/26 | 34% |
| default | max_sell_hours | 4 | -34.73M | -256k | 11/26 | 33% |
| default | min_day_trades | 2000 | -28.13M | +6.34M | 15/26 | 30% |
| default | min_day_trades | 5000 | -31.45M | +3.02M | 14/26 | 30% |
| default | min_day_trades | 10000 (default) | -34.47M | +0 | 0/26 | 30% |
| default | min_day_trades | 25000 | -36.87M | -2.40M | 15/26 | 25% |
| default | min_day_trades | 50000 | -35.44M | -963k | 9/26 | 31% |
| consensus | horizon_hours | 2 | -30.37M | +4.10M | 16/26 | 24% |
| consensus | horizon_hours | 4 | -31.19M | +3.28M | 15/26 | 22% |
| consensus | horizon_hours | 8 (consensus) | -34.64M | -165k | 15/26 | 23% |
| consensus | max_sell_hours | 0.5 (consensus) | -34.64M | -165k | 15/26 | 23% |
| consensus | max_sell_hours | 1 | -32.11M | +2.36M | 14/26 | 28% |
| consensus | max_sell_hours | 2 | -30.40M | +4.07M | 10/26 | 31% |
| consensus | max_sell_hours | 4 | -31.40M | +3.07M | 9/26 | 35% |
| consensus | min_day_trades | 2000 | -35.74M | -1.27M | 14/26 | 22% |
| consensus | min_day_trades | 5000 | -36.65M | -2.18M | 14/26 | 22% |
| consensus | min_day_trades | 10000 (consensus) | -34.64M | -165k | 15/26 | 23% |
| consensus | min_day_trades | 25000 | -38.68M | -4.21M | 16/26 | 23% |
| consensus | min_day_trades | 50000 | -35.06M | -588k | 12/26 | 24% |

**app overnight**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | horizon_hours | 4 | -16.01M | -6.91M | 12/26 | 14% |
| default | horizon_hours | 8 (default) | -9.10M | +0 | 0/26 | 12% |
| default | horizon_hours | 12 | -25.63M | -16.52M | 13/26 | 12% |
| default | max_sell_hours | 0.5 | -17.58M | -8.48M | 17/26 | 10% |
| default | max_sell_hours | 1 (default) | -9.10M | +0 | 0/26 | 12% |
| default | max_sell_hours | 2 | -18.02M | -8.92M | 12/26 | 17% |
| default | max_sell_hours | 4 | -12.71M | -3.61M | 10/26 | 21% |
| default | min_day_trades | 2000 | -23.71M | -14.60M | 13/26 | 11% |
| default | min_day_trades | 5000 | -25.93M | -16.83M | 15/26 | 12% |
| default | min_day_trades | 10000 (default) | -9.10M | +0 | 0/26 | 12% |
| default | min_day_trades | 25000 | -16.33M | -7.22M | 13/26 | 13% |
| default | min_day_trades | 50000 | -11.55M | -2.45M | 13/26 | 14% |
| consensus | horizon_hours | 4 | -23.44M | -14.34M | 15/26 | 9% |
| consensus | horizon_hours | 8 | -18.89M | -9.79M | 15/26 | 10% |
| consensus | horizon_hours | 12 (consensus) | -20.26M | -11.16M | 16/26 | 9% |
| consensus | max_sell_hours | 0.5 (consensus) | -20.26M | -11.16M | 16/26 | 9% |
| consensus | max_sell_hours | 1 | -23.84M | -14.73M | 13/26 | 12% |
| consensus | max_sell_hours | 2 | -14.40M | -5.30M | 11/26 | 16% |
| consensus | max_sell_hours | 4 | -14.73M | -5.63M | 12/26 | 22% |
| consensus | min_day_trades | 2000 | -24.65M | -15.55M | 13/26 | 10% |
| consensus | min_day_trades | 5000 (consensus) | -20.26M | -11.16M | 16/26 | 9% |
| consensus | min_day_trades | 10000 | -16.35M | -7.25M | 16/26 | 10% |
| consensus | min_day_trades | 25000 | -14.40M | -5.30M | 15/26 | 10% |
| consensus | min_day_trades | 50000 | 10.14M | +19.24M | 17/26 | 10% |

**app dips**

| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |
|---|---|---|---:|---:|---:|---:|
| default | horizon_hours | 2 | 12.72M | -4.70M | 5/26 | 8% |
| default | horizon_hours | 4 (default) | 17.42M | +0 | 0/26 | 9% |
| default | horizon_hours | 8 | 18.63M | +1.21M | 18/26 | 10% |
| default | max_sell_hours | 0.5 | 15.54M | -1.88M | 7/26 | 8% |
| default | max_sell_hours | 1 (default) | 17.42M | +0 | 0/26 | 9% |
| default | max_sell_hours | 2 | 18.05M | +627k | 17/26 | 10% |
| default | max_sell_hours | 4 | 18.21M | +786k | 18/26 | 10% |
| default | min_day_trades | 2000 | 17.77M | +344k | 16/26 | 10% |
| default | min_day_trades | 5000 | 17.95M | +527k | 16/26 | 9% |
| default | min_day_trades | 10000 (default) | 17.42M | +0 | 0/26 | 9% |
| default | min_day_trades | 25000 | 16.78M | -643k | 13/26 | 8% |
| default | min_day_trades | 50000 | 16.11M | -1.31M | 10/26 | 8% |
| consensus | horizon_hours | 2 | 12.93M | -4.49M | 9/26 | 8% |
| consensus | horizon_hours | 4 | 18.81M | +1.38M | 18/26 | 11% |
| consensus | horizon_hours | 8 (consensus) | 20.40M | +2.98M | 18/26 | 14% |
| consensus | max_sell_hours | 0.5 | 16.97M | -453k | 13/26 | 8% |
| consensus | max_sell_hours | 1 | 19.07M | +1.64M | 18/26 | 10% |
| consensus | max_sell_hours | 2 | 19.60M | +2.17M | 19/26 | 13% |
| consensus | max_sell_hours | 4 (consensus) | 20.40M | +2.98M | 18/26 | 14% |
| consensus | min_day_trades | 2000 (consensus) | 20.40M | +2.98M | 18/26 | 14% |
| consensus | min_day_trades | 5000 | 22.31M | +4.88M | 19/26 | 13% |
| consensus | min_day_trades | 10000 | 19.40M | +1.98M | 17/26 | 12% |
| consensus | min_day_trades | 25000 | 20.05M | +2.63M | 15/26 | 11% |
| consensus | min_day_trades | 50000 | 19.50M | +2.08M | 15/26 | 10% |

## Parameter stability across folds

| Strategy | Knob | Default | Folds choosing each value (* = default) | Top share |
|---|---|---|---|---:|
| plan_flips | max_fill_hours | 2 | 2*: 21, 12: 5 | 81% |
| plan_flips | min_volume | 10000 | 5000: 9, 50000: 8, 10000*: 4, 1000: 4, 25000: 1 | 35% |
| plan_flips | ask_cap | true | true*: 25, false: 1 | 96% |
| top_flips | max_fill_hours | 2 | 2*: 19, 4: 4, 8: 2, 12: 1 | 73% |
| top_flips | min_volume | 10000 | 25000: 10, 10000*: 8, 50000: 6, 5000: 2 | 38% |
| top_flips | ask_cap | true | true*: 20, false: 6 | 77% |
| app quick | horizon_hours | 4 | 8: 13, 2: 9, 4*: 4 | 50% |
| app quick | max_sell_hours | 1 | 0.5: 12, 1*: 6, 4: 4, 2: 4 | 46% |
| app quick | min_day_trades | 10000 | 10000*: 6, 50000: 6, 25000: 5, 2000: 5, 5000: 4 | 23% |
| app overnight | horizon_hours | 8 | 12: 17, 8*: 6, 4: 3 | 65% |
| app overnight | max_sell_hours | 1 | 0.5: 17, 1*: 4, 2: 3, 4: 2 | 65% |
| app overnight | min_day_trades | 10000 | 5000: 7, 2000: 7, 50000: 5, 10000*: 4, 25000: 3 | 27% |
| app dips | horizon_hours | 4 | 8: 26 | 100% |
| app dips | max_sell_hours | 1 | 4: 19, 2: 6, 0.5: 1 | 73% |
| app dips | min_day_trades | 10000 | 2000: 12, 5000: 6, 50000: 4, 10000*: 3, 25000: 1 | 46% |

- plan_flips: shipped default ranked median 4 of 40 on the training windows (best 1, worst 39).
- top_flips: shipped default ranked median 5 of 40 on the training windows (best 1, worst 37).
- app quick: shipped default ranked median 32 of 60 on the training windows (best 10, worst 55).
- app overnight: shipped default ranked median 30 of 60 on the training windows (best 4, worst 59).
- app dips: shipped default ranked median 24 of 60 on the training windows (best 15, worst 33).

## Regime split (risk-on vs risk-off decisions)

Realized profit of OOS picks grouped by the market mood at the decision that placed them.

| Strategy | Mood at decision | Decisions | WF picks | WF realized | WF losing | Default picks | Default realized | Default losing |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| plan_flips | risk-on | 41 | 142 | 3.73M | 15% | 135 | 2.58M | 16% |
| plan_flips | mixed | 159 | 459 | -20.54M | 19% | 472 | -11.08M | 19% |
| plan_flips | risk-off | 112 | 358 | -18.73M | 21% | 387 | -17.41M | 18% |
| top_flips | risk-on | 41 | 160 | 4.28M | 9% | 148 | 1.73M | 10% |
| top_flips | mixed | 159 | 525 | -47.09M | 11% | 569 | -6.15M | 10% |
| top_flips | risk-off | 112 | 361 | -13.75M | 16% | 430 | -1.22M | 12% |
| app quick | risk-on | 41 | 107 | -2.45M | 26% | 105 | -1.59M | 25% |
| app quick | mixed | 159 | 439 | -7.48M | 27% | 400 | -24.03M | 31% |
| app quick | risk-off | 112 | 319 | -13.90M | 22% | 284 | -9.41M | 31% |
| app overnight | risk-on | 41 | 141 | 2.39M | 11% | 160 | 1.06M | 8% |
| app overnight | mixed | 159 | 585 | -20.59M | 9% | 583 | 6.90M | 11% |
| app overnight | risk-off | 112 | 442 | -6.17M | 14% | 396 | -15.33M | 15% |
| app dips | risk-on | 41 | 119 | 4.28M | 5% | 130 | 2.85M | 4% |
| app dips | mixed | 159 | 446 | 11.28M | 14% | 507 | 8.48M | 10% |
| app dips | risk-off | 112 | 303 | 9.12M | 12% | 331 | 6.48M | 9% |

## Sensitivity: queue share and dump-after hours

OOS profit over the same test windows for the shipped default and the consensus variant, re-simulated with a different simulator queue share or max hold (parameters not re-tuned).

| Strategy | Variant | queue share 10% | queue share 25% | queue share 50% | dump after 12h | dump after 48h |
|---|---|---:|---:|---:|---:|---:|
| plan_flips | default | -27.85M (21% lose, 16/26 up) | -25.47M (18% lose, 16/26 up) | -28.30M (18% lose, 15/26 up) | -29.03M (24% lose, 13/26 up) | -22.86M (16% lose, 14/26 up) |
| plan_flips | consensus | -24.92M (22% lose, 12/26 up) | -23.14M (20% lose, 13/26 up) | -22.24M (19% lose, 13/26 up) | -27.66M (26% lose, 11/26 up) | -25.61M (16% lose, 16/26 up) |
| top_flips | default | -5.76M (12% lose, 19/26 up) | -5.82M (11% lose, 17/26 up) | 1.97M (11% lose, 20/26 up) | -9.74M (16% lose, 17/26 up) | -10.18M (8% lose, 14/26 up) |
| top_flips | consensus | -28.38M (10% lose, 15/26 up) | -27.98M (10% lose, 15/26 up) | -22.28M (9% lose, 16/26 up) | -12.98M (14% lose, 17/26 up) | -16.17M (7% lose, 16/26 up) |
| app quick | default | -29.18M (28% lose, 9/26 up) | -34.47M (30% lose, 7/26 up) | -31.93M (27% lose, 10/26 up) | -29.36M (33% lose, 6/26 up) | -31.97M (29% lose, 7/26 up) |
| app quick | consensus | -38.47M (25% lose, 8/26 up) | -34.64M (23% lose, 10/26 up) | -31.95M (22% lose, 14/26 up) | -27.29M (28% lose, 11/26 up) | -34.76M (22% lose, 11/26 up) |
| app overnight | default | -26.17M (13% lose, 16/26 up) | -9.10M (12% lose, 15/26 up) | -10.38M (13% lose, 15/26 up) | -14.80M (19% lose, 11/26 up) | -12.44M (11% lose, 16/26 up) |
| app overnight | consensus | -19.91M (10% lose, 16/26 up) | -20.26M (9% lose, 16/26 up) | -21.92M (9% lose, 17/26 up) | -7.22M (15% lose, 17/26 up) | -20.55M (7% lose, 15/26 up) |
| app dips | default | 14.66M (10% lose, 23/26 up) | 17.42M (9% lose, 23/26 up) | 19.43M (9% lose, 24/26 up) | 15.15M (13% lose, 23/26 up) | 18.56M (7% lose, 24/26 up) |
| app dips | consensus | 11.50M (15% lose, 19/26 up) | 20.40M (14% lose, 21/26 up) | 25.72M (12% lose, 22/26 up) | 15.21M (18% lose, 21/26 up) | 20.07M (11% lose, 20/26 up) |

The whole walk-forward re-run (grid re-tuned per fold) under other queue shares:

| Strategy | Queue share | WF OOS | Default OOS | Consensus | Consensus beat default | Rule says |
|---|---:|---:|---:|---|---:|---|
| plan_flips | 10% | -36.44M (11/26 up) | -27.85M (16/26 up) | max_fill_hours=2 min_volume=5000 ask_cap=true | 9/26 | keep |
| top_flips | 10% | -17.58M (14/26 up) | -5.76M (19/26 up) | max_fill_hours=2 min_volume=5000 ask_cap=true | 10/26 | keep |
| app quick | 10% | -27.80M (10/26 up) | -29.18M (9/26 up) | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | 13/26 | keep |
| app overnight | 10% | -13.76M (15/26 up) | -26.17M (16/26 up) | horizon_hours=8 max_sell_hours=0.5 min_day_trades=5000 | 17/26 | keep |
| app dips | 10% | 14.57M (21/26 up) | 14.66M (23/26 up) | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 15/26 | keep |
| plan_flips | 50% | -16.13M (14/26 up) | -28.30M (15/26 up) | max_fill_hours=2 min_volume=25000 ask_cap=true | 10/26 | keep |
| top_flips | 50% | -45.15M (13/26 up) | 1.97M (20/26 up) | max_fill_hours=2 min_volume=50000 ask_cap=true | 17/26 | keep |
| app quick | 50% | -42.73M (11/26 up) | -31.93M (10/26 up) | horizon_hours=8 max_sell_hours=0.5 min_day_trades=25000 | 13/26 | keep |
| app overnight | 50% | -11.03M (12/26 up) | -10.38M (15/26 up) | horizon_hours=12 max_sell_hours=0.5 min_day_trades=2000 | 15/26 | keep |
| app dips | 50% | 25.10M (23/26 up) | 19.43M (24/26 up) | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 20/26 | change |

## Folds

**plan_flips**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 10-27 to 10-29 | max_fill_hours=2 min_volume=50000 ask_cap=true | 873k | 922k | 2.59M | 3.06M |
| 2 | 10-29 to 10-31 | max_fill_hours=2 min_volume=5000 ask_cap=true | 2.31M | 856k | 1.00M | 1.17M |
| 3 | 10-31 to 11-02 | max_fill_hours=2 min_volume=10000 ask_cap=true | 3.63M | 293k | 293k | 1.50M |
| 4 | 11-02 to 11-04 | max_fill_hours=2 min_volume=5000 ask_cap=true | 4.51M | -46k | 116k | 1.28M |
| 5 | 11-04 to 11-06 | max_fill_hours=2 min_volume=10000 ask_cap=true | 2.80M | -889k | -889k | 1.63M |
| 6 | 11-06 to 11-08 | max_fill_hours=2 min_volume=5000 ask_cap=true | 211k | 623k | 798k | 798k |
| 7 | 11-08 to 11-10 | max_fill_hours=2 min_volume=1000 ask_cap=true | 1.20M | -1.06M | -812k | 1.80M |
| 8 | 11-10 to 11-12 | max_fill_hours=2 min_volume=1000 ask_cap=true | -670k | 1.32M | 1.23M | 1.58M |
| 9 | 11-12 to 11-14 | max_fill_hours=2 min_volume=5000 ask_cap=true | 2.43M | 1.37M | 998k | 1.37M |
| 10 | 11-14 to 11-16 | max_fill_hours=2 min_volume=5000 ask_cap=true | 2.92M | 269k | 280k | 1.07M |
| 11 | 11-16 to 11-18 | max_fill_hours=2 min_volume=5000 ask_cap=true | 2.91M | 741k | 730k | 741k |
| 12 | 11-18 to 11-20 | max_fill_hours=2 min_volume=5000 ask_cap=true | 3.14M | -1.81M | -527k | -527k |
| 13 | 11-20 to 11-22 | max_fill_hours=2 min_volume=10000 ask_cap=true | 811k | -30.16M | -30.16M | -270k |
| 14 | 11-22 to 11-24 | max_fill_hours=12 min_volume=50000 ask_cap=true | -7.01M | 1.63M | -3.35M | 3.64M |
| 15 | 11-24 to 11-26 | max_fill_hours=12 min_volume=50000 ask_cap=true | -6.84M | -1.60M | -1.49M | 135k |
| 16 | 11-26 to 11-28 | max_fill_hours=12 min_volume=5000 ask_cap=true | -4.25M | -650k | 413k | 2.02M |
| 17 | 11-28 to 11-30 | max_fill_hours=12 min_volume=5000 ask_cap=true | 346k | 349k | -1.37M | 1.17M |
| 18 | 11-30 to 12-02 | max_fill_hours=12 min_volume=1000 ask_cap=true | 3.60M | -10.06M | -1.52M | 510k |
| 19 | 12-02 to 12-04 | max_fill_hours=2 min_volume=1000 ask_cap=true | 2.29M | -2.89M | 799k | 935k |
| 20 | 12-04 to 12-06 | max_fill_hours=2 min_volume=25000 ask_cap=false | 428k | 475k | 1.34M | 2.29M |
| 21 | 12-06 to 12-08 | max_fill_hours=2 min_volume=50000 ask_cap=true | 2.37M | 1.41M | -781k | 2.07M |
| 22 | 12-08 to 12-10 | max_fill_hours=2 min_volume=50000 ask_cap=true | 2.94M | 968k | 624k | 1.01M |
| 23 | 12-10 to 12-12 | max_fill_hours=2 min_volume=50000 ask_cap=true | 5.01M | 2.52M | 1.46M | 2.72M |
| 24 | 12-12 to 12-14 | max_fill_hours=2 min_volume=50000 ask_cap=true | 5.80M | 835k | 1.91M | 1.91M |
| 25 | 12-14 to 12-16 | max_fill_hours=2 min_volume=50000 ask_cap=true | 5.00M | 1.24M | 2.02M | 2.02M |
| 26 | 12-16 to 12-18 | max_fill_hours=2 min_volume=10000 ask_cap=true | 5.75M | -1.16M | -1.16M | 1.02M |

**top_flips**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 10-27 to 10-29 | max_fill_hours=4 min_volume=25000 ask_cap=false | 3.29M | -868k | 1.62M | 3.25M |
| 2 | 10-29 to 10-31 | max_fill_hours=4 min_volume=10000 ask_cap=false | 4.14M | -715k | 1.08M | 1.91M |
| 3 | 10-31 to 11-02 | max_fill_hours=2 min_volume=25000 ask_cap=true | 3.04M | 1.20M | 438k | 1.20M |
| 4 | 11-02 to 11-04 | max_fill_hours=2 min_volume=25000 ask_cap=true | 4.02M | 695k | 603k | 1.17M |
| 5 | 11-04 to 11-06 | max_fill_hours=2 min_volume=25000 ask_cap=true | 4.38M | -1.27M | 466k | 466k |
| 6 | 11-06 to 11-08 | max_fill_hours=2 min_volume=10000 ask_cap=true | 2.15M | 1.23M | 1.23M | 2.01M |
| 7 | 11-08 to 11-10 | max_fill_hours=2 min_volume=10000 ask_cap=true | 3.65M | 2.18M | 2.18M | 2.18M |
| 8 | 11-10 to 11-12 | max_fill_hours=2 min_volume=10000 ask_cap=true | 4.46M | 458k | 458k | 1.88M |
| 9 | 11-12 to 11-14 | max_fill_hours=2 min_volume=5000 ask_cap=true | 4.99M | 1.61M | 1.15M | 1.61M |
| 10 | 11-14 to 11-16 | max_fill_hours=2 min_volume=25000 ask_cap=true | 5.15M | 1.90M | -285k | 2.38M |
| 11 | 11-16 to 11-18 | max_fill_hours=2 min_volume=25000 ask_cap=true | 5.00M | 60k | 553k | 2.26M |
| 12 | 11-18 to 11-20 | max_fill_hours=2 min_volume=10000 ask_cap=false | 4.47M | -6.25M | -1.33M | 282k |
| 13 | 11-20 to 11-22 | max_fill_hours=4 min_volume=10000 ask_cap=true | 1.53M | -41.67M | -4.99M | -2.92M |
| 14 | 11-22 to 11-24 | max_fill_hours=2 min_volume=5000 ask_cap=true | -4.10M | -12.55M | -11.72M | 709k |
| 15 | 11-24 to 11-26 | max_fill_hours=2 min_volume=50000 ask_cap=true | -6.10M | 424k | 1.18M | 1.18M |
| 16 | 11-26 to 11-28 | max_fill_hours=2 min_volume=50000 ask_cap=true | -3.51M | -74k | -1.41M | 1.29M |
| 17 | 11-28 to 11-30 | max_fill_hours=2 min_volume=50000 ask_cap=true | -1.96M | 682k | 1.10M | 1.10M |
| 18 | 11-30 to 12-02 | max_fill_hours=2 min_volume=50000 ask_cap=true | 1.37M | -3.40M | -1.14M | 1.12M |
| 19 | 12-02 to 12-04 | max_fill_hours=8 min_volume=25000 ask_cap=false | 77k | 379k | 1.24M | 1.24M |
| 20 | 12-04 to 12-06 | max_fill_hours=12 min_volume=25000 ask_cap=false | 586k | 4k | 570k | 2.44M |
| 21 | 12-06 to 12-08 | max_fill_hours=2 min_volume=10000 ask_cap=true | 1.51M | -3.15M | -3.15M | 533k |
| 22 | 12-08 to 12-10 | max_fill_hours=8 min_volume=25000 ask_cap=false | 950k | -145k | 2.11M | 2.75M |
| 23 | 12-10 to 12-12 | max_fill_hours=2 min_volume=50000 ask_cap=true | 5.30M | 1.51M | 528k | 1.51M |
| 24 | 12-12 to 12-14 | max_fill_hours=2 min_volume=50000 ask_cap=true | 5.32M | -1.62M | -600k | 1.13M |
| 25 | 12-14 to 12-16 | max_fill_hours=4 min_volume=25000 ask_cap=true | 1.06M | 175k | 2.47M | 2.47M |
| 26 | 12-16 to 12-18 | max_fill_hours=2 min_volume=10000 ask_cap=true | 3.76M | -166k | -166k | 366k |

**app quick**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 10-27 to 10-29 | horizon_hours=2 max_sell_hours=1 min_day_trades=25000 | 132k | 415k | -528k | 764k |
| 2 | 10-29 to 10-31 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=25000 | 939k | 1.05M | 91k | 1.32M |
| 3 | 10-31 to 11-02 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=25000 | 1.34M | 283k | -1.32M | 1.36M |
| 4 | 11-02 to 11-04 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | 2.68M | -1.40M | 1.24M | 3.11M |
| 5 | 11-04 to 11-06 | horizon_hours=2 max_sell_hours=1 min_day_trades=5000 | 3.10M | -2.67M | -4.82M | 1.34M |
| 6 | 11-06 to 11-08 | horizon_hours=4 max_sell_hours=4 min_day_trades=10000 | 1.67M | 11k | -136k | 1.87M |
| 7 | 11-08 to 11-10 | horizon_hours=4 max_sell_hours=2 min_day_trades=2000 | 2.51M | -2.69M | -726k | 1.84M |
| 8 | 11-10 to 11-12 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=2000 | 1.78M | 515k | -67k | 1.09M |
| 9 | 11-12 to 11-14 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 | 2.00M | -347k | -1.05M | 890k |
| 10 | 11-14 to 11-16 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=10000 | 2.84M | -72k | -524k | 3.35M |
| 11 | 11-16 to 11-18 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=25000 | 4.09M | -2.64M | 415k | 1.25M |
| 12 | 11-18 to 11-20 | horizon_hours=4 max_sell_hours=1 min_day_trades=5000 | 1.45M | -947k | -801k | 1.83M |
| 13 | 11-20 to 11-22 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=2000 | 2.48M | -24.14M | -21.81M | -6.37M |
| 14 | 11-22 to 11-24 | horizon_hours=8 max_sell_hours=4 min_day_trades=50000 | -14.69M | -1.20M | -2.19M | 1.75M |
| 15 | 11-24 to 11-26 | horizon_hours=8 max_sell_hours=2 min_day_trades=10000 | -13.97M | 820k | 991k | 2.83M |
| 16 | 11-26 to 11-28 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | -9.65M | -1.53M | -131k | 2.43M |
| 17 | 11-28 to 11-30 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=10000 | 169k | -1.36M | -2.34M | 228k |
| 18 | 11-30 to 12-02 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=10000 | 894k | -169k | -1.16M | 2.80M |
| 19 | 12-02 to 12-04 | horizon_hours=8 max_sell_hours=1 min_day_trades=50000 | 2.03M | -306k | -505k | 991k |
| 20 | 12-04 to 12-06 | horizon_hours=8 max_sell_hours=1 min_day_trades=50000 | 1.39M | 644k | 1.58M | 2.54M |
| 21 | 12-06 to 12-08 | horizon_hours=8 max_sell_hours=1 min_day_trades=50000 | 3.48M | -738k | -316k | 2.06M |
| 22 | 12-08 to 12-10 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 3.37M | -895k | -76k | 909k |
| 23 | 12-10 to 12-12 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 1.44M | 63k | -456k | 2.10M |
| 24 | 12-12 to 12-14 | horizon_hours=2 max_sell_hours=0.5 min_day_trades=50000 | 1.20M | 715k | 427k | 1.28M |
| 25 | 12-14 to 12-16 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=25000 | 2.22M | -745k | -256k | 1.12M |
| 26 | 12-16 to 12-18 | horizon_hours=8 max_sell_hours=4 min_day_trades=50000 | 1.84M | -259k | 19k | 1.42M |

**app overnight**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 10-27 to 10-29 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=25000 | 6.31M | 1.76M | 1.28M | 3.31M |
| 2 | 10-29 to 10-31 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=10000 | 7.57M | 854k | 1.59M | 2.01M |
| 3 | 10-31 to 11-02 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=10000 | 7.40M | -733k | 1.40M | 1.78M |
| 4 | 11-02 to 11-04 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=10000 | 5.79M | 1.39M | -430k | 2.01M |
| 5 | 11-04 to 11-06 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 | 4.30M | -967k | -2.04M | 1k |
| 6 | 11-06 to 11-08 | horizon_hours=8 max_sell_hours=4 min_day_trades=25000 | 3.33M | 1.06M | 155k | 4.10M |
| 7 | 11-08 to 11-10 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 | 6.45M | 2.71M | 1.69M | 2.78M |
| 8 | 11-10 to 11-12 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 | 5.16M | 2.76M | 2.15M | 3.72M |
| 9 | 11-12 to 11-14 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 | 7.62M | 2.04M | 1.36M | 2.25M |
| 10 | 11-14 to 11-16 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 | 8.98M | -64k | 1.08M | 2.42M |
| 11 | 11-16 to 11-18 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=10000 | 6.43M | 2.09M | 1.15M | 2.87M |
| 12 | 11-18 to 11-20 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=2000 | 6.49M | -1.20M | -3.64M | -194k |
| 13 | 11-20 to 11-22 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=2000 | 3.19M | -11.05M | -7.22M | 1.50M |
| 14 | 11-22 to 11-24 | horizon_hours=12 max_sell_hours=4 min_day_trades=50000 | -1.18M | -7.81M | -9.82M | -3.02M |
| 15 | 11-24 to 11-26 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=50000 | -10.12M | -1.23M | -1.56M | 492k |
| 16 | 11-26 to 11-28 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=50000 | -11.07M | 2.41M | -426k | 3.39M |
| 17 | 11-28 to 11-30 | horizon_hours=12 max_sell_hours=0.5 min_day_trades=50000 | -5.41M | 227k | -3.06M | 728k |
| 18 | 11-30 to 12-02 | horizon_hours=12 max_sell_hours=1 min_day_trades=2000 | -47k | 1.68M | -1.07M | 3.19M |
| 19 | 12-02 to 12-04 | horizon_hours=12 max_sell_hours=2 min_day_trades=2000 | 3.47M | 121k | -1.98M | 1.42M |
| 20 | 12-04 to 12-06 | horizon_hours=12 max_sell_hours=1 min_day_trades=2000 | 4.00M | -1.33M | 311k | 1.87M |
| 21 | 12-06 to 12-08 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=50000 | 3.47M | -455k | 2.45M | 3.77M |
| 22 | 12-08 to 12-10 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 5.40M | 204k | -265k | 2.26M |
| 23 | 12-10 to 12-12 | horizon_hours=12 max_sell_hours=1 min_day_trades=5000 | 5.89M | 2.84M | 3.70M | 4.10M |
| 24 | 12-12 to 12-14 | horizon_hours=8 max_sell_hours=1 min_day_trades=5000 | 7.87M | 1.08M | 2.23M | 3.06M |
| 25 | 12-14 to 12-16 | horizon_hours=12 max_sell_hours=2 min_day_trades=25000 | 8.82M | 179k | 1.34M | 2.24M |
| 26 | 12-16 to 12-18 | horizon_hours=4 max_sell_hours=0.5 min_day_trades=2000 | 7.48M | 1.53M | 531k | 1.67M |

**app dips**

| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |
|---:|---|---|---:|---:|---:|---:|
| 1 | 10-27 to 10-29 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 4.02M | 223k | 256k | 286k |
| 2 | 10-29 to 10-31 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 3.34M | 1.53M | 1.36M | 1.55M |
| 3 | 10-31 to 11-02 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 3.98M | 853k | 354k | 853k |
| 4 | 11-02 to 11-04 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 2.88M | 1.16M | 465k | 1.16M |
| 5 | 11-04 to 11-06 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 3.76M | 571k | 371k | 668k |
| 6 | 11-06 to 11-08 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 3.01M | 823k | 239k | 823k |
| 7 | 11-08 to 11-10 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 2.84M | 1.26M | 1.04M | 1.35M |
| 8 | 11-10 to 11-12 | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 | 3.53M | -356k | 162k | 351k |
| 9 | 11-12 to 11-14 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 2.50M | 332k | 242k | 374k |
| 10 | 11-14 to 11-16 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 2.15M | 846k | 530k | 892k |
| 11 | 11-16 to 11-18 | horizon_hours=8 max_sell_hours=2 min_day_trades=2000 | 1.98M | 37k | -14k | 277k |
| 12 | 11-18 to 11-20 | horizon_hours=8 max_sell_hours=4 min_day_trades=10000 | 1.48M | 2.64M | 1.62M | 2.81M |
| 13 | 11-20 to 11-22 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 3.81M | 782k | 449k | 881k |
| 14 | 11-22 to 11-24 | horizon_hours=8 max_sell_hours=4 min_day_trades=10000 | 4.05M | 1.23M | 926k | 1.50M |
| 15 | 11-24 to 11-26 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 5.13M | -74k | -94k | 415k |
| 16 | 11-26 to 11-28 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 2.62M | 2.43M | 1.91M | 2.43M |
| 17 | 11-28 to 11-30 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 4.73M | 1.18M | 1.18M | 1.35M |
| 18 | 11-30 to 12-02 | horizon_hours=8 max_sell_hours=0.5 min_day_trades=2000 | 4.68M | 908k | 849k | 1.09M |
| 19 | 12-02 to 12-04 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 3.76M | 201k | 178k | 700k |
| 20 | 12-04 to 12-06 | horizon_hours=8 max_sell_hours=4 min_day_trades=10000 | 3.67M | 1.23M | 1.03M | 1.68M |
| 21 | 12-06 to 12-08 | horizon_hours=8 max_sell_hours=4 min_day_trades=5000 | 3.67M | 1.19M | 1.23M | 1.35M |
| 22 | 12-08 to 12-10 | horizon_hours=8 max_sell_hours=2 min_day_trades=50000 | 4.07M | 311k | -220k | 441k |
| 23 | 12-10 to 12-12 | horizon_hours=8 max_sell_hours=2 min_day_trades=50000 | 3.32M | 1.16M | 705k | 1.40M |
| 24 | 12-12 to 12-14 | horizon_hours=8 max_sell_hours=4 min_day_trades=25000 | 3.74M | 1.15M | 931k | 1.32M |
| 25 | 12-14 to 12-16 | horizon_hours=8 max_sell_hours=2 min_day_trades=50000 | 3.31M | 1.58M | 1.14M | 1.66M |
| 26 | 12-16 to 12-18 | horizon_hours=8 max_sell_hours=4 min_day_trades=50000 | 4.17M | 348k | 592k | 905k |

## Grid

- plan_flips (40): max_fill_hours {2, 4, 8, 12} x min_volume {1000, 5000, 10000, 25000, 50000} x ask_cap {true, false}
- top_flips (40): max_fill_hours {2, 4, 8, 12} x min_volume {1000, 5000, 10000, 25000, 50000} x ask_cap {true, false}
- app quick (60): horizon_hours {2, 4, 8} x max_sell_hours {0.5, 1, 2, 4} x min_day_trades {2000, 5000, 10000, 25000, 50000}
- app overnight (60): horizon_hours {4, 8, 12} x max_sell_hours {0.5, 1, 2, 4} x min_day_trades {2000, 5000, 10000, 25000, 50000}
- app dips (60): horizon_hours {2, 4, 8} x max_sell_hours {0.5, 1, 2, 4} x min_day_trades {2000, 5000, 10000, 25000, 50000}

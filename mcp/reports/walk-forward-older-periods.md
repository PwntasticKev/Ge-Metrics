# Older-period validation

Replayed on 2026-10-26 using the same simulator and grid as PR #33, with separate 60-day periods ending 2026-06-21 and 2025-12-21. Report dates are the simulated as-of dates. Each period uses 26 non-overlapping two-day test folds after seven-day training windows, a 50M GP stack, eight slots, and a 25% queue share; sensitivity runs also use 10% and 50%.

The app replay vendors the pre-#34 fill model. Comparisons isolate its horizon, sell-time limit and volume floor; these results do not validate the canonical offer pricing/refinement introduced in #35. Fixed-parameter comparisons across these older periods are retrospective robustness checks, not an untouched final holdout after reading the results.

The JSON dump now includes every fixed variant and decision timestamps, and is retained by as-of date under `.cache/backtest/`. Compare runs with `node scripts/compare-walk-forward.mjs Jun=.cache/backtest/walk-forward-2026-06-21.json Dec=.cache/backtest/walk-forward-2025-12-21.json`. The companion reports retain configuration, folds, regimes and sensitivity tables.

## Verdicts

- **MCP 2-hour patience: confirmed in direction.** At the 10K/day floor with ask caps, 2h beats 4h, 8h and 12h in total in both older periods. This reduces losses; it does not establish profitability. `plan_flips` at 2h/10K made +20.56M in Apr–Jun 2026 but lost 25.47M in Oct–Dec 2025. `top_flips` made +23.06M then lost 5.82M.
- **`top_flips` 10K floor: mixed as an optimum, supported over the old 1K default.** At 2h with caps, 10K beats 1K in both older periods (+23.06M vs +13.93M; -5.82M vs -47.19M). A 5K floor wins in Apr–Jun (+26.79M), whereas 50K wins in Oct–Dec (+3.54M). Keep 10K as a compromise; do not describe it as a universal optimum.
- **30-minute quick-pick sell limit: confirmed in direction, not as a profitable strategy.** At a 2h horizon and 10K floor, it improves Apr–Jun from -14.86M to -7.01M (18/26 folds), and Oct–Dec from -31.93M to -30.37M (13/26 folds). The complete 2h/30m change beats the old 4h/1h setup in total in both periods, but remains loss-making in both.
- **App 2-hour horizon alone: mixed.** It improves totals over 4h at a 1h sell limit in both periods, but wins only 14/26 Oct–Dec folds, and the training-fold mode there is 8h. Keep the shorter horizon as a conservative setting, not a claim of stable returns.
- **Ask cap: mixed by period, valuable in the adverse period.** At 2h/10K, `top_flips` without the cap loses 48.94M in Oct–Dec versus 5.82M with it. Retain the cap.
- **10K for every app strategy: mixed.** Dips consistently tunes toward a lower floor and longer patience; do not extrapolate the quick-pick settings to all modes. No additional production defaults change in this follow-up.

These results refute the stronger claim that the current defaults are consistently profitable across market periods. Retuning itself can also fail: Oct–Dec walk-forward totals are -34.50M for `plan_flips`, -59.37M for `top_flips`, and -37.58M for app quick. A risk-off warning alone is not evidence that losses are avoided.

## Detailed comparisons


**Walk-forward summary per window**

| Window | Family | WF OOS | shipped-default OOS | consensus | consensus beat default | modal choices |
|---|---|---:|---:|---|---:|---|
| Apr-Jun | plan_flips | 19.38M | 20.56M | max_fill_hours=2 min_volume=5000 ask_cap=false 12.52M | 13/26 | max_fill_hours 2:26; min_volume 5000:17 10000:5 1000:2 25000:2; ask_cap false:13 true:13 |
| Apr-Jun | top_flips | 11.47M | 23.06M | max_fill_hours=2 min_volume=5000 ask_cap=false 29.21M | 15/26 | max_fill_hours 2:14 4:8 8:4; min_volume 5000:17 1000:5 50000:3 10000:1; ask_cap false:13 true:13 |
| Apr-Jun | app quick | -15.96M | -19.55M | horizon_hours=2 max_sell_hours=0.5 min_day_trades=5000 -12.76M | 17/26 | horizon_hours 2:11 8:9 4:6; max_sell_hours 0.5:16 1:4 2:3 4:3; min_day_trades 5000:14 2000:7 25000:2 50000:2 10000:1 |
| Apr-Jun | app overnight | 13.63M | 8.09M | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 25.29M | 19/26 | horizon_hours 12:17 8:7 4:2; max_sell_hours 0.5:19 4:3 1:2 2:2; min_day_trades 2000:8 5000:8 10000:6 25000:2 50000:2 |
| Apr-Jun | app dips | 12.94M | 10.06M | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 13.36M | 21/26 | horizon_hours 8:26; max_sell_hours 4:16 2:7 1:3; min_day_trades 2000:14 5000:7 10000:4 50000:1 |
| Oct-Dec | plan_flips | -34.50M | -25.47M | max_fill_hours=2 min_volume=5000 ask_cap=true -23.14M | 12/26 | max_fill_hours 2:21 12:5; min_volume 5000:9 50000:8 1000:4 10000:4 25000:1; ask_cap true:25 false:1 |
| Oct-Dec | top_flips | -59.37M | -5.82M | max_fill_hours=2 min_volume=25000 ask_cap=true -27.98M | 12/26 | max_fill_hours 2:19 4:4 8:2 12:1; min_volume 25000:10 10000:8 50000:6 5000:2; ask_cap true:20 false:6 |
| Oct-Dec | app quick | -37.58M | -34.47M | horizon_hours=8 max_sell_hours=0.5 min_day_trades=10000 -34.64M | 15/26 | horizon_hours 8:13 2:9 4:4; max_sell_hours 0.5:12 1:6 2:4 4:4; min_day_trades 10000:6 50000:6 2000:5 25000:5 5000:4 |
| Oct-Dec | app overnight | 83k | -9.10M | horizon_hours=12 max_sell_hours=0.5 min_day_trades=5000 -20.26M | 16/26 | horizon_hours 12:17 8:6 4:3; max_sell_hours 0.5:17 1:4 2:3 4:2; min_day_trades 2000:7 5000:7 50000:5 10000:4 25000:3 |
| Oct-Dec | app dips | 23.54M | 17.42M | horizon_hours=8 max_sell_hours=4 min_day_trades=2000 20.40M | 18/26 | horizon_hours 8:26; max_sell_hours 4:19 2:6 0.5:1; min_day_trades 2000:12 5000:6 50000:4 10000:3 25000:1 |

**plan_flips: fill hours at 10k, ask cap (ref = new default 2h/10k)**

| Variant | Apr-Jun OOS | >0 | beats ref | losing | Oct-Dec OOS | >0 | beats ref | losing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2h / 10k | 20.56M | 22/26 | ref | 12% | -25.47M | 16/26 | ref | 18% |
| 4h / 10k | 3.45M | 16/26 | 5/26 | 19% | -33.39M | 10/26 | 5/26 | 28% |
| 8h / 10k | -13.04M | 8/26 | 4/26 | 32% | -30.12M | 9/26 | 6/26 | 33% |
| 12h / 10k | -14.88M | 11/26 | 3/26 | 35% | -27.74M | 8/26 | 5/26 | 36% |

**plan_flips: min volume at 2h, ask cap (ref = 10k)**

| Variant | Apr-Jun OOS | >0 | beats ref | losing | Oct-Dec OOS | >0 | beats ref | losing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2h / 1k | 7.81M | 15/26 | 8/26 | 15% | -25.10M | 14/26 | 11/26 | 20% |
| 2h / 5k | 22.02M | 22/26 | 12/26 | 13% | -23.14M | 13/26 | 12/26 | 20% |
| 2h / 10k | 20.56M | 22/26 | ref | 12% | -25.47M | 16/26 | ref | 18% |
| 2h / 25k | 19.11M | 25/26 | 12/26 | 12% | -25.57M | 16/26 | 9/26 | 19% |
| 2h / 50k | 18.09M | 23/26 | 8/26 | 12% | -22.83M | 14/26 | 13/26 | 18% |

**top_flips: fill hours at 10k, ask cap (ref = new default 2h/10k)**

| Variant | Apr-Jun OOS | >0 | beats ref | losing | Oct-Dec OOS | >0 | beats ref | losing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2h / 10k | 23.06M | 23/26 | ref | 6% | -5.82M | 17/26 | ref | 11% |
| 4h / 10k | 20.19M | 23/26 | 16/26 | 9% | -49.24M | 14/26 | 8/26 | 10% |
| 8h / 10k | 15.06M | 21/26 | 11/26 | 11% | -38.98M | 10/26 | 6/26 | 15% |
| 12h / 10k | -6.33M | 14/26 | 9/26 | 14% | -34.44M | 7/26 | 5/26 | 15% |

**top_flips: min volume at 2h, ask cap (ref = 10k)**

| Variant | Apr-Jun OOS | >0 | beats ref | losing | Oct-Dec OOS | >0 | beats ref | losing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2h / 1k | 13.93M | 20/26 | 8/26 | 8% | -47.19M | 9/26 | 6/26 | 13% |
| 2h / 5k | 26.79M | 23/26 | 20/26 | 6% | -15.72M | 14/26 | 10/26 | 11% |
| 2h / 10k | 23.06M | 23/26 | ref | 6% | -5.82M | 17/26 | ref | 11% |
| 2h / 25k | 21.05M | 25/26 | 10/26 | 6% | -27.98M | 15/26 | 12/26 | 10% |
| 2h / 50k | 21.48M | 24/26 | 10/26 | 6% | 3.54M | 16/26 | 15/26 | 10% |

**top_flips: min volume at 2h, no ask cap (ref = 10k)**

| Variant | Apr-Jun OOS | >0 | beats ref | losing | Oct-Dec OOS | >0 | beats ref | losing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2h / 1k no cap | 3.55M | 17/26 | 8/26 | 12% | -42.50M | 8/26 | 9/26 | 14% |
| 2h / 5k no cap | 29.21M | 24/26 | 17/26 | 9% | -38.15M | 12/26 | 7/26 | 16% |
| 2h / 10k no cap | 17.24M | 22/26 | ref | 9% | -48.94M | 14/26 | ref | 13% |
| 2h / 25k no cap | 18.41M | 24/26 | 15/26 | 8% | -45.93M | 14/26 | 14/26 | 14% |
| 2h / 50k no cap | 18.84M | 24/26 | 15/26 | 8% | -45.64M | 13/26 | 13/26 | 13% |

**top_flips: old default vs new (ref = old 8h/1k)**

| Variant | Apr-Jun OOS | >0 | beats ref | losing | Oct-Dec OOS | >0 | beats ref | losing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 8h / 1k | 1.31M | 14/26 | ref | 14% | -46.31M | 6/26 | ref | 12% |
| 2h / 10k | 23.06M | 23/26 | 18/26 | 6% | -5.82M | 17/26 | 20/26 | 11% |
| 2h / 5k | 26.79M | 23/26 | 18/26 | 6% | -15.72M | 14/26 | 19/26 | 11% |

**top_flips: which floor is best per test window (max_fill_hours=2 ask_cap=true)**

| Window | 1000 | 5000 | 10000 | 25000 | 50000 |
|---|---:|---:|---:|---:|---:|
| Apr-Jun | 3 | 13 | 2 | 5 | 3 |
| Oct-Dec | 2 | 4 | 7 | 4 | 9 |

**plan_flips: which floor is best per test window (max_fill_hours=2 ask_cap=true)**

| Window | 1000 | 5000 | 10000 | 25000 | 50000 |
|---|---:|---:|---:|---:|---:|
| Apr-Jun | 6 | 8 | 7 | 3 | 2 |
| Oct-Dec | 6 | 7 | 5 | 3 | 5 |

**app quick: horizon x sell limit (ref = old default h4 s1)**

| Variant | Apr-Jun OOS | >0 | beats ref | losing | Oct-Dec OOS | >0 | beats ref | losing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| h4 s1 10k | -19.55M | 10/26 | ref | 24% | -34.47M | 7/26 | ref | 30% |
| h2 s1 10k | -14.86M | 12/26 | 18/26 | 20% | -31.93M | 9/26 | 14/26 | 32% |
| h4 s0.5 10k | -13.77M | 12/26 | 18/26 | 18% | -31.19M | 11/26 | 15/26 | 22% |
| h2 s0.5 10k | -7.01M | 13/26 | 18/26 | 19% | -30.37M | 12/26 | 16/26 | 24% |
| h2 s2 10k | -17.88M | 10/26 | 11/26 | 27% | -34.18M | 5/26 | 10/26 | 36% |
| h8 s1 10k | -15.70M | 9/26 | 13/26 | 24% | -32.11M | 9/26 | 14/26 | 28% |

**app quick: sell limit at h2 (ref = s1)**

| Variant | Apr-Jun OOS | >0 | beats ref | losing | Oct-Dec OOS | >0 | beats ref | losing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| h2 s0.5 10k | -7.01M | 13/26 | 18/26 | 19% | -30.37M | 12/26 | 13/26 | 24% |
| h2 s1 10k | -14.86M | 12/26 | ref | 20% | -31.93M | 9/26 | ref | 32% |
| h2 s2 10k | -17.88M | 10/26 | 8/26 | 27% | -34.18M | 5/26 | 10/26 | 36% |
| h2 s4 10k | -17.88M | 10/26 | 8/26 | 27% | -34.18M | 5/26 | 10/26 | 36% |

**app quick: floor at h2 s0.5 (ref = 10k)**

| Variant | Apr-Jun OOS | >0 | beats ref | losing | Oct-Dec OOS | >0 | beats ref | losing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| h2 s0.5 2k | -22.57M | 11/26 | 8/26 | 20% | -30.27M | 11/26 | 12/26 | 24% |
| h2 s0.5 5k | -12.76M | 13/26 | 15/26 | 20% | -30.28M | 12/26 | 12/26 | 25% |
| h2 s0.5 10k | -7.01M | 13/26 | ref | 19% | -30.37M | 12/26 | ref | 24% |
| h2 s0.5 25k | -7.95M | 12/26 | 9/26 | 19% | -34.88M | 14/26 | 12/26 | 23% |
| h2 s0.5 50k | -6.01M | 12/26 | 10/26 | 18% | -34.06M | 13/26 | 11/26 | 22% |

**app overnight: horizon x sell limit (ref = default h8 s1)**

| Variant | Apr-Jun OOS | >0 | beats ref | losing | Oct-Dec OOS | >0 | beats ref | losing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| h8 s1 10k | 8.09M | 19/26 | ref | 11% | -9.10M | 15/26 | ref | 12% |
| h8 s0.5 10k | 25.45M | 21/26 | 21/26 | 9% | -17.58M | 17/26 | 17/26 | 10% |
| h4 s1 10k | 5.89M | 18/26 | 14/26 | 11% | -16.01M | 13/26 | 12/26 | 14% |
| h4 s0.5 10k | 18.09M | 20/26 | 14/26 | 10% | -22.47M | 16/26 | 17/26 | 9% |
| h12 s1 10k | 5.48M | 19/26 | 11/26 | 11% | -25.63M | 15/26 | 13/26 | 12% |
| h8 s2 10k | 4.66M | 14/26 | 13/26 | 13% | -18.02M | 12/26 | 12/26 | 17% |

**app overnight: floor at h8 s1 (ref = 10k)**

| Variant | Apr-Jun OOS | >0 | beats ref | losing | Oct-Dec OOS | >0 | beats ref | losing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| h8 s1 2k | 7.80M | 18/26 | 15/26 | 13% | -23.71M | 13/26 | 13/26 | 11% |
| h8 s1 5k | 10.43M | 20/26 | 14/26 | 12% | -25.93M | 17/26 | 15/26 | 12% |
| h8 s1 10k | 8.09M | 19/26 | ref | 11% | -9.10M | 15/26 | ref | 12% |
| h8 s1 25k | 233k | 18/26 | 9/26 | 11% | -16.33M | 17/26 | 13/26 | 13% |
| h8 s1 50k | -1.07M | 18/26 | 6/26 | 10% | -11.55M | 17/26 | 13/26 | 14% |

**app dips: horizon x sell limit (ref = default h4 s1)**

| Variant | Apr-Jun OOS | >0 | beats ref | losing | Oct-Dec OOS | >0 | beats ref | losing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| h4 s1 10k | 10.06M | 26/26 | ref | 3% | 17.42M | 23/26 | ref | 9% |
| h4 s0.5 10k | 8.84M | 26/26 | 3/26 | 3% | 15.54M | 25/26 | 7/26 | 8% |
| h8 s1 10k | 11.61M | 26/26 | 23/26 | 3% | 18.63M | 23/26 | 18/26 | 10% |
| h8 s4 10k | 12.50M | 25/26 | 23/26 | 5% | 19.40M | 22/26 | 17/26 | 12% |
| h2 s1 10k | 7.47M | 26/26 | 0/26 | 3% | 12.72M | 25/26 | 5/26 | 8% |

**app dips: floor at h4 s1 (ref = 10k)**

| Variant | Apr-Jun OOS | >0 | beats ref | losing | Oct-Dec OOS | >0 | beats ref | losing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| h4 s1 2k | 10.72M | 26/26 | 16/26 | 5% | 17.77M | 23/26 | 16/26 | 10% |
| h4 s1 5k | 10.40M | 26/26 | 15/26 | 4% | 17.95M | 23/26 | 16/26 | 9% |
| h4 s1 10k | 10.06M | 26/26 | ref | 3% | 17.42M | 23/26 | ref | 9% |
| h4 s1 25k | 9.33M | 26/26 | 6/26 | 3% | 16.78M | 26/26 | 13/26 | 8% |

**Sensitivity (fixed defaults/consensus under other simulator rules)**

| Window | Family | which | variant | setting | OOS | >0 |
|---|---|---|---|---|---:|---:|
| Apr-Jun | plan_flips | default | plan_flips max_fill_hours=2 min_volume=10000 | queue share 10% | 16.89M | 22/26 |
| Apr-Jun | plan_flips | consensus | plan_flips max_fill_hours=2 min_volume=5000 (pre-fix: uncapped ask) | queue share 10% | 15.38M | 22/26 |
| Apr-Jun | top_flips | default | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=10000 | queue share 10% | 20.38M | 23/26 |
| Apr-Jun | top_flips | consensus | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=5000 (pre-fix: uncapped ask) | queue share 10% | 27.06M | 24/26 |
| Apr-Jun | app quick | default | App Buy now: quick, fill-aware (horizon 4h, sell <= 1h, 10000/day) | queue share 10% | -18.64M | 6/26 |
| Apr-Jun | app quick | consensus | App Buy now: quick, fill-aware (horizon 2h, sell <= 0.5h, 5000/day) | queue share 10% | -12.15M | 13/26 |
| Apr-Jun | app overnight | default | App Buy now: overnight, fill-aware (horizon 8h, sell <= 1h, 10000/day) | queue share 10% | -1.00M | 19/26 |
| Apr-Jun | app overnight | consensus | App Buy now: overnight, fill-aware (horizon 12h, sell <= 0.5h, 5000/day) | queue share 10% | 21.46M | 21/26 |
| Apr-Jun | app dips | default | App Buy now: dips, fill-aware (horizon 4h, sell <= 1h, 10000/day) | queue share 10% | 8.39M | 26/26 |
| Apr-Jun | app dips | consensus | App Buy now: dips, fill-aware (horizon 8h, sell <= 4h, 2000/day) | queue share 10% | 10.05M | 25/26 |
| Apr-Jun | plan_flips | default | plan_flips max_fill_hours=2 min_volume=10000 | queue share 25% | 20.56M | 22/26 |
| Apr-Jun | plan_flips | consensus | plan_flips max_fill_hours=2 min_volume=5000 (pre-fix: uncapped ask) | queue share 25% | 12.52M | 21/26 |
| Apr-Jun | top_flips | default | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=10000 | queue share 25% | 23.06M | 23/26 |
| Apr-Jun | top_flips | consensus | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=5000 (pre-fix: uncapped ask) | queue share 25% | 29.21M | 24/26 |
| Apr-Jun | app quick | default | App Buy now: quick, fill-aware (horizon 4h, sell <= 1h, 10000/day) | queue share 25% | -19.55M | 10/26 |
| Apr-Jun | app quick | consensus | App Buy now: quick, fill-aware (horizon 2h, sell <= 0.5h, 5000/day) | queue share 25% | -12.76M | 13/26 |
| Apr-Jun | app overnight | default | App Buy now: overnight, fill-aware (horizon 8h, sell <= 1h, 10000/day) | queue share 25% | 8.09M | 19/26 |
| Apr-Jun | app overnight | consensus | App Buy now: overnight, fill-aware (horizon 12h, sell <= 0.5h, 5000/day) | queue share 25% | 25.29M | 22/26 |
| Apr-Jun | app dips | default | App Buy now: dips, fill-aware (horizon 4h, sell <= 1h, 10000/day) | queue share 25% | 10.06M | 26/26 |
| Apr-Jun | app dips | consensus | App Buy now: dips, fill-aware (horizon 8h, sell <= 4h, 2000/day) | queue share 25% | 13.36M | 25/26 |
| Apr-Jun | plan_flips | default | plan_flips max_fill_hours=2 min_volume=10000 | queue share 50% | 20.70M | 21/26 |
| Apr-Jun | plan_flips | consensus | plan_flips max_fill_hours=2 min_volume=5000 (pre-fix: uncapped ask) | queue share 50% | 14.70M | 22/26 |
| Apr-Jun | top_flips | default | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=10000 | queue share 50% | 23.09M | 23/26 |
| Apr-Jun | top_flips | consensus | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=5000 (pre-fix: uncapped ask) | queue share 50% | 32.64M | 24/26 |
| Apr-Jun | app quick | default | App Buy now: quick, fill-aware (horizon 4h, sell <= 1h, 10000/day) | queue share 50% | -19.80M | 8/26 |
| Apr-Jun | app quick | consensus | App Buy now: quick, fill-aware (horizon 2h, sell <= 0.5h, 5000/day) | queue share 50% | -10.40M | 15/26 |
| Apr-Jun | app overnight | default | App Buy now: overnight, fill-aware (horizon 8h, sell <= 1h, 10000/day) | queue share 50% | 7.72M | 18/26 |
| Apr-Jun | app overnight | consensus | App Buy now: overnight, fill-aware (horizon 12h, sell <= 0.5h, 5000/day) | queue share 50% | 28.40M | 21/26 |
| Apr-Jun | app dips | default | App Buy now: dips, fill-aware (horizon 4h, sell <= 1h, 10000/day) | queue share 50% | 11.14M | 26/26 |
| Apr-Jun | app dips | consensus | App Buy now: dips, fill-aware (horizon 8h, sell <= 4h, 2000/day) | queue share 50% | 16.45M | 26/26 |
| Apr-Jun | plan_flips | default | plan_flips max_fill_hours=2 min_volume=10000 | dump after 12h | 10.89M | 20/26 |
| Apr-Jun | plan_flips | consensus | plan_flips max_fill_hours=2 min_volume=5000 (pre-fix: uncapped ask) | dump after 12h | 2.37M | 18/26 |
| Apr-Jun | top_flips | default | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=10000 | dump after 12h | 16.48M | 23/26 |
| Apr-Jun | top_flips | consensus | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=5000 (pre-fix: uncapped ask) | dump after 12h | 11.69M | 20/26 |
| Apr-Jun | app quick | default | App Buy now: quick, fill-aware (horizon 4h, sell <= 1h, 10000/day) | dump after 12h | -21.79M | 3/26 |
| Apr-Jun | app quick | consensus | App Buy now: quick, fill-aware (horizon 2h, sell <= 0.5h, 5000/day) | dump after 12h | -10.93M | 11/26 |
| Apr-Jun | app overnight | default | App Buy now: overnight, fill-aware (horizon 8h, sell <= 1h, 10000/day) | dump after 12h | 1.62M | 17/26 |
| Apr-Jun | app overnight | consensus | App Buy now: overnight, fill-aware (horizon 12h, sell <= 0.5h, 5000/day) | dump after 12h | 17.43M | 20/26 |
| Apr-Jun | app dips | default | App Buy now: dips, fill-aware (horizon 4h, sell <= 1h, 10000/day) | dump after 12h | 9.54M | 26/26 |
| Apr-Jun | app dips | consensus | App Buy now: dips, fill-aware (horizon 8h, sell <= 4h, 2000/day) | dump after 12h | 11.70M | 25/26 |
| Apr-Jun | plan_flips | default | plan_flips max_fill_hours=2 min_volume=10000 | dump after 48h | 15.61M | 22/26 |
| Apr-Jun | plan_flips | consensus | plan_flips max_fill_hours=2 min_volume=5000 (pre-fix: uncapped ask) | dump after 48h | 7.13M | 18/26 |
| Apr-Jun | top_flips | default | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=10000 | dump after 48h | 19.15M | 22/26 |
| Apr-Jun | top_flips | consensus | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=5000 (pre-fix: uncapped ask) | dump after 48h | 14.89M | 21/26 |
| Apr-Jun | app quick | default | App Buy now: quick, fill-aware (horizon 4h, sell <= 1h, 10000/day) | dump after 48h | -16.51M | 10/26 |
| Apr-Jun | app quick | consensus | App Buy now: quick, fill-aware (horizon 2h, sell <= 0.5h, 5000/day) | dump after 48h | 164k | 17/26 |
| Apr-Jun | app overnight | default | App Buy now: overnight, fill-aware (horizon 8h, sell <= 1h, 10000/day) | dump after 48h | 9.33M | 19/26 |
| Apr-Jun | app overnight | consensus | App Buy now: overnight, fill-aware (horizon 12h, sell <= 0.5h, 5000/day) | dump after 48h | 24.90M | 20/26 |
| Apr-Jun | app dips | default | App Buy now: dips, fill-aware (horizon 4h, sell <= 1h, 10000/day) | dump after 48h | 9.95M | 26/26 |
| Apr-Jun | app dips | consensus | App Buy now: dips, fill-aware (horizon 8h, sell <= 4h, 2000/day) | dump after 48h | 12.79M | 25/26 |
| Oct-Dec | plan_flips | default | plan_flips max_fill_hours=2 min_volume=10000 | queue share 10% | -27.85M | 16/26 |
| Oct-Dec | plan_flips | consensus | plan_flips max_fill_hours=2 min_volume=5000 | queue share 10% | -24.92M | 12/26 |
| Oct-Dec | top_flips | default | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=10000 | queue share 10% | -5.76M | 19/26 |
| Oct-Dec | top_flips | consensus | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=25000 | queue share 10% | -28.38M | 15/26 |
| Oct-Dec | app quick | default | App Buy now: quick, fill-aware (horizon 4h, sell <= 1h, 10000/day) | queue share 10% | -29.18M | 9/26 |
| Oct-Dec | app quick | consensus | App Buy now: quick, fill-aware (horizon 8h, sell <= 0.5h, 10000/day) | queue share 10% | -38.47M | 8/26 |
| Oct-Dec | app overnight | default | App Buy now: overnight, fill-aware (horizon 8h, sell <= 1h, 10000/day) | queue share 10% | -26.17M | 16/26 |
| Oct-Dec | app overnight | consensus | App Buy now: overnight, fill-aware (horizon 12h, sell <= 0.5h, 5000/day) | queue share 10% | -19.91M | 16/26 |
| Oct-Dec | app dips | default | App Buy now: dips, fill-aware (horizon 4h, sell <= 1h, 10000/day) | queue share 10% | 14.66M | 23/26 |
| Oct-Dec | app dips | consensus | App Buy now: dips, fill-aware (horizon 8h, sell <= 4h, 2000/day) | queue share 10% | 11.50M | 19/26 |
| Oct-Dec | plan_flips | default | plan_flips max_fill_hours=2 min_volume=10000 | queue share 25% | -25.47M | 16/26 |
| Oct-Dec | plan_flips | consensus | plan_flips max_fill_hours=2 min_volume=5000 | queue share 25% | -23.14M | 13/26 |
| Oct-Dec | top_flips | default | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=10000 | queue share 25% | -5.82M | 17/26 |
| Oct-Dec | top_flips | consensus | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=25000 | queue share 25% | -27.98M | 15/26 |
| Oct-Dec | app quick | default | App Buy now: quick, fill-aware (horizon 4h, sell <= 1h, 10000/day) | queue share 25% | -34.47M | 7/26 |
| Oct-Dec | app quick | consensus | App Buy now: quick, fill-aware (horizon 8h, sell <= 0.5h, 10000/day) | queue share 25% | -34.64M | 10/26 |
| Oct-Dec | app overnight | default | App Buy now: overnight, fill-aware (horizon 8h, sell <= 1h, 10000/day) | queue share 25% | -9.10M | 15/26 |
| Oct-Dec | app overnight | consensus | App Buy now: overnight, fill-aware (horizon 12h, sell <= 0.5h, 5000/day) | queue share 25% | -20.26M | 16/26 |
| Oct-Dec | app dips | default | App Buy now: dips, fill-aware (horizon 4h, sell <= 1h, 10000/day) | queue share 25% | 17.42M | 23/26 |
| Oct-Dec | app dips | consensus | App Buy now: dips, fill-aware (horizon 8h, sell <= 4h, 2000/day) | queue share 25% | 20.40M | 21/26 |
| Oct-Dec | plan_flips | default | plan_flips max_fill_hours=2 min_volume=10000 | queue share 50% | -28.30M | 15/26 |
| Oct-Dec | plan_flips | consensus | plan_flips max_fill_hours=2 min_volume=5000 | queue share 50% | -22.24M | 13/26 |
| Oct-Dec | top_flips | default | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=10000 | queue share 50% | 1.97M | 20/26 |
| Oct-Dec | top_flips | consensus | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=25000 | queue share 50% | -22.28M | 16/26 |
| Oct-Dec | app quick | default | App Buy now: quick, fill-aware (horizon 4h, sell <= 1h, 10000/day) | queue share 50% | -31.93M | 10/26 |
| Oct-Dec | app quick | consensus | App Buy now: quick, fill-aware (horizon 8h, sell <= 0.5h, 10000/day) | queue share 50% | -31.95M | 14/26 |
| Oct-Dec | app overnight | default | App Buy now: overnight, fill-aware (horizon 8h, sell <= 1h, 10000/day) | queue share 50% | -10.38M | 15/26 |
| Oct-Dec | app overnight | consensus | App Buy now: overnight, fill-aware (horizon 12h, sell <= 0.5h, 5000/day) | queue share 50% | -21.92M | 17/26 |
| Oct-Dec | app dips | default | App Buy now: dips, fill-aware (horizon 4h, sell <= 1h, 10000/day) | queue share 50% | 19.43M | 24/26 |
| Oct-Dec | app dips | consensus | App Buy now: dips, fill-aware (horizon 8h, sell <= 4h, 2000/day) | queue share 50% | 25.72M | 22/26 |
| Oct-Dec | plan_flips | default | plan_flips max_fill_hours=2 min_volume=10000 | dump after 12h | -29.03M | 13/26 |
| Oct-Dec | plan_flips | consensus | plan_flips max_fill_hours=2 min_volume=5000 | dump after 12h | -27.66M | 11/26 |
| Oct-Dec | top_flips | default | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=10000 | dump after 12h | -9.74M | 17/26 |
| Oct-Dec | top_flips | consensus | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=25000 | dump after 12h | -12.98M | 17/26 |
| Oct-Dec | app quick | default | App Buy now: quick, fill-aware (horizon 4h, sell <= 1h, 10000/day) | dump after 12h | -29.36M | 6/26 |
| Oct-Dec | app quick | consensus | App Buy now: quick, fill-aware (horizon 8h, sell <= 0.5h, 10000/day) | dump after 12h | -27.29M | 11/26 |
| Oct-Dec | app overnight | default | App Buy now: overnight, fill-aware (horizon 8h, sell <= 1h, 10000/day) | dump after 12h | -14.80M | 11/26 |
| Oct-Dec | app overnight | consensus | App Buy now: overnight, fill-aware (horizon 12h, sell <= 0.5h, 5000/day) | dump after 12h | -7.22M | 17/26 |
| Oct-Dec | app dips | default | App Buy now: dips, fill-aware (horizon 4h, sell <= 1h, 10000/day) | dump after 12h | 15.15M | 23/26 |
| Oct-Dec | app dips | consensus | App Buy now: dips, fill-aware (horizon 8h, sell <= 4h, 2000/day) | dump after 12h | 15.21M | 21/26 |
| Oct-Dec | plan_flips | default | plan_flips max_fill_hours=2 min_volume=10000 | dump after 48h | -22.86M | 14/26 |
| Oct-Dec | plan_flips | consensus | plan_flips max_fill_hours=2 min_volume=5000 | dump after 48h | -25.61M | 16/26 |
| Oct-Dec | top_flips | default | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=10000 | dump after 48h | -10.18M | 14/26 |
| Oct-Dec | top_flips | consensus | top_flips sort=gp_per_hour max_fill_hours=2 min_volume=25000 | dump after 48h | -16.17M | 16/26 |
| Oct-Dec | app quick | default | App Buy now: quick, fill-aware (horizon 4h, sell <= 1h, 10000/day) | dump after 48h | -31.97M | 7/26 |
| Oct-Dec | app quick | consensus | App Buy now: quick, fill-aware (horizon 8h, sell <= 0.5h, 10000/day) | dump after 48h | -34.76M | 11/26 |
| Oct-Dec | app overnight | default | App Buy now: overnight, fill-aware (horizon 8h, sell <= 1h, 10000/day) | dump after 48h | -12.44M | 16/26 |
| Oct-Dec | app overnight | consensus | App Buy now: overnight, fill-aware (horizon 12h, sell <= 0.5h, 5000/day) | dump after 48h | -20.55M | 15/26 |
| Oct-Dec | app dips | default | App Buy now: dips, fill-aware (horizon 4h, sell <= 1h, 10000/day) | dump after 48h | 18.56M | 24/26 |
| Oct-Dec | app dips | consensus | App Buy now: dips, fill-aware (horizon 8h, sell <= 4h, 2000/day) | dump after 48h | 20.07M | 20/26 |

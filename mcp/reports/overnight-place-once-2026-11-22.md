# GE Metrics overnight backtest: place once, sleep, wake up

Generated 2026-11-22 23:01Z by `npm run backtest -- --overnight` (mcp/src/backtest/overnight). Data: OSRS Wiki /1h and /5m historical snapshots.

## Setup

- Each night a fresh stack (10M, 50M, 200M; no carry-over) and 8 GE slots. At the evening hour the app's Overnight list is rebuilt from what was visible then (no lookahead): rankOvernightFlips, pumps removed, the app's canonical offer (mobile/src/lib/offer.ts, vendored unchanged) with the top rows refined from their last 24 hourly points, then planCashStack across the slots.
- Offers are placed **once**. No re-decisions: a slot that finishes in the night stays empty. An order may be for more than one buy limit (the GE reserves the cash and fills at most one limit per rolling 4h).
- Fills: the same hourly model as the 4h backtests (a share of each hour's flow at or through the price, 25% at the typical price). The sell starts the hour after the buy completes.
- After 10h asleep, unfilled buy offers are cancelled (cash back) and leftover stock is marked at the morning instant-sell price (the last hour's average low) minus tax. Realized = after tax, incl. those marks.
- Variants: sizing horizon 8h (2 buy-limit windows, today) or 12h (3), and the slowest sell allowed 0.5h (today), 1h, 2h, 4h, 10h (with 8h sizing, anything above 8h is the same as 8h).
- Beat today = nights this variant made more than today's model. Cash placed = average cash put into buy offers at the evening hour (the rest sits idle all night).

## Offers placed at 22:00 UTC

180 nights, 2026-05-26 22:00Z to 2026-11-21 22:00Z. Decision (pre-set rule, 10h night): **keep today's model**: no variant beats the baseline on both total profit and worst night at every budget.

| Variant | 10.00M: per night / total / worst | 50.00M: per night / total / worst | 200.00M: per night / total / worst |
|---|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 271.8k / 48.92M / -491.8k | 124.6k / 22.42M / -2.28M | 105.6k / 19.00M / -8.94M |
| sized 8h, sell <= 1h | 319.6k / 57.54M / -530.8k | 67.3k / 12.11M / -2.32M | -14.1k / -2.54M / -8.98M |
| sized 8h, sell <= 2h | 356.6k / 64.19M / -764.1k | -8.3k / -1.50M / -2.59M | -178.0k / -32.04M / -8.07M |
| sized 8h, sell <= 4h | 320.4k / 57.67M / -1.81M | -89.8k / -16.16M / -2.75M | -357.0k / -64.26M / -8.26M |
| sized 8h, sell <= 10h | 299.9k / 53.99M / -1.88M | -73.8k / -13.28M / -2.86M | -445.6k / -80.20M / -8.84M |
| sized 12h, sell <= 0.5h | 238.5k / 42.93M / -455.6k | 35.2k / 6.34M / -2.10M | -37.8k / -6.80M / -9.10M |
| sized 12h, sell <= 1h | 286.3k / 51.54M / -533.4k | -12.6k / -2.27M / -2.32M | -129.7k / -23.35M / -9.03M |
| sized 12h, sell <= 2h | 291.9k / 52.54M / -451.6k | -105.9k / -19.07M / -3.99M | -381.9k / -68.74M / -8.23M |
| sized 12h, sell <= 4h | 241.6k / 43.49M / -1.84M | -272.0k / -48.97M / -3.67M | -726.8k / -130.82M / -8.50M |
| sized 12h, sell <= 10h | 239.7k / 43.15M / -930.0k | -312.1k / -56.17M / -3.25M | -1.03M / -184.78M / -8.39M |

### 10.00M stack, 8h night (sensitivity)

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 208.4k | 162.1k | 37.51M | -670.5k | 138/180 |  | 9.88M | 420.1k | 96% | 87% |
| sized 8h, sell <= 1h | 260.9k | 189.4k | 46.97M | -599.0k | 138/180 | 121/180 | 9.87M | 512.5k | 96% | 85% |
| sized 8h, sell <= 2h | 305.6k | 183.9k | 55.02M | -647.2k | 144/180 | 119/180 | 9.95M | 595.1k | 95% | 84% |
| sized 8h, sell <= 4h | 287.7k | 171.4k | 51.79M | -439.8k | 142/180 | 123/180 | 9.97M | 644.8k | 95% | 83% |
| sized 8h, sell <= 10h | 268.3k | 153.0k | 48.30M | -532.3k | 136/180 | 119/180 | 9.98M | 659.7k | 95% | 82% |
| sized 12h, sell <= 0.5h | 43.1k | 58.5k | 7.76M | -572.2k | 119/180 | 37/180 | 9.88M | 503.8k | 74% | 26% |
| sized 12h, sell <= 1h | 85.9k | 76.6k | 15.46M | -581.1k | 122/180 | 49/180 | 9.92M | 617.8k | 74% | 31% |
| sized 12h, sell <= 2h | 108.2k | 57.5k | 19.48M | -683.4k | 118/180 | 64/180 | 9.95M | 689.7k | 74% | 30% |
| sized 12h, sell <= 4h | 77.7k | 40.1k | 13.99M | -535.4k | 114/180 | 51/180 | 9.97M | 764.3k | 72% | 28% |
| sized 12h, sell <= 10h | 69.8k | 49.8k | 12.57M | -506.9k | 118/180 | 62/180 | 9.98M | 809.1k | 72% | 26% |

### 50.00M stack, 8h night (sensitivity)

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | -75.3k | -40.4k | -13.55M | -2.31M | 82/180 |  | 42.78M | 729.9k | 93% | 82% |
| sized 8h, sell <= 1h | -134.0k | -180.5k | -24.12M | -2.71M | 67/180 | 85/180 | 45.77M | 862.3k | 93% | 81% |
| sized 8h, sell <= 2h | -184.9k | -233.4k | -33.29M | -3.36M | 66/180 | 79/180 | 48.09M | 1.01M | 94% | 80% |
| sized 8h, sell <= 4h | -273.6k | -285.7k | -49.24M | -3.32M | 62/180 | 72/180 | 48.21M | 1.12M | 93% | 76% |
| sized 8h, sell <= 10h | -246.4k | -236.2k | -44.35M | -3.12M | 59/180 | 69/180 | 48.13M | 1.15M | 93% | 75% |
| sized 12h, sell <= 0.5h | -311.6k | -307.5k | -56.09M | -2.60M | 46/180 | 24/180 | 45.39M | 845.4k | 70% | 21% |
| sized 12h, sell <= 1h | -302.3k | -297.1k | -54.41M | -2.81M | 48/180 | 36/180 | 47.57M | 1.01M | 70% | 28% |
| sized 12h, sell <= 2h | -388.6k | -340.1k | -69.94M | -3.25M | 39/180 | 46/180 | 48.83M | 1.19M | 71% | 17% |
| sized 12h, sell <= 4h | -482.4k | -421.7k | -86.82M | -3.83M | 37/180 | 46/180 | 49.31M | 1.40M | 64% | 3% |
| sized 12h, sell <= 10h | -481.6k | -415.8k | -86.69M | -3.83M | 29/180 | 51/180 | 49.29M | 1.51M | 64% | 1% |

### 200.00M stack, 8h night (sensitivity)

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | -646.4k | -47.8k | -116.35M | -10.26M | 85/180 |  | 133.85M | 1.66M | 93% | 82% |
| sized 8h, sell <= 1h | -754.3k | -296.7k | -135.77M | -10.06M | 68/180 | 85/180 | 138.80M | 1.80M | 93% | 82% |
| sized 8h, sell <= 2h | -899.0k | -563.1k | -161.82M | -9.75M | 62/180 | 74/180 | 145.01M | 1.97M | 93% | 79% |
| sized 8h, sell <= 4h | -1.07M | -749.0k | -192.98M | -9.04M | 50/180 | 64/180 | 150.46M | 2.09M | 93% | 75% |
| sized 8h, sell <= 10h | -1.18M | -882.0k | -212.08M | -9.04M | 48/180 | 58/180 | 152.79M | 2.13M | 93% | 73% |
| sized 12h, sell <= 0.5h | -908.3k | -290.6k | -163.49M | -10.56M | 54/180 | 19/180 | 137.78M | 1.78M | 70% | 22% |
| sized 12h, sell <= 1h | -969.9k | -554.3k | -174.58M | -10.21M | 58/180 | 32/180 | 142.91M | 1.96M | 70% | 28% |
| sized 12h, sell <= 2h | -1.18M | -813.4k | -211.55M | -10.11M | 48/180 | 36/180 | 151.81M | 2.19M | 70% | 16% |
| sized 12h, sell <= 4h | -1.43M | -1.20M | -257.47M | -9.99M | 38/180 | 29/180 | 158.09M | 2.43M | 64% | 3% |
| sized 12h, sell <= 10h | -1.63M | -1.49M | -292.56M | -10.00M | 37/180 | 32/180 | 164.87M | 2.59M | 63% | 1% |

### 10.00M stack, 10h night

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 271.8k | 236.3k | 48.92M | -491.8k | 159/180 |  | 9.88M | 420.1k | 97% | 93% |
| sized 8h, sell <= 1h | 319.6k | 243.5k | 57.54M | -530.8k | 158/180 | 122/180 | 9.87M | 512.5k | 97% | 91% |
| sized 8h, sell <= 2h | 356.6k | 263.1k | 64.19M | -764.1k | 157/180 | 117/180 | 9.95M | 595.1k | 97% | 89% |
| sized 8h, sell <= 4h | 320.4k | 242.2k | 57.67M | -1.81M | 150/180 | 116/180 | 9.97M | 644.8k | 96% | 88% |
| sized 8h, sell <= 10h | 299.9k | 213.5k | 53.99M | -1.88M | 143/180 | 105/180 | 9.98M | 659.7k | 96% | 86% |
| sized 12h, sell <= 0.5h | 238.5k | 160.0k | 42.93M | -455.6k | 142/180 | 67/180 | 9.88M | 503.8k | 92% | 67% |
| sized 12h, sell <= 1h | 286.3k | 151.2k | 51.54M | -533.4k | 147/180 | 83/180 | 9.92M | 617.8k | 92% | 65% |
| sized 12h, sell <= 2h | 291.9k | 173.1k | 52.54M | -451.6k | 146/180 | 84/180 | 9.95M | 689.7k | 91% | 59% |
| sized 12h, sell <= 4h | 241.6k | 115.3k | 43.49M | -1.84M | 130/180 | 77/180 | 9.97M | 764.3k | 91% | 59% |
| sized 12h, sell <= 10h | 239.7k | 137.9k | 43.15M | -930.0k | 133/180 | 73/180 | 9.98M | 809.1k | 91% | 59% |

### 50.00M stack, 10h night

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 124.6k | 120.7k | 22.42M | -2.28M | 113/180 |  | 42.78M | 729.9k | 94% | 88% |
| sized 8h, sell <= 1h | 67.3k | 35.2k | 12.11M | -2.32M | 95/180 | 88/180 | 45.77M | 862.3k | 95% | 87% |
| sized 8h, sell <= 2h | -8.3k | 15.9k | -1.50M | -2.59M | 93/180 | 81/180 | 48.09M | 1.01M | 95% | 86% |
| sized 8h, sell <= 4h | -89.8k | -63.6k | -16.16M | -2.75M | 77/180 | 64/180 | 48.21M | 1.12M | 94% | 83% |
| sized 8h, sell <= 10h | -73.8k | -74.4k | -13.28M | -2.86M | 80/180 | 69/180 | 48.13M | 1.15M | 95% | 83% |
| sized 12h, sell <= 0.5h | 35.2k | -48.2k | 6.34M | -2.10M | 85/180 | 61/180 | 45.39M | 845.4k | 88% | 60% |
| sized 12h, sell <= 1h | -12.6k | -72.8k | -2.27M | -2.32M | 81/180 | 66/180 | 47.57M | 1.01M | 88% | 60% |
| sized 12h, sell <= 2h | -105.9k | -100.4k | -19.07M | -3.99M | 77/180 | 61/180 | 48.83M | 1.19M | 89% | 48% |
| sized 12h, sell <= 4h | -272.0k | -196.8k | -48.97M | -3.67M | 61/180 | 48/180 | 49.31M | 1.40M | 90% | 30% |
| sized 12h, sell <= 10h | -312.1k | -255.9k | -56.17M | -3.25M | 57/180 | 50/180 | 49.29M | 1.51M | 89% | 26% |

### 200.00M stack, 10h night

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 105.6k | 211.3k | 19.00M | -8.94M | 112/180 |  | 133.85M | 1.66M | 94% | 89% |
| sized 8h, sell <= 1h | -14.1k | 97.4k | -2.54M | -8.98M | 95/180 | 86/180 | 138.80M | 1.80M | 95% | 87% |
| sized 8h, sell <= 2h | -178.0k | -122.5k | -32.04M | -8.07M | 84/180 | 73/180 | 145.01M | 1.97M | 95% | 84% |
| sized 8h, sell <= 4h | -357.0k | -294.1k | -64.26M | -8.26M | 73/180 | 59/180 | 150.46M | 2.09M | 94% | 82% |
| sized 8h, sell <= 10h | -445.6k | -314.8k | -80.20M | -8.84M | 74/180 | 54/180 | 152.79M | 2.13M | 94% | 81% |
| sized 12h, sell <= 0.5h | -37.8k | 15.6k | -6.80M | -9.10M | 92/180 | 54/180 | 137.78M | 1.78M | 88% | 61% |
| sized 12h, sell <= 1h | -129.7k | -171.2k | -23.35M | -9.03M | 81/180 | 59/180 | 142.91M | 1.96M | 88% | 59% |
| sized 12h, sell <= 2h | -381.9k | -323.5k | -68.74M | -8.23M | 71/180 | 49/180 | 151.81M | 2.19M | 88% | 48% |
| sized 12h, sell <= 4h | -726.8k | -659.9k | -130.82M | -8.50M | 56/180 | 36/180 | 158.09M | 2.43M | 88% | 26% |
| sized 12h, sell <= 10h | -1.03M | -831.3k | -184.78M | -8.39M | 57/180 | 31/180 | 164.87M | 2.59M | 88% | 21% |

### 10.00M stack, 12h night (sensitivity)

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 287.5k | 241.0k | 51.76M | -439.1k | 162/180 |  | 9.88M | 420.1k | 97% | 95% |
| sized 8h, sell <= 1h | 337.6k | 262.6k | 60.76M | -837.5k | 156/180 | 120/180 | 9.87M | 512.5k | 97% | 94% |
| sized 8h, sell <= 2h | 374.8k | 286.8k | 67.46M | -338.4k | 159/180 | 120/180 | 9.95M | 595.1k | 97% | 91% |
| sized 8h, sell <= 4h | 347.3k | 264.2k | 62.52M | -541.2k | 153/180 | 124/180 | 9.97M | 644.8k | 97% | 90% |
| sized 8h, sell <= 10h | 327.1k | 251.2k | 58.87M | -643.7k | 142/180 | 115/180 | 9.98M | 659.7k | 97% | 88% |
| sized 12h, sell <= 0.5h | 312.6k | 248.0k | 56.27M | -424.1k | 155/180 | 115/180 | 9.88M | 503.8k | 95% | 81% |
| sized 12h, sell <= 1h | 372.5k | 266.4k | 67.05M | -822.2k | 157/180 | 120/180 | 9.92M | 617.8k | 95% | 79% |
| sized 12h, sell <= 2h | 382.0k | 281.6k | 68.76M | -941.4k | 155/180 | 115/180 | 9.95M | 689.7k | 94% | 75% |
| sized 12h, sell <= 4h | 342.5k | 253.9k | 61.65M | -671.3k | 146/180 | 105/180 | 9.97M | 764.3k | 95% | 73% |
| sized 12h, sell <= 10h | 334.7k | 259.2k | 60.24M | -668.5k | 144/180 | 110/180 | 9.98M | 809.1k | 94% | 72% |

### 50.00M stack, 12h night (sensitivity)

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 300.4k | 250.0k | 54.06M | -1.79M | 127/180 |  | 42.78M | 729.9k | 95% | 91% |
| sized 8h, sell <= 1h | 238.9k | 196.1k | 43.00M | -2.05M | 117/180 | 89/180 | 45.77M | 862.3k | 95% | 90% |
| sized 8h, sell <= 2h | 157.8k | 60.3k | 28.40M | -2.35M | 98/180 | 80/180 | 48.09M | 1.01M | 96% | 88% |
| sized 8h, sell <= 4h | 92.0k | 30.8k | 16.56M | -2.44M | 92/180 | 74/180 | 48.21M | 1.12M | 95% | 85% |
| sized 8h, sell <= 10h | 82.3k | -20.2k | 14.82M | -2.27M | 85/180 | 66/180 | 48.13M | 1.15M | 95% | 85% |
| sized 12h, sell <= 0.5h | 267.4k | 169.5k | 48.13M | -1.66M | 115/180 | 94/180 | 45.39M | 845.4k | 91% | 75% |
| sized 12h, sell <= 1h | 243.4k | 147.4k | 43.81M | -2.71M | 106/180 | 78/180 | 47.57M | 1.01M | 91% | 74% |
| sized 12h, sell <= 2h | 138.1k | 57.3k | 24.85M | -3.01M | 99/180 | 75/180 | 48.83M | 1.19M | 93% | 69% |
| sized 12h, sell <= 4h | 10.0k | -23.2k | 1.81M | -2.67M | 88/180 | 55/180 | 49.31M | 1.40M | 93% | 55% |
| sized 12h, sell <= 10h | -58.6k | -15.6k | -10.55M | -3.02M | 86/180 | 51/180 | 49.29M | 1.51M | 92% | 51% |

### 200.00M stack, 12h night (sensitivity)

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 784.3k | 365.8k | 141.18M | -8.94M | 133/180 |  | 133.85M | 1.66M | 95% | 91% |
| sized 8h, sell <= 1h | 686.4k | 354.0k | 123.56M | -8.60M | 119/180 | 95/180 | 138.80M | 1.80M | 95% | 90% |
| sized 8h, sell <= 2h | 486.3k | 206.7k | 87.54M | -8.50M | 103/180 | 78/180 | 145.01M | 1.97M | 95% | 87% |
| sized 8h, sell <= 4h | 355.8k | 115.9k | 64.04M | -7.71M | 101/180 | 60/180 | 150.46M | 2.09M | 95% | 85% |
| sized 8h, sell <= 10h | 280.0k | 78.4k | 50.41M | -8.46M | 94/180 | 63/180 | 152.79M | 2.13M | 95% | 84% |
| sized 12h, sell <= 0.5h | 709.7k | 287.1k | 127.75M | -8.65M | 121/180 | 82/180 | 137.78M | 1.78M | 91% | 75% |
| sized 12h, sell <= 1h | 618.8k | 328.4k | 111.38M | -8.59M | 106/180 | 72/180 | 142.91M | 1.96M | 91% | 73% |
| sized 12h, sell <= 2h | 383.5k | 47.2k | 69.02M | -8.42M | 93/180 | 68/180 | 151.81M | 2.19M | 91% | 68% |
| sized 12h, sell <= 4h | 51.4k | -258.6k | 9.25M | -7.48M | 82/180 | 48/180 | 158.09M | 2.43M | 91% | 52% |
| sized 12h, sell <= 10h | -268.7k | -415.0k | -48.37M | -7.71M | 75/180 | 37/180 | 164.87M | 2.59M | 91% | 47% |

## Offers placed at 02:00 UTC

180 nights, 2026-05-27 02:00Z to 2026-11-22 02:00Z. Decision (pre-set rule, 10h night): **keep today's model**: no variant beats the baseline on both total profit and worst night at every budget.

| Variant | 10.00M: per night / total / worst | 50.00M: per night / total / worst | 200.00M: per night / total / worst |
|---|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 272.0k / 48.96M / -321.3k | 277.3k / 49.92M / -1.27M | 862.9k / 155.32M / -5.80M |
| sized 8h, sell <= 1h | 314.3k / 56.58M / -297.4k | 203.7k / 36.67M / -1.51M | 747.2k / 134.49M / -5.66M |
| sized 8h, sell <= 2h | 338.1k / 60.85M / -459.3k | 189.7k / 34.14M / -2.67M | 655.7k / 118.03M / -5.88M |
| sized 8h, sell <= 4h | 317.0k / 57.06M / -840.8k | 99.6k / 17.92M / -2.80M | 516.3k / 92.93M / -5.50M |
| sized 8h, sell <= 10h | 312.6k / 56.27M / -960.1k | 103.7k / 18.67M / -2.89M | 475.1k / 85.51M / -5.55M |
| sized 12h, sell <= 0.5h | 231.6k / 41.68M / -599.2k | 135.1k / 24.32M / -2.19M | 697.9k / 125.62M / -5.65M |
| sized 12h, sell <= 1h | 287.0k / 51.67M / -618.1k | 104.3k / 18.77M / -1.81M | 568.6k / 102.36M / -5.57M |
| sized 12h, sell <= 2h | 254.7k / 45.84M / -494.6k | -196 / -35.3k / -3.55M | 295.2k / 53.14M / -6.37M |
| sized 12h, sell <= 4h | 218.3k / 39.29M / -953.4k | -154.9k / -27.88M / -3.43M | 34.3k / 6.17M / -5.17M |
| sized 12h, sell <= 10h | 225.6k / 40.60M / -1.10M | -180.4k / -32.47M / -3.75M | -148.6k / -26.74M / -5.93M |

### 10.00M stack, 8h night (sensitivity)

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 219.0k | 156.1k | 39.42M | -343.8k | 147/180 |  | 9.81M | 440.5k | 93% | 78% |
| sized 8h, sell <= 1h | 257.6k | 153.3k | 46.37M | -284.7k | 137/180 | 111/180 | 9.91M | 524.8k | 93% | 78% |
| sized 8h, sell <= 2h | 271.5k | 171.0k | 48.87M | -341.8k | 142/180 | 105/180 | 9.95M | 609.5k | 94% | 75% |
| sized 8h, sell <= 4h | 256.2k | 169.6k | 46.11M | -845.0k | 134/180 | 101/180 | 9.96M | 658.0k | 94% | 73% |
| sized 8h, sell <= 10h | 257.9k | 163.4k | 46.43M | -964.3k | 140/180 | 97/180 | 9.96M | 672.9k | 94% | 71% |
| sized 12h, sell <= 0.5h | 59.5k | 73.3k | 10.71M | -474.2k | 122/180 | 37/180 | 9.89M | 535.1k | 71% | 23% |
| sized 12h, sell <= 1h | 111.1k | 94.3k | 19.99M | -510.9k | 127/180 | 50/180 | 9.90M | 640.4k | 71% | 29% |
| sized 12h, sell <= 2h | 92.7k | 57.4k | 16.69M | -753.3k | 117/180 | 59/180 | 9.94M | 710.2k | 71% | 25% |
| sized 12h, sell <= 4h | 70.3k | 41.3k | 12.66M | -1.41M | 110/180 | 47/180 | 9.96M | 773.6k | 70% | 24% |
| sized 12h, sell <= 10h | 68.7k | 59.7k | 12.37M | -1.56M | 107/180 | 43/180 | 9.97M | 816.9k | 69% | 23% |

### 50.00M stack, 8h night (sensitivity)

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 196.3k | 118.7k | 35.34M | -1.41M | 114/180 |  | 40.84M | 713.4k | 89% | 75% |
| sized 8h, sell <= 1h | 114.8k | 4.4k | 20.66M | -2.66M | 90/180 | 72/180 | 44.45M | 848.0k | 89% | 75% |
| sized 8h, sell <= 2h | 8.3k | -36.6k | 1.49M | -3.12M | 85/180 | 72/180 | 46.64M | 1.01M | 92% | 67% |
| sized 8h, sell <= 4h | -43.8k | -102.8k | -7.88M | -2.99M | 84/180 | 65/180 | 47.60M | 1.13M | 91% | 62% |
| sized 8h, sell <= 10h | -44.8k | -140.8k | -8.06M | -2.98M | 76/180 | 60/180 | 48.00M | 1.16M | 92% | 61% |
| sized 12h, sell <= 0.5h | -29.1k | -107.5k | -5.25M | -1.50M | 69/180 | 24/180 | 44.07M | 846.2k | 67% | 19% |
| sized 12h, sell <= 1h | -59.4k | -113.5k | -10.70M | -2.29M | 72/180 | 33/180 | 47.19M | 1.02M | 67% | 26% |
| sized 12h, sell <= 2h | -197.9k | -221.6k | -35.62M | -2.24M | 58/180 | 28/180 | 48.41M | 1.21M | 69% | 14% |
| sized 12h, sell <= 4h | -258.0k | -217.7k | -46.44M | -2.32M | 59/180 | 38/180 | 49.07M | 1.42M | 63% | 1% |
| sized 12h, sell <= 10h | -303.0k | -283.5k | -54.54M | -2.22M | 57/180 | 36/180 | 49.25M | 1.55M | 63% | 1% |

### 200.00M stack, 8h night (sensitivity)

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 637.6k | 218.9k | 114.77M | -6.68M | 123/180 |  | 115.77M | 1.45M | 89% | 75% |
| sized 8h, sell <= 1h | 524.6k | 161.5k | 94.43M | -6.74M | 102/180 | 63/180 | 120.39M | 1.59M | 90% | 74% |
| sized 8h, sell <= 2h | 336.1k | 37.2k | 60.49M | -6.39M | 95/180 | 62/180 | 130.16M | 1.78M | 91% | 66% |
| sized 8h, sell <= 4h | 180.7k | -128.0k | 32.53M | -6.29M | 82/180 | 50/180 | 138.23M | 1.91M | 91% | 59% |
| sized 8h, sell <= 10h | 120.1k | -159.8k | 21.63M | -6.79M | 78/180 | 48/180 | 140.22M | 1.95M | 91% | 57% |
| sized 12h, sell <= 0.5h | 408.1k | -41.9k | 73.45M | -7.03M | 79/180 | 23/180 | 120.39M | 1.58M | 67% | 19% |
| sized 12h, sell <= 1h | 306.2k | -64.8k | 55.12M | -6.46M | 83/180 | 14/180 | 126.78M | 1.77M | 67% | 26% |
| sized 12h, sell <= 2h | 16.2k | -258.2k | 2.91M | -6.44M | 66/180 | 16/180 | 138.22M | 2.02M | 68% | 14% |
| sized 12h, sell <= 4h | -212.4k | -392.6k | -38.23M | -5.84M | 69/180 | 22/180 | 147.96M | 2.28M | 62% | 1% |
| sized 12h, sell <= 10h | -379.1k | -504.2k | -68.24M | -6.63M | 61/180 | 20/180 | 156.33M | 2.46M | 62% | 1% |

### 10.00M stack, 10h night

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 272.0k | 205.8k | 48.96M | -321.3k | 163/180 |  | 9.81M | 440.5k | 95% | 87% |
| sized 8h, sell <= 1h | 314.3k | 209.0k | 56.58M | -297.4k | 162/180 | 117/180 | 9.91M | 524.8k | 95% | 88% |
| sized 8h, sell <= 2h | 338.1k | 209.4k | 60.85M | -459.3k | 154/180 | 111/180 | 9.95M | 609.5k | 96% | 87% |
| sized 8h, sell <= 4h | 317.0k | 193.8k | 57.06M | -840.8k | 141/180 | 107/180 | 9.96M | 658.0k | 96% | 85% |
| sized 8h, sell <= 10h | 312.6k | 199.7k | 56.27M | -960.1k | 140/180 | 102/180 | 9.96M | 672.9k | 96% | 83% |
| sized 12h, sell <= 0.5h | 231.6k | 121.7k | 41.68M | -599.2k | 148/180 | 64/180 | 9.89M | 535.1k | 89% | 62% |
| sized 12h, sell <= 1h | 287.0k | 148.5k | 51.67M | -618.1k | 146/180 | 86/180 | 9.90M | 640.4k | 89% | 62% |
| sized 12h, sell <= 2h | 254.7k | 124.7k | 45.84M | -494.6k | 137/180 | 72/180 | 9.94M | 710.2k | 88% | 56% |
| sized 12h, sell <= 4h | 218.3k | 89.7k | 39.29M | -953.4k | 119/180 | 65/180 | 9.96M | 773.6k | 88% | 56% |
| sized 12h, sell <= 10h | 225.6k | 113.1k | 40.60M | -1.10M | 124/180 | 71/180 | 9.97M | 816.9k | 87% | 56% |

### 50.00M stack, 10h night

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 277.3k | 184.6k | 49.92M | -1.27M | 126/180 |  | 40.84M | 713.4k | 92% | 83% |
| sized 8h, sell <= 1h | 203.7k | 151.8k | 36.67M | -1.51M | 104/180 | 77/180 | 44.45M | 848.0k | 91% | 83% |
| sized 8h, sell <= 2h | 189.7k | 73.5k | 34.14M | -2.67M | 96/180 | 84/180 | 46.64M | 1.01M | 93% | 83% |
| sized 8h, sell <= 4h | 99.6k | 39.5k | 17.92M | -2.80M | 94/180 | 74/180 | 47.60M | 1.13M | 93% | 81% |
| sized 8h, sell <= 10h | 103.7k | -18.8k | 18.67M | -2.89M | 89/180 | 71/180 | 48.00M | 1.16M | 93% | 80% |
| sized 12h, sell <= 0.5h | 135.1k | 10.6k | 24.32M | -2.19M | 91/180 | 49/180 | 44.07M | 846.2k | 85% | 54% |
| sized 12h, sell <= 1h | 104.3k | 3.3k | 18.77M | -1.81M | 91/180 | 61/180 | 47.19M | 1.02M | 84% | 56% |
| sized 12h, sell <= 2h | -196 | -102.0k | -35.3k | -3.55M | 80/180 | 49/180 | 48.41M | 1.21M | 86% | 48% |
| sized 12h, sell <= 4h | -154.9k | -153.4k | -27.88M | -3.43M | 71/180 | 35/180 | 49.07M | 1.42M | 87% | 27% |
| sized 12h, sell <= 10h | -180.4k | -162.1k | -32.47M | -3.75M | 73/180 | 43/180 | 49.25M | 1.55M | 87% | 25% |

### 200.00M stack, 10h night

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 862.9k | 332.7k | 155.32M | -5.80M | 136/180 |  | 115.77M | 1.45M | 92% | 84% |
| sized 8h, sell <= 1h | 747.2k | 286.8k | 134.49M | -5.66M | 120/180 | 78/180 | 120.39M | 1.59M | 92% | 83% |
| sized 8h, sell <= 2h | 655.7k | 170.4k | 118.03M | -5.88M | 109/180 | 73/180 | 130.16M | 1.78M | 92% | 82% |
| sized 8h, sell <= 4h | 516.3k | 86.5k | 92.93M | -5.50M | 93/180 | 60/180 | 138.23M | 1.91M | 92% | 79% |
| sized 8h, sell <= 10h | 475.1k | 52.8k | 85.51M | -5.55M | 91/180 | 60/180 | 140.22M | 1.95M | 92% | 77% |
| sized 12h, sell <= 0.5h | 697.9k | 139.7k | 125.62M | -5.65M | 108/180 | 46/180 | 120.39M | 1.58M | 85% | 54% |
| sized 12h, sell <= 1h | 568.6k | 96.5k | 102.36M | -5.57M | 97/180 | 46/180 | 126.78M | 1.77M | 84% | 56% |
| sized 12h, sell <= 2h | 295.2k | -113.1k | 53.14M | -6.37M | 84/180 | 37/180 | 138.22M | 2.02M | 85% | 45% |
| sized 12h, sell <= 4h | 34.3k | -278.8k | 6.17M | -5.17M | 75/180 | 22/180 | 147.96M | 2.28M | 84% | 21% |
| sized 12h, sell <= 10h | -148.6k | -509.1k | -26.74M | -5.93M | 65/180 | 20/180 | 156.33M | 2.46M | 84% | 16% |

### 10.00M stack, 12h night (sensitivity)

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 276.9k | 235.5k | 49.84M | -487.3k | 164/180 |  | 9.81M | 440.5k | 96% | 91% |
| sized 8h, sell <= 1h | 319.2k | 231.8k | 57.46M | -360.0k | 158/180 | 114/180 | 9.91M | 524.8k | 96% | 91% |
| sized 8h, sell <= 2h | 344.0k | 236.1k | 61.92M | -598.9k | 155/180 | 109/180 | 9.95M | 609.5k | 97% | 90% |
| sized 8h, sell <= 4h | 334.3k | 249.1k | 60.17M | -894.6k | 142/180 | 113/180 | 9.96M | 658.0k | 97% | 89% |
| sized 8h, sell <= 10h | 320.2k | 247.7k | 57.64M | -1.17M | 143/180 | 114/180 | 9.96M | 672.9k | 97% | 88% |
| sized 12h, sell <= 0.5h | 285.7k | 184.2k | 51.42M | -499.6k | 151/180 | 99/180 | 9.89M | 535.1k | 94% | 77% |
| sized 12h, sell <= 1h | 347.2k | 229.3k | 62.49M | -519.2k | 149/180 | 106/180 | 9.90M | 640.4k | 94% | 75% |
| sized 12h, sell <= 2h | 326.8k | 209.4k | 58.82M | -476.5k | 143/180 | 93/180 | 9.94M | 710.2k | 93% | 73% |
| sized 12h, sell <= 4h | 282.6k | 164.1k | 50.87M | -935.7k | 143/180 | 86/180 | 9.96M | 773.6k | 93% | 71% |
| sized 12h, sell <= 10h | 279.6k | 238.5k | 50.32M | -1.05M | 133/180 | 88/180 | 9.97M | 816.9k | 93% | 70% |

### 50.00M stack, 12h night (sensitivity)

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 291.0k | 204.3k | 52.39M | -1.46M | 128/180 |  | 40.84M | 713.4k | 93% | 87% |
| sized 8h, sell <= 1h | 221.5k | 144.5k | 39.88M | -2.30M | 115/180 | 84/180 | 44.45M | 848.0k | 93% | 87% |
| sized 8h, sell <= 2h | 144.9k | 103.2k | 26.07M | -3.05M | 99/180 | 81/180 | 46.64M | 1.01M | 95% | 86% |
| sized 8h, sell <= 4h | 88.9k | 46.7k | 15.99M | -3.01M | 92/180 | 74/180 | 47.60M | 1.13M | 94% | 85% |
| sized 8h, sell <= 10h | 93.4k | -9.7k | 16.81M | -2.99M | 87/180 | 69/180 | 48.00M | 1.16M | 94% | 85% |
| sized 12h, sell <= 0.5h | 215.8k | 60.6k | 38.84M | -1.53M | 97/180 | 70/180 | 44.07M | 846.2k | 90% | 69% |
| sized 12h, sell <= 1h | 186.6k | 85.8k | 33.60M | -2.36M | 98/180 | 69/180 | 47.19M | 1.02M | 89% | 69% |
| sized 12h, sell <= 2h | 80.8k | -23.5k | 14.55M | -5.11M | 88/180 | 67/180 | 48.41M | 1.21M | 91% | 69% |
| sized 12h, sell <= 4h | -45.5k | -90.6k | -8.18M | -5.03M | 82/180 | 61/180 | 49.07M | 1.42M | 91% | 55% |
| sized 12h, sell <= 10h | -93.5k | -139.0k | -16.82M | -5.36M | 83/180 | 57/180 | 49.25M | 1.55M | 92% | 53% |

### 200.00M stack, 12h night (sensitivity)

| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sized 8h, sell <= 0.5h (today) | 918.0k | 362.9k | 165.24M | -3.56M | 138/180 |  | 115.77M | 1.45M | 93% | 87% |
| sized 8h, sell <= 1h | 787.8k | 360.5k | 141.81M | -3.57M | 121/180 | 76/180 | 120.39M | 1.59M | 93% | 87% |
| sized 8h, sell <= 2h | 664.4k | 244.6k | 119.59M | -4.29M | 107/180 | 71/180 | 130.16M | 1.78M | 94% | 86% |
| sized 8h, sell <= 4h | 498.1k | 160.6k | 89.65M | -4.74M | 96/180 | 59/180 | 138.23M | 1.91M | 93% | 84% |
| sized 8h, sell <= 10h | 436.6k | 89.0k | 78.59M | -6.10M | 94/180 | 58/180 | 140.22M | 1.95M | 93% | 83% |
| sized 12h, sell <= 0.5h | 822.1k | 282.6k | 147.98M | -3.52M | 112/180 | 64/180 | 120.39M | 1.58M | 90% | 70% |
| sized 12h, sell <= 1h | 684.2k | 175.0k | 123.15M | -3.91M | 105/180 | 58/180 | 126.78M | 1.77M | 89% | 69% |
| sized 12h, sell <= 2h | 392.4k | -29.7k | 70.63M | -4.68M | 88/180 | 52/180 | 138.22M | 2.02M | 89% | 67% |
| sized 12h, sell <= 4h | 83.9k | -152.7k | 15.10M | -6.62M | 81/180 | 38/180 | 147.96M | 2.28M | 89% | 51% |
| sized 12h, sell <= 10h | -174.0k | -468.4k | -31.32M | -6.68M | 70/180 | 32/180 | 156.33M | 2.46M | 90% | 47% |

## Caveats

- One market path over the nights above, one simulator; fills are hourly and volume-share based. A handful of big leftover marks move totals; compare direction more than exact gp.
- The night length and evening hour rows are sensitivity checks; the decision uses the primary evening and night length only.
- Mapping and buy limits are today's. Pumps are flagged with the MCP scanner's rule (the app's thin-spike rule is close but not identical).

## Findings (analyst notes on this run)

1. **Keep 0.5h and 8h sizing.** At both evening hours no variant beats today's model on total realized profit and worst night at all three budgets. Longer sell caps help only at 10M (+8-15M over 180 nights for 1-2h, worst nights mostly worse) and lose at 50M (-10M to -80M) and 200M (-20M to -200M). At the same sell cap, 12h sizing (3 buy limits) is worse than 8h at every budget and both hours. This matches the 4h walk-forward (0.5h > 1h > 2h > 4h).
2. **Shown profit overstates a night.** Today's model realized 62-65% of its expected profit at 10M, 17-39% at 50M and 6-60% at 200M (10h night). More cash buys larger, slower positions whose leftovers get marked down in the morning.
3. **Idle cash.** Average cash placed: ~9.8M of 10M, ~41-43M of 50M, ~116-134M of 200M; single nights can leave much more idle. The app now shows "~X of Y usable tonight".
4. **Timing matters at big stacks.** 200M at 22:00 UTC made 19M over 180 nights; at 02:00 UTC 155M. Night length matters too: an 8h night loses money at 50M/200M (buys finish late, so sells don't), and 12h beats 10h. Not acted on: one market path, and no pre-set rule for it.

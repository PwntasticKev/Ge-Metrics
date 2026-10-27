# Paid alternatives to existing manual processing

Research decision, 2026-10-27. Documentation only; no production or fills observed.

## Decision

**Support only a small Wesley unicorn-horn alternative in the existing lab’s GP/action area:** one horn → one dust, fee 50 GP/input, unknown rate. Its captured buy-high/sell-low arithmetic margin is **+62 GP/action**, versus manual **+112** after tax. This establishes a positive price scenario and a 50 GP convenience charge, not better overall economics or throughput. Reject paid bird nests (−14), goat horns (−8), and chocolate (−39) at this snapshot. Goat horns additionally lack any high-side input trades in the returned hour. Do not create losing/unsupported feature candidates merely to populate a selector.

No new calculator, screen, catalog-wide ranking, forecast, suggested attainable batch, GP/hour, fill time or guaranteed execution. Native work 73–76 remains blocked; this research does not unblock or expand that UI. Blue scales are already covered by PR 72 and the earlier [conversion report](conversion-mechanisms-research.md); lava and mud are excluded under its existing decisions.

## Repository scope and duplication check

Read `CLAUDE.md`, `docs/DEVELOPMENT_RULES.md`, `docs/ai-instructions/testing.md`, `mobile/AGENTS.md`, the [roadmap](roadmap-ideas.md), and [conversion research](conversion-mechanisms-research.md). This investigation used bounded primary-source requests and did not refresh the catalog or retrieve history.

Inspected `mobile/src/lib/methods.ts`, `processingLab.ts`, `batchCoordinator.ts`, shared `recipes.js`, `derivedRecipes.js`, `processFlip.js`, `data/processingMethods.js`, and `data/moneyMakingRecipes.js`. All four manual methods already exist in MMG, with deterministic one-input/one-output quantities and `coinCost:0`, `coinRevenue:0`: `mmg:Crushing bird nests` (5075→6693), `mmg:Grinding unicorn horns` (237→235), `mmg:Grinding goat horns` (9735→9736), and `mmg:Grinding chocolate bars` (1973→1975). They are exposed through mobile methods. Their stored manual rates must not be copied onto a paid route. Name/ID/service searches found no paid Wesley versions in the processing/MMG catalog; derived recipes cover other operations. Therefore none of these paid routes is skipped as an already implemented paid recipe, but **all manual recipes are reused, not duplicated**.

The lab already has an absent-rate GP/action path and blue-scale comparison. `labMarket` maps instant acquisition to high and sale to low; `computeProcessFlip` accepts `coinCost`; `coordinateBatch` accepts deterministic quantities and the canonical tax function. Its arithmetic bound is not NPC capacity. `recipeLimit` currently uses mapping limits: do not promote those limits into remaining allowances or service capacity for this proposal.

## Verified mechanics and access

Fetched the OSRS Wiki’s direct page wikitext API for [Wesley](https://oldschool.runescape.wiki/api.php?action=parse&page=Wesley&prop=wikitext&format=json). His actual service calculator explicitly lists **all four exact pairs below**, each with a 50-coin fee. This is the evidence of acceptance, rather than an assumption that every grindable item is accepted. [Wesley’s page](https://oldschool.runescape.wiki/w/Wesley) identifies him as members-only, outside Zahur’s home south of Nardah’s fountain; noted items work. [Ironman Herblore guide](https://oldschool.runescape.wiki/w/Ironman_Guide/Herblore), also read via direct wikitext API, explicitly says Wesley’s service does **not** require diary completion. No skill or quest prerequisite is listed for this service; do not transfer Zahur’s hard Desert Diary requirement to him. Travel, teleports and banking are unpriced, and no end-to-end service rate was validated.

| Input ×1 → output ×1 | Manual requirement | Paid requirement and fee | Primary mechanic evidence |
|---|---|---|---|
| Bird nest (empty) **5075** → Crushed nest **6693** | Members; owned retained pestle and mortar; no listed skill/facility gate | Wesley, Nardah; noted/unnoted empty nests; **50 GP/input** | [Empty nest](https://oldschool.runescape.wiki/w/Bird_nest_(empty)), [crushed nest creation](https://oldschool.runescape.wiki/w/Crushed_nest), Wesley service list |
| Unicorn horn **237** → Unicorn horn dust **235** | Members; owned retained pestle and mortar; no listed skill/facility gate | Wesley; noted/unnoted; **50 GP/input** | [Horn](https://oldschool.runescape.wiki/w/Unicorn_horn), [dust creation](https://oldschool.runescape.wiki/w/Unicorn_horn_dust), Wesley service list |
| Goat horn **9735** → Goat horn dust **9736** | Members; owned retained pestle and mortar; no listed skill/facility gate | Wesley; noted/unnoted; **50 GP/input** | [Horn](https://oldschool.runescape.wiki/w/Goat_horn), [dust creation](https://oldschool.runescape.wiki/w/Goat_horn_dust), Wesley service list |
| Chocolate bar **1973** → Chocolate dust **1975** | F2P with owned retained knife; pestle-and-mortar creation is members; no listed skill/facility gate | **Members-only Wesley**, despite F2P items; noted items accepted; **50 GP/input** | [Dust creation and explicit service](https://oldschool.runescape.wiki/w/Chocolate_dust), Wesley service list |

Direct wikitext creation templates for all four outputs confirm one raw material and one output; Wesley’s calculator lists the same output without a quantity multiplier. Each output is tradeable and noteable. Empty nest means the tradeable empty item, not a seed/ring/egg/clue nest. Potion-use Herblore levels are not grinding requirements. Goat horn is the current name (renamed from Desert goat horn in July 2026); use stable IDs rather than old names. Tool acquisition is excluded under an owned-tool assumption. Manual recipes list no service coin fee.

## Single bounded market snapshot

Fetched exactly once each, with descriptive User-Agent `GE-Metrics paid-processing alternatives research (bounded snapshot)`: [mapping](https://prices.runescape.wiki/api/v1/osrs/mapping), [latest](https://prices.runescape.wiki/api/v1/osrs/latest), and [one 1h aggregate](https://prices.runescape.wiki/api/v1/osrs/1h). Retrieval completed **2026-10-27T08:35:04.648350Z**, reference Unix second **1793090104**. Requests were sequential and not atomic. These mutable URLs will return different evidence later; the complete selected-item price fields and mapping identity/limit/membership values are transcribed below. No timeseries or catalog refresh was requested.

Aggregate response timestamp **1793084400 = 2026-10-27 07:00:00 UTC**, block **07:00–08:00 UTC**, start age **5704 seconds (1h35m04s)**. It is the returned block, not the current hour. Quote ages use the reference Unix second above.

| Mapping name / ID | Members | Listed limit | Latest high / highTime / age seconds | Latest low / lowTime / age seconds | 1h avgHighPrice / highPriceVolume | 1h avgLowPrice / lowPriceVolume |
|---|---|---:|---|---|---|---|
| Bird nest (empty) / 5075 | true | 11000 | 3600 / 1793089967 / 137 | 3573 / 1793090017 / 87 | 3574 / 383 | 3563 / 10510 |
| Crushed nest / 6693 | true | 11000 | 3740 / 1793089902 / 202 | 3710 / 1793089916 / 188 | 3753 / 8834 | 3710 / 5065 |
| Unicorn horn / 237 | true | 13000 | 979 / 1793089694 / 410 | 949 / 1793090038 / 66 | 979 / 551 | 960 / 1120 |
| Unicorn horn dust / 235 | true | 13000 | 1114 / 1793090006 / 98 | 1113 / 1793089818 / 286 | 1115 / 5850 | 1088 / 1405 |
| Goat horn / 9735 | true | 13000 | 37 / 1793083839 / 6265 | 35 / 1793089622 / 482 | null / 0 | 35 / 812 |
| Goat horn dust / 9736 | true | 13000 | 99 / 1793088965 / 1139 | 80 / 1793087047 / 3057 | 99 / 1675 | 80 / 25 |
| Chocolate bar / 1973 | false | 13000 | 32 / 1793089358 / 746 | 29 / 1793089671 / 433 | 32 / 55 | 29 / 46 |
| Chocolate dust / 1975 | false | 13000 | 47 / 1793089819 / 285 | 43 / 1793089326 / 778 | 46 / 2747 | 43 / 93 |

High is an observed instant-buy-side transaction; low is an observed instant-sell-side transaction. Latest sides need not have traded together. Observed volumes are traded units, not order-book depth, available supply, personal fill odds or service throughput ([Wiki real-time API documentation](https://oldschool.runescape.wiki/w/RuneScape:Real-time_Prices)). Goat input high-side volume is genuinely **zero**, with unknown/null high average, not zero GP. Unicorn’s 551 high-side input units and 1405 low-side output units support only the existence of trades in this block, not an attainable batch. Chocolate has only 55 high-side input and 93 low-side output units.

Mapping limits are listed four-hour purchase ceilings, not remaining account allowances. Earlier purchases, account state and any shared variant grouping are unknown. Manufactured sales are not capped by an output buy limit. Treat limits as informational; neither full limits nor this hour’s volume establish usable capacity ([GE buying limits](https://oldschool.runescape.wiki/w/Grand_Exchange/Buying_limits)).

## Exact canonical accounting

Executed the actual repository [`geTax(sellPrice,itemId)`](../../src/domain/flipping/geTax.js), including its exemption set: 2%, floor per sold item, maximum 5M GP/item, under 50 GP exempt. [Wiki GE tax rules](https://oldschool.runescape.wiki/w/Grand_Exchange) support the mechanic. No tax on the purchase or service fee. Output quantity is exactly one in every scenario.

`gross spread = output latest low − input latest high`; `manual margin after tax = gross spread − geTax(output low, output ID)`; `paid margin = manual margin − 50`. “Gross spread” excludes tax, fees, travel and tool cost; the after-tax manual column is not mislabeled gross profit.

| Route, one action | Buy high | Sell low / gross proceeds | Gross spread before tax | Unit tax | Net sale | Manual fee | Manual margin after tax | Wesley fee | Wesley margin after tax/fee | Decision |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Empty nest → crushed nest | 3600 | 3710 | 110 | 74 | 3636 | 0 | +36 | 50 | **−14** | Reject paid |
| Unicorn horn → dust | 979 | 1113 | 134 | 22 | 1091 | 0 | +112 | 50 | **+62** | Support per-action candidate |
| Goat horn → dust | 37 | 80 | 43 | 1 | 79 | 0 | +42 | 50 | **−8** | Reject paid; stale input and missing high-side liquidity too |
| Chocolate bar → dust | 32 | 43 | 11 | 0 | 43 | 0 | +11 | 50 | **−39** | Reject paid |

Every paid route sacrifices exactly 50 GP/action relative to manual under identical prices and yields. There is **no price advantage over manual** here. Wesley’s bulk interface does not establish a trusted end-to-end rate: no better-overall, active-time savings valuation, break-even GP/hour, or manual-versus-service throughput conclusion follows. Travel and tool acquisition could change the economics and were not measured. These are quote arithmetic scenarios, not realized profit.

## Smallest supported follow-up

For implementation, create a lab-local untimed pair: reuse the existing manual MMG recipe as a local comparison view, explicitly overriding its stored 9,000 actions/hour to null in this view, and add a named **Wesley unicorn horn → dust** variant. The manual MMG recipe is not currently in Processing Lab; it belongs to Money Makers. Preserve its original rate and global ranking behavior. The paid variant uses: `inputs:[{id:237,qty:1}]`, `outputs:[{id:235,qty:1}]`, `coinCost:50`, `coinRevenue:0`, `actionsPerHour:null`, `members:true`, location Nardah and Wesley source link. Keep the manual MMG record unchanged. Reuse canonical tax and instant lab price adaptation. Adding the variant to the globally ranked MMG catalog is outside this recommendation. Preserve both quote ages, the aggregate block time and per-side volumes; missing data remains unknown and losses stay visible in grey under the existing blue light/dark presentation.

Show one action’s buy 979, fee 50, gross output 1113, tax 22, net output 1091, margin +62, and manual comparison +112 at this saved scenario. Rate stays unknown; no timed batch sizing, inferred capacity or output-limit cap. This is a narrow recipe/data proposal, not authorization to expand native 73–76 or build a selector/screen now. Reject the other three paid additions until separate fresh evidence warrants reconsideration; do not silently substitute patient prices to rescue negative instant arithmetic.

## Verification and limits

Node **v24.19.0** ran a small in-memory fixture importing the actual tax function: all four tax/manual/paid outcomes above passed, plus the 49/50 GP tax boundary. No implementation or test files were added, no full redundant test run, lint/typecheck/native QA performed for this documentation-only assignment. Only this report was written.

Wiki HTML/search attempts reported `Blocked by robots.txt` for Wesley and several item pages. Direct `api.php?action=parse&page=…&prop=wikitext&format=json` succeeded for Wesley, empty nest, all four output pages and Ironman Guide/Herblore, resolving service-list, yield and diary facts without relying on secondary calculators or another game edition. Search-index dates/prices were not used for market arithmetic. Primary Wiki pages and mutable API responses can change; no immutable revision or game-client experiment was captured. No NPC capacity, personal execution, travel timing or outstanding account allowance was verified.

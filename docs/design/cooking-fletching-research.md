# Cooking and fletching: bounded recipe research

Research only, 2026-10-26 local session; live retrieval host clock was **2026-10-27 03:18:06 UTC**. Four missing ordinary recipes assessed. Only this report was edited. No DB, EAS, builds, dependencies, devices, branches, commits, pushes, or child agents. Existing website visuals remain unchanged; any later mobile presentation uses blue/grey.

## Decision

**Defer a new money-making feature for these four recipes.** Every recipe loses money after tax at instant sides, and even at favorable latest low-input/high-output sides. There is no demonstrated GP edge here. These are valid coverage candidates for a training-cost comparison, not recommendations to buy materials. Do not reinterpret volume as executable liquidity or extrapolate a single snapshot into future profitability.

The smallest potentially useful interaction, if recipe coverage is separately wanted, is an extension of the existing **GP/action view**: select one recipe, enter a whole number of recipe batches and optionally a target tip price; show total input spend, output, tax, loss and break-even tip price. No new optimizer, screen, rate model or server is justified. This report does **not** recommend shipping that interaction as a money maker on the present evidence. Recheck the existing data path when prices change rather than schedule a new data collection system.

## Existing coverage and instructions

Read root `CLAUDE.md`, `docs/ai-instructions/testing.md`, `mobile/AGENTS.md`, `docs/design/roadmap-ideas.md`, and the existing finished-potion research. The research skill's primary-source/single-report methodology was followed; the user's explicit no-subagent constraint takes precedence over its delegation instruction. No ancestor/root AGENTS file was found in the inspected workspace. No implementation was added, so application tests/builds were not run; the checks below are read-only coverage checks and arithmetic assertions.

Inspected [`derivedRecipes.js`](../../src/domain/flipping/derivedRecipes.js), [`recipes.js`](../../src/domain/flipping/recipes.js), [`craftedRecipes.js`](../../src/domain/flipping/data/craftedRecipes.js), [`processingMethods.js`](../../src/domain/flipping/data/processingMethods.js), [`moneyMakingRecipes.js`](../../src/domain/flipping/data/moneyMakingRecipes.js), [`processFlip.js`](../../src/domain/flipping/processFlip.js), [`geTax.js`](../../src/domain/flipping/geTax.js), [`methods.ts`](../../mobile/src/lib/methods.ts), and [`processingLab.ts`](../../mobile/src/lib/processingLab.ts).

- Derived recipes cover cleaning, unf potions and decanting, not arrow/dart assembly. GE sets and crafted combinations do not supply these four outputs.
- A programmatic output-ID search across curated processing and imported money makers returned **zero recipes** for 892, 21326, 25849 and 11230.
- Already present: headless arrows, maple arrow shafts, amethyst arrowtip cutting, flighted ogre arrows, adamant brutal arrows, metal dart-tip smithing and bow stringing. Final assembly below is a different step; do not duplicate those inputs' production methods.
- Cooking raw karambwan already exists as `mmg:Cooking raw karambwan`: 3142 × 1 → 3144 × 1, `coinCost:0`, `actionsPerHour:1300`, skill text `Cooking 30`. Many ordinary fish and plain pizzas also exist. A new raw-fish calculator would duplicate coverage and risk repeating the existing no-burn assumption. This report adds no cooking recipe and no potion work.

## Four verified deterministic recipes

Quantities are **one full recipe batch**, not one ammunition unit. All four assembly steps require membership, consume exactly the listed materials, have no coin fee, no tools/facilities, and no failure or random bonus yield in the ordinary creation recipes. Do not charge a knife/chisel/hammer or add a feather to an already headless arrow. No quests are listed for these assembly steps; specifically, Tourist Trap gates metal dart-tip smithing, **not feathering purchased tips** ([Dart tip](https://oldschool.runescape.wiki/w/Dart_tip)). No Ranged level is required to manufacture them; wielding requirements are separate.

| Recipe and creation source | Exact inputs | Exact output | Fletching / XP per batch |
|---|---|---|---|
| [Rune arrow](https://oldschool.runescape.wiki/w/Rune_arrow) | Headless arrow **53 × 15** + Rune arrowtips **44 × 15** | Rune arrow **892 × 15** | 75 / 187.5 |
| [Amethyst arrow](https://oldschool.runescape.wiki/w/Amethyst_arrow) | Headless arrow **53 × 15** + Amethyst arrowtips **21350 × 15** | Amethyst arrow **21326 × 15** | 82 / 202.5 |
| [Amethyst dart](https://oldschool.runescape.wiki/w/Amethyst_dart) | Amethyst dart tip **25853 × 10** + Feather **314 × 10** | Amethyst dart **25849 × 10** | 90 / 210 |
| [Dragon dart](https://oldschool.runescape.wiki/w/Dragon_darts) | Dragon dart tip **11232 × 10** + Feather **314 × 10** | Dragon dart **11230 × 10** | 95 / 250 |

IDs/exact names/limits were matched directly against the [Wiki mapping API](https://prices.runescape.wiki/api/v1/osrs/mapping), not inferred from adjacent IDs. The [Fletching experience table](https://oldschool.runescape.wiki/w/Fletching/Experience_table) independently lists quantities and tool columns. Amethyst's **8 tips per mineral** is an upstream Crafting step, not dart assembly's 10-tip batch. Dragon tips are purchased here; no Smithing prerequisite should leak into this recipe.

### Buy limits

Listed limits per four-hour buying window: feather 314 **30,000**; headless arrow 53 **11,000**; rune arrowtips 44 **10,000**; amethyst arrowtips 21350 **10,000**; amethyst dart tip 25853 **11,000**; dragon dart tip 11232 **11,000**. All four finished outputs list **11,000** each ([mapping](https://prices.runescape.wiki/api/v1/osrs/mapping)). The four-hour nature of buying limits is supported by [Jagex's A Porcine of Interest update](https://oldschool.runescape.wiki/w/Update%3AA_Porcine_of_Interest).

With fresh full allowances, arrows allow floor(min(11000,10000)/15) = **666 batches / 9,990 arrows**, leaving 10 tip allowance and 1,010 headless allowance. Each dart recipe allows min(floor(11000/10),floor(30000/10)) = **1,100 batches / 11,000 darts**. These are theoretical input-limit ceilings, not fill sizes. Existing purchases reduce allowance; headless arrows and feathers are shared inventory/input allowances across selected recipes, so independently sized plans cannot each spend the same allowance. Produced outputs do not consume their listed GE buying allowance. No special cross-ID connected limit was established; do not invent one or assert poisoned variants have independent allowances. Selling is not constrained by these input-buy ceilings.

## One modest current snapshot

Fetched **once each**, with an identifying User-Agent: [mapping](https://prices.runescape.wiki/api/v1/osrs/mapping), [latest](https://prices.runescape.wiki/api/v1/osrs/latest), and [1h](https://prices.runescape.wiki/api/v1/osrs/1h). No history/time-series requests. Hour response timestamp **1793062800 = 2026-10-27 01:00 UTC**; it is older than the retrieval and latest prints. Mutable endpoint links alone cannot reproduce this capture, so the relevant values are transcribed below. V1 matches this repository's integration; current [API documentation](https://oldschool.runescape.wiki/w/RuneScape%3AReal-time_Prices) describes V2 and possible future V1 removal, outside this report's scope.

High/low are observed instant-buy/instant-sell transactions; timestamps are Unix seconds. Hour H/L volumes are aggregate traded quantities on those sides. They are not open offers, book depth, guaranteed fills or a rate available to this user ([API documentation](https://oldschool.runescape.wiki/w/RuneScape%3AReal-time_Prices)).

| ID / name | Latest high / low GP | highTime / lowTime | Hour avg high / low | Hour H / L volume |
|---|---:|---|---:|---:|
| 314 Feather | 3 / 2 | 1793071008 / 1793070951 | 3 / 2 | 3,233,106 / 3,156,610 |
| 53 Headless arrow | 12 / 11 | 1793070986 / 1793070360 | 11 / 9 | 463,686 / 60,765 |
| 44 Rune arrowtips | 233 / 229 | 1793069516 / 1793070816 | 253 / 239 | 10,760 / 5,819 |
| 892 Rune arrow | 39 / 38 | 1793070994 / 1793070995 | 37 / 35 | 319,116 / 381,576 |
| 21350 Amethyst arrowtips | 168 / 166 | 1793070917 / 1793069360 | 167 / 165 | 161,921 / 11,976 |
| 21326 Amethyst arrow | 127 / 114 | 1793071016 / 1793070967 | 121 / 115 | 388,496 / 149,129 |
| 25853 Amethyst dart tip | 288 / 280 | 1793069835 / 1793070881 | 291 / 273 | 121,153 / 409,376 |
| 25849 Amethyst dart | 177 / 164 | 1793070876 / 1793070941 | 176 / 171 | 270,923 / 124,594 |
| 11232 Dragon dart tip | 1,139 / 1,104 | 1793070993 / 1793071011 | 1,145 / 1,120 | 56,100 / 54,689 |
| 11230 Dragon dart | 1,106 / 1,075 | 1793071018 / 1793070987 | 1,088 / 1,067 | 321,231 / 43,464 |

### Actual after-tax arithmetic

New GE offers use 2% sales tax, floored **per item**, capped at 5M per item, with zero tax below 50 GP ([Jagex update reproduced by Wiki](https://oldschool.runescape.wiki/w/Update%3AYama_CAs_%26_More%21), [GE rounding explanation](https://oldschool.runescape.wiki/w/Grand_exchange)). Use existing `geTax(price,id)` including exemptions. None of these four output IDs appears in the local exemption list. Purchases and internal assembly have no sales tax.

For quantity q, instant cost = q × (tip high + other-input high); net revenue = q × (output low − geTax(output low,id)); gain = net revenue − cost. No additional coin input.

| Recipe batch | Input cost | Gross sale | Tax | Net sale | Gain after tax | Break-even maximum tip buy GP/unit* |
|---|---:|---:|---:|---:|---:|---:|
| Rune arrows ×15 | 15×(233+12) = 3,675 | 15×38 = 570 | 15×0 = 0 | 570 | **−3,105** | 38−0−12 = **26** |
| Amethyst arrows ×15 | 15×(168+12) = 2,700 | 15×114 = 1,710 | 15×2 = 30 | 1,680 | **−1,020** | 114−2−12 = **100** |
| Amethyst darts ×10 | 10×(288+3) = 2,910 | 10×164 = 1,640 | 10×3 = 30 | 1,610 | **−1,300** | 164−3−3 = **158** |
| Dragon darts ×10 | 10×(1139+3) = 11,420 | 10×1075 = 10,750 | 10×21 = 210 | 10,540 | **−880** | 1075−21−3 = **1,051** |

*Holding the observed other-input high and output low fixed; equality gives zero profit before time/opportunity costs. These targets are arithmetic thresholds, not suggested bids or evidence anyone will sell there. Rune arrows below 50 GP have zero tax even though 15 together sell for 570 GP; taxing the whole offer would be wrong.

Even the optimistic **latest input low / output high** scenario loses: rune arrows 15×(39−0−229−11) = **−3,015**; amethyst arrows 15×(127−2−166−11) = **−780**; amethyst darts 10×(177−3−280−2) = **−1,080**; dragon darts 10×(1106−22−1104−2) = **−220**. These unrelated last transactions are not synchronized executable orders. Do not call this a patient-fill forecast; the app's existing patient mode uses volume-backed daily averages, which were deliberately not downloaded here.

## Precise conditional implementation seam and tests

If later authorized for coverage, add one curated `fletch-ammunition` method to `src/domain/flipping/data/processingMethods.js`, with these four explicit recipes, stable IDs such as `proc:fletch-ammunition:rune-arrow`, `coinCost:0`, and **actionsPerHour:null**. A mixed-level method needs per-recipe requirement metadata/notes; do not show 75 as eligibility for all four. Do not derive generic ammunition by names or alter imported MMG output. `mobile/src/lib/methods.ts` already maps curated methods into tools and recipe lookup. No DB/schema/API service or web visual change is needed.

Use `computeProcessFlip` through `labMarket(market,'instant','instant',...)` for the instant scenario: the core engine expects low inputs/high outputs, while the adapter swaps in observed high inputs/low outputs. Passing the raw market would silently produce the favorable second scenario instead. Call `computeProcessFlip` directly for loss display; `rankProcessFlips` defaults to filtering losses. Reuse `geTax` for every output unit.

`sizeProcessingBatch` returns null batch sizing when the rate is null. A quantity-driven GP/action interaction therefore needs a tiny pure integer-batch ledger or adapter; do not invent a rate just to enable the cash/minutes lab. Batch N consumes/produces qN; its cash cap is floor(cash/costPerBatch), allowance cap is the minimum floor(remainingInputAllowance/inputQty), and no automatic reinvestment/reset is assumed. Missing allowance or price remains explicitly unknown. Existing `recipeLimit` takes the minimum of known limits even if another is unknown; label that as a partial bound rather than a fully verified allowance. Keep action/batch and ammunition-unit labels distinct. No volume-derived ETA or GP/hour without a separately supported active rate.

Later test cases (no new application tests were authored for this research-only document):

1. Exact IDs and 15:15:15 / 10:10:10 quantities, deterministic outputs, zero coin fee, no tools, no Tourist Trap gate for feathering; amethyst 8-tip upstream yield must not alter assembly.
2. Reproduce all four instant ledger rows and all four favorable losing examples above. Two batches double per-unit tax; no aggregate rounding. Rune 15×38 must have tax zero; amethyst arrow 15×114 must have tax 30, not floor(1710×.02)=34.
3. Input ceilings 666 arrow batches and 1,100 dart batches; 667 arrow batches need 10,005 tips and exceed 10,000 allowance. Output buy limit must not cap manufacturing/sales. Two dart recipes must share the same feather allowance in a combined plan.
4. N=0 yields zero flows; negative/fractional/unsafe N is rejected; quantities cannot overflow safe integer arithmetic. Missing/stale high or low quotes do not become zero-cost ingredients. Keep losing rows visible in grey.
5. Verify adapter direction explicitly, no accidental raw-market low/high substitution. Null rate yields no GP/hour or active-time sizing. Owned materials, if supported later, distinguish zero new cash spend from nonzero opportunity cost.

## Unknown mechanics and deferred scope

Cooking: the [karambwan guide](https://oldschool.runescape.wiki/w/Money_making_guide/Cooking_raw_karambwan) explicitly says its displayed profits assume none burned; ordinary Cooking 30 alone does not establish deterministic yield. The existing 1,300/h is a guide's tick-perfect normal-rate assumption, not a measured personal throughput. [Cooking](https://oldschool.runescape.wiki/w/Cooking) says an equipped cooking cape prevents burns, while [Cooking training](https://oldschool.runescape.wiki/w/Pay-to-play_Cooking_training) says cooking gauntlets do not affect karambwan burns. Thus a cape-only no-burn scenario is supportable, but is already-covered production, not a missing recipe. **Defer** general level/range/gauntlet/Hosidius success rates, burn economics, special bonus-yield equipment and tick-manipulation rates; no success curve or expected GP/hour was invented. Do not present the existing 1:1 karambwan row as guaranteed at level 30.

Fletching: dart creation pages show zero tick delay; that does not imply infinite throughput. Arrow animation ticks do not include bank/GE/interaction overhead. No trustworthy personal production rate was established, so all comparisons are GP/batch only. Partial final in-game batches, colored feather substitutions, poisoned/seeking ammunition, upstream smithing/cutting, modifiers, connected variant limits and multi-stage routes are outside this bounded recommendation. These omissions are explicit scope boundaries, not claims that such mechanics do not exist.

Wiki HTML often returned robots restrictions; indexed Wiki creation tables and official updates reproduced on the Wiki were used for mechanics, and direct Wiki API responses for IDs/prices/limits. No third-party calculator, other game edition, or unsourced rate was used. A single snapshot does not prove permanent unprofitability; it does establish that these four examples supply no observed edge worth a new money-making feature now.

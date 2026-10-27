# Simple item conversions: bounded primary-source research

Research only, 2026-10-27. Captured prices describe a historical quote scenario; no production or fills were observed.

## Decision

**Support one small blue-dragon-scale comparison in the existing mobile processing tools.** One purchased scale → one dust has a **+54 GP/action arithmetic margin by hand**, or **+4 GP/action using Wesley**, at the captured instant sides. This is a quote scenario, not realized profit or a buying recommendation: the input purchase print is 15m36s old and the returned hour contains only **34 high-side input units**. Do not multiply the margin by the 13,000 limit and call it obtainable profit.

Reject ground mud runes for GE resale: the OSRS item is untradeable. Reject lava scales for a simple deterministic feature: manual output varies, Wesley's fixed-output route loses **119 GP/action**, and the input purchase print is almost three hours old. No new optimizer, forecast, confidence score, GP/hour, fill-time estimate or historical collector is supported.

## Duplication and local seams

Read `CLAUDE.md`, `mobile/AGENTS.md`, `docs/ai-instructions/testing.md`, `docs/DEVELOPMENT_RULES.md`, and the [roadmap](roadmap-ideas.md), plus [finished potions](finished-potion-research.md), [cooking/fletching](cooking-fletching-research.md), and [next mechanisms](next-gp-mechanisms.md). The user's research-only, no-DB scope applies; this research adds no user-facing direct API path. Preserve blue/light/dark presentation and grey losses; no web design changes.

Inspected `mobile/src/lib/methods.ts`, `processingLab.ts`, `batchCoordinator.ts`, shared `recipes.js`, `derivedRecipes.js`, and processing/crafted/money-making data. Mobile already exposes the shared money-making catalog and curated processing recipes. The lab adapts instant input high/output low and supports absent rates; the batch coordinator requires deterministic whole-unit yields and accepts fees and the shared tax function. Reuse these rather than adding another calculator engine.

The catalog already includes grinding chocolate/goat/unicorn horns, crushing bird nests/superior bones, chest openings, crystal-key assembly and bracelet dismantling. Earlier reports cover potion/decant, ammunition, repair, stored charges and feather packs; none is reopened. ID/name searches found **no** blue-scale → dust, mud → ground mud, or lava-scale → shard recipe. `mmg:Collecting blue dragon scales` produces ID 243, but does not grind it into ID 241. Derived recipes generate herb/unf/dose operations, not these conversions. This establishes an uncovered recipe, not a novel system requirement.

## Mechanics, identity and access

- **Blue dragon scale 243 ×1 → Dragon scale dust 241 ×1.** Members; pestle and mortar required and retained; no skill/XP gate or facility listed in the creation recipe. Manual grinding has no listed service coin fee. Wesley in Nardah accepts noted/unnoted secondaries for **50 GP per input**, with the same one dust yield. A purchased-input grinding route does not require entering Taverley Dungeon or collecting scales. Tool acquisition, travel and banking are unpriced; assume an owned tool for manual comparison. Sources: [dust creation and Wesley fee](https://oldschool.runescape.wiki/w/Dragon_scale_dust), [pestle and mortar](https://oldschool.runescape.wiki/w/Pestle_and_mortar). No Desert Diary completion is needed for Wesley's service ([Wiki Herblore guide](https://oldschool.runescape.wiki/w/Ironman_Guide/Herblore)).
- **Mud rune 4698 ×1 → Ground mud runes 9594 ×1.** Members, pestle and mortar; output is explicitly **untradeable**, nonstackable and unnoteable. Creation lists no skill gate; its quest use is not evidence of a quest prerequisite to grind. Confirmed directly from [OSRS page wikitext API](https://oldschool.runescape.wiki/api.php?action=parse&page=Ground_mud_runes&prop=wikitext&format=json), including `id=9594` and `tradeable=No`; [item page](https://oldschool.runescape.wiki/w/Ground_mud_runes). No output GE quote/volume/limit exists in the fetched mapping. Do not substitute RuneScape 3's tradeable item, invent a sale, or treat a missing quote as zero. No service fee modeled; no resale calculator proposed.
- **Lava scale 11992 ×1 → Lava scale shard 11994.** Members, retained pestle and mortar. Manual yields are **3, 4, 5 or 6**; Herblore changes the distribution. Hard Wilderness Diary increases each result by 50%, rounded down: **4, 6, 7 or 9**. Neither 4.5 nor 6.5 is a guaranteed output. Wesley gives **exactly three shards per scale**, regardless of the manual-yield attraction, for the 50-GP input service fee. Sources: [lava scale](https://oldschool.runescape.wiki/w/Lava_scale), [shard](https://oldschool.runescape.wiki/w/Lava_scale_shard), [service fee](https://oldschool.runescape.wiki/w/Pestle_and_mortar). No production skill gate is listed; Herblore levels to use shards in potions are separate. Buying scales does not require fighting in the Wilderness. No full probability model or personal pace was validated.

## Captured direct API evidence

Fetched [mapping](https://prices.runescape.wiki/api/v1/osrs/mapping), [latest](https://prices.runescape.wiki/api/v1/osrs/latest) and [1h aggregate](https://prices.runescape.wiki/api/v1/osrs/1h) once each, with a descriptive User-Agent. Retrieval completed **2026-10-27T06:18:51Z**, Unix **1793081931** (ages below rounded to integer seconds). Aggregate returned timestamp **1793073600 = 04:00 UTC**, a block start **2h18m51s** before retrieval; do not label it the current hour. No history/timeseries pulls. Endpoint URLs are mutable; these transcribed values preserve the observation.

Latest high is used as the instant-buy observation, latest low as the instant-sell observation. They are independent historical transactions, not an order book or guaranteed executable quotes. Aggregate volumes count observed units on each side, not available inventory or personal fill odds ([API documentation](https://oldschool.runescape.wiki/w/RuneScape%3AReal-time_Prices)). V1 matches the existing integration; its documented possible removal is outside this task.

| Item / ID | Mapping limit | High GP / Unix time / age seconds | Low GP / Unix time / age seconds | Returned hour high / low units | Hour avg high / low GP |
|---|---:|---|---|---:|---|
| Blue dragon scale 243 | 13,000 | 12 / 1793080995 / 936 | 11 / 1793079576 / 2355 | 34 / 6080 | 12 / 11 |
| Dragon scale dust 241 | 13,000 | 69 / 1793078335 / 3596 | 67 / 1793081777 / 154 | 7031 / 3577 | 70 / 65 |
| Mud rune 4698 | 18,000 | 72 / 1793081544 / 387 | 64 / 1793081314 / 617 | 92879 / 117420 | 69 / 63 |
| Ground mud runes 9594 | Not mapped | unavailable | unavailable | unavailable | unavailable |
| Lava scale 11992 | 11,000 | 309 / 1793071586 / 10345 | 288 / 1793081866 / 65 | 0 / 238 | null / 288 |
| Lava scale shard 11994 | 11,000 | 84 / 1793080889 / 1042 | 81 / 1793081743 / 188 | 423 / 1067 | 71 / 73 |

All five mapped items have `members:true`. Mapping gives listed four-hour purchase limits, not remaining account allowances, supply or a conversion cap. The four-hour clock starts with a purchase; sale quantities have no GE buy-limit cap ([buying limits](https://oldschool.runescape.wiki/w/Grand_Exchange/Buying_limits)). Shared grouping between raw/processed variants was **not established**. Do not claim independent spare allowances, add them together, or let an output's purchase limit cap manufactured sales. No NPC service capacity, travel cost, available depth or observed personal execution was measured. Zero high-side lava volume is genuine zero in this returned block; its null average remains unknown.

## Exact tax and snapshot arithmetic

Imported and executed the repository's [`geTax(price,id)`](../../src/domain/flipping/geTax.js), including exemption data. New-offer GE tax is 2%, floored **per sold item**, capped at 5M; below 50 GP it is zero ([Wiki tax rules](https://oldschool.runescape.wiki/w/GE)). No tax is charged on purchases, service fees or internal grinding. Dust at 67 pays **1 GP**; each shard at 81 pays **1 GP**. For N actions, multiply already-rounded per-unit tax by output quantity and N.

| Scenario, one input | Acquisition | Fee | Output gross | Output tax | Net sale | Arithmetic margin |
|---|---:|---:|---:|---:|---:|---:|
| Blue scale, manual 1 dust | 12 | 0 | 67 | 1 | 66 | **+54** |
| Blue scale, Wesley 1 dust | 12 | 50 | 67 | 1 | 66 | **+4** |
| Lava scale, Wesley 3 shards | 309 | 50 | 243 | 3 | 240 | **−119** |

Manual lava, conditional on an actual yield q, has margin `80q−309`: **−69, +11, +91, +171** for q=3,4,5,6. With the diary, possible margins are **+11, +171, +251, +411** for q=4,6,7,9. These are outcome bounds under fixed quotes, not expected profits or proof of executable opportunity. The stale high and absent high-side volume reject promotion even of the positive diary lower-bound arithmetic. Do not assign a probability or convert a displayed average yield into deterministic batch output.

Mud grinding costs the observed 72 GP input but produces a retained untradeable item; no GE gain can be computed. It is not a 72-GP realized trading loss unless a separate valuation/disposal assumption is declared.

## Minimal supported interaction

A vetted **blue scale → dust** recipe can reuse existing mobile processing accounting. A whole action count N and **manual / Wesley** fee selector are a proposed small UI integration, not controls supplied by adding a recipe entry. Default N=1; price mode clearly says buy-high/sell-low, with both quote ages and aggregate block time visible. Show exact input/output counts, acquisition, fee, per-unit tax and batch net/margin. At this snapshot N=10 is cost 120, fee 0/500, tax 10, proceeds 660, margin 540/40—arithmetic only, with no suggested attainable batch. Reuse `ProcessRecipe`, `labMarket`, batch accounting and existing price floors/ceilings; `actionsPerHour:null`. The current timed lab sizing returns unknown batch size for this absent rate and uses mapping-based recipe limits. It cannot supply the proposed count-based comparison unchanged: choose an explicit manual-count integration before implementation, and do not reuse mapping limits as remaining allowances or inferred capacity. A per-action comparison is the smaller initial option. No new screen/server or auto-recorded fills/profits is needed. Missing quotes remain unknown; losing scenarios remain visible in grey within blue light/dark styling.

A remaining-allowance input may be explicit/unknown; never derive capacity from the full mapping limit or 34 observed trades. Defer owned-stock support unless cash outlay and input opportunity value are shown separately. No automatic session, holdings, confirmed-capital or trade writes. Lava/mud are excluded from this deterministic selector.

Later implementation checks: exact 243→241 one-to-one quantities; fee 0/50 per input; unit tax 1 at sale 67; N=0 zero flows; N=10 values above; missing/stale quote preservation; invalid/fractional counts; negative margin shown; no implied rate or fill. Owned-tool assumption must be explicit.

## Verification and limitations

Local Node 24 assertions imported the actual tax function and passed blue manual/Wesley margins and lava Wesley rejection. Existing processing and tax-exemption unit suites passed: **2 files, 15 tests**. No implementation/tests were added; full application lint/typecheck/native QA were not performed for this documentation-only scope. Some Wiki HTML requests were blocked by robots; indexed OSRS Wiki content supplied mechanics, and the direct OSRS page API resolved the mud item identity/tradeability. Other game editions and third-party calculators were excluded from evidence. No live game production or fills were observed.

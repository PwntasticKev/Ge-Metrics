# Next GP mechanisms: bounded primary-source research

Research only, 2026-10-26 America/Denver; snapshot retrieved **2026-10-27 05:02:59 UTC**. Three mechanisms assessed; only equipment repair merits a small mobile comparison. This is a ranking by supported decision utility, not a profit forecast. No application code, database, EAS, website visuals, builds, dependencies, devices, branches, commits, pushes or subagents were changed/used. The user's no-subagent instruction overrides the research skill's delegation instruction.

## Decision

1. **Fully broken equipment → repair → resale:** add a narrowly scoped repair-fee comparison to the app, initially one verified Barrows pair. Dharok's platelegs show **+24,185 GP** after tax at 99 Smithing versus **−15,415 GP** using an NPC. This is one asynchronous observation, with a 50-minute-old purchase print and sparse purchase-side volume; it is not an instruction to buy. Moon repair belongs to this same mechanism, not a second feature; the checked Blue Moon chestplate loses money even at 99 Smithing and is rejected as a money-making candidate.
2. **Stored-charge conversion (Trident of the Seas): reject for a money-making feature now.** Both ordinary full charging and uncharging lose money at observed instant sides. Mechanics are sufficiently documented to calculate a loss; there is no supported reason to ship another conversion tool on this snapshot.
3. **NPC feather pack → unpack → GE resale: reject now.** At the observed instant sale of 2 GP/feather, a minimum-price pack merely breaks even, and a ten-pack purchase loses 90 GP. Do not substitute the latest 3 GP instant-buy print as a sale receipt.

No new optimizer, market-pattern detector, confidence score, GP/hour claim, historical collector or generic batch planner follows from this research.

## Instructions and duplication audit

Read `CLAUDE.md`, `docs/DEVELOPMENT_RULES.md`, `docs/ai-instructions/testing.md`, `mobile/AGENTS.md`, the roadmap, and both [finished-potion](finished-potion-research.md) and [cooking/fletching](cooking-fletching-research.md) reports. Preserve the roadmap's client-side Wiki data/on-device storage scope and existing website appearance. Earlier potion/ammunition losses are not reopened here.

Inspected `mobile/src/lib/methods.ts`, `processingLab.ts`, price ceilings/floors/stress, `batchCoordinator.ts`, `combinedBatches.ts`, `productionRoutes.ts`, `doseBasket.ts`, `setProfitLab.ts`, `processingSessions.ts`, `confirmedCapital.ts`, shared processing/crafted/money-making recipes, tax code, and the web Barrows repair recipe data.

- Existing 23 curated processing methods include **boat repair kit manufacture**, not armour repair. The lab already supplies instant/patient sides, tax, budgets and missing-rate handling. Ceilings/floors/stress are already available; do not recreate them.
- Batch/combined ledgers already handle whole deterministic quantities, shared inputs, fees and taxed output sales. Production routes are deliberately restricted to vetted herb and steel chains. Dose baskets already conserve doses/containers. Set lab already combines/unpacks sets. None requires extension for this proposal.
- Recorded processing sessions already distinguish acquisition, opportunity values, fees and sales; confirmed capital requires explicit cash/activity reconciliation. A quoted repair margin must never become recorded proceeds or confirmed capital.
- No file/text match for `exit rehearsal` / `exitRehearsal` was present in the inspected `mobile` checkout. Its requested status is therefore **unavailable to inspect here**, not evidence it needs replacing. A future repair comparison must reuse any exit-rehearsal work present on the integration branch.
- The **web already has Barrows Repair** (`src/pages/BarrowsRepair/index.jsx`); this is an app coverage gap, not a novel project-wide mechanism. Its static `barrows-repair-filters.jsx` must not be copied: it labels ID **4888** as broken Dharok's platelegs, whereas the live mapping identifies the tradable `0` item as **4902**. Similar static ID assumptions require independent verification. No correction to web code is part of this task.
- Crystal-key assembly is already `mmg:Creating crystal keys`; bracelet dismantling is already a money maker, and serpentine-helm crafting is already a crafted recipe. Set unpacking is already covered. Searches for 11905/11908 and `Buying feather packs` found no shared recipe, but absence alone does not justify adding losing methods.

## Snapshot provenance and arithmetic

Exactly three price-service requests were made, once each: [mapping](https://prices.runescape.wiki/api/v1/osrs/mapping), [latest](https://prices.runescape.wiki/api/v1/osrs/latest), and [24h](https://prices.runescape.wiki/api/v1/osrs/24h). No history/timeseries downloads. The complete responses stayed in a temporary research file outside the repo; the relevant observed values are transcribed below. Links refresh over time and will not reproduce this historical snapshot.

**Important age finding:** `/24h` returned timestamp **1792886400 = 2026-10-25 00:00:00 UTC**, over 53 hours before retrieval. Report its volumes as that returned aggregate's evidence, not today's turnover. Do not use them to estimate a fill time or to size a purchase. Latest sides also have independent timestamps and are not simultaneous executable quotes.

For purchased inputs use latest **high**; for sales use latest **low**. The existing [tax function](../../src/domain/flipping/geTax.js) applies floor(2% × unit sale), capped at 5M per item and respecting exemptions; sales below 50 GP pay zero. The [Wiki GE rules](https://oldschool.runescape.wiki/w/Grand_exchange) and [Jagex's tax update reproduced by Wiki](https://oldschool.runescape.wiki/w/Update%3AYama_CAs_%26_More%21) support new-offer taxation. Tax each sold unit, never an entire stack's gross. These equipment/death/chaos sales use ordinary tax; fire/feathers are below threshold. No tax on buying, repair fees, charging, or internal conversion.

### 1. Fully broken equipment repair

A broken Barrows piece plus coins becomes its undamaged version. Only fully repaired/fully degraded states are tradable; restrict acquisition to explicit `0` IDs, never approximate intermediate degradation. Full NPC fees are 60K helm, 90K body, 80K legs, 100K weapon. Armour-stand fee = NPC fee × (1 − effective Smithing/200); boosts affect it. A stand can be used in any player's house; building one's own needs 55 Construction, 8 oak planks and a limestone brick. Owning/building a stand is not a per-item material input. Repair and wearing requirements are different: Dharok legs' 70 Defence is for wearing; its repair production entry lists level 1 Smithing. Sources: [Barrows repair rules](https://oldschool.runescape.wiki/w/Barrows_equipment), [armour stand](https://oldschool.runescape.wiki/w/Armour_stand), [Dharok's platelegs and repair recipe](https://oldschool.runescape.wiki/w/Dharok%27s_platelegs_0).

**Dharok's platelegs 0 (4902) → Dharok's platelegs (4722), one each:**

- Buy 754,965 GP; `highTime` **1793074371 / 04:12:51 UTC**. Sell 836,275 GP; `lowTime` **1793076630 / 04:50:30 UTC** (both Oct 27).
- Unit tax = floor(836,275 × .02) = **16,725**; net sale **819,550**.
- NPC: 819,550 − 754,965 − 80,000 = **−15,415 GP**; upfront **834,965 GP**.
- Stand at 99: fee **40,400**; 819,550 − 754,965 − 40,400 = **+24,185 GP**; upfront **795,365 GP**.
- At level 60: fee 56,000, margin **+8,585 GP**. First whole unboosted Smithing level with nonnegative margin under these fixed quotes is **39**: fee 64,400, margin +185; level 38 gives −215. This is an arithmetic threshold, not an access or fill claim.
- Snapshot mapping limit **15 for each ID**, members true. Whether broken/new variants share an allowance was **not verified**. Display mapping limit as metadata, request remaining allowance explicitly, and do not add two limits together or multiply this margin by 15 as attainable profit.
- Returned `/24h` volumes, **high-side / low-side**: broken **3 / 763**, repaired **298 / 243**. Only three high-side broken trades in the old aggregate materially limits the usefulness of the positive instant-purchase observation. No book depth was obtained.

**Moon negative control:** [Blue Moon chestplate repair](https://oldschool.runescape.wiki/w/Blue_Moon_chestplate) is 1.5M GP at NPC, discounted 7,500 GP per Smithing level at a stand: **757,500 at 99**. Use broken **29058** and repaired **29013**, one each; membership and stand/NPC access apply. No combat/quest unlock is assumed merely to repair a purchased piece; verify any additional repair gate before expanding coverage. The [Blue Moon armour page](https://oldschool.runescape.wiki/w/Blue_Moon_armour) documents the broken/repaired price comparison and repair fee.

- Buy 490,569 (`highTime` 1793054279 / Oct 26 22:37:59 UTC); sell 1,252,181 (`lowTime` 1793077161 / Oct 27 04:59:21 UTC).
- Tax **25,043**, net **1,227,138**. Stand-99 gain = 1,227,138 − 490,569 − 757,500 = **−20,931**; NPC gain **−763,431**. Reject this pair as a money maker.
- Both mapping limits 15, shared grouping unknown. Old aggregate volumes: broken **11 / 51**, repaired **358 / 282**.

Other positive repair prints were deliberately not promoted: Guthan helm's input high was **Oct 26 14:06:31 UTC**, Blood Moon chestplate's **Oct 26 11:57:26 UTC**. Their age makes a ranking by nominal gain unhelpful. Barrows/Moons are one fee-sensitive mechanism, not multiple discoveries.

### 2. Trident stored-charge conversion — rejected

The ordinary full trident **11905** is tradable; partial charges are not. Charging consumes uncharged **11908 ×1**, death rune **560 ×2500**, chaos rune **562 ×2500**, fire rune **554 ×12500**, coins **25,000**, producing one full trident. The Wiki recipe lists no production skill; 75 Magic is a wielding requirement, and 87 Slayer is a monster-drop requirement, not a purchased-input production requirement. Sources: [current item/recipe](https://oldschool.runescape.wiki/w/Trident_of_the_Seas), [tradable charge states](https://oldschool.runescape.wiki/w/Trident_of_the_seas).

For uncharging, the [storage rules](https://oldschool.runescape.wiki/w/Storage) describe stored rune quantities and coins not returned; the [in-game transcript](https://oldschool.runescape.wiki/w/Transcript%3ATrident_of_the_seas) confirms the lost coins. The older transcript's statement about combination runes conflicts with the current item's 2025 change entry. Exclude alternative rune charging/refund histories; do not infer refunds for those variants from this ordinary-rune example.

Snapshot latest high / low and mapping limit:

- Full trident: **747,858 / 721,692**, limit 8; uncharged: **40,505 / 40,801**, limit 8 (crossed asynchronous prints, not corrected silently).
- Death: **160 / 155**, limit 25,000; chaos **86 / 81**, limit 18,000; fire **6 / 5**, limit 50,000.
- Charging outlay = 40,505 + 400,000 + 215,000 + 75,000 + 25,000 = **755,505**. Full sale tax **14,433**, net **707,259**, loss **48,246 GP**.
- Uncharging ordinary full contents: uncharged net **39,985**; deaths 2,500 × (155−3) = **380,000**; chaos 2,500 × (81−1) = **200,000**; fire 12,500 ×5 = **62,500**. Total **682,485**, less purchase 747,858 = **−65,373 GP**. Coin refund **zero**. Reject both directions.
- Old aggregate high/low volumes: full **413/246**, uncharged **238/330**, death **37,675,151/33,674,475**, chaos **41,229,449/37,975,148**, fire **89,693,930/149,817,051**. Large rune turnover does not establish full-trident availability. Mapping limits are not known remaining allowances; shared trident grouping unknown.

### 3. NPC pack/unpack — rejected

[Wiki's feather-pack guide](https://oldschool.runescape.wiki/w/Money_making_guide/Buying_feather_packs) specifies Gerrant in Port Sarim, no skill/quest requirement, packs starting at **200 GP**, each additional pack in the described depleted-stock purchase increasing by 2 GP; ten cost **2,090 GP**. [Feather](https://oldschool.runescape.wiki/w/Feathers) verifies **100 feathers per pack**. This is a stock-dependent NPC purchase, not a constant-price GE recipe.

Feather **314** latest high **3**, low **2**; lowTime **1793077314 / Oct 27 05:01:54 UTC**. One minimum-price pack yields 100 × (2−0) −200 = **0 GP**. Ten yield 1,000 ×2 −2,090 = **−90 GP**. A 3 GP patient sale would give +910 GP for ten, but that is an unexecuted assumption, not this snapshot's instant result. Reject as a new money-making feature.

Old aggregate high/low volume **84,294,096 / 35,339,288**; feather GE buy limit **30,000** is irrelevant to NPC supply. Shared shop stock, depletion/recovery, competing shoppers, actual checkout total and opening/travel time were not observed. A later shop tool would require actual stock/total inputs; no fixed GP/hour or unlimited minimum-price supply is supported.

## Smallest implementation seam, if repair coverage is selected

Use one explicit vetted repair pair (4902 →4722), a whole quantity, NPC/stand selector and effective Smithing **1–99**. Defer boost acquisition economics and partial durability. Compute the fee in a tiny pure adapter and pass a standard one-input/one-output `ProcessRecipe` with `coinCost` into the existing lab/batch/tax machinery. `actionsPerHour:null`; show per-item and fixed-batch amounts only. Show individual quote timestamps and old volume timestamp. Negative comparisons remain visible in grey.

Reuse existing ceilings/floors for target buy/sell prices after setting the fee. Do not create new routes, set recipes or a second sensitivity engine. Do not automatically write to sessions, holdings, slots or capital. If an owned broken item is supported later, distinguish repair cash fee from its current after-tax liquidation opportunity value; acquisition cost is not automatically its opportunity value.

Necessary later tests (no implementation added here):

- Exact IDs and one-to-one conservation; reject partial-state IDs and reversed definitions; regression against web's erroneous 4888 lookup.
- NPC fee 80,000; level 1 stand 79,600; level 60 56,000; level 99 40,400. Invalid/fractional levels and counts fail explicitly.
- Snapshot margins −15,415 / +24,185; break-even level boundary 38/39; tax 16,725 per item, multiplied only after rounding.
- Zero batch produces zero costs/output; fee charged per repaired item; no purchase/internal-conversion tax.
- Missing quote stays unknown; old price/volume times survive; absent shared-limit grouping and absent remaining allowance never become spare capacity.
- Owned stock cash/opportunity distinction; no assumed hourly rate, fill ETA, reinvestment or auto-confirmed cash.

Research arithmetic was checked with local Python against the single snapshot. Application tests/lint/typecheck were not run: this is a documentation-only task with no application changes. Browser opens of some Wiki pages were blocked by robots; indexed Wiki content supplied the cited mechanics. No live game execution was performed. Recheck mechanics, mapping IDs and prices before implementation; the evidence supports a small comparison, not automatic purchasing or a broad money-making launch.

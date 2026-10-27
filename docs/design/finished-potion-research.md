# Finished potion comparison: bounded research

Research date: 2026-10-27 UTC (2026-10-26 America/Denver). Scope: four ordinary, deterministic unf + secondary recipes; research only. No implementation, device work, builds, branch changes, or historical downloads.

## Recommendation

Proceed with a small **make versus buy / sell (3) versus decant (4)** comparison inside the existing processing tools. Do not build another general processing optimizer or advertise these as money makers. All four examples lose money at the observed instant sides; that is useful information for someone choosing whether to train Herblore or buy their supplies finished. Start with Prayer potion if verified shared buy-limit grouping is required for launch; defer automated multi-dose purchasing for the other families until grouping is independently confirmed.

The useful addition is recipe coverage and an explicit comparison ledger, not rates or fill predictions. Keep production yield at three doses; exclude chemistry equipment, goggles, secondary-saving effects, potion storage, divine variants, mixes, and multi-stage upgrades. These are scope assumptions, not claims that modifiers do not exist.

## Existing functionality and duplication check

Read root `CLAUDE.md`, `docs/ai-instructions/testing.md`, `mobile/AGENTS.md`, and `docs/design/roadmap-ideas.md`; no ancestor AGENTS file or docs-specific instructions were found. The roadmap explicitly lists unf + secondary potion making as a gap. Its core constraints are client-side Wiki data/on-device storage, blue/grey loss presentation, and no website redesign.

Inspected these local sources:

- [`derivedRecipes.js`](../../src/domain/flipping/derivedRecipes.js): derives herb cleaning, unfinished potions, and dose-pair decanting. It does **not** know which secondary finishes an ordinary potion. Its exact-ratio decant recipes omit empty-vial output.
- [`processingMethods.js`](../../src/domain/flipping/data/processingMethods.js): no curated recipes producing IDs 139, 145, 3026, or 6687. Sailing potion production already exists and is outside this proposal.
- [`moneyMakingRecipes.js`](../../src/domain/flipping/data/moneyMakingRecipes.js): an output-ID check found only incidental potion output in `Opening grubby chests`, not these deterministic recipes.
- [`productionRoutes.ts`](../../mobile/src/lib/productionRoutes.ts): vetted two-stage chains are ranarr/snapdragon cleaning → unf and steel → cannonballs. It requires exactly two stages and rejects unvetted definitions; passing a finished-potion chain to it is not already supported.
- [`doseBasket.ts`](../../mobile/src/lib/doseBasket.ts): already conserves doses, calculates remainder/container counts, accounts for purchased/released vials, taxes each sale, tracks owned opportunity cost, and bounds its search. It takes family provenance/allowance as input; it does not verify real family grouping. Produced potion inputs should enter as inventory at an explicit transfer basis, not as another GE purchase or taxable internal sale.
- [`processingLab.ts`](../../mobile/src/lib/processingLab.ts): already distinguishes observed instant sides and volume-backed patient averages. Reuse those conventions; do not add a separate execution-confidence model.

## Supported recipes and item identity

Each action consumes **one unf and one secondary**, yielding **one ordinary vial containing three doses**, with no additional vial of water or empty vial input. Recipe quantities and levels are supported by the creation sections linked in each row. All require membership and Herblore access; training Herblore requires Druidic Ritual ([Herblore](https://oldschool.runescape.wiki/w/Herblore)).

| Recipe / source | Inputs, quantity 1 each (item IDs) | Output, quantity 1 | Herblore / XP |
|---|---|---|---|
| [Prayer potion](https://oldschool.runescape.wiki/w/Prayer_potion%282%29) | Ranarr potion (unf) **99** + Snape grass **231** | Prayer potion(3) **139**, 3 doses | 38 / 87.5 |
| [Super restore](https://oldschool.runescape.wiki/w/Super_restore_potion) | Snapdragon potion (unf) **3004** + Red spiders' eggs **223** | Super restore(3) **3026**, 3 doses | 63 / 142.5 |
| [Saradomin brew](https://oldschool.runescape.wiki/w/Saradomin_brew%282%29) | Toadflax potion (unf) **3002** + Crushed nest **6693** | Saradomin brew(3) **6687**, 3 doses | 81 / 180 |
| [Super attack](https://oldschool.runescape.wiki/w/Super_attack%283%29) | Irit potion (unf) **101** + Eye of newt **221** | Super attack(3) **145**, 3 doses | 45 / 100 |

The [Wiki mapping API](https://prices.runescape.wiki/api/v1/osrs/mapping), retrieved below, verifies exact GE names/IDs and listed limits for every input/output here; all have GE prices on both sides in this snapshot, so the comparison uses tradeable GE items. `members` describes the item, not a recipe's level or account eligibility. Do not treat noted item IDs as additional commodities.

| Family | IDs in dose order 1, 2, 3, 4 | Listed limit per dose variant |
|---|---|---|
| Prayer | 143, 141, 139, 2434 | 2,000 |
| Super restore | 3030, 3028, 3026, 3024 | 2,000 |
| Saradomin brew | 6691, 6689, 6687, 6685 | 2,000 |
| Super attack | 149, 147, 145, 2436 | 2,000 |

All four unfs list 10,000 each; snape grass, eggs, and eye of newt list 13,000 each; crushed nests list 11,000; empty vial **229** lists 13,000 ([mapping](https://prices.runescape.wiki/api/v1/osrs/mapping)). Limits are not available supply.

The four-hour timer begins with the first purchase. Prayer dose variants explicitly share a connected limit: buying 2,000 (4)s does not leave another 2,000 allowance for (3)s. There is no selling limit ([buying limits](https://oldschool.runescape.wiki/w/Grand_Exchange/Buying_limits), [Grand Exchange](https://oldschool.runescape.wiki/w/Grand_Exchange)). Use group `prayer-ordinary-doses` for 143/141/139/2434. The mapping alone does **not** verify grouping for the other three families or relationships to mixes/blighted/unfs. Conservatively model one 2,000-bottle allowance per selected ordinary family as an explicit assumption, or leave allowance unknown; do not assert four independent allowances or share all families together. Production itself is not a GE buy and must not consume the finished-family allowance. No cross-input grouping was established; show input limits independently with this limitation.

## Tax and decant mechanics

For new offers, tax is 2%, rounded down per sold item, with a 5,000,000 GP per-item cap; values below 50 GP incur zero. The current official update also preserves old-offer tax rules ([Jagex update reproduced by Wiki](https://oldschool.runescape.wiki/w/Update%3AYama_CAs_%26_More%21)); per-item rather than whole-offer taxation is described in the [original official tax announcement](https://oldschool.runescape.wiki/w/Update%3AGrand_Exchange_Tax_%26_Item_Sink?mobileaction=toggle_view_desktop). Use existing `geTax(price,id)` and its exemption data, not another tax formula. These ordinary potion sales are modeled as taxable; purchases and internal crafting/decant transfers incur no modeled sales tax. Tax the final (3), (4), remainder and vial sales separately. The snapshot vial sale at 2 GP is untaxed.

Bob Barter provides members' decanting, accepts notes, returns empty containers, and can output 1–4 doses ([Bob Barter](https://oldschool.runescape.wiki/w/Bob_Barter)). **Unresolved source inconsistency:** that page says missing containers cost current GE guide price + 2 GP, while [Decanting](https://oldschool.runescape.wiki/w/Decant) says 5 GP per missing vial. Do not encode either as a universal fee. The scoped 3→4 operation needs no extra containers and has no decant service fee, so this disagreement does not affect it. Travel/time costs remain unpriced.

For integer action count N: total doses D=3N; four-dose bottles Q=floor(D/4); remainder R=D mod 4; potion containers C=Q+[R>0]; released empty vials E=N−C. Output includes one R-dose potion if R>0 and E empty vials. Examples: N=1 → one (3), zero empties; N=2 → one (4)+one (2), zero empties; N=3 → two (4)+one (1), zero empties; N=4 → three (4)+one empty vial. Never round 3N/4 upward or discard a remainder's doses. Retain empties by default; optional liquidation must use an explicit vial sale quote and quantity.

## One modest observed snapshot

Fetched once each: [mapping](https://prices.runescape.wiki/api/v1/osrs/mapping), [latest](https://prices.runescape.wiki/api/v1/osrs/latest), [one-hour aggregates](https://prices.runescape.wiki/api/v1/osrs/1h?timestamp=1793059200). Retrieval began **2026-10-27T02:35:02.459005Z**. Hour block timestamp **1793059200 = 2026-10-27 00:00 UTC**. These endpoint links are mutable; the values below are the captured evidence. The host clock supplied the retrieval date, which is later than the session's nominal date.

High is an observed instant-buy transaction, low an instant-sell transaction; hourly volumes count observed trades on each side, not book depth or personal fill probability ([API documentation](https://oldschool.runescape.wiki/w/RuneScape%3AReal-time_Prices)). V1 was used because it matches existing integration; documentation now describes V2 and warns V1 may be removed. Do not extend this task into an API migration.

| ID | Latest high / low GP | highTime / lowTime (Unix) | Hour high / low volume |
|---|---|---|---|
| 99 | 5613 / 5610 | 1793068289 / 1793068433 | 32078 / 14614 |
| 231 | 923 / 910 | 1793068425 / 1793068429 | 48083 / 39713 |
| 139 | 6372 / 6312 | 1793068346 / 1793068439 | 6539 / 14518 |
| 2434 | 8665 / 8450 | 1793068439 / 1793068427 | 55745 / 15743 |
| 3004 | 7338 / 7310 | 1793068434 / 1793068240 | 30052 / 6183 |
| 223 | 157 / 156 | 1793068435 / 1793068328 | 74997 / 39380 |
| 3026 | 6991 / 6959 | 1793068181 / 1793068428 | 3879 / 8401 |
| 3024 | 9100 / 8944 | 1793068438 / 1793068416 | 49252 / 27183 |
| 3002 | 2285 / 2200 | 1793068357 / 1793068133 | 18797 / 11446 |
| 6693 | 3755 / 3701 | 1793068390 / 1793068435 | 9931 / 11283 |
| 6687 | 4541 / 4500 | 1793067997 / 1793068432 | 2402 / 1345 |
| 6685 | 6060 / 5906 | 1793068436 / 1793068406 | 64957 / 42646 |
| 101 | 1290 / 1272 | 1793068437 / 1793066690 | 19121 / 18652 |
| 221 | 5 / 4 | 1793068315 / 1793068156 | 34905 / 4357 |
| 145 | 1175 / 1130 | 1793067867 / 1793068410 | 18 / 10340 |
| 2436 | 1670 / 1655 | 1793068373 / 1793067951 | 26526 / 9057 |
| 229 | 3 / 2 | 1793068237 / 1793068405 | 326619 / 58201 |

Demonstration: N=4, buy both ingredients at latest high; sell outputs at latest low; liquidate the single released vial for 2 GP. Let net(p)=p−floor(0.02p) for these potion prices. Cost=4(high_unf+high_secondary); sell(3) revenue=4net(low_3); decant revenue=3net(low_4)+2. Numbers are arithmetic scenarios, not execution promises.

| Family | Make cost | Buy four (3)s instead | Net sell four (3)s | Make→sell(3) gain | Net sell three (4)s + vial | Make→decant gain |
|---|---:|---:|---:|---:|---:|---:|
| Prayer | 26,144 | 25,488 | 24,744 | −1,400 | 24,845 | −1,299 |
| Super restore | 29,980 | 27,964 | 27,280 | −2,700 | 26,300 | −3,680 |
| Saradomin brew | 24,160 | 18,164 | 17,640 | −6,520 | 17,366 | −6,794 |
| Super attack | 5,180 | 4,700 | 4,432 | −748 | 4,868 | −312 |

For example Prayer cost=4×(5613+923); direct revenue=4×(6312−126); decanted revenue=3×(8450−169)+2. Decanting improves that loss by 101 GP; it worsens restore by 980 GP. Buying finished is cheaper than making for all four observed equal-dose baskets. Retaining the empty vial lowers realized decant cash revenue by 2 GP while retaining that asset; do not call it a vanished cost.

## Small interaction and implementation seam

One family selector (four vetted rows), whole batch count, independent input/output price scenarios, optional owned unf/secondary quantities, and sell(3)/decant(4) choice. Show equal-dose make-versus-buy acquisition cost, XP, cash outlay, final outputs including remainder/empties, per-item tax, net cash and economic gain. Keep losing rows visible in grey. Show zero-action/retain-stock baseline. For “buy” compare N purchased (3)s against N crafted (3)s before applying the same output choice; do not compare N (4)s against N three-dose actions.

Use a tiny explicit recipe registry with source URLs and structured level/XP/dose metadata alongside existing processing data. Add a pure single-stage batch ledger adapter, then reuse the dose-basket accounting for produced inventory; its current optimizer assumes purchased/owned sources, so composition needs an explicit basis to avoid double-counting ingredient cost or finished-potion opportunity value. Do not relax `productionRoutes` to arbitrary chains for this MVP. Charge no intermediate GE tax. Missing prices/allowances remain unknown; do not coerce to zero. No supplied action rate means GP/action and batch GP only, no GP/hour, fill ETA, confidence score or guaranteed profit.

Essential later tests: each recipe's exact IDs/1:1:1 quantities; N=0..5 dose/container conservation; N=4 releases exactly one vial; remainder ID lookup for every family; per-item floor versus aggregate tax (two sales at 99 GP tax 2 GP total, not 3); retained versus sold vial; no tax on internal stages; owned input cash versus opportunity cost; unknown/stale quotes; batch beyond input allowance; shared Prayer allowance across mixed doses; no finished buy allowance consumed by crafting; negative profit displayed; equal doses in make/buy; safe integer validation and no fabricated rate.

## Limitations and verification

Wiki HTML browsing often returned robots restrictions; the search tool supplied indexed Wiki page content, while the Wiki API was directly reachable. No other wiki/game edition or third-party calculator was used as evidence. Exact connected limits beyond Prayer, missing-container fees, modifier yields/costs, and real processing/banking rates remain unresolved or deliberately deferred. No live game mechanics were tested. Existing tax/processing unit tests were run as a repository sanity check; no application implementation was added. Full lint/typecheck/build/native QA are outside this research-only change.

# RuneLite raw GP counter semantics

Research date: 2026-10-27. Scope: RuneLite 1.13.4, pinned commit
`ad137adad1cb5052a5fef6e391888a8895d09830`. These are source findings, not
real-game validation or evidence of collected cash or profit.

## What the primary sources establish

- The [official API Javadoc](https://static.runelite.net/runelite-api/apidocs/net/runelite/api/GrandExchangeOffer.html)
  describes `getSpent()` as cumulative money spent so far. The
  [pinned offer interface](https://github.com/runelite/runelite/blob/ad137adad1cb5052a5fef6e391888a8895d09830/runelite-api/src/main/java/net/runelite/api/GrandExchangeOffer.java#L30)
  returns `long` for both `getSpent()` and the per-item offer limit `getPrice()`;
  bought/sold quantity is an `int`.
- The [official offer UI](https://github.com/runelite/runelite/blob/ad137adad1cb5052a5fef6e391888a8895d09830/runelite-client/src/main/java/net/runelite/client/plugins/grandexchange/GrandExchangeOfferSlot.java#L228)
  labels the same counter “Spent” for buys and “Received” for sells. That label
  does not specify gross versus net tax treatment or collection status.
- The [first-party history consumer](https://github.com/runelite/runelite/blob/ad137adad1cb5052a5fef6e391888a8895d09830/runelite-client/src/main/java/net/runelite/client/plugins/grandexchange/GrandExchangePlugin.java#L340)
  subtracts previous quantity and spent aggregates to detect progress. For
  completed or partially cancelled trades it stores `spent / quantity` using
  integer division. This is an aggregate-derived ratio, not individual fill
  prices or a verified execution-price contract.
- [testCancelTrade](https://github.com/runelite/runelite/blob/ad137adad1cb5052a5fef6e391888a8895d09830/runelite-client/src/test/java/net/runelite/client/plugins/grandexchange/GrandExchangePluginTest.java#L125)
  mocks quantity 1, spent 25 and limit price 1000, then expects history price
  25. It verifies consumer arithmetic; it does not validate real-game price
  improvement.
- The [offer-change event documentation](https://github.com/runelite/runelite/blob/ad137adad1cb5052a5fef6e391888a8895d09830/runelite-api/src/main/java/net/runelite/api/events/GrandExchangeOfferChanged.java#L33)
  says login initially emits `EMPTY` for every slot regardless of actual
  offers, followed by populated updates as server information arrives.
  Initial `EMPTY` therefore cannot prove collection or an empty live offer.

## Local representation and safe use

At `af44e45`, [RecorderPlugin](../../runelite/src/main/java/com/gemetrics/recorder/RecorderPlugin.java)
passes the API `long` values to [Reducer](../../runelite/src/main/java/com/gemetrics/recorder/Reducer.java),
which uses `Long.toString`. [Journal](../../runelite/src/main/java/com/gemetrics/recorder/Journal.java)
serializes those string fields through Gson; the mobile
[decoder and preview](../../mobile/src/lib/runeliteEvidence.ts) validate decimal
strings against Java long bounds and use `BigInt` for GP comparisons and
subtraction. This path has no `int` narrowing of the raw GP counter. The
separate legacy app monetary-bound warning does not discard the raw strings.

Keep the counter as raw `spentGp` evidence (conceptually `rawSpentGp`). Existing
compatible-observation raw quantity and raw GP deltas are the safe consumer;
this finding adds no metrics. Any counter/quantity ratio must remain a raw
ratio, not a verified execution price. Gaps and regressions still require
reconciliation. Actual tax and net GP remain unset; collection remains `UNKNOWN`.

Tax gross/net treatment, collection effects, counter resets and live price
improvement remain **UNKNOWN**. Source labels, arithmetic and mocked tests do
not resolve them or justify automatic cash, realized-profit or settlement claims.

## Real-game validation still required

No results are claimed for these checks:

- Capture taxable and tax-exempt items on both buy and sell sides, comparing
  offer limits, cumulative quantities/GP, game displays and independently
  observed cash changes.
- Capture partial fills and partial collection, then final collection; record
  whether and when either counter changes.
- Capture partial cancellation, collection of remaining items/refunds, and
  relisting in the same slot; compare lifecycle boundaries and resets.
- Capture login/reconnect with existing offers and any actual price improvement;
  distinguish initialization events from server-populated observations and
  compare raw ratios with observed transactions.

Keep these boundaries unresolved until the corresponding evidence is captured.

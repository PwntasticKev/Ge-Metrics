package com.gemetrics.recorder;

import java.time.Instant;
import java.util.UUID;

/** Dependency-free executable tests; assertions always run. */
public final class ReducerTest {
    static final UUID A = UUID.fromString("00000000-0000-0000-0000-000000000001");
    static final UUID B = UUID.fromString("00000000-0000-0000-0000-000000000002");
    static int checks;
    static void check(boolean value) { checks++; if (!value) throw new AssertionError("check " + checks); }
    static Reducer.Observation offer(String state, int qty, long spent) {
        return new Reducer.Observation(state, 4151, 10, qty, 3000000000L, spent);
    }
    static Reducer.Result apply(Reducer.State s, UUID scope, String reason, Reducer.Observation o, int seq) {
        return Reducer.reduce(s, new Reducer.Input(scope, "STANDARD", 0, reason, "session", Instant.EPOCH.toString(), 1, o),
            "source:" + seq, UUID.nameUUIDFromBytes(("offer" + seq).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    }
    public static void main(String[] args) {
        Reducer.State s = new Reducer.State();
        Reducer.Result empty = apply(s, A, "LOGIN", Reducer.Observation.empty(), 1);
        check(empty.event != null && empty.event.offerId == null);
        Reducer.Result baseline = apply(empty.state, A, "LIVE", offer("BUYING", 2, 5000000001L), 2);
        check(baseline.event.continuity.equals("BASELINE") && baseline.deltaQuantity == null);
        Reducer.Result duplicate = apply(baseline.state, A, "LIVE", offer("BUYING", 2, 5000000001L), 3);
        check(duplicate.event == null);
        Reducer.Result fill = apply(baseline.state, A, "LIVE", offer("BUYING", 5, 10000000003L), 3);
        check(fill.deltaQuantity == 3 && fill.deltaSpent == 5000000002L);
        check(fill.event.offerId.equals(baseline.event.offerId));
        Reducer.Result cancelled = apply(fill.state, A, "LIVE", offer("CANCELLED_BUY", 5, 10000000003L), 4);
        check(cancelled.deltaQuantity == 0 && cancelled.event.collection.equals("UNKNOWN"));
        Reducer.Result cleared = apply(cancelled.state, A, "LIVE", Reducer.Observation.empty(), 5);
        check(cleared.event.collection.equals("UNKNOWN") && cleared.event.reason.equals("LIVE"));
        check(apply(cleared.state, A, "LIVE", Reducer.Observation.empty(), 99).event == null);
        Reducer.Result relist = apply(cleared.state, A, "LIVE", offer("BUYING", 5, 10000000003L), 6);
        check(!relist.event.offerId.equals(cancelled.event.offerId) && relist.deltaQuantity == null);
        Reducer.Result gap = apply(fill.state, A, "RECONNECT", offer("BUYING", 7, 12000000003L), 7);
        check(gap.event.continuity.equals("GAP") && gap.deltaQuantity == null);
        check(!gap.event.offerId.equals(fill.event.offerId));
        Reducer.Result regression = apply(fill.state, A, "LIVE", offer("BUYING", 1, 1), 8);
        check(regression.event.continuity.equals("DISCONTINUITY") && regression.deltaQuantity == null);
        Reducer.Result repeatTerminal = apply(cancelled.state, A, "LIVE", offer("BUYING", 5, 10000000003L), 9);
        check(repeatTerminal.event.continuity.equals("DISCONTINUITY"));
        Reducer.Result other = apply(fill.state, B, "LIVE", offer("BUYING", 7, 10), 10);
        check(other.event.previousEventId == null && other.deltaQuantity == null);
        Reducer.Result oldAccount = apply(other.state, A, "LIVE", offer("BOUGHT", 10, Long.MAX_VALUE), 11);
        check(oldAccount.event.previousEventId.equals("source:3"));
        check(oldAccount.event.spentGp.equals(Long.toString(Long.MAX_VALUE)));
        check(fill.state.latest(A, 0).eventId.equals("source:3")); // reducer did not mutate input
        Reducer.Result loginEmpty = apply(fill.state, A, "LOGIN", Reducer.Observation.empty(), 12);
        check(loginEmpty.state.latest(A, 0).eventId.equals("source:3")); // keep stale populated baseline
        Reducer.Result afterEmpty = apply(loginEmpty.state, A, "LIVE", offer("BUYING", 7, 12000000003L), 13);
        check(afterEmpty.event.continuity.equals("GAP") && afterEmpty.deltaQuantity == null);
        check(afterEmpty.event.previousEventId.equals("source:12"));
        boolean unresolvedRejected = false;
        try { apply(s, null, "LIVE", offer("BUYING", 1, 1), 99); } catch (NullPointerException e) { unresolvedRejected = true; }
        check(unresolvedRejected);
        boolean rejected = false;
        try { offer("BUYING", -1, 0); } catch (IllegalArgumentException e) { rejected = true; }
        check(rejected);
        rejected = false;
        try { new Reducer.Observation("SELLING", 1, 1, 2, 1, 1); } catch (IllegalArgumentException e) { rejected = true; }
        check(rejected);
        Reducer.Result sell = apply(new Reducer.State(), A, "LIVE", offer("SELLING", 0, 0), 14);
        Reducer.Result sold = apply(sell.state, A, "LIVE", offer("SOLD", 3, 7), 15);
        check(sold.deltaSpent == 7 && sold.event.collection.equals("UNKNOWN"));
        Reducer.Input reconnectEmptyInput = new Reducer.Input(A, "STANDARD", 0, "RECONNECT", "session-B", Instant.EPOCH.toString(), 2, Reducer.Observation.empty());
        Reducer.Result reconnectEmpty = Reducer.reduce(fill.state, reconnectEmptyInput, "source:20", UUID.randomUUID());
        check(reconnectEmpty.event != null);
        Reducer.Input repeatedEmpty = new Reducer.Input(A, "STANDARD", 0, "LIVE", "session-B", Instant.EPOCH.toString(), 3, Reducer.Observation.empty());
        check(Reducer.reduce(reconnectEmpty.state, repeatedEmpty, "source:21", UUID.randomUUID()).event == null);
        check(reconnectEmpty.state.latest(A, 0).eventId.equals("source:3"));
        Reducer.Input populatedB = new Reducer.Input(A, "STANDARD", 0, "LIVE", "session-B", Instant.EPOCH.toString(), 4, offer("BUYING", 7, 12000000003L));
        Reducer.Result afterReconnectEmpty = Reducer.reduce(reconnectEmpty.state, populatedB, "source:21", UUID.randomUUID());
        check(afterReconnectEmpty.event.continuity.equals("GAP") && afterReconnectEmpty.deltaQuantity == null);
        check(afterReconnectEmpty.event.previousEventId.equals("source:20"));
        check(!afterReconnectEmpty.event.offerId.equals(fill.event.offerId));
        System.out.println("ReducerTest: " + checks + " checks passed");
    }
}

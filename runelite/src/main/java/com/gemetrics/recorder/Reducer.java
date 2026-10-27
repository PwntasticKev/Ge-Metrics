package com.gemetrics.recorder;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Pure observation reducer. IDs/time are supplied by the durable recording boundary. */
public final class Reducer {
    private Reducer() {}
    private static final Set<String> STATES = Set.of("EMPTY", "BUYING", "BOUGHT", "SELLING", "SOLD", "CANCELLED_BUY", "CANCELLED_SELL");
    public static final class Observation {
        public final String state;
        public final Integer itemId, totalQuantity, quantitySold;
        public final String limitPriceGp, spentGp;
        public Observation(String state, int item, int total, int sold, long price, long spent) {
            if (!STATES.contains(state) || "EMPTY".equals(state) || item <= 0 || total <= 0 || sold < 0 || sold > total || price < 0 || spent < 0)
                throw new IllegalArgumentException("Malformed populated offer");
            this.state = state; itemId = item; totalQuantity = total; quantitySold = sold;
            limitPriceGp = Long.toString(price); spentGp = Long.toString(spent);
        }
        private Observation() { state = "EMPTY"; itemId = totalQuantity = quantitySold = null; limitPriceGp = spentGp = null; }
        public static Observation empty() { return new Observation(); }
        boolean same(Observation b) { return state.equals(b.state) && compatible(b) && Objects.equals(quantitySold, b.quantitySold) && Objects.equals(spentGp, b.spentGp); }
        boolean compatible(Observation b) {
            return Objects.equals(itemId, b.itemId) && Objects.equals(totalQuantity, b.totalQuantity) && Objects.equals(limitPriceGp, b.limitPriceGp)
                && side(state).equals(side(b.state));
        }
        static String side(String state) { return state.contains("BUY") || state.equals("BOUGHT") ? "BUY" : state.equals("EMPTY") ? "EMPTY" : "SELL"; }
        boolean terminal() { return state.equals("BOUGHT") || state.equals("SOLD") || state.startsWith("CANCELLED"); }
    }
    public static final class Input {
        public final UUID scope;
        public final String profileType, reason, session, observedAt;
        public final int slot, tick;
        public final Observation observation;
        public Input(UUID scope, String profileType, int slot, String reason, String session, String observedAt, int tick, Observation observation) {
            this.scope = Objects.requireNonNull(scope); this.profileType = Objects.requireNonNull(profileType);
            if (slot < 0 || slot > 7 || !Set.of("STARTUP", "LOGIN", "RECONNECT", "LIVE").contains(reason)) throw new IllegalArgumentException("Invalid observation context");
            this.slot = slot; this.reason = reason; this.session = Objects.requireNonNull(session);
            java.time.Instant.parse(observedAt); this.observedAt = observedAt; this.tick = tick; this.observation = Objects.requireNonNull(observation);
        }
    }
    public static final class Event {
        public final int schemaVersion = 1;
        public final String eventId, accountScopeId, profileType, captureSessionId, observedAt, reason, continuity, previousEventId, offerId;
        public final int slot, clientTick;
        public final String state, limitPriceGp, spentGp;
        public final Integer itemId, totalQuantity, quantitySold;
        public final String collection = "UNKNOWN";
        // No execution timestamp, inferred tax, net proceeds, or collection claim exists.
        Event(Input in, String id, String continuity, Event previous, String offerId) {
            eventId = id; accountScopeId = in.scope.toString(); profileType = in.profileType; captureSessionId = in.session;
            observedAt = in.observedAt; reason = in.reason; this.continuity = continuity;
            previousEventId = previous == null ? null : previous.eventId; this.offerId = offerId; slot = in.slot; clientTick = in.tick;
            Observation o = in.observation; state = o.state; itemId = o.itemId; totalQuantity = o.totalQuantity;
            quantitySold = o.quantitySold; limitPriceGp = o.limitPriceGp; spentGp = o.spentGp;
        }
        Observation observation() { return state.equals("EMPTY") ? Observation.empty() : new Observation(state, itemId, totalQuantity, quantitySold, Long.parseLong(limitPriceGp), Long.parseLong(spentGp)); }
    }
    public static final class State {
        private final Map<String, Event> slots;
        private final Set<String> uncertain;
        private final Map<String, Event> observations;
        public State() { slots = Collections.emptyMap(); uncertain = Collections.emptySet(); observations = Collections.emptyMap(); }
        private State(Map<String, Event> slots, Set<String> uncertain, Map<String, Event> observations) { this.observations = Collections.unmodifiableMap(observations); this.slots = Collections.unmodifiableMap(slots); this.uncertain = Collections.unmodifiableSet(uncertain); }
        public Event latest(UUID scope, int slot) { return slots.get(scope + ":" + slot); }
    }
    public static final class Result {
        public final State state;
        public final Event event;
        /** Only defensibly continuous aggregate observations have deltas. Never individual fills. */
        public final Integer deltaQuantity;
        public final Long deltaSpent;
        Result(State state, Event event, Integer qty, Long value) { this.state = state; this.event = event; deltaQuantity = qty; deltaSpent = value; }
    }
    public static Result reduce(State state, Input in, String eventId, UUID freshOfferId) {
        String key = in.scope + ":" + in.slot;
        Event prev = state.slots.get(key);
        Observation o = in.observation, p = prev == null ? null : prev.observation();
        Event last = state.observations.get(key);
        // Retained populated evidence can predate an EMPTY in the current session.
        // Session boundaries follow the latest observation, not that stale baseline.
        boolean boundary = !in.reason.equals("LIVE") || (last != null && !last.captureSessionId.equals(in.session));
        boolean gap = boundary || state.uncertain.contains(key);
        if (!boundary && last != null && last.observation().same(o)) return new Result(state, null, null, null);
        String continuity = prev == null || p.state.equals("EMPTY") ? "BASELINE" : gap ? "GAP" : "CONTIGUOUS";
        boolean populated = !o.state.equals("EMPTY");
        if (!populated && p != null && !p.state.equals("EMPTY")) continuity = "GAP";
        if (!gap && populated && p != null && !p.state.equals("EMPTY") &&
            (!p.compatible(o) || o.quantitySold < p.quantitySold || Long.parseLong(o.spentGp) < Long.parseLong(p.spentGp) ||
             (p.terminal() && !p.state.equals(o.state)))) continuity = "DISCONTINUITY";
        String offerId = populated ? continuity.equals("CONTIGUOUS") ? prev.offerId : freshOfferId.toString() : null;
        Event event = new Event(in, eventId, continuity, state.observations.get(key), offerId);
        Map<String, Event> next = new HashMap<>(state.slots);
        Set<String> uncertain = new java.util.HashSet<>(state.uncertain);
        // No empty callback is a verified reconciliation barrier. Keep populated evidence stale.
        if (!populated && prev != null && !prev.state.equals("EMPTY")) uncertain.add(key);
        else { next.put(key, event); uncertain.remove(key); }
        Integer dq = populated && continuity.equals("CONTIGUOUS") ? o.quantitySold - p.quantitySold : null;
        Long dv = dq != null ? Long.parseLong(o.spentGp) - Long.parseLong(p.spentGp) : null;
        Map<String, Event> observations = new HashMap<>(state.observations); observations.put(key, event);
        return new Result(new State(next, uncertain, observations), event, dq, dv);
    }
}

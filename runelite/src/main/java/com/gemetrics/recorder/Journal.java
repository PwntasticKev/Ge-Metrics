package com.gemetrics.recorder;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.stream.JsonWriter;
import java.io.IOException;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Serialized append-and-force before publishing state. Any uncertain IO fails closed. */
public final class Journal {
    public interface Storage {
        String read() throws IOException;
        /** Must append the complete line then force it to stable storage before returning. */
        void append(String line) throws IOException;
    }
    private final Storage storage;
    private final Gson gson;
    private final String sourceId;
    private Reducer.State state = new Reducer.State();
    private final Map<String, UUID> scopes = new HashMap<>();
    private final List<Reducer.Event> events = new ArrayList<>();
    private boolean failed;
    public Journal(Storage storage, Gson gson) throws IOException {
        this.storage = storage; this.gson = gson;
        String raw = storage.read();
        if (raw.isEmpty()) {
            sourceId = UUID.randomUUID().toString();
            JsonObject header = new JsonObject(); header.addProperty("format", "ge-metrics-private-log"); header.addProperty("schemaVersion", 1); header.addProperty("sourceId", sourceId);
            storage.append(json(header) + "\n");
        } else {
            try {
                if (raw.length() > 16 * 1024 * 1024 || !raw.endsWith("\n")) throw new IllegalArgumentException("Incomplete or oversized journal");
                String[] lines = raw.split("\n");
                JsonObject header = gson.fromJson(lines[0], JsonObject.class);
                validateHeader(header);
                if (!header.get("format").getAsString().equals("ge-metrics-private-log") || header.get("schemaVersion").getAsInt() != 1) throw new IllegalArgumentException("Unsupported log");
                sourceId = UUID.fromString(header.get("sourceId").getAsString()).toString();
                for (int n = 1; n < lines.length; n++) {
                    JsonObject rawRecord = gson.fromJson(lines[n], JsonObject.class);
                    validateRecord(rawRecord);
                    Record record = gson.fromJson(rawRecord, Record.class);
                    Reducer.Input i = record.input;
                    Reducer.Observation o = i.observation;
                    o = o.state.equals("EMPTY") ? Reducer.Observation.empty() : new Reducer.Observation(o.state, o.itemId, o.totalQuantity, o.quantitySold, Long.parseLong(o.limitPriceGp), Long.parseLong(o.spentGp));
                    Reducer.Input validated = new Reducer.Input(i.scope, i.profileType, i.slot, i.reason, i.session, i.observedAt, i.tick, o);
                    if (!record.eventId.equals(sourceId + ":" + n) || (scopes.containsKey(record.scopeKey) && !scopes.get(record.scopeKey).equals(i.scope))) throw new IllegalArgumentException("Broken sequence/scope");
                    Reducer.Result result = Reducer.reduce(state, validated, record.eventId, UUID.fromString(record.freshOfferId));
                    if (result.event == null || events.size() >= 10000) throw new IllegalArgumentException("Invalid/oversized replay");
                    state = result.state; events.add(result.event); scopes.put(record.scopeKey, i.scope);
                }
            } catch (RuntimeException e) { throw new IOException("Journal damaged; recording blocked. Preserve file for manual recovery.", e); }
        }
    }
    // Check the persisted representation before Gson can coerce types or default primitives.
    private static void validateHeader(JsonObject header) {
        string(header, "format"); integer(header, "schemaVersion"); string(header, "sourceId");
    }
    private static void validateRecord(JsonObject record) {
        string(record, "scopeKey"); string(record, "eventId"); string(record, "freshOfferId");
        JsonObject input = object(record, "input");
        for (String key : List.of("scope", "profileType", "reason", "session", "observedAt")) string(input, key);
        integer(input, "slot"); integer(input, "tick");
        JsonObject observation = object(input, "observation");
        String state = string(observation, "state");
        if (state.equals("EMPTY")) {
            // Default Gson omits these nulls in existing private journals.
            for (String key : List.of("itemId", "totalQuantity", "quantitySold", "limitPriceGp", "spentGp"))
                if (observation.has(key) && !observation.get(key).isJsonNull()) throw new IllegalArgumentException("Non-null empty offer field: " + key);
        } else {
            for (String key : List.of("itemId", "totalQuantity", "quantitySold")) integer(observation, key);
            for (String key : List.of("limitPriceGp", "spentGp")) {
                String value = string(observation, key);
                if (!value.matches("0|[1-9][0-9]*")) throw new IllegalArgumentException("Invalid GP decimal: " + key);
                Long.parseLong(value);
            }
        }
    }
    private static com.google.gson.JsonElement required(JsonObject object, String key) {
        if (object == null || !object.has(key) || object.get(key).isJsonNull()) throw new IllegalArgumentException("Missing journal field: " + key);
        return object.get(key);
    }
    private static JsonObject object(JsonObject parent, String key) {
        com.google.gson.JsonElement value = required(parent, key);
        if (!value.isJsonObject()) throw new IllegalArgumentException("Expected object: " + key);
        return value.getAsJsonObject();
    }
    private static String string(JsonObject parent, String key) {
        com.google.gson.JsonElement value = required(parent, key);
        if (!value.isJsonPrimitive() || !value.getAsJsonPrimitive().isString()) throw new IllegalArgumentException("Expected string: " + key);
        return value.getAsString();
    }
    private static void integer(JsonObject parent, String key) {
        com.google.gson.JsonElement value = required(parent, key);
        if (!value.isJsonPrimitive() || !value.getAsJsonPrimitive().isNumber() || !value.getAsString().matches("-?(0|[1-9][0-9]*)"))
            throw new IllegalArgumentException("Expected integer: " + key);
        Integer.parseInt(value.getAsString());
    }
    private static final class Record {
        final String scopeKey, eventId, freshOfferId;
        final Reducer.Input input;
        Record(String key, String id, UUID fresh, Reducer.Input input) { scopeKey = key; eventId = id; freshOfferId = fresh.toString(); this.input = input; }
    }
    public synchronized Reducer.Event observe(String privateScopeKey, String profileType, int slot, String reason, String session, String observedAt, int tick, Reducer.Observation o) throws IOException {
        healthy();
        UUID scope = scopes.getOrDefault(privateScopeKey, UUID.randomUUID());
        Reducer.Input input = new Reducer.Input(scope, profileType, slot, reason, session, observedAt, tick, o);
        String id = sourceId + ":" + (events.size() + 1);
        UUID fresh = UUID.randomUUID();
        Reducer.Result result = Reducer.reduce(state, input, id, fresh);
        if (result.event == null) return null;
        if (events.size() >= 10000) { failed = true; throw new IOException("Scaffold retention limit reached; recording stopped without pruning"); }
        try { storage.append(json(new Record(privateScopeKey, id, fresh, input)) + "\n"); }
        catch (IOException e) { failed = true; throw e; }
        state = result.state; events.add(result.event); scopes.put(privateScopeKey, scope);
        return result.event;
    }
    public synchronized String exportJson(String privateScopeKey, String exportedAt) throws IOException {
        healthy();
        UUID scope = scopes.get(privateScopeKey);
        if (scope == null) throw new IOException("No evidence for resolved account scope");
        List<Map<String, Object>> selected = new ArrayList<>();
        String profileType = null;
        for (Reducer.Event event : events) if (event.accountScopeId.equals(scope.toString())) {
            Map<String, Object> fields = new java.util.LinkedHashMap<>();
            // Serialize with the injected Gson, then add decimal source sequence fields.
            JsonObject tree = gson.toJsonTree(event).getAsJsonObject();
            // Gson's default tree omits nulls; wire contract requires explicit nullable fields.
            for (String key : List.of("previousEventId", "offerId", "itemId", "totalQuantity", "quantitySold", "limitPriceGp", "spentGp"))
                if (!tree.has(key)) tree.add(key, com.google.gson.JsonNull.INSTANCE);
            tree.addProperty("sourceId", sourceId); tree.addProperty("seq", event.eventId.substring(sourceId.length() + 1));
            fields.put("event", tree); selected.add(fields); profileType = event.profileType;
        }
        JsonObject envelope = new JsonObject();
        envelope.addProperty("format", "ge-metrics-runelite-evidence"); envelope.addProperty("schemaVersion", 1);
        envelope.addProperty("pluginVersion", "0.1.0-scaffold"); envelope.addProperty("runeLiteVersion", "1.13.4");
        envelope.addProperty("exportedAt", exportedAt);
        com.google.gson.JsonArray accounts = new com.google.gson.JsonArray(); JsonObject account = new JsonObject();
        account.addProperty("accountScopeId", scope.toString()); account.addProperty("profileType", profileType); accounts.add(account); envelope.add("accountScopes", accounts);
        com.google.gson.JsonArray array = new com.google.gson.JsonArray();
        com.google.gson.JsonArray ranges = new com.google.gson.JsonArray();
        for (Map<String, Object> row : selected) {
            JsonObject event = (JsonObject) row.get("event"); array.add(event);
            // Singleton ranges are precise even when other accounts interleave source sequences.
            JsonObject range = new JsonObject(); range.addProperty("sourceId", sourceId); range.add("fromSeq", event.get("seq")); range.add("toSeq", event.get("seq")); ranges.add(range);
        }
        envelope.add("retainedSequenceRanges", ranges); envelope.add("events", array);
        com.google.gson.JsonArray gaps = new com.google.gson.JsonArray();
        // Global source sequences excluded by account filtering are absent from this
        // export, not lost journal records or proof of missing game executions.
        // Include leading/trailing exclusions too; never invent offline sequence IDs.
        long next = 1;
        for (com.google.gson.JsonElement element : array) {
            long seq = Long.parseLong(element.getAsJsonObject().get("seq").getAsString());
            if (seq > next) gaps.add(sequenceRange(next, seq - 1));
            next = seq + 1;
        }
        if (next <= events.size()) gaps.add(sequenceRange(next, events.size()));
        envelope.add("sequenceGaps", gaps);
        return json(envelope);
    }
    private JsonObject sequenceRange(long from, long to) {
        JsonObject range = new JsonObject(); range.addProperty("sourceId", sourceId);
        range.addProperty("fromSeq", Long.toString(from)); range.addProperty("toSeq", Long.toString(to));
        return range;
    }
    private void healthy() throws IOException { if (failed) throw new IOException("Recording blocked after persistence failure/limit; restart and inspect journal"); }
    private String json(Object value) throws IOException {
        StringWriter out = new StringWriter(); JsonWriter writer = new JsonWriter(out); writer.setSerializeNulls(true);
        // Gson.toJson overrides writer flags; the JsonElement adapter preserves explicit nulls here.
        if (value instanceof com.google.gson.JsonElement) gson.getAdapter(com.google.gson.JsonElement.class).write(writer, (com.google.gson.JsonElement) value);
        else gson.toJson(value, value.getClass(), writer);
        writer.close(); return out.toString();
    }
}

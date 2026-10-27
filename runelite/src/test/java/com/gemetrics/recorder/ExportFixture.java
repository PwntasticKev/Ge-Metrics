package com.gemetrics.recorder;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import java.util.UUID;

/** Deterministic private-log replay through the real Journal export boundary. */
public final class ExportFixture {
    private static final Gson GSON = new Gson();
    private static final String SOURCE = "11111111-1111-4111-8111-111111111111";
    private static final String SESSION = "33333333-3333-4333-8333-333333333333";
    private static final String TIME = "2026-10-26T12:00:00Z";
    public static String generate() throws Exception {
        JournalTest.Memory storage = new JournalTest.Memory();
        storage.text = "{\"format\":\"ge-metrics-private-log\",\"schemaVersion\":1,\"sourceId\":\"" + SOURCE + "\"}\n";
        add(storage, 1, false, "STARTUP", SESSION, 1, 3000000000L);
        add(storage, 2, false, "LIVE", SESSION, 2, 6000000001L);
        add(storage, 3, true, "STARTUP", SESSION, 1, 3000000000L);
        add(storage, 4, false, "LIVE", SESSION, 3, 9000000002L);
        add(storage, 5, false, "RECONNECT", "55555555-5555-4555-8555-555555555555", 4, 12000000003L);
        add(storage, 6, false, "LIVE", "55555555-5555-4555-8555-555555555555", 1, 3000000000L);
        Journal journal = new Journal(storage, GSON);
        String result = journal.exportJson("synthetic-selected-account", TIME);
        if (!result.equals(new Journal(storage, GSON).exportJson("synthetic-selected-account", TIME)))
            throw new AssertionError("Replay/export changed identity");
        if (result.contains("synthetic-")) throw new AssertionError("Private scope leaked");
        return result;
    }
    private static void add(JournalTest.Memory storage, int seq, boolean other, String reason, String session, int sold, long spent) {
        UUID scope = UUID.fromString(other ? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" : "22222222-2222-4222-8222-222222222222");
        Reducer.Input input = new Reducer.Input(scope, other ? "LEAGUE" : "STANDARD", 0, reason, session, TIME, seq,
            new Reducer.Observation("BUYING", 4151, 10, sold, 4000000000L, spent));
        JsonObject record = new JsonObject();
        record.addProperty("scopeKey", other ? "synthetic-other-account" : "synthetic-selected-account");
        record.addProperty("eventId", SOURCE + ":" + seq);
        record.addProperty("freshOfferId", String.format("44444444-4444-4444-8444-%012d", seq));
        record.add("input", GSON.toJsonTree(input));
        storage.text += GSON.toJson(record) + "\n";
    }
    public static void main(String[] args) throws Exception { System.out.println(generate()); }
}

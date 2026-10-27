package com.gemetrics.recorder;

import com.google.gson.Gson;
import java.io.IOException;
import java.time.Instant;
import java.util.UUID;

public final class JournalTest {
    static final class Memory implements Journal.Storage {
        String text = ""; boolean fail;
        public String read() { return text; }
        public void append(String line) throws IOException {
            if (fail) { text += line.substring(0, line.length() / 2); throw new IOException("simulated torn write"); }
            text += line;
        }
    }
    static int checks;
    static void check(boolean v) { checks++; if (!v) throw new AssertionError("check " + checks); }
    public static void main(String[] args) throws Exception {
        Gson gson = new Gson(); Memory storage = new Memory();
        Journal j = new Journal(storage, gson);
        j.observe("private-profile-account-mode", "STANDARD", 0, "STARTUP", "session", Instant.EPOCH.toString(), 1, ReducerTest.offer("BUYING", 1, 3));
        String first = j.exportJson("private-profile-account-mode", Instant.EPOCH.toString());
        check(!first.contains("private-profile-account-mode"));
        check(first.contains("\"seq\":\"1\"") && first.contains("\"previousEventId\":null"));
        check(first.equals(j.exportJson("private-profile-account-mode", Instant.EPOCH.toString())));
        Journal recovered = new Journal(storage, gson);
        recovered.observe("private-profile-account-mode", "STANDARD", 0, "RECONNECT", "newsession", Instant.EPOCH.toString(), 1, ReducerTest.offer("BUYING", 2, 8));
        String second = recovered.exportJson("private-profile-account-mode", Instant.EPOCH.toString());
        check(second.contains("\"seq\":\"2\"") && second.contains("\"continuity\":\"GAP\""));
        check(gson.fromJson(first, com.google.gson.JsonObject.class).getAsJsonArray("events").get(0).getAsJsonObject().get("sourceId").equals(gson.fromJson(second, com.google.gson.JsonObject.class).getAsJsonArray("events").get(0).getAsJsonObject().get("sourceId")));
        recovered.observe("another-mode", "LEAGUE", 0, "LIVE", "newsession", Instant.EPOCH.toString(), 1, ReducerTest.offer("BUYING", 2, 8));
        check(!recovered.exportJson("another-mode", Instant.EPOCH.toString()).contains("\"seq\":\"1\""));
        com.google.gson.JsonObject selected = gson.fromJson(recovered.exportJson("private-profile-account-mode", Instant.EPOCH.toString()), com.google.gson.JsonObject.class);
        check(selected.size() == 9 && !selected.has("gaps") && !selected.has("coverage") && !selected.has("sourceId"));
        check(selected.getAsJsonArray("sequenceGaps").size() == 1);
        check(selected.getAsJsonArray("sequenceGaps").get(0).getAsJsonObject().get("fromSeq").getAsString().equals("3"));
        check(gson.fromJson(second, com.google.gson.JsonObject.class).getAsJsonArray("sequenceGaps").size() == 0); // reconnect is not a missing persisted sequence
        com.google.gson.JsonObject other = gson.fromJson(recovered.exportJson("another-mode", Instant.EPOCH.toString()), com.google.gson.JsonObject.class);
        check(other.getAsJsonArray("sequenceGaps").get(0).getAsJsonObject().get("toSeq").getAsString().equals("2"));
        check(other.getAsJsonArray("retainedSequenceRanges").get(0).getAsJsonObject().has("sourceId"));
        storage.fail = true;
        boolean failed = false;
        try { recovered.observe("another-mode", "LEAGUE", 0, "LIVE", "newsession", Instant.EPOCH.toString(), 1, ReducerTest.offer("BUYING", 3, 9)); } catch (IOException e) { failed = true; }
        check(failed);
        failed = false;
        try { recovered.exportJson("another-mode", Instant.EPOCH.toString()); } catch (IOException e) { failed = true; }
        check(failed); // no exporting memory state after uncertain write
        failed = false;
        try { new Journal(storage, gson); } catch (IOException e) { failed = true; }
        check(failed); // torn tail blocks recovery; never silently resets source/sequence
        replayValidation(gson);
        System.out.println("JournalTest: " + checks + " checks passed");
    }
    static void replayValidation(Gson gson) throws Exception {
        Memory valid = new Memory();
        Journal journal = new Journal(valid, gson);
        journal.observe("private-key", "STANDARD", 3, "STARTUP", "session", Instant.EPOCH.toString(), 7, ReducerTest.offer("BUYING", 1, 3));
        String expected = journal.exportJson("private-key", Instant.EPOCH.toString());
        check(expected.equals(new Journal(valid, gson).exportJson("private-key", Instant.EPOCH.toString())));
        String[] lines = valid.text.split("\n");
        String[][] paths = {
            {"format"}, {"schemaVersion"}, {"sourceId"},
            {"scopeKey"}, {"eventId"}, {"freshOfferId"}, {"input"},
            {"input", "scope"}, {"input", "profileType"}, {"input", "slot"},
            {"input", "reason"}, {"input", "session"}, {"input", "observedAt"},
            {"input", "tick"}, {"input", "observation"},
            {"input", "observation", "state"}, {"input", "observation", "itemId"},
            {"input", "observation", "totalQuantity"}, {"input", "observation", "quantitySold"},
            {"input", "observation", "limitPriceGp"}, {"input", "observation", "spentGp"}
        };
        // Missing slot on a real slot-3 record must never deserialize as slot zero.
        for (String[] path : paths) {
            int line = path.length == 1 && java.util.Set.of("format", "schemaVersion", "sourceId").contains(path[0]) ? 0 : 1;
            for (String replacement : new String[] {null, "null", "true", "[]", "{}", "1.5"}) {
                com.google.gson.JsonObject root = gson.fromJson(lines[line], com.google.gson.JsonObject.class);
                com.google.gson.JsonObject owner = root;
                for (int n = 0; n < path.length - 1; n++) owner = owner.getAsJsonObject(path[n]);
                String key = path[path.length - 1];
                if (replacement == null) owner.remove(key);
                else owner.add(key, new com.google.gson.JsonParser().parse(replacement));
                damaged(gson, line == 0 ? root + "\n" + lines[1] + "\n" : lines[0] + "\n" + root + "\n");
            }
        }
        for (String key : new String[] {"slot", "tick", "itemId", "totalQuantity", "quantitySold", "schemaVersion"}) {
            for (String number : new String[] {"\"3\"", "3.5", "2147483648", "1e100", "3.0"}) {
                int line = key.equals("schemaVersion") ? 0 : 1;
                com.google.gson.JsonObject root = gson.fromJson(lines[line], com.google.gson.JsonObject.class);
                com.google.gson.JsonObject owner = line == 0 ? root : root.getAsJsonObject("input");
                if (java.util.Set.of("itemId", "totalQuantity", "quantitySold").contains(key)) owner = owner.getAsJsonObject("observation");
                owner.add(key, new com.google.gson.JsonParser().parse(number));
                damaged(gson, line == 0 ? root + "\n" + lines[1] + "\n" : lines[0] + "\n" + root + "\n");
            }
        }
        for (String key : new String[] {"limitPriceGp", "spentGp"}) {
            for (String value : new String[] {"", "-1", "1.5", "1e2", "9223372036854775808"}) {
                com.google.gson.JsonObject root = gson.fromJson(lines[1], com.google.gson.JsonObject.class);
                root.getAsJsonObject("input").getAsJsonObject("observation").addProperty(key, value);
                damaged(gson, lines[0] + "\n" + root + "\n");
            }
        }
        // Gson normally omits null fields in private EMPTY records; retain that compatibility.
        Memory empty = new Memory();
        Journal emptyJournal = new Journal(empty, gson);
        emptyJournal.observe("private-key", "STANDARD", 3, "STARTUP", "session", Instant.EPOCH.toString(), 7, Reducer.Observation.empty());
        check(emptyJournal.exportJson("private-key", Instant.EPOCH.toString()).equals(new Journal(empty, gson).exportJson("private-key", Instant.EPOCH.toString())));
        String[] explicitLines = empty.text.split("\n");
        com.google.gson.JsonObject explicit = gson.fromJson(explicitLines[1], com.google.gson.JsonObject.class);
        for (String key : new String[] {"itemId", "totalQuantity", "quantitySold", "limitPriceGp", "spentGp"})
            explicit.getAsJsonObject("input").getAsJsonObject("observation").add(key, com.google.gson.JsonNull.INSTANCE);
        Memory explicitNulls = new Memory(); explicitNulls.text = explicitLines[0] + "\n" + explicit + "\n";
        check(emptyJournal.exportJson("private-key", Instant.EPOCH.toString()).equals(new Journal(explicitNulls, gson).exportJson("private-key", Instant.EPOCH.toString())));
        for (String key : new String[] {"itemId", "totalQuantity", "quantitySold", "limitPriceGp", "spentGp"}) {
            String[] emptyLines = empty.text.split("\n");
            com.google.gson.JsonObject root = gson.fromJson(emptyLines[1], com.google.gson.JsonObject.class);
            root.getAsJsonObject("input").getAsJsonObject("observation").addProperty(key, 1);
            damaged(gson, emptyLines[0] + "\n" + root + "\n");
        }
    }
    static void damaged(Gson gson, String raw) throws Exception {
        Memory storage = new Memory(); storage.text = raw;
        boolean rejected = false;
        try { new Journal(storage, gson); } catch (IOException e) { rejected = true; }
        check(rejected);
        check(storage.text.equals(raw)); // fail closed without truncation, replacement, or append
    }

}

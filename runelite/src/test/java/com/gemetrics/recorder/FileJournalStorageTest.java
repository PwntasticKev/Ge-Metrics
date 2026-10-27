package com.gemetrics.recorder;

import com.google.gson.Gson;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import net.runelite.client.util.Filepath;

/** Test-only Unchecked root; production never uses Filepath.Unchecked. */
public final class FileJournalStorageTest {
    public static void main(String[] args) throws Exception {
        Path directory = Files.createTempDirectory(Path.of("target"), "storage-test-");
        Path path = directory.resolve("log.jsonl");
        Filepath file = Filepath.Unchecked.getRooted(path);
        String before;
        try (FileJournalStorage storage = new FileJournalStorage(file)) {
            Journal j = new Journal(storage, new Gson());
            j.observe("local-only", "STANDARD", 0, "STARTUP", "session", Instant.EPOCH.toString(), 1, ReducerTest.offer("SELLING", 1, Long.MAX_VALUE));
            before = j.exportJson("local-only", Instant.EPOCH.toString());
            boolean rejected = false;
            try (FileJournalStorage competing = new FileJournalStorage(file)) { throw new AssertionError("Competing writer accepted"); }
            catch (java.nio.channels.OverlappingFileLockException | java.io.IOException expected) { rejected = true; }
            if (!rejected) throw new AssertionError("Lock not enforced");
        }
        try (FileJournalStorage storage = new FileJournalStorage(file)) {
            if (!before.equals(new Journal(storage, new Gson()).exportJson("local-only", Instant.EPOCH.toString()))) throw new AssertionError("Recovery changed export");
        }
        Files.writeString(path, "{partial", java.nio.file.StandardOpenOption.APPEND);
        try (FileJournalStorage storage = new FileJournalStorage(file)) {
            try { new Journal(storage, new Gson()); throw new AssertionError("Torn tail accepted"); }
            catch (java.io.IOException expected) { }
        }
        Files.delete(path); Files.delete(directory);
        System.out.println("FileJournalStorageTest: lock, durable reopen, torn-tail checks passed");
    }
}

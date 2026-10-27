package com.gemetrics.recorder;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;
import java.nio.file.StandardOpenOption;
import net.runelite.client.util.Filepath;

/** All filesystem access is through RuneLite's approved Filepath surface. */
final class FileJournalStorage implements Journal.Storage, AutoCloseable {
    private final FileChannel channel;
    private final FileLock lock;
    FileJournalStorage(Filepath file) throws IOException {
        channel = file.openFileChannel(StandardOpenOption.CREATE, StandardOpenOption.READ, StandardOpenOption.WRITE);
        FileLock acquired;
        try {
            acquired = channel.tryLock();
            if (acquired == null) throw new IOException("Journal is already open by another recorder");
        } catch (IOException | RuntimeException e) { channel.close(); throw e; }
        lock = acquired;
    }
    @Override public String read() throws IOException {
        long size = channel.size();
        if (size > 16 * 1024 * 1024) throw new IOException("Journal exceeds scaffold limit");
        ByteBuffer bytes = ByteBuffer.allocate((int) size);
        channel.position(0);
        while (bytes.hasRemaining()) if (channel.read(bytes) < 0) throw new IOException("Unexpected EOF");
        return StandardCharsets.UTF_8.newDecoder().decode(bytes.flip()).toString();
    }
    @Override public void append(String line) throws IOException {
        byte[] bytes = line.getBytes(StandardCharsets.UTF_8);
        if (channel.size() + bytes.length > 16 * 1024 * 1024) throw new IOException("Journal byte limit reached");
        channel.position(channel.size());
        ByteBuffer buffer = ByteBuffer.wrap(bytes);
        while (buffer.hasRemaining()) channel.write(buffer);
        channel.force(true);
    }
    @Override public void close() throws IOException { try { lock.release(); } finally { channel.close(); } }
}

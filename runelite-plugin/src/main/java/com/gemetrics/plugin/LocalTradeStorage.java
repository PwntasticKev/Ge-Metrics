package com.gemetrics.plugin;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.File;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.inject.Singleton;
import lombok.extern.slf4j.Slf4j;
import net.runelite.client.RuneLite;

/**
 * Persists trades that haven't synced yet, plus a few plugin settings, as one JSON file
 * in the RuneLite directory. Plain JSON (rather than SQLite) keeps the plugin free of
 * native dependencies, which the Plugin Hub requires.
 */
@Slf4j
@Singleton
public class LocalTradeStorage
{
	private static final String FILE_NAME = "ge-metrics-trades.json";

	private final Gson gson;
	private final File file;
	private State state;

	public LocalTradeStorage()
	{
		this(new File(RuneLite.RUNELITE_DIR, FILE_NAME));
	}

	/** Uses the given file; tests pass a temp file. */
	protected LocalTradeStorage(File file)
	{
		this.gson = new GsonBuilder().create();
		this.file = file;
		this.state = read();
	}

	public synchronized void savePendingTrade(TradeEvent trade)
	{
		if (trade == null)
		{
			return;
		}
		state.pendingTrades.removeIf(p -> idOf(p) != null && idOf(p).equals(trade.getRuneliteEventId()));
		state.pendingTrades.add(new PendingTrade(trade, Instant.now().getEpochSecond()));
		write();
	}

	/** Trades due for (re)sending: never failed, or past their retry time. Oldest first. */
	public synchronized List<TradeEvent> loadPendingTrades()
	{
		long now = Instant.now().getEpochSecond();
		return state.pendingTrades.stream()
			.filter(p -> p.nextRetryAt == null || p.nextRetryAt <= now)
			.sorted((a, b) -> Long.compare(a.createdAt, b.createdAt))
			.map(p -> p.trade)
			.collect(Collectors.toList());
	}

	public synchronized void removePendingTrade(String runeliteEventId)
	{
		if (runeliteEventId != null && state.pendingTrades.removeIf(p -> runeliteEventId.equals(idOf(p))))
		{
			write();
		}
	}

	public synchronized void updateTradeRetryInfo(String runeliteEventId, int retryCount, String lastError, Instant nextRetryAt)
	{
		for (PendingTrade p : state.pendingTrades)
		{
			if (runeliteEventId != null && runeliteEventId.equals(idOf(p)))
			{
				p.retryCount = retryCount;
				p.lastError = lastError;
				p.nextRetryAt = nextRetryAt == null ? null : nextRetryAt.getEpochSecond();
			}
		}
		write();
	}

	public synchronized void saveSetting(String key, String value)
	{
		if (key == null || value == null)
		{
			return;
		}
		state.settings.put(key, value);
		write();
	}

	public synchronized String loadSetting(String key)
	{
		return key == null ? null : state.settings.get(key);
	}

	public synchronized void cleanupOldTrades(int maxAgeDays)
	{
		long cutoff = Instant.now().getEpochSecond() - maxAgeDays * 24L * 60 * 60;
		int before = state.pendingTrades.size();
		state.pendingTrades.removeIf(p -> p.createdAt < cutoff);
		if (state.pendingTrades.size() != before)
		{
			log.info("Cleaned up {} old trades", before - state.pendingTrades.size());
			write();
		}
	}

	public synchronized int getPendingTradeCount()
	{
		return state.pendingTrades.size();
	}

	/** Every change is written immediately, so there is nothing to flush. */
	public void shutdown()
	{
	}

	private static String idOf(PendingTrade p)
	{
		return p.trade == null ? null : p.trade.getRuneliteEventId();
	}

	private State read()
	{
		if (!file.exists())
		{
			return new State();
		}
		try (Reader reader = Files.newBufferedReader(file.toPath(), StandardCharsets.UTF_8))
		{
			State loaded = gson.fromJson(reader, State.class);
			return loaded == null ? new State() : loaded.withDefaults();
		}
		catch (IOException | RuntimeException e)
		{
			log.error("Could not read {}, starting with empty trade storage", file, e);
			return new State();
		}
	}

	/** Writes to a temp file then swaps it in, so a crash never leaves a half-written file. */
	private void write()
	{
		File tmp = new File(file.getPath() + ".tmp");
		try
		{
			File dir = file.getParentFile();
			if (dir != null)
			{
				Files.createDirectories(dir.toPath());
			}
			try (Writer writer = Files.newBufferedWriter(tmp.toPath(), StandardCharsets.UTF_8))
			{
				gson.toJson(state, writer);
			}
			Files.move(tmp.toPath(), file.toPath(), StandardCopyOption.REPLACE_EXISTING);
		}
		catch (IOException e)
		{
			log.error("Failed to save trade storage to {}", file, e);
		}
	}

	private static class State
	{
		List<PendingTrade> pendingTrades = new ArrayList<>();
		Map<String, String> settings = new HashMap<>();

		State withDefaults()
		{
			if (pendingTrades == null)
			{
				pendingTrades = new ArrayList<>();
			}
			if (settings == null)
			{
				settings = new HashMap<>();
			}
			return this;
		}
	}

	private static class PendingTrade
	{
		TradeEvent trade;
		long createdAt;
		int retryCount;
		String lastError;
		Long nextRetryAt;

		PendingTrade(TradeEvent trade, long createdAt)
		{
			this.trade = trade;
			this.createdAt = createdAt;
		}
	}
}

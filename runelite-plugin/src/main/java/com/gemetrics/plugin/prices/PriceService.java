package com.gemetrics.plugin.prices;

import com.google.gson.Gson;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import javax.inject.Singleton;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * Polls latest GE prices from the OSRS Wiki real-time prices API. This is the plugin's
 * only network call. No account or other backend is involved.
 *
 * @see <a href="https://oldschool.runescape.wiki/w/RuneScape:Real-time_Prices">Wiki API rules</a>
 */
@Slf4j
@Singleton
public class PriceService
{
	static final String WIKI_LATEST_URL = "https://prices.runescape.wiki/api/v1/osrs/latest";
	/** The wiki asks for a descriptive User-Agent that says what the tool is and how to reach its author. */
	static final String USER_AGENT = "GE Metrics RuneLite plugin - https://github.com/PwntasticKev/Ge-Metrics";
	/** The wiki's /latest data updates about once a minute; polling faster gains nothing. */
	private static final long POLL_SECONDS = 60;

	private final OkHttpClient httpClient;
	private final Gson gson;
	private final List<Runnable> listeners = new CopyOnWriteArrayList<>();

	private volatile PriceSnapshot snapshot = PriceSnapshot.EMPTY;
	private ScheduledExecutorService executor;

	@Inject
	public PriceService(OkHttpClient httpClient, Gson gson)
	{
		this.httpClient = httpClient;
		this.gson = gson;
	}

	public void start()
	{
		executor = Executors.newSingleThreadScheduledExecutor(r -> new Thread(r, "gemetrics-prices"));
		executor.scheduleWithFixedDelay(this::refresh, 0, POLL_SECONDS, TimeUnit.SECONDS);
	}

	/** Stops polling and drops listeners (the panel is rebuilt on the next start). */
	public void stop()
	{
		listeners.clear();
		if (executor != null)
		{
			executor.shutdownNow();
			executor = null;
		}
	}

	/** Triggers an immediate refresh off the calling thread. */
	public void refreshNow()
	{
		if (executor != null)
		{
			executor.execute(this::refresh);
		}
	}

	public PriceSnapshot getSnapshot()
	{
		return snapshot;
	}

	public PriceQuote getQuote(int itemId)
	{
		return snapshot.get(itemId);
	}

	/** Listeners run on the price thread; marshal to the EDT before touching Swing. */
	public void addListener(Runnable listener)
	{
		listeners.add(listener);
	}

	public void removeListener(Runnable listener)
	{
		listeners.remove(listener);
	}

	private void refresh()
	{
		try
		{
			snapshot = fetchLatest();
			listeners.forEach(Runnable::run);
		}
		catch (Exception e)
		{
			// Keep the previous snapshot; the next poll retries.
			log.warn("OSRS Wiki price refresh failed: {}", e.getMessage());
		}
	}

	private PriceSnapshot fetchLatest() throws IOException
	{
		Request request = new Request.Builder()
			.url(WIKI_LATEST_URL)
			.header("User-Agent", USER_AGENT)
			.build();
		try (Response response = httpClient.newCall(request).execute())
		{
			ResponseBody body = response.body();
			if (!response.isSuccessful() || body == null)
			{
				throw new IOException("OSRS Wiki returned HTTP " + response.code());
			}
			Map<Integer, PriceQuote> quotes = PriceParser.parse(gson, body.string());
			if (quotes.isEmpty())
			{
				throw new IOException("OSRS Wiki returned no prices");
			}
			return new PriceSnapshot(quotes, PriceSnapshot.Source.OSRS_WIKI, Instant.now());
		}
	}
}

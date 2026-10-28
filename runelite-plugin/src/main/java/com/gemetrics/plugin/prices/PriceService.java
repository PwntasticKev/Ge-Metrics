package com.gemetrics.plugin.prices;

import com.gemetrics.plugin.AuthenticationService;
import com.gemetrics.plugin.GeMetricsConfig;
import com.google.gson.Gson;
import java.io.IOException;
import java.time.Instant;
import java.util.Collections;
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
 * Polls latest GE prices. Prefers GE Metrics ({@code items.getAllItems}, needs login +
 * subscription) and falls back to the OSRS Wiki prices API so lookups always work.
 */
@Slf4j
@Singleton
public class PriceService
{
	static final String WIKI_LATEST_URL = "https://prices.runescape.wiki/api/v1/osrs/latest";
	static final String USER_AGENT = "GE Metrics RuneLite plugin (https://www.ge-metrics.com)";
	private static final long POLL_SECONDS = 60;

	private final OkHttpClient httpClient;
	private final Gson gson;
	private final GeMetricsConfig config;
	private final AuthenticationService authService;
	private final List<Runnable> listeners = new CopyOnWriteArrayList<>();

	private volatile PriceSnapshot snapshot = PriceSnapshot.EMPTY;
	private ScheduledExecutorService executor;

	@Inject
	public PriceService(OkHttpClient httpClient, Gson gson, GeMetricsConfig config, AuthenticationService authService)
	{
		this.httpClient = httpClient;
		this.gson = gson;
		this.config = config;
		this.authService = authService;
	}

	public void start()
	{
		executor = Executors.newSingleThreadScheduledExecutor(r -> new Thread(r, "gemetrics-prices"));
		executor.scheduleWithFixedDelay(this::refresh, 0, POLL_SECONDS, TimeUnit.SECONDS);
	}

	public void stop()
	{
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
			PriceSnapshot next = fetchFromGeMetrics();
			if (next == null)
			{
				next = fetch(new Request.Builder().url(WIKI_LATEST_URL), PriceSnapshot.Source.OSRS_WIKI);
			}
			snapshot = next;
			listeners.forEach(Runnable::run);
		}
		catch (Exception e)
		{
			log.warn("Price refresh failed: {}", e.getMessage());
		}
	}

	/** Returns null (so the caller falls back) when logged out, unsubscribed, or unreachable. */
	private PriceSnapshot fetchFromGeMetrics()
	{
		String token = authService.getAccessToken();
		if (token == null || token.isEmpty())
		{
			return null;
		}
		Request.Builder request = new Request.Builder()
			.url(config.apiUrl() + "/trpc/items.getAllItems")
			.header("Authorization", "Bearer " + token);
		try
		{
			return fetch(request, PriceSnapshot.Source.GE_METRICS);
		}
		catch (IOException | RuntimeException e)
		{
			log.debug("GE Metrics prices unavailable, using OSRS Wiki: {}", e.getMessage());
			return null;
		}
	}

	private PriceSnapshot fetch(Request.Builder builder, PriceSnapshot.Source source) throws IOException
	{
		Request request = builder.header("User-Agent", USER_AGENT).build();
		try (Response response = httpClient.newCall(request).execute())
		{
			ResponseBody body = response.body();
			if (!response.isSuccessful() || body == null)
			{
				throw new IOException(source + " returned HTTP " + response.code());
			}
			Map<Integer, PriceQuote> quotes = PriceParser.parse(gson, body.string());
			if (quotes.isEmpty())
			{
				throw new IOException(source + " returned no prices");
			}
			return new PriceSnapshot(Collections.unmodifiableMap(quotes), source, Instant.now());
		}
	}
}

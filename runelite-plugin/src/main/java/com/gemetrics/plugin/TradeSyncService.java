package com.gemetrics.plugin;

import lombok.extern.slf4j.Slf4j;
import net.runelite.api.GrandExchangeOffer;
import net.runelite.api.GrandExchangeOfferState;
import net.runelite.api.GrandExchangeOfferType;
import net.runelite.api.ItemManager;
import net.runelite.client.config.ConfigManager;
import okhttp3.*;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Slf4j
@Singleton
public class TradeSyncService
{
	@Inject
	private GeMetricsConfig config;

	@Inject
	private AuthenticationService authService;

	@Inject
	private ItemManager itemManager;

	@Inject
	private ConfigManager configManager;
	
	@Inject
	private LocalTradeStorage localStorage;
	
	@Inject
	private NotificationService notificationService;

	private final OkHttpClient httpClient;
	private final Gson gson;
	private final Queue<TradeEvent> pendingTrades;
	private final ScheduledExecutorService executorService;
	private String runeliteClientId;
	private String accessToken;
	private String osrsUsername;
	private int consecutiveFailures;
	private static final int MAX_RETRY_ATTEMPTS = 5;

	public TradeSyncService()
	{
		this.httpClient = new OkHttpClient();
		this.gson = new GsonBuilder().create();
		this.pendingTrades = new ConcurrentLinkedQueue<>();
		this.executorService = Executors.newSingleThreadScheduledExecutor(r -> {
			Thread thread = new Thread(r, "GeMetrics-Sync");
			thread.setDaemon(true);
			return thread;
		});
		this.consecutiveFailures = 0;
	}

	public void initialize()
	{
		// Load or generate client ID
		runeliteClientId = loadOrGenerateClientId();
		
		// Load access token if available
		accessToken = authService.getAccessToken();
		
		// Load persisted trades from database
		loadPersistedTrades();
		
		// Detect OSRS username from client (will be set by plugin)
		// osrsUsername will be set when plugin detects it
		
		// Clean up old trades (older than 7 days)
		localStorage.cleanupOldTrades(7);
		
		// Start periodic sync
		if (config.autoSync())
		{
			executorService.scheduleAtFixedRate(
				this::syncPendingTrades,
				0,
				config.syncInterval(),
				TimeUnit.SECONDS
			);
		}
	}

	public void handleTradeEvent(GrandExchangeOffer offer)
	{
		if (!config.enabled())
		{
			return;
		}

		try
		{
			TradeEvent tradeEvent = convertOfferToTradeEvent(offer);
			if (tradeEvent != null)
			{
				// Add to in-memory queue
				pendingTrades.offer(tradeEvent);
				
				// Persist to database
				localStorage.savePendingTrade(tradeEvent);
				
				// Show notification
				if (notificationService != null)
				{
					notificationService.showTradeDetected(tradeEvent.getItemName(), tradeEvent.getOfferType());
				}
				
				log.info("Trade tracked: {} {} {} @ {}gp", 
					tradeEvent.getOfferType(), 
					tradeEvent.getQuantity(),
					tradeEvent.getItemName(),
					tradeEvent.getPrice());
				
				// If auto-sync is enabled, sync immediately for completed trades
				if (config.autoSync() && tradeEvent.getStatus().equals("completed"))
				{
					executorService.execute(this::syncPendingTrades);
				}
			}
		}
		catch (Exception e)
		{
			log.error("Error handling trade event", e);
			if (notificationService != null)
			{
				notificationService.showError("Trade Tracking Error", 
					"Failed to track trade: " + e.getMessage());
			}
		}
	}

	private TradeEvent convertOfferToTradeEvent(GrandExchangeOffer offer)
	{
		if (offer == null)
		{
			return null;
		}

		GrandExchangeOfferState state = offer.getState();
		
		// Generate unique event ID
		String runeliteEventId = UUID.randomUUID().toString();
		
		// Determine status
		String status = "pending";
		if (state == GrandExchangeOfferState.BOUGHT || state == GrandExchangeOfferState.SOLD)
		{
			status = "completed";
		}
		else if (state == GrandExchangeOfferState.CANCELLED_BUY || state == GrandExchangeOfferState.CANCELLED_SELL)
		{
			status = "canceled";
		}

		// Determine offer type
		String offerType = offer.getType() == GrandExchangeOfferType.BUY ? "buy" : "sell";

		int itemId = offer.getItemId();
		String itemName = getItemName(itemId);
		int price = offer.getPrice();
		int totalQuantity = offer.getTotalQuantity();
		int spent = offer.getSpent();
		int quantity = offer.getQuantity();
		
		// Calculate filled and remaining quantities
		int filledQuantity = quantity;
		int remainingQuantity = totalQuantity - quantity;

		TradeEvent tradeEvent = new TradeEvent();
		tradeEvent.setRuneliteEventId(runeliteEventId);
		tradeEvent.setItemId(itemId);
		tradeEvent.setItemName(itemName);
		tradeEvent.setOfferType(offerType);
		tradeEvent.setPrice(price);
		tradeEvent.setQuantity(totalQuantity);
		tradeEvent.setFilledQuantity(filledQuantity);
		tradeEvent.setRemainingQuantity(remainingQuantity);
		tradeEvent.setStatus(status);
		tradeEvent.setTimestamp(Instant.now().toString());

		return tradeEvent;
	}

	private String getItemName(int itemId)
	{
		try
		{
			if (itemManager != null)
			{
				return itemManager.getItemComposition(itemId).getName();
			}
		}
		catch (Exception e)
		{
			log.warn("Failed to get item name for itemId {}: {}", itemId, e.getMessage());
		}
		
		// Fallback if ItemManager is not available
		return "Item " + itemId;
	}

	private String detectOsrsUsername()
	{
		// This will be set by the plugin when username is detected
		// Keep this method for backwards compatibility
		return osrsUsername;
	}

	public void flushPendingTrades()
	{
		syncPendingTrades();
	}

	private void syncPendingTrades()
	{
		// Refresh token if needed
		if (authService.isAuthenticated() && !authService.refreshTokenIfNeeded())
		{
			log.warn("Token refresh failed, skipping sync");
			return;
		}
		
		// Load persisted trades and combine with in-memory queue
		List<TradeEvent> allTrades = new ArrayList<>(localStorage.loadPendingTrades());
		
		// Add in-memory trades to the list
		while (!pendingTrades.isEmpty())
		{
			TradeEvent trade = pendingTrades.poll();
			if (trade != null)
			{
				allTrades.add(trade);
			}
		}
		
		if (allTrades.isEmpty())
		{
			return;
		}
		
		// Check authentication
		String token = authService.getAccessToken();
		if (token == null || token.isEmpty())
		{
			log.debug("No authentication token, queuing {} trades locally", allTrades.size());
			if (notificationService != null)
			{
				notificationService.showSyncQueued(allTrades.size());
			}
			return;
		}

		// Batch up to 100 trades for sync
		List<TradeEvent> batch = allTrades.stream()
			.limit(100)
			.toList();

		if (batch.isEmpty())
		{
			return;
		}

		log.info("Syncing {} trades to server", batch.size());
		
		// Send batch to server
		sendTradesToServer(batch);
	}

	private void sendTradesToServer(List<TradeEvent> trades)
	{
		String token = authService.getAccessToken();
		
		try
		{
			TradeBatchRequest request = new TradeBatchRequest();
			request.setRuneliteClientId(runeliteClientId);
			request.setOsrsUsername(osrsUsername);
			request.setTrades(trades);

			// tRPC HTTP format: POST /trpc/{router}.{procedure}
			// Body format: { "input": {...} }
			Map<String, Object> trpcRequest = new HashMap<>();
			trpcRequest.put("input", request);
			
			String json = gson.toJson(trpcRequest);
			
			RequestBody body = RequestBody.create(
				json,
				MediaType.parse("application/json; charset=utf-8")
			);

			Request httpRequest = new Request.Builder()
				.url(config.apiUrl() + "/trpc/runelite.trades.submit")
				.post(body)
				.addHeader("Authorization", "Bearer " + token)
				.addHeader("Content-Type", "application/json")
				.build();

			try (Response response = httpClient.newCall(httpRequest).execute())
			{
				if (response.isSuccessful())
				{
					// Success - remove from database and reset failure count
					for (TradeEvent trade : trades)
					{
						localStorage.removePendingTrade(trade.getRuneliteEventId());
					}
					
					consecutiveFailures = 0;
					
					log.info("Successfully synced {} trades", trades.size());
					
					if (notificationService != null)
					{
						notificationService.showSyncSuccess(trades.size());
					}
				}
				else
				{
					handleSyncError(response.code(), response.body().string(), trades);
				}
			}
		}
		catch (IOException e)
		{
			log.error("Network error syncing trades", e);
			consecutiveFailures++;
			
			// Update retry info for failed trades
			for (TradeEvent trade : trades)
			{
				updateTradeRetryInfo(trade, "Network error: " + e.getMessage());
			}
			
			if (notificationService != null)
			{
				if (consecutiveFailures >= MAX_RETRY_ATTEMPTS)
				{
					notificationService.showError("Sync Failed", 
						"Unable to sync trades after " + MAX_RETRY_ATTEMPTS + " attempts. Check connection.",
						"Retry Now",
						this::triggerManualSync);
				}
				else
				{
					notificationService.showConnectionError();
				}
			}
		}
	}

	private String loadOrGenerateClientId()
	{
		// Try to load from config
		String savedClientId = config.runeliteClientId();
		
		if (savedClientId != null && !savedClientId.isEmpty())
		{
			return savedClientId;
		}
		
		// Generate new UUID and save to config via ConfigManager
		String newClientId = UUID.randomUUID().toString();
		configManager.setConfiguration("gemetrics", "runeliteClientId", newClientId);
		log.info("Generated new RuneLite client ID: {}", newClientId);
		return newClientId;
	}

	public void setAccessToken(String token)
	{
		this.accessToken = token;
	}

	public void setOsrsUsername(String username)
	{
		this.osrsUsername = username;
		log.info("OSRS username set: {}", username);
	}
	
	// New helper methods for enhanced functionality
	
	private void loadPersistedTrades()
	{
		try
		{
			List<TradeEvent> persistedTrades = localStorage.loadPendingTrades();
			pendingTrades.addAll(persistedTrades);
			
			if (!persistedTrades.isEmpty())
			{
				log.info("Loaded {} persisted trades from database", persistedTrades.size());
			}
		}
		catch (Exception e)
		{
			log.error("Error loading persisted trades", e);
			if (notificationService != null)
			{
				notificationService.showDatabaseError();
			}
		}
	}
	
	private void handleSyncError(int responseCode, String responseBody, List<TradeEvent> trades)
	{
		consecutiveFailures++;
		
		String errorMessage = "Server error: " + responseCode;
		if (responseBody != null && !responseBody.isEmpty())
		{
			errorMessage += " - " + responseBody;
		}
		
		log.error("Sync failed: {}", errorMessage);
		
		// Handle specific error codes
		switch (responseCode)
		{
			case 401:
				// Authentication error
				authService.handleAuthenticationError();
				break;
				
			case 429:
				// Rate limiting
				handleRateLimitError(responseBody, trades);
				break;
				
			case 500:
			case 502:
			case 503:
				// Server errors - retry with backoff
				for (TradeEvent trade : trades)
				{
					updateTradeRetryInfo(trade, errorMessage);
				}
				
				if (notificationService != null)
				{
					notificationService.showError("Server Error", 
						"GE-Metrics server is temporarily unavailable. Trades will be retried automatically.");
				}
				break;
				
			default:
				// Unknown error
				for (TradeEvent trade : trades)
				{
					updateTradeRetryInfo(trade, errorMessage);
				}
				
				if (notificationService != null)
				{
					notificationService.showError("Sync Error", 
						"Failed to sync trades: " + errorMessage,
						"Retry Now",
						this::triggerManualSync);
				}
				break;
		}
	}
	
	private void handleRateLimitError(String responseBody, List<TradeEvent> trades)
	{
		// Try to parse retry-after header or default to 60 seconds
		long retryAfterSeconds = 60;
		
		// Update retry time for all trades
		Instant retryTime = Instant.now().plusSeconds(retryAfterSeconds);
		for (TradeEvent trade : trades)
		{
			localStorage.updateTradeRetryInfo(trade.getRuneliteEventId(), 
				consecutiveFailures, "Rate limited", retryTime);
		}
		
		if (notificationService != null)
		{
			notificationService.showRateLimitError(retryAfterSeconds);
		}
	}
	
	private void updateTradeRetryInfo(TradeEvent trade, String errorMessage)
	{
		// Exponential backoff: 30s, 1m, 2m, 4m, 8m
		long backoffSeconds = (long) (30 * Math.pow(2, Math.min(consecutiveFailures - 1, 4)));
		Instant nextRetry = Instant.now().plusSeconds(backoffSeconds);
		
		localStorage.updateTradeRetryInfo(trade.getRuneliteEventId(), 
			consecutiveFailures, errorMessage, nextRetry);
	}
	
	private void triggerManualSync()
	{
		log.info("Manual sync triggered by user");
		consecutiveFailures = 0; // Reset failure count for manual retry
		executorService.execute(this::syncPendingTrades);
	}
	
	public int getPendingTradeCount()
	{
		return pendingTrades.size() + localStorage.getPendingTradeCount();
	}
	
	public void shutdown()
	{
		if (executorService != null && !executorService.isShutdown())
		{
			executorService.shutdown();
			try
			{
				if (!executorService.awaitTermination(5, TimeUnit.SECONDS))
				{
					executorService.shutdownNow();
				}
			}
			catch (InterruptedException e)
			{
				executorService.shutdownNow();
				Thread.currentThread().interrupt();
			}
		}
		
		if (localStorage != null)
		{
			localStorage.shutdown();
		}
	}
}


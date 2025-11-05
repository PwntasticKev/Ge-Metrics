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

	private final OkHttpClient httpClient;
	private final Gson gson;
	private final Queue<TradeEvent> pendingTrades;
	private final ScheduledExecutorService executorService;
	private String runeliteClientId;
	private String accessToken;
	private String osrsUsername;

	public TradeSyncService()
	{
		this.httpClient = new OkHttpClient();
		this.gson = new GsonBuilder().create();
		this.pendingTrades = new ConcurrentLinkedQueue<>();
		this.executorService = Executors.newSingleThreadScheduledExecutor();
	}

	public void initialize()
	{
		// Load or generate client ID
		runeliteClientId = loadOrGenerateClientId();
		
		// Load access token if available
		accessToken = authService.getAccessToken();
		
		// Detect OSRS username from client (will be set by plugin)
		// osrsUsername will be set when plugin detects it
		
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
				pendingTrades.offer(tradeEvent);
				
				// If auto-sync is enabled, sync immediately for completed trades
				if (config.autoSync() && tradeEvent.getStatus().equals("completed"))
				{
					syncPendingTrades();
				}
			}
		}
		catch (Exception e)
		{
			log.error("Error handling trade event", e);
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
		if (pendingTrades.isEmpty() || accessToken == null)
		{
			return;
		}

		// Batch up to 100 trades
		List<TradeEvent> batch = new ArrayList<>();
		while (!pendingTrades.isEmpty() && batch.size() < 100)
		{
			TradeEvent trade = pendingTrades.poll();
			if (trade != null)
			{
				batch.add(trade);
			}
		}

		if (batch.isEmpty())
		{
			return;
		}

		// Send batch to server
		sendTradesToServer(batch);
	}

	private void sendTradesToServer(List<TradeEvent> trades)
	{
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
				.addHeader("Authorization", "Bearer " + accessToken)
				.addHeader("Content-Type", "application/json")
				.build();

			Response response = httpClient.newCall(httpRequest).execute();
			
			if (response.isSuccessful())
			{
				log.info("Successfully synced {} trades", trades.size());
			}
			else
			{
				log.error("Failed to sync trades: {} - {}", response.code(), response.body().string());
				// Re-queue trades for retry
				pendingTrades.addAll(trades);
			}
			
			response.close();
		}
		catch (IOException e)
		{
			log.error("Error syncing trades", e);
			// Re-queue trades for retry
			pendingTrades.addAll(trades);
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
	}
}


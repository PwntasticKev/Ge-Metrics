package com.gemetrics.plugin;

import com.gemetrics.plugin.buy.BuyRequestFactory;
import com.gemetrics.plugin.buy.GeBuyAssist;
import com.gemetrics.plugin.prices.PriceService;
import com.gemetrics.plugin.sets.GeTax;
import com.gemetrics.plugin.sets.ItemSetRepository;
import com.gemetrics.plugin.sets.SetFlipCalculator;
import com.gemetrics.plugin.ui.GeMetricsPanel;
import com.gemetrics.plugin.ui.ItemNames;
import com.google.gson.Gson;
import com.google.inject.Provides;
import javax.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import net.runelite.api.*;
import net.runelite.api.events.GameStateChanged;
import net.runelite.api.events.GameTick;
import net.runelite.api.events.GrandExchangeOfferChanged;
import net.runelite.client.config.ConfigManager;
import net.runelite.client.eventbus.EventBus;
import net.runelite.client.eventbus.Subscribe;
import net.runelite.client.game.ItemManager;
import net.runelite.client.input.KeyManager;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;
import net.runelite.client.ui.ClientToolbar;
import net.runelite.client.ui.NavigationButton;
import net.runelite.client.util.ImageUtil;

import java.awt.image.BufferedImage;

@Slf4j
@PluginDescriptor(
	name = "GE Metrics Trade Tracker",
	description = "Automatically tracks Grand Exchange trades and syncs to GE-Metrics.com for advanced profit analysis, FIFO matching, and trading insights. Works offline with local storage.",
	tags = {"grand-exchange", "trading", "flipping", "profit", "analytics", "tracking", "ge-metrics"},
	enabledByDefault = true
)
public class GeMetricsPlugin extends Plugin
{
	@Inject
	private Client client;

	@Inject
	private GeMetricsConfig config;

	@Inject
	private TradeSyncService tradeSyncService;

	@Inject
	private AuthenticationService authService;

	@Inject
	private ClientToolbar clientToolbar;

	@Inject
	private ConfigManager configManager;

	@Inject
	private NotificationService notificationService;

	@Inject
	private PriceService priceService;

	@Inject
	private GeBuyAssist buyAssist;

	@Inject
	private BuyRequestFactory buyRequestFactory;

	@Inject
	private ItemNames itemNames;

	@Inject
	private ItemManager itemManager;

	@Inject
	private EventBus eventBus;

	@Inject
	private KeyManager keyManager;

	@Inject
	private Gson gson;

	private GeMetricsPanel panel;
	private boolean usernameDetected;
	private NavigationButton navButton;

	@Override
	protected void startUp() throws Exception
	{
		log.info("GE Metrics plugin started!");
		
		// Create panel
		SetFlipCalculator calculator = new SetFlipCalculator(new GeTax(ItemSetRepository.loadTaxExemptIds(gson)));
		panel = new GeMetricsPanel(authService, config, priceService, itemManager, itemNames,
			buyRequestFactory, buyAssist, ItemSetRepository.loadSets(gson), calculator);
		notificationService.setPanel(panel.getAccountPanel());
		
		// Create navigation button (try to load icon, use default if fails)
		BufferedImage icon;
		try
		{
			icon = ImageUtil.loadImageResource(GeMetricsPlugin.class, "nav-icon.png");
		}
		catch (Exception e)
		{
			log.warn("Failed to load icon, using default");
			// Create a simple default icon
			icon = new BufferedImage(16, 16, BufferedImage.TYPE_INT_ARGB);
		}
		
		navButton = NavigationButton.builder()
			.tooltip("GE Metrics")
			.icon(icon)
			.priority(5)
			.panel(panel)
			.build();
		
		clientToolbar.addNavigation(navButton);
		
		// Initialize authentication
		authService.initialize();
		
		// Initialize trade sync service (after ensuring client ID is saved)
		ensureClientIdSaved();
		tradeSyncService.initialize();
		
		// OSRS username is detected on the first game tick after login
		usernameDetected = false;
		
		// Update panel with auth status
		panel.getAccountPanel().checkLoginStatus();

		// Live prices + GE buy assist
		priceService.start();
		eventBus.register(buyAssist);
		keyManager.registerKeyListener(buyAssist);
	}

	@Override
	protected void shutDown() throws Exception
	{
		log.info("GE Metrics plugin stopped!");
		
		// Remove navigation button
		if (navButton != null)
		{
			clientToolbar.removeNavigation(navButton);
		}
		
		priceService.stop();
		eventBus.unregister(buyAssist);
		keyManager.unregisterKeyListener(buyAssist);
		buyAssist.clear();

		// Sync any pending trades before shutdown
		tradeSyncService.flushPendingTrades();
		tradeSyncService.stop();
		authService.stop();
	}

	@Subscribe
	public void onGrandExchangeOfferChanged(GrandExchangeOfferChanged event)
	{
		GrandExchangeOffer offer = event.getOffer();
		
		if (offer == null)
		{
			return;
		}

		// Track the trade event
		tradeSyncService.handleTradeEvent(offer);
	}

	@Subscribe
	public void onGameTick(GameTick tick)
	{
		if (!usernameDetected)
		{
			usernameDetected = detectOsrsUsername();
		}
	}

	@Subscribe
	public void onGameStateChanged(GameStateChanged event)
	{
		// Re-detect after logout in case the player switches accounts
		if (event.getGameState() == GameState.LOGIN_SCREEN)
		{
			usernameDetected = false;
		}
	}

	private boolean detectOsrsUsername()
	{
		try
		{
			if (client != null && client.getLocalPlayer() != null)
			{
				Player localPlayer = client.getLocalPlayer();
				String playerName = localPlayer.getName();
				
				if (playerName != null && !playerName.isEmpty())
				{
					log.info("Detected OSRS username: {}", playerName);
					tradeSyncService.setOsrsUsername(playerName);
					return true;
				}
			}
		}
		catch (Exception e)
		{
			log.warn("Failed to detect OSRS username: {}", e.getMessage());
		}
		return false;
	}

	private void ensureClientIdSaved()
	{
		// Ensure client ID is generated and saved if not already present
		String existingClientId = config.runeliteClientId();
		if (existingClientId == null || existingClientId.isEmpty())
		{
			String newClientId = java.util.UUID.randomUUID().toString();
			configManager.setConfiguration("gemetrics", "runeliteClientId", newClientId);
			log.info("Generated and saved new RuneLite client ID: {}", newClientId);
		}
	}

	@Provides
	GeMetricsConfig provideConfig(ConfigManager configManager)
	{
		return configManager.getConfig(GeMetricsConfig.class);
	}
}


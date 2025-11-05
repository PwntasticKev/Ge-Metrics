package com.gemetrics.plugin;

import com.google.inject.Provides;
import javax.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import net.runelite.api.*;
import net.runelite.api.events.GrandExchangeOfferChanged;
import net.runelite.client.config.ConfigManager;
import net.runelite.client.eventbus.Subscribe;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;
import net.runelite.client.ui.ClientToolbar;
import net.runelite.client.ui.NavigationButton;
import net.runelite.client.util.ImageUtil;

import java.awt.image.BufferedImage;

@Slf4j
@PluginDescriptor(
	name = "GE Metrics Trade Tracker",
	description = "Automatically tracks your Grand Exchange trades and syncs them to GE Metrics",
	tags = {"grand-exchange", "trading", "flipping", "profit-tracking"}
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

	private GeMetricsPanel panel;
	private NavigationButton navButton;

	@Override
	protected void startUp() throws Exception
	{
		log.info("GE Metrics plugin started!");
		
		// Create panel
		panel = new GeMetricsPanel(authService, config);
		
		// Create navigation button (try to load icon, use default if fails)
		BufferedImage icon;
		try
		{
			icon = ImageUtil.loadImageResource(getClass(), "/icon.png");
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
		
		// Detect OSRS username from RuneLite client
		detectOsrsUsername();
		
		// Update panel with auth status
		panel.checkLoginStatus();
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
		
		// Sync any pending trades before shutdown
		tradeSyncService.flushPendingTrades();
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

	private void detectOsrsUsername()
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
				}
			}
		}
		catch (Exception e)
		{
			log.warn("Failed to detect OSRS username: {}", e.getMessage());
		}
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


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
import java.awt.image.BufferedImage;
import javax.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import net.runelite.client.config.ConfigManager;
import net.runelite.client.eventbus.EventBus;
import net.runelite.client.game.ItemManager;
import net.runelite.client.input.KeyManager;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;
import net.runelite.client.ui.ClientToolbar;
import net.runelite.client.ui.NavigationButton;
import net.runelite.client.util.ImageUtil;

/**
 * GE Metrics (lite): OSRS Wiki prices, GE item set flips and a click-to-select buy assist.
 * No account, no backend. The only network call is the OSRS Wiki prices API.
 */
@Slf4j
@PluginDescriptor(
	name = "GE Metrics",
	description = "Live GE prices from the OSRS Wiki, item set flip profits after tax, and a GE buy assist",
	tags = {"grand-exchange", "ge", "trading", "flipping", "prices", "item-sets", "tax"}
)
public class GeMetricsPlugin extends Plugin
{
	@Inject
	private GeMetricsConfig config;

	@Inject
	private ClientToolbar clientToolbar;

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

	private NavigationButton navButton;

	@Override
	protected void startUp() throws Exception
	{
		SetFlipCalculator calculator = new SetFlipCalculator(new GeTax(ItemSetRepository.loadTaxExemptIds(gson)));
		GeMetricsPanel panel = new GeMetricsPanel(config, priceService, itemManager, itemNames,
			buyRequestFactory, buyAssist, ItemSetRepository.loadSets(gson), calculator);

		BufferedImage icon = ImageUtil.loadImageResource(GeMetricsPlugin.class, "nav-icon.png");
		navButton = NavigationButton.builder()
			.tooltip("GE Metrics")
			.icon(icon)
			.priority(5)
			.panel(panel)
			.build();
		clientToolbar.addNavigation(navButton);

		priceService.start();
		eventBus.register(buyAssist);
		keyManager.registerKeyListener(buyAssist);
	}

	@Override
	protected void shutDown() throws Exception
	{
		if (navButton != null)
		{
			clientToolbar.removeNavigation(navButton);
			navButton = null;
		}
		priceService.stop();
		eventBus.unregister(buyAssist);
		keyManager.unregisterKeyListener(buyAssist);
		buyAssist.clear();
		buyAssist.removeAllListeners();
	}

	@Provides
	GeMetricsConfig provideConfig(ConfigManager configManager)
	{
		return configManager.getConfig(GeMetricsConfig.class);
	}
}

package com.gemetrics.plugin.buy;

import com.gemetrics.plugin.GeMetricsConfig;
import com.gemetrics.plugin.prices.PriceService;
import javax.inject.Inject;
import javax.inject.Singleton;
import net.runelite.client.game.ItemManager;
import net.runelite.client.game.ItemStats;

/** Builds a {@link BuyRequest} for an item from current prices and the buy-assist config. */
@Singleton
public class BuyRequestFactory
{
	private final PriceService priceService;
	private final ItemManager itemManager;
	private final GeMetricsConfig config;

	@Inject
	public BuyRequestFactory(PriceService priceService, ItemManager itemManager, GeMetricsConfig config)
	{
		this.priceService = priceService;
		this.itemManager = itemManager;
		this.config = config;
	}

	/** @param partsPerSet how many of the item one set needs (1 for single items) */
	public BuyRequest create(int itemId, String name, int partsPerSet)
	{
		long price = config.buyPriceMode().priceFor(priceService.getQuote(itemId));
		ItemStats stats = itemManager.getItemStats(itemId);
		int geLimit = stats == null ? 0 : stats.getGeLimit();
		return new BuyRequest(itemId, name, price, quantityFor(config.defaultBuyQuantity(), geLimit, partsPerSet));
	}

	/**
	 * A configured quantity wins; otherwise use the GE buy limit, rounded down to whole
	 * sets for set parts. Never returns less than one set's worth.
	 */
	static int quantityFor(int configured, int geLimit, int partsPerSet)
	{
		int perSet = Math.max(1, partsPerSet);
		if (configured > 0)
		{
			return configured * perSet;
		}
		if (geLimit <= 0)
		{
			return perSet;
		}
		return Math.max(perSet, (geLimit / perSet) * perSet);
	}
}

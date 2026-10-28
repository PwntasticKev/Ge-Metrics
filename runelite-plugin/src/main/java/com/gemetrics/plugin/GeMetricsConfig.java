package com.gemetrics.plugin;

import com.gemetrics.plugin.buy.BuyPriceMode;
import java.awt.event.KeyEvent;
import net.runelite.client.config.Config;
import net.runelite.client.config.ConfigGroup;
import net.runelite.client.config.ConfigItem;
import net.runelite.client.config.ConfigSection;
import net.runelite.client.config.Keybind;
import net.runelite.client.config.Range;

@ConfigGroup("gemetrics")
public interface GeMetricsConfig extends Config
{
	@ConfigItem(
		keyName = "apiUrl",
		name = "API URL",
		description = "Backend API URL for GE Metrics"
	)
	default String apiUrl()
	{
		return "https://www.ge-metrics.com"; // Production API URL
	}

	@ConfigItem(
		keyName = "enabled",
		name = "Enable Trade Tracking",
		description = "Enable automatic trade tracking"
	)
	default boolean enabled()
	{
		return true;
	}

	@ConfigItem(
		keyName = "autoSync",
		name = "Auto Sync",
		description = "Automatically sync trades to server"
	)
	default boolean autoSync()
	{
		return true;
	}

	@ConfigItem(
		keyName = "syncInterval",
		name = "Sync Interval (seconds)",
		description = "How often to sync trades (in seconds)"
	)
	default int syncInterval()
	{
		return 30;
	}

	@ConfigSection(
		name = "Buy assist",
		description = "Queue items from the panel and fill GE buy offers",
		position = 10
	)
	String buyAssistSection = "buyAssist";

	@ConfigItem(
		keyName = "buyPriceMode",
		name = "Buy price",
		description = "Price filled into buy offers for queued items",
		section = buyAssistSection,
		position = 11
	)
	default BuyPriceMode buyPriceMode()
	{
		return BuyPriceMode.LOW;
	}

	@ConfigItem(
		keyName = "defaultBuyQuantity",
		name = "Default quantity",
		description = "Quantity for queued items. 0 uses the item's GE buy limit",
		section = buyAssistSection,
		position = 12
	)
	@Range(min = 0)
	default int defaultBuyQuantity()
	{
		return 0;
	}

	@ConfigItem(
		keyName = "fillOfferHotkey",
		name = "Fill offer hotkey",
		description = "In the GE quantity or price prompt, types the queued item's value. You still press Enter",
		section = buyAssistSection,
		position = 13
	)
	default Keybind fillOfferHotkey()
	{
		return new Keybind(KeyEvent.VK_E, 0);
	}

	@ConfigItem(
		keyName = "runeliteClientId",
		name = "",
		description = "",
		hidden = true
	)
	default String runeliteClientId()
	{
		return null;
	}

	@ConfigItem(
		keyName = "accessToken",
		name = "",
		description = "",
		hidden = true
	)
	default String accessToken()
	{
		return null;
	}

	@ConfigItem(
		keyName = "refreshToken",
		name = "",
		description = "",
		hidden = true
	)
	default String refreshToken()
	{
		return null;
	}
}


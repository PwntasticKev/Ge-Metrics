package com.gemetrics.plugin;

import net.runelite.client.config.Config;
import net.runelite.client.config.ConfigGroup;
import net.runelite.client.config.ConfigItem;

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


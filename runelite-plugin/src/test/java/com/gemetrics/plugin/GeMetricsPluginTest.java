package com.gemetrics.plugin;

import net.runelite.client.RuneLite;
import net.runelite.client.externalplugins.ExternalPluginManager;

/** Launches the RuneLite developer client with GE Metrics loaded. Run via `./gradlew run`. */
public class GeMetricsPluginTest
{
	public static void main(String[] args) throws Exception
	{
		ExternalPluginManager.loadBuiltin(GeMetricsPlugin.class);
		RuneLite.main(args);
	}
}

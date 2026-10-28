package com.gemetrics.plugin.prices;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Parses price maps shaped {@code {"<itemId>": {"high", "highTime", "low", "lowTime"}}}.
 * Accepts the GE Metrics tRPC envelope ({@code {"result":{"data":{...}}}}) and the
 * OSRS Wiki envelope ({@code {"data":{...}}}). Malformed entries are skipped.
 */
public final class PriceParser
{
	private PriceParser()
	{
	}

	public static Map<Integer, PriceQuote> parse(Gson gson, String json)
	{
		JsonElement root = gson.fromJson(json, JsonElement.class);
		if (root == null || !root.isJsonObject())
		{
			throw new IllegalArgumentException("Price response is not a JSON object");
		}
		JsonObject data = unwrap(root.getAsJsonObject());
		Map<Integer, PriceQuote> quotes = new HashMap<>();
		for (Map.Entry<String, JsonElement> entry : data.entrySet())
		{
			Integer itemId = parseId(entry.getKey());
			if (itemId == null || !entry.getValue().isJsonObject())
			{
				continue;
			}
			JsonObject p = entry.getValue().getAsJsonObject();
			quotes.put(itemId, new PriceQuote(itemId,
				longOf(p, "high"), longOf(p, "highTime"), longOf(p, "low"), longOf(p, "lowTime")));
		}
		return Collections.unmodifiableMap(quotes);
	}

	private static JsonObject unwrap(JsonObject root)
	{
		if (root.has("result") && root.get("result").isJsonObject())
		{
			root = root.getAsJsonObject("result");
		}
		if (root.has("data") && root.get("data").isJsonObject())
		{
			return root.getAsJsonObject("data");
		}
		throw new IllegalArgumentException("Price response has no data object");
	}

	private static Integer parseId(String key)
	{
		try
		{
			return Integer.parseInt(key);
		}
		catch (NumberFormatException e)
		{
			return null;
		}
	}

	private static long longOf(JsonObject obj, String key)
	{
		JsonElement v = obj.get(key);
		if (v == null || v.isJsonNull() || !v.isJsonPrimitive() || !v.getAsJsonPrimitive().isNumber())
		{
			return 0;
		}
		return v.getAsLong();
	}
}

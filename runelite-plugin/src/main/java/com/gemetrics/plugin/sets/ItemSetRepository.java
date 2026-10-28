package com.gemetrics.plugin.sets;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Loads the GE item sets and tax-exempt ids bundled from the web app
 * (regenerate with {@code node runelite-plugin/scripts/export-data.mjs}).
 */
public final class ItemSetRepository
{
	private static final Type SETS_TYPE = new TypeToken<List<ItemSet>>() {}.getType();
	private static final Type IDS_TYPE = new TypeToken<List<Integer>>() {}.getType();

	private ItemSetRepository()
	{
	}

	public static List<ItemSet> loadSets(Gson gson)
	{
		List<ItemSet> sets = read(gson, "item-sets.json", SETS_TYPE);
		return Collections.unmodifiableList(sets);
	}

	public static Set<Integer> loadTaxExemptIds(Gson gson)
	{
		List<Integer> ids = read(gson, "tax-exempt.json", IDS_TYPE);
		return Collections.unmodifiableSet(new HashSet<>(ids));
	}

	private static <T> T read(Gson gson, String resource, Type type)
	{
		try (InputStream in = ItemSetRepository.class.getResourceAsStream("/com/gemetrics/plugin/" + resource))
		{
			if (in == null)
			{
				throw new IllegalStateException("Missing bundled resource " + resource);
			}
			try (Reader reader = new InputStreamReader(in, StandardCharsets.UTF_8))
			{
				return gson.fromJson(reader, type);
			}
		}
		catch (IOException e)
		{
			throw new IllegalStateException("Failed to read " + resource, e);
		}
	}
}

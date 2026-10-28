package com.gemetrics.plugin.ui;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;
import javax.inject.Inject;
import javax.inject.Singleton;
import javax.swing.SwingUtilities;
import net.runelite.api.Client;
import net.runelite.api.GameState;
import net.runelite.client.callback.ClientThread;
import net.runelite.client.game.ItemManager;
import net.runelite.http.api.item.ItemPrice;

/**
 * Item names and searches from the game cache. Item compositions can only be read on
 * the client thread, so lookups hop there and deliver results back on the EDT.
 */
@Singleton
public class ItemNames
{
	private static final int MAX_SEARCH_RESULTS = 40;

	private final Client client;
	private final ClientThread clientThread;
	private final ItemManager itemManager;
	private final Map<Integer, String> names = new ConcurrentHashMap<>();

	@Inject
	public ItemNames(Client client, ClientThread clientThread, ItemManager itemManager)
	{
		this.client = client;
		this.clientThread = clientThread;
		this.itemManager = itemManager;
	}

	/** Cached name, or a placeholder until {@link #resolve} has loaded it. */
	public String get(int itemId)
	{
		return names.getOrDefault(itemId, "Item " + itemId);
	}

	/** Loads names once the cache is ready, then runs {@code onDone} on the EDT. */
	public void resolve(Collection<Integer> itemIds, Runnable onDone)
	{
		clientThread.invoke(() -> {
			if (client.getGameState().getState() < GameState.LOGIN_SCREEN.getState())
			{
				return false; // cache not loaded yet; ClientThread retries next tick
			}
			for (int id : itemIds)
			{
				names.computeIfAbsent(id, i -> itemManager.getItemComposition(i).getName());
			}
			SwingUtilities.invokeLater(onDone);
			return true;
		});
	}

	/** Tradeable items whose name contains {@code query}, delivered on the EDT. */
	public void search(String query, Consumer<List<ItemPrice>> onResults)
	{
		clientThread.invoke(() -> {
			List<ItemPrice> results = itemManager.search(query);
			List<ItemPrice> top = results.subList(0, Math.min(MAX_SEARCH_RESULTS, results.size()));
			top.forEach(r -> names.putIfAbsent(r.getId(), r.getName()));
			List<ItemPrice> copy = List.copyOf(top);
			SwingUtilities.invokeLater(() -> onResults.accept(copy));
		});
	}
}

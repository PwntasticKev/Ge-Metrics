package com.gemetrics.plugin.ui;

import com.gemetrics.plugin.buy.BuyRequestFactory;
import com.gemetrics.plugin.buy.GeBuyAssist;
import com.gemetrics.plugin.prices.PriceService;
import java.awt.BorderLayout;
import java.util.Collections;
import java.util.List;
import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.Timer;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import net.runelite.client.game.ItemManager;
import net.runelite.client.ui.ColorScheme;
import net.runelite.client.ui.components.IconTextField;
import net.runelite.http.api.item.ItemPrice;

/** Search any tradeable item, see live prices, click to queue a buy. */
class PriceSearchPanel extends JPanel
{
	private static final int SEARCH_DELAY_MS = 250;

	private final ItemManager itemManager;
	private final ItemNames itemNames;
	private final PriceService priceService;
	private final BuyRequestFactory buyRequests;
	private final GeBuyAssist buyAssist;

	private final IconTextField searchField = new IconTextField();
	private final JPanel results = new JPanel();
	private final Timer searchTimer;
	private List<ItemPrice> lastResults = Collections.emptyList();

	PriceSearchPanel(ItemManager itemManager, ItemNames itemNames, PriceService priceService,
		BuyRequestFactory buyRequests, GeBuyAssist buyAssist)
	{
		this.itemManager = itemManager;
		this.itemNames = itemNames;
		this.priceService = priceService;
		this.buyRequests = buyRequests;
		this.buyAssist = buyAssist;

		setLayout(new BorderLayout(0, 6));
		setBackground(ColorScheme.DARK_GRAY_COLOR);

		searchField.setIcon(IconTextField.Icon.SEARCH);
		searchField.setBackground(ColorScheme.DARKER_GRAY_COLOR);
		searchField.setHoverBackgroundColor(ColorScheme.DARK_GRAY_HOVER_COLOR);
		searchField.addClearListener(this::search);
		add(searchField, BorderLayout.NORTH);

		searchTimer = new Timer(SEARCH_DELAY_MS, e -> search());
		searchTimer.setRepeats(false);
		searchField.getDocument().addDocumentListener(new DocumentListener()
		{
			@Override
			public void insertUpdate(DocumentEvent e)
			{
				searchTimer.restart();
			}

			@Override
			public void removeUpdate(DocumentEvent e)
			{
				searchTimer.restart();
			}

			@Override
			public void changedUpdate(DocumentEvent e)
			{
				searchTimer.restart();
			}
		});

		results.setLayout(new BoxLayout(results, BoxLayout.Y_AXIS));
		results.setBackground(ColorScheme.DARK_GRAY_COLOR);
		JPanel wrapper = new JPanel(new BorderLayout());
		wrapper.add(results, BorderLayout.NORTH);
		wrapper.setBackground(ColorScheme.DARK_GRAY_COLOR);
		JScrollPane scroll = new JScrollPane(wrapper);
		scroll.setBorder(BorderFactory.createEmptyBorder());
		scroll.getVerticalScrollBar().setUnitIncrement(16);
		add(scroll, BorderLayout.CENTER);

		render();
	}

	/** Re-draws current results with fresh prices (call on the EDT). */
	void refreshPrices()
	{
		render();
	}

	private void search()
	{
		String query = searchField.getText().trim();
		if (query.length() < 2)
		{
			lastResults = Collections.emptyList();
			render();
			return;
		}
		itemNames.search(query, found -> {
			// Ignore stale responses if the user kept typing.
			if (query.equals(searchField.getText().trim()))
			{
				lastResults = found;
				render();
			}
		});
	}

	private void render()
	{
		results.removeAll();
		if (lastResults.isEmpty())
		{
			String hint = searchField.getText().trim().length() < 2
				? "<html>Search any item to see live GE prices. Click a result to queue it for buying.</html>"
				: "No tradeable items match.";
			JLabel label = new JLabel(hint);
			label.setForeground(ColorScheme.LIGHT_GRAY_COLOR);
			label.setBorder(BorderFactory.createEmptyBorder(8, 4, 8, 4));
			results.add(label);
		}
		for (ItemPrice item : lastResults)
		{
			int id = item.getId();
			String name = item.getName();
			results.add(new ItemRow(itemManager, id, name, 1, priceService.getQuote(id),
				() -> buyAssist.queue(buyRequests.create(id, name, 1))));
			results.add(Box.createVerticalStrut(2));
		}
		results.revalidate();
		results.repaint();
	}
}

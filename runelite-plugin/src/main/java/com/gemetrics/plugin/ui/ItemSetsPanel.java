package com.gemetrics.plugin.ui;

import com.gemetrics.plugin.buy.BuyRequestFactory;
import com.gemetrics.plugin.buy.GeBuyAssist;
import com.gemetrics.plugin.prices.PriceService;
import com.gemetrics.plugin.sets.ItemSet;
import com.gemetrics.plugin.sets.SetFlip;
import com.gemetrics.plugin.sets.SetFlipCalculator;
import java.awt.BorderLayout;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import net.runelite.client.game.ItemManager;
import net.runelite.client.ui.ColorScheme;
import net.runelite.client.ui.components.IconTextField;

/** GE item sets ranked by flip profit, matching the GE Metrics Item Sets page. */
class ItemSetsPanel extends JPanel
{
	private final ItemManager itemManager;
	private final ItemNames itemNames;
	private final PriceService priceService;
	private final BuyRequestFactory buyRequests;
	private final GeBuyAssist buyAssist;
	private final List<ItemSet> sets;
	private final SetFlipCalculator calculator;

	private final IconTextField filterField = new IconTextField();
	private final JPanel list = new JPanel();
	private final Set<Integer> expanded = new HashSet<>();

	ItemSetsPanel(ItemManager itemManager, ItemNames itemNames, PriceService priceService,
		BuyRequestFactory buyRequests, GeBuyAssist buyAssist, List<ItemSet> sets, SetFlipCalculator calculator)
	{
		this.itemManager = itemManager;
		this.itemNames = itemNames;
		this.priceService = priceService;
		this.buyRequests = buyRequests;
		this.buyAssist = buyAssist;
		this.sets = sets;
		this.calculator = calculator;

		setLayout(new BorderLayout(0, 6));
		setBackground(ColorScheme.DARK_GRAY_COLOR);

		filterField.setIcon(IconTextField.Icon.SEARCH);
		filterField.setBackground(ColorScheme.DARKER_GRAY_COLOR);
		filterField.setHoverBackgroundColor(ColorScheme.DARK_GRAY_HOVER_COLOR);
		filterField.addClearListener(this::render);
		filterField.getDocument().addDocumentListener(new DocumentListener()
		{
			@Override
			public void insertUpdate(DocumentEvent e)
			{
				render();
			}

			@Override
			public void removeUpdate(DocumentEvent e)
			{
				render();
			}

			@Override
			public void changedUpdate(DocumentEvent e)
			{
				render();
			}
		});
		add(filterField, BorderLayout.NORTH);

		list.setLayout(new BoxLayout(list, BoxLayout.Y_AXIS));
		list.setBackground(ColorScheme.DARK_GRAY_COLOR);
		JPanel wrapper = new JPanel(new BorderLayout());
		wrapper.setBackground(ColorScheme.DARK_GRAY_COLOR);
		wrapper.add(list, BorderLayout.NORTH);
		JScrollPane scroll = new JScrollPane(wrapper);
		scroll.setBorder(BorderFactory.createEmptyBorder());
		scroll.getVerticalScrollBar().setUnitIncrement(16);
		add(scroll, BorderLayout.CENTER);

		Set<Integer> partIds = sets.stream()
			.flatMap(s -> s.getParts().stream().map(ItemSet.Part::getId))
			.collect(Collectors.toSet());
		itemNames.resolve(partIds, this::render);
		render();
	}

	/** Re-ranks with fresh prices (call on the EDT). */
	void refreshPrices()
	{
		render();
	}

	private void render()
	{
		list.removeAll();
		String filter = filterField.getText().trim().toLowerCase(Locale.ROOT);
		List<SetFlip> flips = calculator.rank(sets, priceService.getSnapshot()).stream()
			.filter(f -> filter.isEmpty() || f.getSet().getName().toLowerCase(Locale.ROOT).contains(filter))
			.collect(Collectors.toList());

		if (flips.isEmpty())
		{
			String msg = priceService.getSnapshot().isEmpty() ? "Loading prices..." : "No sets match.";
			JLabel label = new JLabel(msg);
			label.setForeground(ColorScheme.LIGHT_GRAY_COLOR);
			label.setBorder(BorderFactory.createEmptyBorder(8, 4, 8, 4));
			list.add(label);
		}
		for (SetFlip flip : flips)
		{
			int setId = flip.getSet().getSetId();
			list.add(new SetRow(flip, expanded.contains(setId), () -> toggle(setId), this::partRows,
				() -> queue(setId, flip.getSet().getName(), 1)));
			list.add(Box.createVerticalStrut(2));
		}
		list.revalidate();
		list.repaint();
	}

	private void toggle(int setId)
	{
		if (!expanded.remove(setId))
		{
			expanded.add(setId);
		}
		render();
	}

	private JPanel partRows(SetFlip flip)
	{
		JPanel parts = new JPanel();
		parts.setLayout(new BoxLayout(parts, BoxLayout.Y_AXIS));
		parts.setOpaque(false);
		ItemSet set = flip.getSet();
		parts.add(new ItemRow(itemManager, set.getSetId(), set.getName(), 1, priceService.getQuote(set.getSetId()),
			() -> queue(set.getSetId(), set.getName(), 1)));
		for (ItemSet.Part part : set.getParts())
		{
			String name = itemNames.get(part.getId());
			parts.add(Box.createVerticalStrut(1));
			parts.add(new ItemRow(itemManager, part.getId(), name, part.getQty(), priceService.getQuote(part.getId()),
				() -> queue(part.getId(), name, part.getQty())));
		}
		return parts;
	}

	private void queue(int itemId, String name, int perSet)
	{
		buyAssist.queue(buyRequests.create(itemId, name, perSet));
	}
}

package com.gemetrics.plugin.ui;

import com.gemetrics.plugin.sets.SetFlip;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Cursor;
import java.awt.GridLayout;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.function.Function;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import net.runelite.client.ui.ColorScheme;
import net.runelite.client.ui.FontManager;
import net.runelite.client.util.QuantityFormatter;

/** Collapsible item-set row: name, profit and strategy; expands to its set + part rows. */
class SetRow extends JPanel
{
	private static final Color PROFIT = new Color(0x4C, 0xAF, 0x50);
	private static final Color LOSS = new Color(0xE5, 0x73, 0x73);

	SetRow(SetFlip flip, boolean expanded, Runnable onToggle, Function<SetFlip, JPanel> partRows, Runnable onBuyFirst)
	{
		setLayout(new BorderLayout());
		setBackground(ColorScheme.DARKER_GRAY_COLOR);

		JPanel header = new JPanel(new BorderLayout(4, 0));
		header.setOpaque(false);
		header.setBorder(BorderFactory.createEmptyBorder(4, 6, 4, 4));
		header.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));

		JPanel text = new JPanel(new GridLayout(2, 1));
		text.setOpaque(false);
		JLabel name = new JLabel((expanded ? "▾ " : "▸ ") + flip.getSet().getName());
		name.setFont(FontManager.getRunescapeSmallFont());
		name.setForeground(Color.WHITE);
		JLabel profit = new JLabel(profitText(flip));
		profit.setFont(FontManager.getRunescapeSmallFont());
		profit.setForeground(flip.getProfit() > 0 ? PROFIT : LOSS);
		text.add(name);
		text.add(profit);
		header.add(text, BorderLayout.CENTER);

		// Combine starts by buying parts (expand to pick them); split starts by buying the set.
		boolean split = flip.getDirection() == SetFlip.Direction.SPLIT;
		JButton buy = new JButton(split ? "Buy set" : "Parts");
		buy.setFont(FontManager.getRunescapeSmallFont());
		buy.setFocusable(false);
		buy.setToolTipText(split ? "Queue the set for your next GE buy offer" : "Show the parts to buy");
		buy.addActionListener(e -> {
			if (split)
			{
				onBuyFirst.run();
			}
			else if (!expanded)
			{
				onToggle.run();
			}
		});
		header.add(buy, BorderLayout.EAST);
		header.setToolTipText(tooltip(flip));
		header.addMouseListener(new MouseAdapter()
		{
			@Override
			public void mouseClicked(MouseEvent e)
			{
				onToggle.run();
			}
		});
		add(header, BorderLayout.NORTH);

		if (expanded)
		{
			add(partRows.apply(flip), BorderLayout.CENTER);
		}
	}

	private static String profitText(SetFlip flip)
	{
		String strategy = flip.getDirection() == SetFlip.Direction.SPLIT ? "split" : "combine";
		return QuantityFormatter.quantityToStackSize(flip.getProfit()) + " gp (" + strategy + ")";
	}

	private static String tooltip(SetFlip flip)
	{
		String how = flip.getDirection() == SetFlip.Direction.SPLIT
			? "Buy the set low, exchange into parts, sell the parts high"
			: "Buy the parts low, exchange into the set, sell the set high";
		return "<html>" + how
			+ "<br>Cost: " + QuantityFormatter.formatNumber(flip.getCost())
			+ "<br>Revenue: " + QuantityFormatter.formatNumber(flip.getRevenue())
			+ "<br>Tax: " + QuantityFormatter.formatNumber(flip.getTax())
			+ "<br>Profit: " + QuantityFormatter.formatNumber(flip.getProfit())
			+ String.format(" (%.1f%%)", flip.getRoi() * 100) + "</html>";
	}
}

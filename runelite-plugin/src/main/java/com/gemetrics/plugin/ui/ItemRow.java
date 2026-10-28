package com.gemetrics.plugin.ui;

import com.gemetrics.plugin.prices.PriceQuote;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.GridLayout;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import net.runelite.client.game.ItemManager;
import net.runelite.client.ui.ColorScheme;
import net.runelite.client.ui.FontManager;
import net.runelite.client.util.QuantityFormatter;

/** One item: icon, name, low/high price and a Buy button that queues it. */
class ItemRow extends JPanel
{
	private static final Color BG = ColorScheme.DARKER_GRAY_COLOR;
	private static final Color BG_HOVER = ColorScheme.DARKER_GRAY_HOVER_COLOR;

	ItemRow(ItemManager itemManager, int itemId, String name, int qty, PriceQuote quote, Runnable onBuy)
	{
		setLayout(new BorderLayout(6, 0));
		setBackground(BG);
		setBorder(BorderFactory.createEmptyBorder(4, 4, 4, 4));
		setMaximumSize(new Dimension(Integer.MAX_VALUE, 42));

		JLabel icon = new JLabel();
		icon.setPreferredSize(new Dimension(32, 32));
		itemManager.getImage(itemId, qty, qty > 1).addTo(icon);
		add(icon, BorderLayout.WEST);

		JPanel text = new JPanel(new GridLayout(2, 1));
		text.setOpaque(false);
		JLabel nameLabel = new JLabel(name);
		nameLabel.setFont(FontManager.getRunescapeSmallFont());
		nameLabel.setForeground(Color.WHITE);
		JLabel priceLabel = new JLabel(priceText(quote));
		priceLabel.setFont(FontManager.getRunescapeSmallFont());
		priceLabel.setForeground(ColorScheme.LIGHT_GRAY_COLOR);
		text.add(nameLabel);
		text.add(priceLabel);
		add(text, BorderLayout.CENTER);

		JButton buy = new JButton("Buy");
		buy.setFont(FontManager.getRunescapeSmallFont());
		buy.setFocusable(false);
		buy.setToolTipText("Queue " + name + " for your next GE buy offer");
		buy.addActionListener(e -> onBuy.run());
		add(buy, BorderLayout.EAST);

		setToolTipText(tooltip(name, quote));
		setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
		addMouseListener(new MouseAdapter()
		{
			@Override
			public void mouseClicked(MouseEvent e)
			{
				onBuy.run();
			}

			@Override
			public void mouseEntered(MouseEvent e)
			{
				setBackground(BG_HOVER);
			}

			@Override
			public void mouseExited(MouseEvent e)
			{
				setBackground(BG);
			}
		});
	}

	static String priceText(PriceQuote quote)
	{
		if (quote == null || (quote.getLow() <= 0 && quote.getHigh() <= 0))
		{
			return "No recent trades";
		}
		return "Low " + gp(quote.getLow()) + " / High " + gp(quote.getHigh());
	}

	static String gp(long value)
	{
		return value <= 0 ? "-" : QuantityFormatter.quantityToStackSize(value);
	}

	private static String tooltip(String name, PriceQuote quote)
	{
		if (quote == null)
		{
			return name;
		}
		return "<html>" + name
			+ "<br>Low (sell): " + QuantityFormatter.formatNumber(quote.getLow()) + " gp"
			+ "<br>High (buy): " + QuantityFormatter.formatNumber(quote.getHigh()) + " gp"
			+ "<br>Click to queue a buy</html>";
	}
}

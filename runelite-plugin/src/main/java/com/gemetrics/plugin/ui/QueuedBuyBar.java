package com.gemetrics.plugin.ui;

import com.gemetrics.plugin.GeMetricsConfig;
import com.gemetrics.plugin.buy.BuyRequest;
import com.gemetrics.plugin.buy.GeBuyAssist;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.FlowLayout;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JSpinner;
import javax.swing.SpinnerNumberModel;
import net.runelite.client.ui.ColorScheme;
import net.runelite.client.ui.FontManager;
import net.runelite.client.util.QuantityFormatter;

/** Shows the queued buy, lets the player adjust quantity/price, and explains the steps. */
class QueuedBuyBar extends JPanel
{
	private final GeBuyAssist buyAssist;
	private final GeMetricsConfig config;
	private final JLabel title = new JLabel();
	private final JLabel steps = new JLabel();
	private final JSpinner quantity = new JSpinner(new SpinnerNumberModel(1, 1, Integer.MAX_VALUE, 1));
	private final JSpinner price = new JSpinner(new SpinnerNumberModel(1L, 1L, (long) Integer.MAX_VALUE, 1L));
	private final JPanel editors = new JPanel(new FlowLayout(FlowLayout.LEFT, 2, 0));
	private boolean updating;

	QueuedBuyBar(GeBuyAssist buyAssist, GeMetricsConfig config)
	{
		this.buyAssist = buyAssist;
		this.config = config;
		setLayout(new BorderLayout(0, 4));
		setBackground(ColorScheme.DARKER_GRAY_COLOR);
		setBorder(BorderFactory.createCompoundBorder(
			BorderFactory.createMatteBorder(0, 2, 0, 0, ColorScheme.BRAND_ORANGE),
			BorderFactory.createEmptyBorder(6, 6, 6, 6)));

		title.setForeground(ColorScheme.BRAND_ORANGE);
		add(title, BorderLayout.NORTH);

		editors.setOpaque(false);
		editors.add(small("Qty"));
		editors.add(quantity);
		editors.add(small("@"));
		editors.add(price);
		JButton clear = new JButton("x");
		clear.setFocusable(false);
		clear.setToolTipText("Clear queued buy");
		clear.addActionListener(e -> buyAssist.clear());
		editors.add(clear);
		add(editors, BorderLayout.CENTER);

		steps.setFont(FontManager.getRunescapeSmallFont());
		steps.setForeground(ColorScheme.LIGHT_GRAY_COLOR);
		add(steps, BorderLayout.SOUTH);

		quantity.addChangeListener(e -> edit());
		price.addChangeListener(e -> edit());
		refresh();
	}

	/** Re-reads the queued request (call on the EDT). */
	void refresh()
	{
		BuyRequest request = buyAssist.getQueued();
		setVisible(request != null);
		if (request == null)
		{
			return;
		}
		updating = true;
		title.setText("Queued: " + request.getName());
		quantity.setValue(request.getQuantity());
		price.setValue(Math.max(1L, request.getPrice()));
		updating = false;
		String key = config.fillOfferHotkey().toString();
		steps.setText("<html>1. Open a GE buy slot<br>2. Pick the <b>GE Metrics</b> item<br>"
			+ "3. Press <b>" + key + "</b> in the qty and price prompts, then Enter<br>"
			+ "Total: " + QuantityFormatter.quantityToStackSize(request.getPrice() * request.getQuantity()) + " gp</html>");
		revalidate();
	}

	private void edit()
	{
		BuyRequest request = buyAssist.getQueued();
		if (updating || request == null)
		{
			return;
		}
		buyAssist.queue(request
			.withQuantity((Integer) quantity.getValue())
			.withPrice(((Number) price.getValue()).longValue()));
	}

	private static JLabel small(String text)
	{
		JLabel label = new JLabel(text);
		label.setForeground(Color.LIGHT_GRAY);
		return label;
	}
}

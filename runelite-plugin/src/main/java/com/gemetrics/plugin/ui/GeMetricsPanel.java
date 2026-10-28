package com.gemetrics.plugin.ui;

import com.gemetrics.plugin.AuthenticationService;
import com.gemetrics.plugin.GeMetricsConfig;
import com.gemetrics.plugin.buy.BuyRequestFactory;
import com.gemetrics.plugin.buy.GeBuyAssist;
import com.gemetrics.plugin.prices.PriceService;
import com.gemetrics.plugin.prices.PriceSnapshot;
import com.gemetrics.plugin.sets.ItemSet;
import com.gemetrics.plugin.sets.SetFlipCalculator;
import java.awt.BorderLayout;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;
import net.runelite.client.game.ItemManager;
import net.runelite.client.ui.ColorScheme;
import net.runelite.client.ui.FontManager;
import net.runelite.client.ui.PluginPanel;
import net.runelite.client.ui.components.materialtabs.MaterialTab;
import net.runelite.client.ui.components.materialtabs.MaterialTabGroup;

/** Side panel: queued buy, then Prices / Sets / Account tabs. */
public class GeMetricsPanel extends PluginPanel
{
	private final PriceService priceService;
	private final PriceSearchPanel pricesTab;
	private final ItemSetsPanel setsTab;
	private final AccountPanel accountTab;
	private final QueuedBuyBar queuedBar;
	private final JLabel sourceLabel = new JLabel();

	public GeMetricsPanel(AuthenticationService authService, GeMetricsConfig config, PriceService priceService,
		ItemManager itemManager, ItemNames itemNames, BuyRequestFactory buyRequests, GeBuyAssist buyAssist,
		List<ItemSet> sets, SetFlipCalculator calculator)
	{
		super(false);
		this.priceService = priceService;
		setLayout(new BorderLayout(0, 6));
		setBorder(BorderFactory.createEmptyBorder(8, 8, 8, 8));
		setBackground(ColorScheme.DARK_GRAY_COLOR);

		pricesTab = new PriceSearchPanel(itemManager, itemNames, priceService, buyRequests, buyAssist);
		setsTab = new ItemSetsPanel(itemManager, itemNames, priceService, buyRequests, buyAssist, sets, calculator);
		accountTab = new AccountPanel(authService, config);
		queuedBar = new QueuedBuyBar(buyAssist, config);

		JPanel display = new JPanel(new BorderLayout());
		display.setBackground(ColorScheme.DARK_GRAY_COLOR);
		MaterialTabGroup tabs = new MaterialTabGroup(display);
		MaterialTab prices = new MaterialTab("Prices", tabs, pricesTab);
		tabs.addTab(prices);
		tabs.addTab(new MaterialTab("Sets", tabs, setsTab));
		tabs.addTab(new MaterialTab("Account", tabs, accountTab));
		tabs.select(prices);

		JPanel top = new JPanel(new BorderLayout(0, 6));
		top.setOpaque(false);
		top.add(statusRow(), BorderLayout.NORTH);
		top.add(queuedBar, BorderLayout.CENTER);
		top.add(tabs, BorderLayout.SOUTH);
		add(top, BorderLayout.NORTH);
		add(display, BorderLayout.CENTER);

		priceService.addListener(() -> SwingUtilities.invokeLater(this::onPricesUpdated));
		buyAssist.addListener(() -> SwingUtilities.invokeLater(queuedBar::refresh));
		onPricesUpdated();
	}

	public AccountPanel getAccountPanel()
	{
		return accountTab;
	}

	private JPanel statusRow()
	{
		JPanel row = new JPanel(new BorderLayout());
		row.setOpaque(false);
		sourceLabel.setFont(FontManager.getRunescapeSmallFont());
		sourceLabel.setForeground(ColorScheme.LIGHT_GRAY_COLOR);
		row.add(sourceLabel, BorderLayout.CENTER);
		JButton refresh = new JButton("Refresh");
		refresh.setFont(FontManager.getRunescapeSmallFont());
		refresh.setFocusable(false);
		refresh.addActionListener(e -> priceService.refreshNow());
		row.add(refresh, BorderLayout.EAST);
		return row;
	}

	private void onPricesUpdated()
	{
		PriceSnapshot snapshot = priceService.getSnapshot();
		if (snapshot.isEmpty())
		{
			sourceLabel.setText("Loading prices...");
		}
		else
		{
			long ageSec = Duration.between(snapshot.getFetchedAt(), Instant.now()).getSeconds();
			sourceLabel.setText("Prices: " + snapshot.getSource() + " (" + ageSec + "s ago)");
		}
		pricesTab.refreshPrices();
		setsTab.refreshPrices();
	}
}

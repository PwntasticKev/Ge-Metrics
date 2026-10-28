package com.gemetrics.plugin.buy;

import com.gemetrics.plugin.GeMetricsConfig;
import java.awt.event.KeyEvent;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import javax.inject.Inject;
import javax.inject.Singleton;
import lombok.extern.slf4j.Slf4j;
import net.runelite.api.Client;
import net.runelite.api.events.VarClientIntChanged;
import net.runelite.api.gameval.InterfaceID;
import net.runelite.api.gameval.VarClientID;
import net.runelite.api.gameval.VarPlayerID;
import net.runelite.api.widgets.JavaScriptCallback;
import net.runelite.api.widgets.Widget;
import net.runelite.api.widgets.WidgetTextAlignment;
import net.runelite.api.widgets.WidgetType;
import net.runelite.client.callback.ClientThread;
import net.runelite.client.eventbus.Subscribe;
import net.runelite.client.input.KeyListener;

/**
 * Helps the player buy a queued item without automating any game input:
 * <ul>
 *   <li>When the player opens a GE buy slot, the queued item is shown at the top of
 *   the item search so they can pick it with their own click.</li>
 *   <li>In the price/quantity prompt, the fill hotkey types the queued value into the
 *   chatbox. The player still presses Enter and confirms the offer.</li>
 * </ul>
 * This mirrors what Plugin Hub plugins such as Flipping Copilot do.
 */
@Slf4j
@Singleton
public class GeBuyAssist implements KeyListener
{
	private static final int MESLAYER_MODE_INT_INPUT = 7;
	private static final int MESLAYER_MODE_LONG_INPUT = 30;
	private static final int MESLAYER_MODE_GE_SEARCH = 14;
	/** Script the GE search runs when a result is picked (same args the game uses). */
	private static final int GE_SEARCH_SELECT_SCRIPT = 754;
	private static final int GE_OFFER_STATE_CHILD = 20;
	private static final String LABEL = "GE Metrics:";

	private final Client client;
	private final ClientThread clientThread;
	private final GeMetricsConfig config;
	private final List<Runnable> listeners = new CopyOnWriteArrayList<>();

	private volatile BuyRequest queued;
	/** Mirrors whether a numeric chatbox prompt is open, so key handling stays off the client thread. */
	private volatile boolean numericInputOpen;

	@Inject
	public GeBuyAssist(Client client, ClientThread clientThread, GeMetricsConfig config)
	{
		this.client = client;
		this.clientThread = clientThread;
		this.config = config;
	}

	public BuyRequest getQueued()
	{
		return queued;
	}

	public void queue(BuyRequest request)
	{
		queued = request;
		notifyListeners();
		// If the search is already open, show the new item straight away.
		clientThread.invokeLater(this::showQueuedInSearch);
	}

	public void clear()
	{
		queued = null;
		notifyListeners();
	}

	/** Listeners run on whatever thread changed the queue; marshal to the EDT for Swing. */
	public void addListener(Runnable listener)
	{
		listeners.add(listener);
	}

	private void notifyListeners()
	{
		listeners.forEach(Runnable::run);
	}

	@Subscribe
	public void onVarClientIntChanged(VarClientIntChanged event)
	{
		if (event.getIndex() != VarClientID.MESLAYERMODE)
		{
			return;
		}
		int mode = client.getVarcIntValue(VarClientID.MESLAYERMODE);
		numericInputOpen = mode == MESLAYER_MODE_INT_INPUT || mode == MESLAYER_MODE_LONG_INPUT;
		if (mode == MESLAYER_MODE_GE_SEARCH)
		{
			clientThread.invokeLater(this::showQueuedInSearch);
		}
	}

	// ---- GE search: show the queued item as the first result -------------------------

	private void showQueuedInSearch()
	{
		BuyRequest request = queued;
		Widget results = client.getWidget(InterfaceID.Chatbox.MES_LAYER_SCROLLCONTENTS);
		if (request == null || results == null
			|| client.getVarcIntValue(VarClientID.MESLAYERMODE) != MESLAYER_MODE_GE_SEARCH)
		{
			return;
		}
		// The game draws "Previous search" in children 0-3 when it has one; reuse those
		// slots, otherwise create our own in the same layout.
		if (hasPreviousSearchRow(results))
		{
			overwritePreviousSearch(results, request);
		}
		else
		{
			createSearchRow(results, request);
		}
	}

	private static boolean hasPreviousSearchRow(Widget results)
	{
		Widget[] children = results.getChildren();
		return children != null && children.length >= 4 && children[0] != null && children[3] != null;
	}

	private static void overwritePreviousSearch(Widget results, BuyRequest request)
	{
		configureSelectButton(results.getChild(0), request);

		Widget label = results.getChild(1);
		label.setText(LABEL);
		label.setOriginalWidth(95);
		label.setXTextAlignment(WidgetTextAlignment.LEFT);
		label.revalidate();

		Widget name = results.getChild(2);
		name.setText(request.getName());
		name.revalidate();

		Widget icon = results.getChild(3);
		icon.setItemId(request.getItemId());
		icon.revalidate();
	}

	private static void createSearchRow(Widget results, BuyRequest request)
	{
		Widget button = results.createChild(0, WidgetType.RECTANGLE);
		button.setFilled(true);
		button.setTextColor(0xFFFFFF);
		button.setOpacity(255);
		button.setOriginalX(114);
		button.setOriginalY(0);
		button.setOriginalWidth(256);
		button.setOriginalHeight(32);
		button.setOnMouseOverListener((JavaScriptCallback) ev -> button.setOpacity(200));
		button.setOnMouseLeaveListener((JavaScriptCallback) ev -> button.setOpacity(255));
		configureSelectButton(button, request);

		Widget label = results.createChild(1, WidgetType.TEXT);
		label.setText(LABEL);
		label.setFontId(495);
		label.setOriginalX(114);
		label.setOriginalY(0);
		label.setOriginalWidth(95);
		label.setOriginalHeight(32);
		label.setYTextAlignment(1);
		label.revalidate();

		Widget name = results.createChild(2, WidgetType.TEXT);
		name.setText(request.getName());
		name.setFontId(495);
		name.setOriginalX(254);
		name.setOriginalY(0);
		name.setOriginalWidth(116);
		name.setOriginalHeight(32);
		name.setYTextAlignment(1);
		name.revalidate();

		Widget icon = results.createChild(3, WidgetType.GRAPHIC);
		icon.setItemId(request.getItemId());
		icon.setItemQuantity(1);
		icon.setItemQuantityMode(0);
		icon.setRotationX(550);
		icon.setModelZoom(1031);
		icon.setBorderType(1);
		icon.setOriginalX(214);
		icon.setOriginalY(0);
		icon.setOriginalWidth(36);
		icon.setOriginalHeight(32);
		icon.revalidate();
	}

	private static void configureSelectButton(Widget button, BuyRequest request)
	{
		button.setName("<col=ff9040>" + request.getName() + "</col>");
		button.setHasListener(true);
		button.setAction(0, "Select");
		// Same handler the game attaches to its own search results; it only runs when
		// the player clicks it or presses the key themselves.
		button.setOnOpListener(GE_SEARCH_SELECT_SCRIPT, request.getItemId(), 84);
		button.setOnKeyListener(GE_SEARCH_SELECT_SCRIPT, request.getItemId(), -2147483640);
		button.revalidate();
	}

	// ---- Price / quantity prompt: fill hotkey -----------------------------------------

	@Override
	public void keyTyped(KeyEvent e)
	{
	}

	@Override
	public void keyPressed(KeyEvent e)
	{
		// Enter is never a valid fill key: it would also submit the prompt.
		if (e.getKeyCode() == KeyEvent.VK_ENTER || queued == null || !numericInputOpen
			|| !config.fillOfferHotkey().matches(e))
		{
			return;
		}
		e.consume();
		clientThread.invokeLater(this::fillPrompt);
	}

	@Override
	public void keyReleased(KeyEvent e)
	{
	}

	private void fillPrompt()
	{
		BuyRequest request = queued;
		if (request == null || client.getVarpValue(VarPlayerID.TRADINGPOST_SEARCH) != request.getItemId()
			|| !isBuyOfferOpen())
		{
			return;
		}
		String title = textOf(client.getWidget(InterfaceID.Chatbox.MES_TEXT));
		if (title.equals("How many do you wish to buy?"))
		{
			setChatboxValue(request.getQuantity());
		}
		else if (title.equals("Set a price for each item:") && request.getPrice() > 0)
		{
			setChatboxValue(request.getPrice());
		}
	}

	private boolean isBuyOfferOpen()
	{
		Widget setup = client.getWidget(InterfaceID.GeOffers.SETUP);
		return setup != null && "Buy offer".equals(textOf(setup.getChild(GE_OFFER_STATE_CHILD)));
	}

	/** Types a value into the open chatbox prompt; the player still presses Enter. */
	private void setChatboxValue(long value)
	{
		Widget input = client.getWidget(InterfaceID.Chatbox.MES_TEXT2);
		if (input == null)
		{
			return;
		}
		input.setText(value + "*");
		client.setVarcStrValue(VarClientID.MESLAYERINPUT, String.valueOf(value));
	}

	private static String textOf(Widget widget)
	{
		return widget == null || widget.getText() == null ? "" : widget.getText();
	}
}

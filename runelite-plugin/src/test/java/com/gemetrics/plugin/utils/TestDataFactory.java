package com.gemetrics.plugin.utils;

import com.gemetrics.plugin.TradeEvent;
import net.runelite.api.GrandExchangeOffer;
import net.runelite.api.GrandExchangeOfferState;
import net.runelite.api.GrandExchangeOfferType;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Factory for creating test data objects
 */
public class TestDataFactory
{
	public static TradeEvent createTradeEvent()
	{
		return createTradeEvent("test-trade-" + UUID.randomUUID());
	}
	
	public static TradeEvent createTradeEvent(String eventId)
	{
		TradeEvent trade = new TradeEvent();
		trade.setRuneliteEventId(eventId);
		trade.setItemId(554);
		trade.setItemName("Fire rune");
		trade.setOfferType("buy");
		trade.setPrice(5);
		trade.setQuantity(1000);
		trade.setFilledQuantity(1000);
		trade.setRemainingQuantity(0);
		trade.setStatus("completed");
		trade.setTimestamp(Instant.now().toString());
		return trade;
	}
	
	public static TradeEvent createBuyTradeEvent(String itemName, int price, int quantity)
	{
		TradeEvent trade = createTradeEvent();
		trade.setItemName(itemName);
		trade.setOfferType("buy");
		trade.setPrice(price);
		trade.setQuantity(quantity);
		trade.setFilledQuantity(quantity);
		trade.setRemainingQuantity(0);
		return trade;
	}
	
	public static TradeEvent createSellTradeEvent(String itemName, int price, int quantity)
	{
		TradeEvent trade = createTradeEvent();
		trade.setItemName(itemName);
		trade.setOfferType("sell");
		trade.setPrice(price);
		trade.setQuantity(quantity);
		trade.setFilledQuantity(quantity);
		trade.setRemainingQuantity(0);
		return trade;
	}
	
	public static TradeEvent createPartiallyFilledTrade(String itemName, int totalQuantity, int filledQuantity)
	{
		TradeEvent trade = createTradeEvent();
		trade.setItemName(itemName);
		trade.setQuantity(totalQuantity);
		trade.setFilledQuantity(filledQuantity);
		trade.setRemainingQuantity(totalQuantity - filledQuantity);
		trade.setStatus("pending");
		return trade;
	}
	
	public static TradeEvent createCancelledTrade(String itemName)
	{
		TradeEvent trade = createTradeEvent();
		trade.setItemName(itemName);
		trade.setStatus("cancelled");
		trade.setFilledQuantity(0);
		trade.setRemainingQuantity(trade.getQuantity());
		return trade;
	}
	
	/**
	 * Create a mock GrandExchangeOffer for testing
	 */
	public static GrandExchangeOffer createMockOffer(
		GrandExchangeOfferType type, 
		GrandExchangeOfferState state,
		int itemId,
		int price,
		int totalQuantity,
		int quantitySold)
	{
		GrandExchangeOffer offer = mock(GrandExchangeOffer.class);
		
		when(offer.getType()).thenReturn(type);
		when(offer.getState()).thenReturn(state);
		when(offer.getItemId()).thenReturn(itemId);
		when(offer.getPrice()).thenReturn(price);
		when(offer.getTotalQuantity()).thenReturn(totalQuantity);
		when(offer.getQuantitySold()).thenReturn(quantitySold);
		when(offer.getSpent()).thenReturn(price * quantitySold);
		
		return offer;
	}
	
	public static GrandExchangeOffer createCompletedBuyOffer(int itemId, int price, int quantity)
	{
		return createMockOffer(
			GrandExchangeOfferType.BUY,
			GrandExchangeOfferState.BOUGHT,
			itemId,
			price,
			quantity,
			quantity
		);
	}
	
	public static GrandExchangeOffer createCompletedSellOffer(int itemId, int price, int quantity)
	{
		return createMockOffer(
			GrandExchangeOfferType.SELL,
			GrandExchangeOfferState.SOLD,
			itemId,
			price,
			quantity,
			quantity
		);
	}
	
	public static GrandExchangeOffer createPartiallyFilledOffer(int itemId, int price, int totalQuantity, int filledQuantity)
	{
		return createMockOffer(
			GrandExchangeOfferType.BUY,
			GrandExchangeOfferState.BUYING,
			itemId,
			price,
			totalQuantity,
			filledQuantity
		);
	}
	
	public static GrandExchangeOffer createCancelledOffer(int itemId, int price, int quantity)
	{
		return createMockOffer(
			GrandExchangeOfferType.BUY,
			GrandExchangeOfferState.CANCELLED_BUY,
			itemId,
			price,
			quantity,
			0
		);
	}
	
	/**
	 * Common test item IDs for OSRS items
	 */
	public static class Items
	{
		public static final int FIRE_RUNE = 554;
		public static final int NATURE_RUNE = 561;
		public static final int DRAGON_BONES = 536;
		public static final int SHARKS = 385;
		public static final int MONKFISH = 7946;
		public static final int CANNONBALL = 2;
		public static final int COAL = 453;
		public static final int IRON_ORE = 440;
		public static final int GOLD_ORE = 444;
		public static final int YEW_LOGS = 1515;
	}
	
	/**
	 * Create test trades for common profit scenarios
	 */
	public static class Scenarios
	{
		public static TradeEvent[] createSimpleFlip()
		{
			return new TradeEvent[] {
				createBuyTradeEvent("Dragon bones", 2500, 100),
				createSellTradeEvent("Dragon bones", 2600, 100)
			};
		}
		
		public static TradeEvent[] createLossFlip()
		{
			return new TradeEvent[] {
				createBuyTradeEvent("Sharks", 1000, 50),
				createSellTradeEvent("Sharks", 950, 50)
			};
		}
		
		public static TradeEvent[] createHighVolumeFlip()
		{
			return new TradeEvent[] {
				createBuyTradeEvent("Fire rune", 5, 10000),
				createSellTradeEvent("Fire rune", 6, 10000)
			};
		}
	}
}
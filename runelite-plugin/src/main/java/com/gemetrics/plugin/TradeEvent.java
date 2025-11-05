package com.gemetrics.plugin;

import lombok.Data;

@Data
public class TradeEvent
{
	private String runeliteEventId;
	private Integer itemId;
	private String itemName;
	private String offerType; // "buy" or "sell"
	private Integer price;
	private Integer quantity;
	private Integer filledQuantity;
	private Integer remainingQuantity;
	private String status; // "pending", "completed", "canceled"
	private String timestamp;
}


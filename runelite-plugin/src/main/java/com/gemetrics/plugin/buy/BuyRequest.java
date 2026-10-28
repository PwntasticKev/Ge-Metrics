package com.gemetrics.plugin.buy;

import lombok.Value;
import lombok.With;

/** An item the player has queued in the panel to buy on the GE. */
@Value
@With
public class BuyRequest
{
	int itemId;
	String name;
	long price;
	int quantity;
}

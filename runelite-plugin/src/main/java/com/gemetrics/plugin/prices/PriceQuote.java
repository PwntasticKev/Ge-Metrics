package com.gemetrics.plugin.prices;

import lombok.Value;

/**
 * Latest instant-buy (high) and instant-sell (low) prices for one item.
 * A price of 0 means no trade has been seen; times are epoch seconds (0 = unknown).
 */
@Value
public class PriceQuote
{
	int itemId;
	long high;
	long highTime;
	long low;
	long lowTime;

	public boolean isPriced()
	{
		return high > 0 && low > 0;
	}
}

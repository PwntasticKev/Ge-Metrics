package com.gemetrics.plugin.buy;

import com.gemetrics.plugin.prices.PriceQuote;

/** Which price to fill into a buy offer. */
public enum BuyPriceMode
{
	LOW("Low (patient buy)"),
	LOW_PLUS_ONE("Low + 1 gp"),
	HIGH("High (instant buy)");

	private final String label;

	BuyPriceMode(String label)
	{
		this.label = label;
	}

	/** Returns the offer price, or 0 when the quote has no usable price. */
	public long priceFor(PriceQuote quote)
	{
		if (quote == null)
		{
			return 0;
		}
		switch (this)
		{
			case HIGH:
				return quote.getHigh() > 0 ? quote.getHigh() : quote.getLow();
			case LOW_PLUS_ONE:
				return quote.getLow() > 0 ? quote.getLow() + 1 : quote.getHigh();
			default:
				return quote.getLow() > 0 ? quote.getLow() : quote.getHigh();
		}
	}

	@Override
	public String toString()
	{
		return label;
	}
}

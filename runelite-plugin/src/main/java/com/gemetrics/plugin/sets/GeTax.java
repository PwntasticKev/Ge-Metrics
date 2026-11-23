package com.gemetrics.plugin.sets;

import java.util.Set;

/**
 * Grand Exchange sales tax, matching the web app's geTax.js: 2% of the sell price per
 * item, rounded down, capped at 5M. Items under 50 gp and exempt items pay nothing.
 */
public final class GeTax
{
	/** 2%, kept as an integer fraction so rounding is exact (no floating point). */
	static final long RATE_PERCENT = 2;
	static final long CAP = 5_000_000L;
	static final long MIN_PRICE = 50;

	private final Set<Integer> exemptIds;

	public GeTax(Set<Integer> exemptIds)
	{
		this.exemptIds = exemptIds;
	}

	/** Tax on selling one item at {@code sellPrice}. */
	public long of(long sellPrice, int itemId)
	{
		if (sellPrice < MIN_PRICE || exemptIds.contains(itemId))
		{
			return 0;
		}
		// sellPrice >= 50, so integer division is a floor.
		return Math.min(sellPrice * RATE_PERCENT / 100, CAP);
	}
}

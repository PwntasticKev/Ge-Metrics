package com.gemetrics.plugin.sets;

import java.util.Set;

/**
 * Grand Exchange sales tax, matching the web app's geTax.js: 2% of the sell price per
 * item, rounded down, capped at 5M. Items under 50 gp and exempt items pay nothing.
 */
public final class GeTax
{
	static final double RATE = 0.02;
	static final long CAP = 5_000_000L;
	static final long MIN_PRICE = 50;

	private final Set<Integer> exemptIds;

	public GeTax(Set<Integer> exemptIds)
	{
		this.exemptIds = exemptIds;
	}

	public long of(long sellPrice, int itemId)
	{
		if (sellPrice < MIN_PRICE || exemptIds.contains(itemId))
		{
			return 0;
		}
		return Math.min((long) Math.floor(sellPrice * RATE), CAP);
	}
}

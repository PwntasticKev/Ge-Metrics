package com.gemetrics.plugin.sets;

import lombok.Value;

/** The most profitable way to flip one item set at current prices. */
@Value
public class SetFlip
{
	public enum Direction
	{
		/** Buy every part at its low, exchange into the set, sell the set high. */
		COMBINE,
		/** Buy the set at its low, exchange into parts, sell every part high. */
		SPLIT
	}

	ItemSet set;
	Direction direction;
	long cost;
	long revenue;
	long tax;

	public long getProfit()
	{
		return revenue - cost - tax;
	}

	public double getRoi()
	{
		return cost == 0 ? 0 : (double) getProfit() / cost;
	}
}

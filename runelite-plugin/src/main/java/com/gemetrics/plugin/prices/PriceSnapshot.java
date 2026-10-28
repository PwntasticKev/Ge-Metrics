package com.gemetrics.plugin.prices;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import lombok.Value;

/** Immutable set of prices fetched together, plus where and when they came from. */
@Value
public class PriceSnapshot
{
	public enum Source
	{
		NONE("not loaded"),
		GE_METRICS("GE Metrics"),
		OSRS_WIKI("OSRS Wiki");

		private final String label;

		Source(String label)
		{
			this.label = label;
		}

		@Override
		public String toString()
		{
			return label;
		}
	}

	public static final PriceSnapshot EMPTY = new PriceSnapshot(Collections.emptyMap(), Source.NONE, Instant.EPOCH);

	Map<Integer, PriceQuote> quotes;
	Source source;
	Instant fetchedAt;

	/** Returns the quote, or null when the item has never traded. */
	public PriceQuote get(int itemId)
	{
		return quotes.get(itemId);
	}

	public boolean isEmpty()
	{
		return quotes.isEmpty();
	}
}

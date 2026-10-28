package com.gemetrics.plugin.sets;

import com.gemetrics.plugin.prices.PriceQuote;
import com.gemetrics.plugin.prices.PriceSnapshot;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/** Port of the web app's setFlip.js for GE sets (free, reversible exchanges). */
public final class SetFlipCalculator
{
	private final GeTax tax;

	public SetFlipCalculator(GeTax tax)
	{
		this.tax = tax;
	}

	/** Returns the better of combine/split, or null if any item lacks a high and low price. */
	public SetFlip compute(ItemSet set, PriceSnapshot prices)
	{
		PriceQuote setQuote = prices.get(set.getSetId());
		if (setQuote == null || !setQuote.isPriced())
		{
			return null;
		}
		long partsLow = 0;
		long partsHigh = 0;
		long partsTax = 0;
		for (ItemSet.Part part : set.getParts())
		{
			PriceQuote q = prices.get(part.getId());
			if (q == null || !q.isPriced())
			{
				return null;
			}
			partsLow += q.getLow() * part.getQty();
			partsHigh += q.getHigh() * part.getQty();
			partsTax += tax.of(q.getHigh(), part.getId()) * part.getQty();
		}

		SetFlip combine = new SetFlip(set, SetFlip.Direction.COMBINE,
			partsLow, setQuote.getHigh(), tax.of(setQuote.getHigh(), set.getSetId()));
		SetFlip split = new SetFlip(set, SetFlip.Direction.SPLIT, setQuote.getLow(), partsHigh, partsTax);
		return split.getProfit() > combine.getProfit() ? split : combine;
	}

	/** All priceable sets, most profitable first. */
	public List<SetFlip> rank(List<ItemSet> sets, PriceSnapshot prices)
	{
		return sets.stream()
			.map(s -> compute(s, prices))
			.filter(Objects::nonNull)
			.sorted(Comparator.comparingLong(SetFlip::getProfit).reversed())
			.collect(Collectors.toList());
	}
}

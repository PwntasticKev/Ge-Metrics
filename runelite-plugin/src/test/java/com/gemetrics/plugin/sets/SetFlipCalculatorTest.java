package com.gemetrics.plugin.sets;

import static org.assertj.core.api.Assertions.assertThat;

import com.gemetrics.plugin.prices.PriceQuote;
import com.gemetrics.plugin.prices.PriceSnapshot;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class SetFlipCalculatorTest
{
	private static final int SET = 100;
	private static final int HELM = 1;
	private static final int BODY = 2;

	private final ItemSet set = new ItemSet(SET, "Test set",
		Arrays.asList(new ItemSet.Part(HELM, 1), new ItemSet.Part(BODY, 2)));
	private final SetFlipCalculator calculator = new SetFlipCalculator(new GeTax(Collections.emptySet()));

	@Test
	void combineBuysPartsLowAndSellsSetHigh()
	{
		PriceSnapshot prices = snapshot(
			quote(SET, 10_000, 9_000),
			quote(HELM, 2_100, 2_000),
			quote(BODY, 3_100, 3_000));

		SetFlip flip = calculator.compute(set, prices);

		// cost 2000 + 2*3000 = 8000, revenue 10000, tax floor(10000 * 2%) = 200
		assertThat(flip.getDirection()).isEqualTo(SetFlip.Direction.COMBINE);
		assertThat(flip.getCost()).isEqualTo(8_000);
		assertThat(flip.getRevenue()).isEqualTo(10_000);
		assertThat(flip.getTax()).isEqualTo(200);
		assertThat(flip.getProfit()).isEqualTo(1_800);
	}

	@Test
	void splitWinsWhenPartsSellForMoreThanTheSet()
	{
		PriceSnapshot prices = snapshot(
			quote(SET, 6_000, 5_000),
			quote(HELM, 2_500, 2_400),
			quote(BODY, 3_000, 2_900));

		SetFlip flip = calculator.compute(set, prices);

		// split: cost 5000, revenue 2500 + 2*3000 = 8500, tax 50 + 2*60 = 170
		assertThat(flip.getDirection()).isEqualTo(SetFlip.Direction.SPLIT);
		assertThat(flip.getCost()).isEqualTo(5_000);
		assertThat(flip.getRevenue()).isEqualTo(8_500);
		assertThat(flip.getTax()).isEqualTo(170);
		assertThat(flip.getProfit()).isEqualTo(3_330);
	}

	@Test
	void skipsSetsWithAnUnpricedItem()
	{
		PriceSnapshot prices = snapshot(quote(SET, 10_000, 9_000), quote(HELM, 2_100, 2_000), quote(BODY, 0, 3_000));

		assertThat(calculator.compute(set, prices)).isNull();
	}

	@Test
	void ranksMostProfitableFirst()
	{
		ItemSet other = new ItemSet(200, "Other", Collections.singletonList(new ItemSet.Part(3, 1)));
		PriceSnapshot prices = snapshot(
			quote(SET, 10_000, 9_000), quote(HELM, 2_100, 2_000), quote(BODY, 3_100, 3_000),
			quote(200, 50_000, 10_000), quote(3, 60_000, 1_000));

		List<SetFlip> ranked = calculator.rank(Arrays.asList(set, other), prices);

		assertThat(ranked).extracting(f -> f.getSet().getSetId()).containsExactly(200, SET);
	}

	@Test
	void taxMatchesWebAppRules()
	{
		GeTax tax = new GeTax(Set.of(13190));

		assertThat(tax.of(49, 1)).isZero();
		assertThat(tax.of(50, 1)).isEqualTo(1);
		assertThat(tax.of(999, 1)).isEqualTo(19);
		assertThat(tax.of(1_000_000_000L, 1)).isEqualTo(5_000_000);
		assertThat(tax.of(10_000_000, 13190)).isZero();
	}

	private static PriceQuote quote(int id, long high, long low)
	{
		return new PriceQuote(id, high, 1, low, 1);
	}

	private static PriceSnapshot snapshot(PriceQuote... quotes)
	{
		Map<Integer, PriceQuote> map = new HashMap<>();
		for (PriceQuote q : quotes)
		{
			map.put(q.getItemId(), q);
		}
		return new PriceSnapshot(map, PriceSnapshot.Source.OSRS_WIKI, Instant.EPOCH);
	}
}

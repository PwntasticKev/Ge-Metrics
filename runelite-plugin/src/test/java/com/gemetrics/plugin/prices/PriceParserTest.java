package com.gemetrics.plugin.prices;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.google.gson.Gson;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PriceParserTest
{
	private final Gson gson = new Gson();

	@Test
	void parsesOsrsWikiLatestResponse()
	{
		// Shape copied from https://prices.runescape.wiki/api/v1/osrs/latest
		String json = "{\"data\":{"
			+ "\"2\":{\"high\":200,\"highTime\":1700000000,\"low\":190,\"lowTime\":1700000100},"
			+ "\"4151\":{\"high\":1500000,\"highTime\":1700000200,\"low\":1480000,\"lowTime\":1700000300}"
			+ "}}";

		Map<Integer, PriceQuote> quotes = PriceParser.parse(gson, json);

		assertThat(quotes).containsOnlyKeys(2, 4151);
		assertThat(quotes.get(2)).isEqualTo(new PriceQuote(2, 200, 1_700_000_000, 190, 1_700_000_100));
		assertThat(quotes.get(4151)).isEqualTo(new PriceQuote(4151, 1_500_000, 1_700_000_200, 1_480_000, 1_700_000_300));
		assertThat(quotes.get(4151).isPriced()).isTrue();
	}

	@Test
	void parsesPricesAboveIntMax()
	{
		String json = "{\"data\":{\"20997\":{\"high\":3000000000,\"highTime\":1,\"low\":2900000000,\"lowTime\":1}}}";

		assertThat(PriceParser.parse(gson, json).get(20997).getHigh()).isEqualTo(3_000_000_000L);
	}

	@Test
	void ignoresUnknownFields()
	{
		String json = "{\"data\":{\"2\":{\"high\":200,\"low\":190,\"avgHighPrice\":5}},\"extra\":true}";

		PriceQuote quote = PriceParser.parse(gson, json).get(2);

		assertThat(quote.getHigh()).isEqualTo(200);
		assertThat(quote.getHighTime()).isZero();
	}

	@Test
	void treatsNullPricesAsUnpricedAndSkipsBadEntries()
	{
		String json = "{\"data\":{\"10\":{\"high\":null,\"low\":5},\"abc\":{\"high\":1},\"11\":7,"
			+ "\"12\":{\"high\":\"lots\",\"low\":3}}}";

		Map<Integer, PriceQuote> quotes = PriceParser.parse(gson, json);

		assertThat(quotes).containsOnlyKeys(10, 12);
		assertThat(quotes.get(10).getHigh()).isZero();
		assertThat(quotes.get(10).isPriced()).isFalse();
		assertThat(quotes.get(12).getHigh()).isZero();
	}

	@Test
	void emptyDataGivesEmptyMap()
	{
		assertThat(PriceParser.parse(gson, "{\"data\":{}}")).isEmpty();
	}

	@Test
	void rejectsResponsesWithoutData()
	{
		assertThatThrownBy(() -> PriceParser.parse(gson, "{\"error\":\"rate limited\"}"))
			.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> PriceParser.parse(gson, "[]"))
			.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> PriceParser.parse(gson, "{\"data\":[]}"))
			.isInstanceOf(IllegalArgumentException.class);
	}
}

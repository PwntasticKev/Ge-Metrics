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
	void parsesGeMetricsTrpcEnvelope()
	{
		String json = "{\"result\":{\"data\":{\"4151\":{\"high\":1500000,\"highTime\":1700000000,"
			+ "\"low\":1480000,\"lowTime\":1700000100}}}}";

		Map<Integer, PriceQuote> quotes = PriceParser.parse(gson, json);

		assertThat(quotes).containsOnlyKeys(4151);
		assertThat(quotes.get(4151)).isEqualTo(new PriceQuote(4151, 1_500_000, 1_700_000_000, 1_480_000, 1_700_000_100));
	}

	@Test
	void parsesOsrsWikiEnvelope()
	{
		String json = "{\"data\":{\"2\":{\"high\":200,\"highTime\":1,\"low\":190,\"lowTime\":2}}}";

		assertThat(PriceParser.parse(gson, json).get(2).getLow()).isEqualTo(190);
	}

	@Test
	void treatsNullPricesAsUnpricedAndSkipsBadEntries()
	{
		String json = "{\"data\":{\"10\":{\"high\":null,\"low\":5},\"abc\":{\"high\":1},\"11\":7}}";

		Map<Integer, PriceQuote> quotes = PriceParser.parse(gson, json);

		assertThat(quotes).containsOnlyKeys(10);
		assertThat(quotes.get(10).getHigh()).isZero();
		assertThat(quotes.get(10).isPriced()).isFalse();
	}

	@Test
	void rejectsErrorResponses()
	{
		assertThatThrownBy(() -> PriceParser.parse(gson, "{\"error\":{\"message\":\"FORBIDDEN\"}}"))
			.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> PriceParser.parse(gson, "[]"))
			.isInstanceOf(IllegalArgumentException.class);
	}
}

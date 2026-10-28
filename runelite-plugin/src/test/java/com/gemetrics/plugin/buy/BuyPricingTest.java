package com.gemetrics.plugin.buy;

import static org.assertj.core.api.Assertions.assertThat;

import com.gemetrics.plugin.prices.PriceQuote;
import org.junit.jupiter.api.Test;

class BuyPricingTest
{
	private final PriceQuote quote = new PriceQuote(1, 1_050, 1, 1_000, 1);

	@Test
	void priceModes()
	{
		assertThat(BuyPriceMode.LOW.priceFor(quote)).isEqualTo(1_000);
		assertThat(BuyPriceMode.LOW_PLUS_ONE.priceFor(quote)).isEqualTo(1_001);
		assertThat(BuyPriceMode.HIGH.priceFor(quote)).isEqualTo(1_050);
	}

	@Test
	void fallsBackToTheOtherSideWhenOneIsMissing()
	{
		PriceQuote onlyHigh = new PriceQuote(1, 500, 1, 0, 0);
		PriceQuote onlyLow = new PriceQuote(1, 0, 0, 400, 1);

		assertThat(BuyPriceMode.LOW.priceFor(onlyHigh)).isEqualTo(500);
		assertThat(BuyPriceMode.HIGH.priceFor(onlyLow)).isEqualTo(400);
		assertThat(BuyPriceMode.LOW.priceFor(null)).isZero();
	}

	@Test
	void quantityUsesConfigThenBuyLimitRoundedToWholeSets()
	{
		assertThat(BuyRequestFactory.quantityFor(5, 70, 1)).isEqualTo(5);
		assertThat(BuyRequestFactory.quantityFor(5, 70, 2)).isEqualTo(10);
		assertThat(BuyRequestFactory.quantityFor(0, 70, 1)).isEqualTo(70);
		assertThat(BuyRequestFactory.quantityFor(0, 70, 3)).isEqualTo(69);
		assertThat(BuyRequestFactory.quantityFor(0, 2, 3)).isEqualTo(3);
		assertThat(BuyRequestFactory.quantityFor(0, 0, 1)).isEqualTo(1);
	}
}

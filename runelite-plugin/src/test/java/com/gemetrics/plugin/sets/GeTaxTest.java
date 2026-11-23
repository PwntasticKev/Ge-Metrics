package com.gemetrics.plugin.sets;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Collections;
import java.util.Set;
import org.junit.jupiter.api.Test;

class GeTaxTest
{
	private static final int ITEM = 4151;
	private static final int BOND = 13190;

	private final GeTax tax = new GeTax(Collections.emptySet());

	@Test
	void noTaxUnderFiftyGp()
	{
		assertThat(tax.of(0, ITEM)).isZero();
		assertThat(tax.of(1, ITEM)).isZero();
		assertThat(tax.of(49, ITEM)).isZero();
	}

	@Test
	void twoPercentRoundedDown()
	{
		assertThat(tax.of(50, ITEM)).isEqualTo(1);
		assertThat(tax.of(99, ITEM)).isEqualTo(1);
		assertThat(tax.of(100, ITEM)).isEqualTo(2);
		assertThat(tax.of(149, ITEM)).isEqualTo(2);
		assertThat(tax.of(999, ITEM)).isEqualTo(19);
		assertThat(tax.of(1_480_000, ITEM)).isEqualTo(29_600);
	}

	@Test
	void cappedAtFiveMillion()
	{
		assertThat(tax.of(249_999_999L, ITEM)).isEqualTo(4_999_999);
		assertThat(tax.of(250_000_000L, ITEM)).isEqualTo(5_000_000);
		assertThat(tax.of(2_147_483_647L, ITEM)).isEqualTo(5_000_000);
	}

	@Test
	void exemptItemsPayNothing()
	{
		GeTax withExempt = new GeTax(Set.of(BOND));

		assertThat(withExempt.of(10_000_000, BOND)).isZero();
		assertThat(withExempt.of(10_000_000, ITEM)).isEqualTo(200_000);
	}

	@Test
	void bundledExemptListIsApplied()
	{
		GeTax bundled = new GeTax(ItemSetRepository.loadTaxExemptIds(new com.google.gson.Gson()));

		assertThat(bundled.of(10_000_000, BOND)).isZero();
	}
}

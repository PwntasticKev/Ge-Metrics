package com.gemetrics.plugin.sets;

import static org.assertj.core.api.Assertions.assertThat;

import com.google.gson.Gson;
import java.util.List;
import org.junit.jupiter.api.Test;

class ItemSetRepositoryTest
{
	private final Gson gson = new Gson();

	@Test
	void loadsBundledGeItemSets()
	{
		List<ItemSet> sets = ItemSetRepository.loadSets(gson);

		assertThat(sets).hasSizeGreaterThan(100);
		assertThat(sets).allSatisfy(s -> {
			assertThat(s.getName()).isNotBlank();
			assertThat(s.getParts()).isNotEmpty().allSatisfy(p -> assertThat(p.getQty()).isPositive());
		});
		// Dharok's armour set: helm, platebody, platelegs, greataxe
		assertThat(sets).filteredOn(s -> s.getSetId() == 12877)
			.singleElement()
			.satisfies(s -> assertThat(s.getParts()).extracting(ItemSet.Part::getId)
				.containsExactlyInAnyOrder(4716, 4720, 4722, 4718));
	}

	@Test
	void loadsTaxExemptIds()
	{
		// Old school bond is tax exempt
		assertThat(ItemSetRepository.loadTaxExemptIds(gson)).contains(13190);
	}
}

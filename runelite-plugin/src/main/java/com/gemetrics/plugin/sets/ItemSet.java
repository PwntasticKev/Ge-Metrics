package com.gemetrics.plugin.sets;

import java.util.List;
import lombok.Value;

/** A Grand Exchange item set (e.g. Dharok's armour set) and the parts it exchanges into. */
@Value
public class ItemSet
{
	int setId;
	String name;
	List<Part> parts;

	@Value
	public static class Part
	{
		int id;
		int qty;
	}
}

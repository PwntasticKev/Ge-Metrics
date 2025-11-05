package com.gemetrics.plugin;

import lombok.Data;
import java.util.List;

@Data
public class TradeBatchRequest
{
	private String runeliteClientId;
	private String osrsUsername;
	private List<TradeEvent> trades;
}


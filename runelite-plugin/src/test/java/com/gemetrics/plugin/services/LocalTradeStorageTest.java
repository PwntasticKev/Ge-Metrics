package com.gemetrics.plugin.services;

import com.gemetrics.plugin.LocalTradeStorage;
import com.gemetrics.plugin.TradeEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class LocalTradeStorageTest
{
	@TempDir
	Path tempDir;
	
	private LocalTradeStorage storage;

	@BeforeEach
	void setUp()
	{
		// Create storage with temporary database
		storage = new TestLocalTradeStorage(tempDir);
	}

	@AfterEach
	void tearDown()
	{
		storage.shutdown();
	}

	@Test
	void shouldSaveAndLoadPendingTrades()
	{
		// Given
		TradeEvent trade = createTestTradeEvent();
		
		// When
		storage.savePendingTrade(trade);
		List<TradeEvent> loadedTrades = storage.loadPendingTrades();
		
		// Then
		assertThat(loadedTrades).hasSize(1);
		TradeEvent loaded = loadedTrades.get(0);
		assertThat(loaded.getRuneliteEventId()).isEqualTo(trade.getRuneliteEventId());
		assertThat(loaded.getItemName()).isEqualTo(trade.getItemName());
		assertThat(loaded.getPrice()).isEqualTo(trade.getPrice());
	}

	@Test
	void shouldRemovePendingTrade()
	{
		// Given
		TradeEvent trade = createTestTradeEvent();
		storage.savePendingTrade(trade);
		
		// When
		storage.removePendingTrade(trade.getRuneliteEventId());
		
		// Then
		List<TradeEvent> trades = storage.loadPendingTrades();
		assertThat(trades).isEmpty();
	}

	@Test
	void shouldUpdateTradeRetryInfo()
	{
		// Given
		TradeEvent trade = createTestTradeEvent();
		storage.savePendingTrade(trade);
		
		// When
		storage.updateTradeRetryInfo(trade.getRuneliteEventId(), 3, "Test error", Instant.now().plusSeconds(60));
		
		// Then
		// Trade still exists, but is held back from loading until its retry time
		assertThat(storage.getPendingTradeCount()).isEqualTo(1);
		assertThat(storage.loadPendingTrades()).isEmpty();
	}

	@Test
	void shouldSaveAndLoadSettings()
	{
		// Given
		String key = "test_setting";
		String value = "test_value";
		
		// When
		storage.saveSetting(key, value);
		String loaded = storage.loadSetting(key);
		
		// Then
		assertThat(loaded).isEqualTo(value);
	}

	@Test
	void shouldReturnNullForNonExistentSetting()
	{
		// When
		String value = storage.loadSetting("non_existent_key");
		
		// Then
		assertThat(value).isNull();
	}

	@Test
	void shouldGetPendingTradeCount()
	{
		// Given
		storage.savePendingTrade(createTestTradeEvent());
		storage.savePendingTrade(createTestTradeEvent("trade-2"));
		
		// When
		int count = storage.getPendingTradeCount();
		
		// Then
		assertThat(count).isEqualTo(2);
	}

	@Test
	void shouldKeepTradesNewerThanCleanupAge()
	{
		// Given
		storage.savePendingTrade(createTestTradeEvent());
		
		// When - cleanup trades older than 1 day
		storage.cleanupOldTrades(1);
		
		// Then - a trade saved just now survives
		assertThat(storage.getPendingTradeCount()).isEqualTo(1);
	}

	@Test
	void shouldHandleNullTradeGracefully()
	{
		// When - try to save null trade
		storage.savePendingTrade(null);
		
		// Then - should not crash
		List<TradeEvent> trades = storage.loadPendingTrades();
		assertThat(trades).isEmpty();
	}

	@Test
	void shouldHandleNullEventIdGracefully()
	{
		// When - try to remove with null ID
		storage.removePendingTrade(null);
		
		// Then - should not crash (no exception thrown)
		assertThat(storage.getPendingTradeCount()).isEqualTo(0);
	}

	private TradeEvent createTestTradeEvent()
	{
		return createTestTradeEvent("test-trade-id");
	}
	
	private TradeEvent createTestTradeEvent(String id)
	{
		TradeEvent trade = new TradeEvent();
		trade.setRuneliteEventId(id);
		trade.setItemId(554);
		trade.setItemName("Fire rune");
		trade.setOfferType("buy");
		trade.setPrice(5L);
		trade.setQuantity(1000);
		trade.setFilledQuantity(1000);
		trade.setRemainingQuantity(0);
		trade.setStatus("completed");
		trade.setTimestamp(Instant.now().toString());
		return trade;
	}

	// Test implementation that uses temporary directory
	private static class TestLocalTradeStorage extends LocalTradeStorage
	{
		TestLocalTradeStorage(Path tempDir)
		{
			super(tempDir.resolve("test-trades.db").toFile());
		}
	}
}
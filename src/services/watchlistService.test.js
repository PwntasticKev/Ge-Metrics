import { describe, it, expect, beforeEach } from 'vitest';
import watchlistService from './watchlistService';

// Test suite for Watchlist Service

describe('WatchlistService', () => {
  let mockUserId;
  let mockItemData;

  beforeEach(() => {
    watchlistService.watchlistItems.clear();
    watchlistService.nextId = 1;
    watchlistService.initializeMockData();

    mockUserId = 1;
    mockItemData = {
      item_id: 1234,
      item_name: 'Test Item',
      volume_threshold: 50000,
      price_drop_threshold: 1000,
      price_change_percentage: 20
    };
  });

  describe('Basic Watchlist Operations', () => {
    it('should initialize with mock data', () => {
      const items = watchlistService.getUserWatchlist(mockUserId);
      expect(items.length).toBe(3);
    });

    it('should add a new item to the watchlist', () => {
      const result = watchlistService.addToWatchlist(mockUserId, mockItemData);
      expect(result.success).toBe(true);
      expect(result.item).toBeDefined();
      expect(result.item.item_id).toBe(mockItemData.item_id);
      expect(result.item.item_name).toBe(mockItemData.item_name);
      expect(result.item.volume_threshold).toBe(mockItemData.volume_threshold);
      expect(result.item.price_drop_threshold).toBe(mockItemData.price_drop_threshold);
      expect(result.item.price_change_percentage).toBe(mockItemData.price_change_percentage);
      expect(watchlistService.getUserWatchlist(mockUserId).length).toBe(4);
    });

    it('should not add a duplicate item', () => {
      watchlistService.addToWatchlist(mockUserId, mockItemData);
      const result = watchlistService.addToWatchlist(mockUserId, mockItemData);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Item already in watchlist');
    });

    it('should remove an item from the watchlist', () => {
      watchlistService.addToWatchlist(mockUserId, mockItemData);
      const addedItemId = 4; // Next ID after initialization
      const removeResult = watchlistService.removeFromWatchlist(addedItemId);
      expect(removeResult.success).toBe(true);
      expect(watchlistService.getUserWatchlist(mockUserId).length).toBe(3);
    });

    it('should handle removing non-existent item', () => {
      const removeResult = watchlistService.removeFromWatchlist(999);
      expect(removeResult.success).toBe(false);
      expect(removeResult.error).toBe('Watchlist item not found');
    });

    it('should check if an item is in the watchlist', () => {
      watchlistService.addToWatchlist(mockUserId, mockItemData);
      const isInWatchlist = watchlistService.isItemInWatchlist(mockUserId, mockItemData.item_id);
      expect(isInWatchlist).toBe(true);
    });
  });

  describe('Watchlist Management', () => {
    it('should update thresholds for a watchlist item', () => {
      const addResult = watchlistService.addToWatchlist(mockUserId, mockItemData);
      const itemId = addResult.item.id;
      
      const updateResult = watchlistService.updateThresholds(itemId, {
        volume_threshold: 75000,
        price_drop_threshold: 1500
      });
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.item.volume_threshold).toBe(75000);
      expect(updateResult.item.price_drop_threshold).toBe(1500);
    });

    it('should get watchlist statistics', () => {
      const stats = watchlistService.getWatchlistStats(mockUserId);
      expect(stats.total).toBe(3);
      expect(stats.withVolumeThreshold).toBe(2);
      expect(stats.withPriceThreshold).toBe(2);
      expect(stats.withSmartDetection).toBe(1);
      expect(stats.mostRecent).toBeDefined();
    });

    it('should search watchlist items', () => {
      const searchResults = watchlistService.searchWatchlist(mockUserId, 'whip');
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].item_name).toBe('Abyssal whip');
    });

    it('should export watchlist data as JSON', () => {
      const exportData = watchlistService.exportWatchlist(mockUserId, 'json');
      const parsed = JSON.parse(exportData);
      expect(parsed.watchlist).toBeDefined();
      expect(parsed.watchlist.length).toBe(3);
      expect(parsed.stats).toBeDefined();
      expect(parsed.user_id).toBe(mockUserId);
    });

    it('should export watchlist data as CSV', () => {
      const csvData = watchlistService.exportWatchlist(mockUserId, 'csv');
      expect(csvData).toContain('Item ID,Item Name,Volume Threshold');
      expect(csvData).toContain('4151,Abyssal whip,10000');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors when adding items', () => {
      // Test with invalid data
      const result = watchlistService.addToWatchlist(mockUserId, null);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle errors when updating thresholds', () => {
      const result = watchlistService.updateThresholds(999, { volume_threshold: 1000 });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Watchlist item not found');
    });
  });
});


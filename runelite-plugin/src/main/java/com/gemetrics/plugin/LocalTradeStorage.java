package com.gemetrics.plugin;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import lombok.extern.slf4j.Slf4j;
import net.runelite.client.RuneLite;

import javax.inject.Singleton;
import java.io.File;
import java.sql.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

@Slf4j
@Singleton
public class LocalTradeStorage
{
	private static final String DB_NAME = "ge-metrics-trades.db";
	private static final int CURRENT_SCHEMA_VERSION = 1;
	
	private final Gson gson;
	private final ReentrantLock dbLock;
	private Connection connection;
	private final File dbFile;

	public LocalTradeStorage()
	{
		this.gson = new GsonBuilder().create();
		this.dbLock = new ReentrantLock();
		
		// Store database in RuneLite's config directory
		File runeliteDir = RuneLite.RUNELITE_DIR;
		this.dbFile = new File(runeliteDir, DB_NAME);
		
		initializeDatabase();
	}

	private void initializeDatabase()
	{
		try
		{
			// Create connection
			String dbUrl = "jdbc:sqlite:" + dbFile.getAbsolutePath();
			connection = DriverManager.getConnection(dbUrl);
			connection.setAutoCommit(false);
			
			log.info("Connected to SQLite database: {}", dbFile.getAbsolutePath());
			
			// Create tables if they don't exist
			createTables();
			
			// Run migrations if needed
			runMigrations();
			
		}
		catch (SQLException e)
		{
			log.error("Failed to initialize database", e);
			throw new RuntimeException("Database initialization failed", e);
		}
	}

	private void createTables() throws SQLException
	{
		dbLock.lock();
		try
		{
			// Pending trades table
			String createPendingTradesTable = """
				CREATE TABLE IF NOT EXISTS pending_trades (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					trade_data TEXT NOT NULL,
					created_at INTEGER NOT NULL,
					retry_count INTEGER DEFAULT 0,
					last_error TEXT,
					next_retry_at INTEGER
				)
			""";
			
			// Plugin settings table
			String createSettingsTable = """
				CREATE TABLE IF NOT EXISTS plugin_settings (
					key TEXT PRIMARY KEY,
					value TEXT NOT NULL,
					updated_at INTEGER NOT NULL
				)
			""";
			
			// Schema version table
			String createSchemaTable = """
				CREATE TABLE IF NOT EXISTS schema_version (
					version INTEGER PRIMARY KEY,
					applied_at INTEGER NOT NULL
				)
			""";

			try (Statement stmt = connection.createStatement())
			{
				stmt.execute(createPendingTradesTable);
				stmt.execute(createSettingsTable);
				stmt.execute(createSchemaTable);
				connection.commit();
			}
		}
		finally
		{
			dbLock.unlock();
		}
	}

	private void runMigrations() throws SQLException
	{
		int currentVersion = getSchemaVersion();
		
		if (currentVersion < CURRENT_SCHEMA_VERSION)
		{
			log.info("Running database migrations from version {} to {}", currentVersion, CURRENT_SCHEMA_VERSION);
			
			// Add future migrations here
			// For now, just update the version
			setSchemaVersion(CURRENT_SCHEMA_VERSION);
		}
	}

	private int getSchemaVersion() throws SQLException
	{
		String query = "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1";
		
		try (Statement stmt = connection.createStatement();
			 ResultSet rs = stmt.executeQuery(query))
		{
			if (rs.next())
			{
				return rs.getInt("version");
			}
			else
			{
				return 0; // No version set, assume initial
			}
		}
	}

	private void setSchemaVersion(int version) throws SQLException
	{
		String insert = "INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (?, ?)";
		
		try (PreparedStatement stmt = connection.prepareStatement(insert))
		{
			stmt.setInt(1, version);
			stmt.setLong(2, Instant.now().getEpochSecond());
			stmt.executeUpdate();
			connection.commit();
		}
	}

	public void savePendingTrade(TradeEvent trade)
	{
		if (trade == null) return;
		
		dbLock.lock();
		try
		{
			String tradeJson = gson.toJson(trade);
			String insert = """
				INSERT INTO pending_trades (trade_data, created_at)
				VALUES (?, ?)
			""";
			
			try (PreparedStatement stmt = connection.prepareStatement(insert))
			{
				stmt.setString(1, tradeJson);
				stmt.setLong(2, Instant.now().getEpochSecond());
				stmt.executeUpdate();
				connection.commit();
				
				log.debug("Saved pending trade to database: {}", trade.getRuneliteEventId());
			}
		}
		catch (SQLException e)
		{
			log.error("Failed to save pending trade", e);
			try
			{
				connection.rollback();
			}
			catch (SQLException rollbackEx)
			{
				log.error("Failed to rollback transaction", rollbackEx);
			}
		}
		finally
		{
			dbLock.unlock();
		}
	}

	public List<TradeEvent> loadPendingTrades()
	{
		List<TradeEvent> trades = new ArrayList<>();
		
		dbLock.lock();
		try
		{
			String query = """
				SELECT trade_data, retry_count, next_retry_at 
				FROM pending_trades
				WHERE next_retry_at IS NULL OR next_retry_at <= ?
				ORDER BY created_at ASC
			""";
			
			try (PreparedStatement stmt = connection.prepareStatement(query))
			{
				stmt.setLong(1, Instant.now().getEpochSecond());
				
				try (ResultSet rs = stmt.executeQuery())
				{
					while (rs.next())
					{
						String tradeJson = rs.getString("trade_data");
						TradeEvent trade = gson.fromJson(tradeJson, TradeEvent.class);
						trades.add(trade);
					}
				}
			}
			
			log.debug("Loaded {} pending trades from database", trades.size());
		}
		catch (SQLException e)
		{
			log.error("Failed to load pending trades", e);
		}
		finally
		{
			dbLock.unlock();
		}
		
		return trades;
	}

	public void removePendingTrade(String runeliteEventId)
	{
		if (runeliteEventId == null) return;
		
		dbLock.lock();
		try
		{
			String delete = "DELETE FROM pending_trades WHERE json_extract(trade_data, '$.runeliteEventId') = ?";
			
			try (PreparedStatement stmt = connection.prepareStatement(delete))
			{
				stmt.setString(1, runeliteEventId);
				int deleted = stmt.executeUpdate();
				connection.commit();
				
				if (deleted > 0)
				{
					log.debug("Removed pending trade from database: {}", runeliteEventId);
				}
			}
		}
		catch (SQLException e)
		{
			log.error("Failed to remove pending trade", e);
			try
			{
				connection.rollback();
			}
			catch (SQLException rollbackEx)
			{
				log.error("Failed to rollback transaction", rollbackEx);
			}
		}
		finally
		{
			dbLock.unlock();
		}
	}

	public void updateTradeRetryInfo(String runeliteEventId, int retryCount, String lastError, Instant nextRetryAt)
	{
		dbLock.lock();
		try
		{
			String update = """
				UPDATE pending_trades 
				SET retry_count = ?, last_error = ?, next_retry_at = ?
				WHERE json_extract(trade_data, '$.runeliteEventId') = ?
			""";
			
			try (PreparedStatement stmt = connection.prepareStatement(update))
			{
				stmt.setInt(1, retryCount);
				stmt.setString(2, lastError);
				stmt.setLong(3, nextRetryAt != null ? nextRetryAt.getEpochSecond() : null);
				stmt.setString(4, runeliteEventId);
				stmt.executeUpdate();
				connection.commit();
			}
		}
		catch (SQLException e)
		{
			log.error("Failed to update trade retry info", e);
			try
			{
				connection.rollback();
			}
			catch (SQLException rollbackEx)
			{
				log.error("Failed to rollback transaction", rollbackEx);
			}
		}
		finally
		{
			dbLock.unlock();
		}
	}

	public void saveSetting(String key, String value)
	{
		if (key == null || value == null) return;
		
		dbLock.lock();
		try
		{
			String upsert = """
				INSERT OR REPLACE INTO plugin_settings (key, value, updated_at)
				VALUES (?, ?, ?)
			""";
			
			try (PreparedStatement stmt = connection.prepareStatement(upsert))
			{
				stmt.setString(1, key);
				stmt.setString(2, value);
				stmt.setLong(3, Instant.now().getEpochSecond());
				stmt.executeUpdate();
				connection.commit();
			}
		}
		catch (SQLException e)
		{
			log.error("Failed to save setting", e);
			try
			{
				connection.rollback();
			}
			catch (SQLException rollbackEx)
			{
				log.error("Failed to rollback transaction", rollbackEx);
			}
		}
		finally
		{
			dbLock.unlock();
		}
	}

	public String loadSetting(String key)
	{
		if (key == null) return null;
		
		dbLock.lock();
		try
		{
			String query = "SELECT value FROM plugin_settings WHERE key = ?";
			
			try (PreparedStatement stmt = connection.prepareStatement(query))
			{
				stmt.setString(1, key);
				
				try (ResultSet rs = stmt.executeQuery())
				{
					if (rs.next())
					{
						return rs.getString("value");
					}
				}
			}
		}
		catch (SQLException e)
		{
			log.error("Failed to load setting", e);
		}
		finally
		{
			dbLock.unlock();
		}
		
		return null;
	}

	public void cleanupOldTrades(int maxAgeDays)
	{
		dbLock.lock();
		try
		{
			long cutoffTime = Instant.now().getEpochSecond() - (maxAgeDays * 24 * 60 * 60);
			String delete = "DELETE FROM pending_trades WHERE created_at < ?";
			
			try (PreparedStatement stmt = connection.prepareStatement(delete))
			{
				stmt.setLong(1, cutoffTime);
				int deleted = stmt.executeUpdate();
				connection.commit();
				
				if (deleted > 0)
				{
					log.info("Cleaned up {} old pending trades", deleted);
				}
			}
		}
		catch (SQLException e)
		{
			log.error("Failed to cleanup old trades", e);
			try
			{
				connection.rollback();
			}
			catch (SQLException rollbackEx)
			{
				log.error("Failed to rollback transaction", rollbackEx);
			}
		}
		finally
		{
			dbLock.unlock();
		}
	}

	public int getPendingTradeCount()
	{
		dbLock.lock();
		try
		{
			String query = "SELECT COUNT(*) FROM pending_trades";
			
			try (Statement stmt = connection.createStatement();
				 ResultSet rs = stmt.executeQuery(query))
			{
				if (rs.next())
				{
					return rs.getInt(1);
				}
			}
		}
		catch (SQLException e)
		{
			log.error("Failed to get pending trade count", e);
		}
		finally
		{
			dbLock.unlock();
		}
		
		return 0;
	}

	public void shutdown()
	{
		dbLock.lock();
		try
		{
			if (connection != null && !connection.isClosed())
			{
				connection.close();
				log.info("Database connection closed");
			}
		}
		catch (SQLException e)
		{
			log.error("Error closing database connection", e);
		}
		finally
		{
			dbLock.unlock();
		}
	}
}
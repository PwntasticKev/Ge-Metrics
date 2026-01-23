package com.gemetrics.plugin;

import lombok.extern.slf4j.Slf4j;
import net.runelite.client.Notifier;
import net.runelite.client.ui.ClientToolbar;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.swing.*;
import java.awt.*;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;

@Slf4j
@Singleton
public class NotificationService
{
	public enum NotificationType
	{
		SUCCESS("Success", new Color(34, 139, 34)),
		WARNING("Warning", new Color(255, 165, 0)),
		ERROR("Error", new Color(220, 20, 60)),
		INFO("Info", new Color(70, 130, 180));
		
		private final String displayName;
		private final Color color;
		
		NotificationType(String displayName, Color color)
		{
			this.displayName = displayName;
			this.color = color;
		}
		
		public String getDisplayName() { return displayName; }
		public Color getColor() { return color; }
	}

	public static class Notification
	{
		private final NotificationType type;
		private final String title;
		private final String message;
		private final Instant timestamp;
		private final String actionText;
		private final Runnable action;
		
		public Notification(NotificationType type, String title, String message)
		{
			this(type, title, message, null, null);
		}
		
		public Notification(NotificationType type, String title, String message, String actionText, Runnable action)
		{
			this.type = type;
			this.title = title;
			this.message = message;
			this.timestamp = Instant.now();
			this.actionText = actionText;
			this.action = action;
		}
		
		// Getters
		public NotificationType getType() { return type; }
		public String getTitle() { return title; }
		public String getMessage() { return message; }
		public Instant getTimestamp() { return timestamp; }
		public String getActionText() { return actionText; }
		public Runnable getAction() { return action; }
		public boolean hasAction() { return action != null; }
	}

	@Inject
	private Notifier runeliteNotifier;
	
	@Inject
	private ClientToolbar clientToolbar;

	private final ConcurrentLinkedQueue<Notification> recentNotifications;
	private GeMetricsPanel panel;
	private static final int MAX_RECENT_NOTIFICATIONS = 50;

	public NotificationService()
	{
		this.recentNotifications = new ConcurrentLinkedQueue<>();
	}

	public void setPanel(GeMetricsPanel panel)
	{
		this.panel = panel;
	}

	public void showSuccess(String title, String message)
	{
		showNotification(new Notification(NotificationType.SUCCESS, title, message));
	}

	public void showWarning(String title, String message)
	{
		showNotification(new Notification(NotificationType.WARNING, title, message));
	}

	public void showError(String title, String message)
	{
		showNotification(new Notification(NotificationType.ERROR, title, message));
	}

	public void showError(String title, String message, String actionText, Runnable action)
	{
		showNotification(new Notification(NotificationType.ERROR, title, message, actionText, action));
	}

	public void showInfo(String title, String message)
	{
		showNotification(new Notification(NotificationType.INFO, title, message));
	}

	public void showRetryableError(String title, String message, Runnable retryAction)
	{
		showNotification(new Notification(NotificationType.ERROR, title, message, "Retry", retryAction));
	}

	private void showNotification(Notification notification)
	{
		// Add to recent notifications queue
		recentNotifications.offer(notification);
		
		// Keep only recent notifications
		while (recentNotifications.size() > MAX_RECENT_NOTIFICATIONS)
		{
			recentNotifications.poll();
		}
		
		// Update panel if available
		if (panel != null)
		{
			SwingUtilities.invokeLater(() -> panel.updateNotificationStatus(notification));
		}
		
		// Show RuneLite notification for important messages
		if (notification.getType() == NotificationType.ERROR || 
			notification.getType() == NotificationType.SUCCESS)
		{
			String fullMessage = notification.getTitle() + ": " + notification.getMessage();
			runeliteNotifier.notify(fullMessage);
		}
		
		// Log all notifications
		logNotification(notification);
	}

	private void logNotification(Notification notification)
	{
		String logMessage = String.format("[%s] %s: %s", 
			notification.getType().getDisplayName(),
			notification.getTitle(),
			notification.getMessage());
			
		switch (notification.getType())
		{
			case SUCCESS:
			case INFO:
				log.info(logMessage);
				break;
			case WARNING:
				log.warn(logMessage);
				break;
			case ERROR:
				log.error(logMessage);
				break;
		}
	}

	public List<Notification> getRecentNotifications()
	{
		return new ArrayList<>(recentNotifications);
	}

	public void clearNotifications()
	{
		recentNotifications.clear();
		if (panel != null)
		{
			SwingUtilities.invokeLater(() -> panel.clearNotifications());
		}
	}

	// Specific notification methods for common scenarios
	
	public void showConnectionError()
	{
		showError("Connection Failed", 
			"Unable to reach GE-Metrics server. Trades will be queued locally.",
			"Retry Now", 
			this::triggerManualSync);
	}

	public void showAuthenticationError()
	{
		showError("Authentication Failed", 
			"Your session has expired. Please login again to sync trades.",
			"Login", 
			this::triggerReLogin);
	}

	public void showRateLimitError(long retryAfterSeconds)
	{
		String message = String.format("Rate limit exceeded. Retrying in %d seconds.", retryAfterSeconds);
		showWarning("Rate Limited", message);
	}

	public void showSyncSuccess(int tradeCount)
	{
		if (tradeCount > 0)
		{
			showSuccess("Sync Complete", 
				String.format("Successfully synced %d trade%s", tradeCount, tradeCount == 1 ? "" : "s"));
		}
	}

	public void showSyncQueued(int queueSize)
	{
		showInfo("Trades Queued", 
			String.format("%d trade%s queued for sync", queueSize, queueSize == 1 ? "" : "s"));
	}

	public void showTradeDetected(String itemName, String offerType)
	{
		showInfo("Trade Detected", 
			String.format("%s %s tracked", offerType.substring(0, 1).toUpperCase() + offerType.substring(1), itemName));
	}

	public void showDatabaseError()
	{
		showError("Database Error", 
			"Local storage error. Some trades may not be saved.",
			"View Logs",
			() -> log.info("Database error - check RuneLite logs"));
	}

	public void showLoginSuccess(String email)
	{
		showSuccess("Login Successful", "Logged in as " + email);
	}

	public void showLogoutSuccess()
	{
		showInfo("Logged Out", "You have been logged out. Trades will be queued locally.");
	}

	// Callback methods for actions
	private void triggerManualSync()
	{
		// This will be called by TradeSyncService
		log.info("Manual sync triggered by user");
	}

	private void triggerReLogin()
	{
		// This will be called by AuthenticationService  
		log.info("Re-login triggered by user");
	}

	// Helper method to format notifications for display
	public static String formatNotificationTime(Instant timestamp)
	{
		LocalDateTime dateTime = LocalDateTime.ofInstant(timestamp, java.time.ZoneId.systemDefault());
		DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm:ss");
		return dateTime.format(formatter);
	}
}
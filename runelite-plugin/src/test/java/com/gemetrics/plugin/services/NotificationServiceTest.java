package com.gemetrics.plugin.services;

import com.gemetrics.plugin.NotificationService;
import net.runelite.client.Notifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest
{
	@Mock
	private Notifier mockNotifier;
	
	private NotificationService notificationService;

	@BeforeEach
	void setUp()
	{
		notificationService = new NotificationService();
		// Inject mock notifier via reflection or setter if available
		// For now, service will work without RuneLite notifier
	}

	@Test
	void shouldCreateSuccessNotification()
	{
		// When
		notificationService.showSuccess("Test Success", "Success message");
		
		// Then
		List<NotificationService.Notification> notifications = notificationService.getRecentNotifications();
		assertThat(notifications).hasSize(1);
		
		NotificationService.Notification notification = notifications.get(0);
		assertThat(notification.getType()).isEqualTo(NotificationService.NotificationType.SUCCESS);
		assertThat(notification.getTitle()).isEqualTo("Test Success");
		assertThat(notification.getMessage()).isEqualTo("Success message");
		assertThat(notification.hasAction()).isFalse();
	}

	@Test
	void shouldCreateErrorNotificationWithAction()
	{
		// Given
		boolean[] actionExecuted = {false};
		Runnable testAction = () -> actionExecuted[0] = true;
		
		// When
		notificationService.showError("Test Error", "Error message", "Retry", testAction);
		
		// Then
		List<NotificationService.Notification> notifications = notificationService.getRecentNotifications();
		assertThat(notifications).hasSize(1);
		
		NotificationService.Notification notification = notifications.get(0);
		assertThat(notification.getType()).isEqualTo(NotificationService.NotificationType.ERROR);
		assertThat(notification.getTitle()).isEqualTo("Test Error");
		assertThat(notification.getMessage()).isEqualTo("Error message");
		assertThat(notification.hasAction()).isTrue();
		assertThat(notification.getActionText()).isEqualTo("Retry");
		
		// Test action execution
		notification.getAction().run();
		assertThat(actionExecuted[0]).isTrue();
	}

	@Test
	void shouldCreateWarningNotification()
	{
		// When
		notificationService.showWarning("Test Warning", "Warning message");
		
		// Then
		List<NotificationService.Notification> notifications = notificationService.getRecentNotifications();
		assertThat(notifications).hasSize(1);
		
		NotificationService.Notification notification = notifications.get(0);
		assertThat(notification.getType()).isEqualTo(NotificationService.NotificationType.WARNING);
		assertThat(notification.getTitle()).isEqualTo("Test Warning");
		assertThat(notification.getMessage()).isEqualTo("Warning message");
	}

	@Test
	void shouldCreateInfoNotification()
	{
		// When
		notificationService.showInfo("Test Info", "Info message");
		
		// Then
		List<NotificationService.Notification> notifications = notificationService.getRecentNotifications();
		assertThat(notifications).hasSize(1);
		
		NotificationService.Notification notification = notifications.get(0);
		assertThat(notification.getType()).isEqualTo(NotificationService.NotificationType.INFO);
		assertThat(notification.getTitle()).isEqualTo("Test Info");
		assertThat(notification.getMessage()).isEqualTo("Info message");
	}

	@Test
	void shouldLimitRecentNotifications()
	{
		// When - add more notifications than the limit (50)
		for (int i = 0; i < 60; i++)
		{
			notificationService.showInfo("Test " + i, "Message " + i);
		}
		
		// Then - should only keep the most recent 50
		List<NotificationService.Notification> notifications = notificationService.getRecentNotifications();
		assertThat(notifications).hasSize(50);
		
		// Should have the most recent notifications (10-59)
		NotificationService.Notification first = notifications.get(0);
		assertThat(first.getTitle()).isEqualTo("Test 10"); // Oldest kept
		
		NotificationService.Notification last = notifications.get(49);
		assertThat(last.getTitle()).isEqualTo("Test 59"); // Most recent
	}

	@Test
	void shouldClearNotifications()
	{
		// Given
		notificationService.showInfo("Test", "Message");
		assertThat(notificationService.getRecentNotifications()).hasSize(1);
		
		// When
		notificationService.clearNotifications();
		
		// Then
		assertThat(notificationService.getRecentNotifications()).isEmpty();
	}

	@Test
	void shouldCreateSpecificNotificationTypes()
	{
		// Test specific notification methods
		notificationService.showConnectionError();
		notificationService.showAuthenticationError();
		notificationService.showRateLimitError(60);
		notificationService.showSyncSuccess(5);
		notificationService.showSyncQueued(3);
		notificationService.showTradeDetected("Dragon bones", "sell");
		notificationService.showDatabaseError();
		notificationService.showLoginSuccess("user@test.com");
		notificationService.showLogoutSuccess();
		
		// Should have created 9 notifications
		List<NotificationService.Notification> notifications = notificationService.getRecentNotifications();
		assertThat(notifications).hasSize(9);
	}

	@Test
	void shouldFormatNotificationTimeCorrectly()
	{
		// When
		String formattedTime = NotificationService.formatNotificationTime(
			java.time.Instant.parse("2026-01-20T15:30:45Z"));
		
		// Then - should be in HH:mm:ss format (will depend on system timezone)
		assertThat(formattedTime).matches("\\d{2}:\\d{2}:\\d{2}");
	}

	@Test
	void shouldGetNotificationTypeProperties()
	{
		// Test enum properties
		NotificationService.NotificationType success = NotificationService.NotificationType.SUCCESS;
		assertThat(success.getDisplayName()).isEqualTo("Success");
		assertThat(success.getColor()).isNotNull();
		
		NotificationService.NotificationType error = NotificationService.NotificationType.ERROR;
		assertThat(error.getDisplayName()).isEqualTo("Error");
		assertThat(error.getColor()).isNotNull();
	}
}
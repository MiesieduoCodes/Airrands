import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Enhanced notification configuration
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;
  
  // Check if we're in Expo Go (which doesn't support push notifications in SDK 53+)
  if (Constants.appOwnership === 'expo') {
    console.warn('Push notifications are not supported in Expo Go. Use a development build instead.');
    return undefined;
  }
  
  if (Device.isDevice) {
    try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      }
    
    if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return undefined;
    }
    
    // Get project ID from app.json
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error('No project ID found in app.json');
        return undefined;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    })).data;
    
    } catch (error) {
      console.error('Error getting push token:', error);
      return undefined;
    }
  } else {
    console.warn('Must use physical device for push notifications');
    }

  // Configure Android notification channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Orders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Payments',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9800',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('errands', {
      name: 'Errands',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2196F3',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
    
    }

  return token;
}

// Enhanced background notification handler
export async function handleBackgroundNotification(notification: Notifications.Notification) {
  try {
    const data = notification.request.content.data;
    const title = notification.request.content.title;
    const body = notification.request.content.body;
    
    // Update badge count
    const currentBadge = await Notifications.getBadgeCountAsync();
    await Notifications.setBadgeCountAsync(currentBadge + 1);
    
    // You can perform additional background tasks here
    // For example:
    // - Save notification to local storage
    // - Update app state
    // - Sync data with server
    // - Trigger other background processes
    
    } catch (error) {
    console.error('❌ Error processing background notification:', error);
  }
}

// Enhanced notification response handler
export async function handleNotificationResponse(response: Notifications.NotificationResponse) {
  try {
    const data = response.notification.request.content.data;
    const action = response.actionIdentifier;
    
    // Clear badge count when user interacts with notification
    await Notifications.setBadgeCountAsync(0);
    
    // Return structured response for navigation handling
    return {
      type: data.type || 'general',
      action,
      data,
      notification: response.notification.request.content,
    };
    
  } catch (error) {
    console.error('❌ Error handling notification response:', error);
    return null;
  }
}

// Utility function to check notification permissions
export async function checkNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('❌ Error checking notification permissions:', error);
    return false;
  }
}

// Utility function to request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    return false;
  }
}

// Utility function to get current badge count
export async function getCurrentBadgeCount(): Promise<number> {
  try {
    const count = await Notifications.getBadgeCountAsync();
    return count;
  } catch (error) {
    console.error('❌ Error getting badge count:', error);
    return 0;
  }
}

// Utility function to clear badge count
export async function clearBadgeCount(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
    } catch (error) {
    console.error('❌ Error clearing badge count:', error);
  }
}

// Utility function to schedule a local notification
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any,
  delayInSeconds?: number
): Promise<string | null> {
  try {
    const notificationContent: Notifications.NotificationContentInput = {
      title,
      body,
      data: data || {},
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      vibrate: [0, 250, 250, 250],
    };

    const trigger = delayInSeconds ? ({ type: 'timeInterval', seconds: delayInSeconds } as Notifications.TimeIntervalTriggerInput) : null;
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger,
    });

    return notificationId;
  } catch (error) {
    console.error('❌ Error scheduling local notification:', error);
    return null;
  }
}

// Utility function to cancel all scheduled notifications
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
    console.error('❌ Error cancelling scheduled notifications:', error);
  }
}

// Utility function to cancel a specific notification
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
    console.error('❌ Error cancelling notification:', error);
  }
} 
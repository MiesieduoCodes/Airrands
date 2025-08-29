import * as Notifications from 'expo-notifications';
import { NavigationContainerRef } from '@react-navigation/native';

// Global navigation reference
let navigationRef: NavigationContainerRef<any> | null = null;

// Set navigation reference
export const setNavigationRef = (ref: NavigationContainerRef<any>) => {
  navigationRef = ref;
};

// Handle notification response and navigate accordingly
export const handleNotificationNavigation = (response: Notifications.NotificationResponse) => {
  try {
    const data = response.notification.request.content.data;
    const notificationType = data?.type;

    if (!navigationRef) {
      console.log('Navigation ref not set, cannot handle notification navigation');
      return;
    }

    switch (notificationType) {
      case 'message':
        // Navigate to Messages screen for message notifications
        navigationRef.navigate('BuyerApp', {
          screen: 'Messages'
        });
        break;
        
      case 'errand_request':
      case 'errand_created':
        // Navigate to Orders screen for errand notifications
        navigationRef.navigate('BuyerApp', {
          screen: 'Orders'
        });
        break;
        
      case 'order_update':
      case 'order_created':
        // Navigate to Orders screen for order notifications
        navigationRef.navigate('BuyerApp', {
          screen: 'Orders'
        });
        break;
        
      default:
        // For other notifications, navigate to Home screen
        navigationRef.navigate('BuyerApp', {
          screen: 'Home'
        });
        break;
    }

    console.log(`Navigated to appropriate screen for notification type: ${notificationType}`);
  } catch (error) {
    console.error('Error handling notification navigation:', error);
  }
};

// Set up notification response listener
export const setupNotificationNavigation = () => {
  const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationNavigation);
  return subscription;
};


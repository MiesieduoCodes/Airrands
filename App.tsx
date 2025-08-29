import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { registerForPushNotificationsAsync } from './src/utils/notifications';
import * as Notifications from 'expo-notifications';
import { useRef, useEffect } from 'react';
import OfflineBanner from './src/components/OfflineBanner';
import { db } from './src/config/firebase';
import { Snackbar } from 'react-native-paper';
import firebase from 'firebase/compat/app';
import { useColorScheme } from 'react-native';
import { NotificationService, sendPushNotification } from './src/services/notificationService';
import { RunnerAvailabilityProvider } from './src/contexts/RunnerAvailabilityContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import { setNavigationRef, setupNotificationNavigation } from './src/utils/notificationNavigation';

// Enhanced notification handler for background notifications
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Handle background notification processing
    if (notification.request.trigger) {
      // You can perform background tasks here
      // For example, update local storage, sync data, etc.
      try {
        const data = notification.request.content.data;
        const title = notification.request.content.title;
        const body = notification.request.content.body;
        
        // Update badge count
        const currentBadge = await NotificationService.getBadgeCountAsync();
        await NotificationService.setBadgeCountAsync(currentBadge + 1);
        
      } catch (error) {
        // Silent error handling for production
      }
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

const AppContent = () => {
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationSuccess, setNotificationSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync().then(token => {
        if (!token) {
          // Don't show error for Expo Go, just log it
          console.log('Push notifications not available (likely using Expo Go)');
          return;
        }
        
        setNotificationSuccess('Notifications enabled successfully!');
        
        try {
          // Save token to Firestore under the user document for all roles
          if (user.uid) {
            db.collection('users').doc(user.uid).update({ 
              expoPushToken: token,
              tokenUpdatedAt: new Date().toISOString(),
              notificationEnabled: true,
            }).then(() => {
              // Token saved successfully
            }).catch((err: any) => {
              console.error('Failed to save notification token:', err);
              // Don't show error to user for token saving failures
            });
          }
        } catch (error) {
          console.error('Failed to save notification settings:', error);
          // Don't show error to user for token saving failures
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setNotificationSuccess(null), 3000);
      }).catch((error) => {
        console.error('Failed to register for notifications:', error);
        // Don't show error to user for notification registration failures
      });
    }
  }, [user]);

  useEffect(() => {
    // Handle notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Update badge count
      NotificationService.getBadgeCountAsync().then(count => {
        NotificationService.setBadgeCountAsync(count + 1);
      });
      
      // Show success message for foreground notifications
      setNotificationSuccess('New notification received!');
      setTimeout(() => setNotificationSuccess(null), 3000);
    });

    // Handle user tapping on notification (both foreground and background)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const action = response.actionIdentifier;
      
      // Clear badge count when user interacts with notification
      NotificationService.clearBadgeCountAsync();
      
      // Handle different notification types and actions
      if (data.type === 'order') {
        setNotificationSuccess('Opening order details...');
      } else if (data.type === 'message') {
        setNotificationSuccess('Opening chat...');
      } else if (data.type === 'payment') {
        setNotificationSuccess('Opening payment details...');
      } else if (data.type === 'errand') {
        setNotificationSuccess('Opening errand details...');
      }
      
      // Handle specific actions
      if (action === 'view-order' && data.orderId) {
        // Handle view order
      } else if (action === 'accept-order' && data.orderId) {
        // Handle accept order
      } else if (action === 'decline-order' && data.orderId) {
        // Handle decline order
      } else if (action === 'reply' && data.chatId) {
        // Handle reply to chat
      } else if (action === 'view-chat' && data.chatId) {
        // Handle view chat
      } else if (action === 'view-payment' && data.paymentId) {
        // Handle view payment
      } else if (action === 'view-errand' && data.errandId) {
        // Handle view errand
      } else if (action === 'accept-errand' && data.errandId) {
        // Handle accept errand
      }
      
      // Clear success message after 2 seconds
      setTimeout(() => setNotificationSuccess(null), 2000);
    });

    // Set up notification navigation
    const navigationSubscription = setupNotificationNavigation();

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      if (navigationSubscription) {
        Notifications.removeNotificationSubscription(navigationSubscription);
      }
    };
  }, []);
  
  useEffect(() => {
    const updateLastSeen = async () => {
      if (user) {
        try {
          await db.collection('users').doc(user.uid).update({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            isOnline: true,
          });
        } catch (err: any) {
          // Silent error handling for production
        }
      }
    };
    
    updateLastSeen();
    
    // Set up periodic online status updates
    const onlineInterval = setInterval(updateLastSeen, 30000); // Every 30 seconds
    
    return () => {
      clearInterval(onlineInterval);
      // Set user as offline when component unmounts
      if (user) {
        db.collection('users').doc(user.uid).update({
          isOnline: false,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {
          // Silent error handling for production
        });
      }
    };
  }, [user]);
  
  return (
    <>
      <OfflineBanner />
      
      {/* Error Snackbar */}
      <Snackbar
        visible={!!notificationError}
        onDismiss={() => setNotificationError(null)}
        duration={6000}
        action={{ 
          label: 'OK', 
          onPress: () => setNotificationError(null) 
        }}
        style={{ backgroundColor: theme.colors.error }}
      >
        {notificationError}
      </Snackbar>
      
      {/* Success Snackbar */}
      <Snackbar
        visible={!!notificationSuccess}
        onDismiss={() => setNotificationSuccess(null)}
        duration={3000}
        style={{ backgroundColor: theme.colors.primary }}
      >
        {notificationSuccess}
      </Snackbar>
      
      <PaperProvider theme={theme}>
        <NavigationContainer ref={setNavigationRef}>
          <StatusBar style={isDarkMode ? 'light' : 'dark'} />
          <RootNavigator />
        </NavigationContainer>
      </PaperProvider>
    </>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <RunnerAvailabilityProvider>
                <NotificationProvider>
                  <AppContent />
                </NotificationProvider>
              </RunnerAvailabilityProvider>
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;

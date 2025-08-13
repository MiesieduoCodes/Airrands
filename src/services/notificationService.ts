import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db } from '../config/firebase';
import firebase from 'firebase/compat/app';

// Configure notification behavior for background and foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    
    // Handle background notifications
    if (notification.request.trigger) {
      // You can perform background tasks here
      // For example, update local storage, sync data, etc.
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

// Configure notification categories for different types of notifications
const configureNotificationCategories = async () => {
  if (Platform.OS === 'ios') {
    await Notifications.setNotificationCategoryAsync('order-update', [
      {
        identifier: 'view-order',
        buttonTitle: 'View Order',
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: 'accept-order',
        buttonTitle: 'Accept',
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: 'decline-order',
        buttonTitle: 'Decline',
        options: {
          isDestructive: true,
          isAuthenticationRequired: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('message', [
      {
        identifier: 'reply',
        buttonTitle: 'Reply',
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: 'view-chat',
        buttonTitle: 'View Chat',
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('payment', [
      {
        identifier: 'view-payment',
        buttonTitle: 'View Details',
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('errand', [
      {
        identifier: 'view-errand',
        buttonTitle: 'View Errand',
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: 'accept-errand',
        buttonTitle: 'Accept',
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
    ]);
  }
};

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'verification' | 'order' | 'payment' | 'general' | 'errand' | 'message';
  status: 'unread' | 'read';
  createdAt: any;
  data?: any;
}

export class NotificationService {
  static async registerForPushNotificationsAsync() {
    let token;

    // Configure notification categories
    await configureNotificationCategories();

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

      // Create specific channels for different notification types
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

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return null;
      }
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: '', // Your actual project ID
      })).data;
    } else {
      }

    return token;
  }

  static async scheduleLocalNotification(
    title: string, 
    body: string, 
    data?: any, 
    category?: string,
    channelId?: string
  ) {
    try {
      const notificationContent: Notifications.NotificationContentInput = {
        title,
        body,
        data: data || {},
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
      };

      if (category) {
        notificationContent.categoryIdentifier = category;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Send immediately
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  static async scheduleOrderNotification(
    orderId: string,
    title: string,
    body: string,
    data?: any
  ) {
    return this.scheduleLocalNotification(
      title,
      body,
      { ...data, orderId, type: 'order' },
      'order-update',
      'orders'
    );
  }

  static async scheduleMessageNotification(
    chatId: string,
    senderName: string,
    message: string,
    data?: any
  ) {
    return this.scheduleLocalNotification(
      `Message from ${senderName}`,
      message,
      { ...data, chatId, type: 'message' },
      'message',
      'messages'
    );
  }

  static async schedulePaymentNotification(
    paymentId: string,
    title: string,
    body: string,
    data?: any
  ) {
    return this.scheduleLocalNotification(
      title,
      body,
      { ...data, paymentId, type: 'payment' },
      'payment',
      'payments'
    );
  }

  static async scheduleErrandNotification(
    errandId: string,
    title: string,
    body: string,
    data?: any
  ) {
    return this.scheduleLocalNotification(
      title,
      body,
      { ...data, errandId, type: 'errand' },
      'errand',
      'errands'
    );
  }

  static async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  static async cancelNotification(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  static addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  static addNotificationResponseReceivedListener(listener: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  static async getBadgeCountAsync(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  static async setBadgeCountAsync(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  static async clearBadgeCountAsync(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge count:', error);
    }
  }

  // Enhanced background notification handling
  static async handleBackgroundNotification(notification: Notifications.Notification) {
    
    const data = notification.request.content.data;
    const title = notification.request.content.title;
    const body = notification.request.content.body;
    
    // Save notification to local storage or perform background tasks
    try {
      // You can save to AsyncStorage here for offline access
      // await AsyncStorage.setItem('lastNotification', JSON.stringify({ title, body, data }));
      
      // Update badge count
      const currentBadge = await this.getBadgeCountAsync();
      await this.setBadgeCountAsync(currentBadge + 1);
      
    } catch (error) {
      console.error('Error processing background notification:', error);
    }
  }

  // Enhanced notification response handling
  static async handleNotificationResponse(response: Notifications.NotificationResponse) {
    
    const data = response.notification.request.content.data;
    const action = response.actionIdentifier;
    
    // Clear badge count when user interacts with notification
    await NotificationService.clearBadgeCountAsync();
    
    // Handle different notification types and actions
    switch (data.type) {
      case 'order':
        return { type: 'order', action, data };
      case 'message':
        return { type: 'message', action, data };
      case 'payment':
        return { type: 'payment', action, data };
      case 'errand':
        return { type: 'errand', action, data };
      default:
        return { type: 'general', action, data };
    }
  }
}

export const registerForPushNotifications = () => NotificationService.registerForPushNotificationsAsync();

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'order' | 'message' | 'payment' | 'system' | 'promo' | 'general' | 'verification' | 'errand' = 'general',
  data?: any
) => {
  try {
    const notificationData = {
      userId,
      title,
      message,
      type,
      status: 'unread',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      data: data || {},
    };

    const docRef = await db.collection('users').doc(userId).collection('notifications').add(notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const getUserNotifications = async (userId: string, limit: number = 50) => {
  try {
    
    const notificationsRef = db.collection('users').doc(userId).collection('notifications');
    const snapshot = await notificationsRef
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    if (snapshot.empty) {
      return [];
    }
    
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return notifications;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    // Return empty array on error to prevent crashes
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string, userId?: string) => {
  try {
    
    if (!userId) {
      console.error('No userId provided for markNotificationAsRead');
      return;
    }
    
    const notificationRef = db.collection('users').doc(userId).collection('notifications').doc(notificationId);
    const doc = await notificationRef.get();
    
    if (!doc.exists) {
      return;
    }
    
    await notificationRef.update({
      isRead: true,
      readAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    // Don't throw error to prevent crashes
  }
};

export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const batch = db.batch();
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .where('status', '==', 'unread')
      .get();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'read',
        isRead: true,
        readAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

export const deleteNotification = async (notificationId: string) => {
  try {
    // Find and delete the notification from all user collections
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const notificationRef = userDoc.ref.collection('notifications').doc(notificationId);
      const notificationDoc = await notificationRef.get();
      
      if (notificationDoc.exists) {
        await notificationRef.delete();
        break;
      }
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: any
) => {
  try {
    // Get user's push token
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.expoPushToken) {
      return;
    }

    // Send push notification via Expo
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: userData.expoPushToken,
        title,
        body,
        data: data || {},
        sound: 'default',
        priority: 'high',
        channelId: data?.type === 'order' ? 'orders' : 
                   data?.type === 'message' ? 'messages' : 
                   data?.type === 'payment' ? 'payments' : 
                   data?.type === 'errand' ? 'errands' : 'default',
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('Push notification errors:', result.errors);
      // Handle invalid tokens
      if (result.errors.some((error: any) => error.code === 'DeviceNotRegistered')) {
        await db.collection('users').doc(userId).update({
          expoPushToken: null,
          tokenUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
    } else {
      }
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

export const createVerificationNotification = async (
  userId: string,
  status: 'approved' | 'rejected',
  userRole: 'seller' | 'runner',
  notes?: string
) => {
  const title = `Verification ${status === 'approved' ? 'Approved' : 'Rejected'}`;
  const message = status === 'approved' 
    ? `Your ${userRole} verification has been approved! You can now start using the app.`
    : `Your ${userRole} verification was rejected. ${notes ? `Reason: ${notes}` : 'Please try again.'}`;

  return createNotification(userId, title, message, 'verification', {
    status,
    userRole,
    notes,
  });
};

export const getUnreadNotificationCount = async (userId: string) => {
  try {
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .where('status', '==', 'unread')
      .get();

    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Enhanced notification utilities
export const scheduleReminderNotification = async (
  userId: string,
  title: string,
  body: string,
  delayInSeconds: number,
  data?: any
) => {
  try {
    const notificationContent: Notifications.NotificationContentInput = {
      title,
      body,
      data: data || {},
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: {
        type: 'timeInterval',
        seconds: delayInSeconds,
      } as Notifications.TimeIntervalTriggerInput,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling reminder notification:', error);
    throw error;
  }
};

export const schedulePeriodicNotification = async (
  title: string,
  body: string,
  intervalInSeconds: number,
  data?: any
) => {
  try {
    const notificationContent: Notifications.NotificationContentInput = {
      title,
      body,
      data: data || {},
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: {
        type: 'timeInterval',
        seconds: intervalInSeconds,
        repeats: true,
      } as Notifications.TimeIntervalTriggerInput,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling periodic notification:', error);
    throw error;
  }
}; 

// Enhanced notification response handling with deep linking
export const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
  
  const data = response.notification.request.content.data;
  const action = response.actionIdentifier;
  
  // Clear badge count when user interacts with notification
  await NotificationService.clearBadgeCountAsync();
  
  // Handle different notification types and actions with deep linking
  switch (data.type) {
    case 'order':
      return { 
        type: 'order', 
        action, 
        data,
        navigateTo: 'OrderDetails',
        params: { orderId: data.orderId }
      };
    case 'message':
      return { 
        type: 'message', 
        action, 
        data,
        navigateTo: 'ChatScreen',
        params: { chatId: data.chatId }
      };
    case 'payment':
      return { 
        type: 'payment', 
        action, 
        data,
        navigateTo: 'PaymentDetails',
        params: { paymentId: data.paymentId }
      };
    case 'errand':
      return { 
        type: 'errand', 
        action, 
        data,
        navigateTo: 'ErrandDetails',
        params: { errandId: data.errandId }
      };
    default:
      return { 
        type: 'general', 
        action, 
        data,
        navigateTo: null,
        params: null
      };
  }
};

// Simple function to handle notification actions
export const handleNotificationAction = async (
  notificationData: any,
  navigation: any
) => {
  try {
    const { type, action, data, navigateTo, params } = notificationData;
    
    // Handle specific actions
    switch (action) {
      case 'view-order':
      case 'accept-order':
        if (data.orderId) {
          navigation.navigate('OrderDetails', { orderId: data.orderId });
        }
        break;
        
      case 'view-chat':
      case 'reply':
        if (data.chatId) {
          navigation.navigate('ChatScreen', { chatId: data.chatId });
        }
        break;
        
      case 'view-payment':
        if (data.paymentId) {
          navigation.navigate('PaymentDetails', { paymentId: data.paymentId });
        }
        break;
        
      case 'view-errand':
      case 'accept-errand':
        if (data.errandId) {
          navigation.navigate('ErrandDetails', { errandId: data.errandId });
        }
        break;
        
      default:
        // Default navigation based on type
        if (navigateTo && params) {
          navigation.navigate(navigateTo, params);
        }
        break;
    }
    
    // Mark notification as read
    if (data.notificationId) {
      await markNotificationAsRead(data.notificationId);
    }
    
  } catch (error) {
    console.error('Error handling notification action:', error);
  }
};

// Simple function to get user notification preferences
export const getUserNotificationPreferences = async (userId: string) => {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return {
        orders: true,
        messages: true,
        payments: true,
        errands: true,
        general: true,
      };
    }
    
    const userData = userDoc.data();
    return userData?.notificationPreferences || {
      orders: true,
      messages: true,
      payments: true,
      errands: true,
      general: true,
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return {
      orders: true,
      messages: true,
      payments: true,
      errands: true,
      general: true,
    };
  }
};

// Simple function to update user notification preferences
export const updateUserNotificationPreferences = async (
  userId: string,
  preferences: {
    orders: boolean;
    messages: boolean;
    payments: boolean;
    errands: boolean;
    general: boolean;
  }
) => {
  try {
    await db.collection('users').doc(userId).update({
      notificationPreferences: preferences,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

// Enhanced notification functions for specific app interactions

// Send notification when buyer places an order
export const sendOrderNotification = async (
  sellerId: string,
  buyerId: string,
  orderId: string,
  productName: string,
  amount: number,
  buyerName?: string
) => {
  try {
    // Notify seller about new order
    await sendPushNotification(
      sellerId,
      'New Order Received',
      `New order for ${productName} from ${buyerName || 'a customer'}`,
      {
        type: 'order',
        orderId,
        buyerId,
        buyerName,
        productName,
        amount,
      }
    );

    // Notify buyer about order confirmation
    await sendPushNotification(
      buyerId,
      'Order Confirmed',
      `Your order for ${productName} has been confirmed and is being prepared.`,
      {
        type: 'order',
        orderId,
        sellerId,
        productName,
        amount,
      }
    );

    // Save in-app notifications
    await Promise.all([
      // Seller notification
      db.collection('users').doc(sellerId)
        .collection('notifications').add({
          title: 'New Order Received',
          message: `New order for ${productName} from ${buyerName || 'a customer'}`,
          type: 'order',
          isRead: false,
          createdAt: new Date().toISOString(),
          orderId,
          buyerId,
          buyerName,
        }),
      
      // Buyer notification
      db.collection('users').doc(buyerId)
        .collection('notifications').add({
          title: 'Order Confirmed',
          message: `Your order for ${productName} has been confirmed and is being prepared.`,
          type: 'order',
          isRead: false,
          createdAt: new Date().toISOString(),
          orderId,
          sellerId,
          productName,
        })
    ]);

  } catch (error) {
    console.error('Error sending order notifications:', error);
    throw error;
  }
};

// Send notification when buyer requests an errand
export const sendErrandRequestNotification = async (
  runnerId: string,
  buyerId: string,
  errandId: string,
  errandTitle: string,
  location: string,
  buyerName?: string,
  runnerName?: string
) => {
  try {
    // Notify runner about new errand request
    await sendPushNotification(
      runnerId,
      'New Errand Request',
      `${buyerName || 'A buyer'} requested: "${errandTitle}" at ${location}.`,
      {
        type: 'errand',
        errandId,
        buyerId,
        buyerName,
        status: 'requested'
      }
    );

    // Notify buyer that errand request was sent
    await sendPushNotification(
      buyerId,
      'Errand Request Sent',
      `Your request "${errandTitle}" to ${runnerName || 'a runner'} was sent!`,
      {
        type: 'errand',
        errandId,
        runnerId,
        runnerName,
        status: 'requested'
      }
    );

    // Save in-app notifications
    await Promise.all([
      // Runner notification
      db.collection('users').doc(runnerId)
        .collection('notifications').add({
          title: 'New Errand Request',
          message: `${buyerName || 'A buyer'} requested: "${errandTitle}" at ${location}.`,
          type: 'errand',
          isRead: false,
          createdAt: new Date().toISOString(),
          errandId,
          buyerId,
          buyerName,
        }),
      
      // Buyer notification
      db.collection('users').doc(buyerId)
        .collection('notifications').add({
          title: 'Errand Request Sent',
          message: `Your request "${errandTitle}" to ${runnerName || 'a runner'} was sent!`,
          type: 'errand',
          isRead: false,
          createdAt: new Date().toISOString(),
          errandId,
          runnerId,
          runnerName,
        })
    ]);

  } catch (error) {
    console.error('Error sending errand request notifications:', error);
    throw error;
  }
};

// Send notification when runner accepts an errand
export const sendErrandAcceptanceNotification = async (
  buyerId: string,
  runnerId: string,
  errandId: string,
  runnerName?: string
) => {
  try {
    // Notify buyer that errand was accepted
    await sendPushNotification(
      buyerId,
      'Errand Accepted!',
      `${runnerName || 'A runner'} has accepted your errand request.`,
      {
        type: 'errand',
        errandId,
        runnerId,
        runnerName,
        status: 'accepted'
      }
    );

    // Save in-app notification for buyer
    await db.collection('users').doc(buyerId)
      .collection('notifications').add({
        title: 'Errand Accepted!',
        message: `${runnerName || 'A runner'} has accepted your errand request.`,
        type: 'errand',
        isRead: false,
        createdAt: new Date().toISOString(),
        errandId,
        runnerId,
        runnerName,
      });

  } catch (error) {
    console.error('Error sending errand acceptance notification:', error);
    throw error;
  }
};

// Send notification when order/errand status changes
export const sendStatusUpdateNotification = async (
  userId: string,
  itemId: string,
  itemType: 'order' | 'errand',
  newStatus: string,
  itemName?: string,
  otherPartyName?: string
) => {
  try {
    const statusMessages = {
      'preparing': 'Your order is being prepared',
      'ready': 'Your order is ready for pickup',
      'in_progress': 'Your errand is in progress',
      'completed': 'Your errand has been completed',
      'delivered': 'Your order has been delivered',
    };

    const message = statusMessages[newStatus as keyof typeof statusMessages] || 
                   `Your ${itemType} status has been updated to ${newStatus}`;

    await sendPushNotification(
      userId,
      `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Status Update`,
      message,
      {
        type: itemType,
        [itemType === 'order' ? 'orderId' : 'errandId']: itemId,
        status: newStatus,
        itemName,
        otherPartyName,
      }
    );

    // Save in-app notification
    await db.collection('users').doc(userId)
      .collection('notifications').add({
        title: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Status Update`,
        message,
        type: itemType,
        isRead: false,
        createdAt: new Date().toISOString(),
        [itemType === 'order' ? 'orderId' : 'errandId']: itemId,
        status: newStatus,
      });

  } catch (error) {
    console.error('Error sending status update notification:', error);
    throw error;
  }
}; 
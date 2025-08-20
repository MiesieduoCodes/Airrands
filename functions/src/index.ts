import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { paystackWebhook } from './webhooks';

admin.initializeApp();

// Export the PayStack webhook
export { paystackWebhook };

interface PaystackVerificationData {
  reference: string;
}

interface PaymentData {
  paymentData: any;
  orderData: any;
}

interface PaymentStatusData {
  paymentId: string;
  status: 'approved' | 'rejected';
}

// Simple notification interfaces
interface SendNotificationData {
  userId: string;
  title: string;
  body: string;
  type?: 'order' | 'message' | 'payment' | 'errand' | 'general';
  data?: any;
}

interface NotificationPreferences {
  orders: boolean;
  messages: boolean;
  payments: boolean;
  errands: boolean;
  general: boolean;
}

// Paystack verification function
export const verifyPaystackTransaction = functions.https.onCall(async (data: PaystackVerificationData, context: functions.https.CallableContext) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { reference } = data;

  if (!reference) {
    throw new functions.https.HttpsError('invalid-argument', 'Transaction reference is required');
  }

  try {
    // Get Paystack secret key from environment variables
    const paystackSecretKey = functions.config().paystack?.secret_key;
    
    if (!paystackSecretKey) {
      throw new functions.https.HttpsError('internal', 'Paystack configuration not found');
    }

    // Call Paystack verify API
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new functions.https.HttpsError('internal', `Paystack API error: ${result.message || 'Unknown error'}`);
    }

    // Check if transaction was successful
    if (result.data.status === 'success') {
      return {
        success: true,
        data: result.data,
        message: 'Transaction verified successfully'
      };
    } else {
      return {
        success: false,
        data: result.data,
        message: `Transaction failed: ${result.data.gateway_response || 'Unknown error'}`
      };
    }

  } catch (error) {
    console.error('Paystack verification error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to verify transaction');
  }
});

// Function to process successful payments
export const processSuccessfulPayment = functions.https.onCall(async (data: PaymentData, context: functions.https.CallableContext) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { paymentData, orderData } = data;

  if (!paymentData || !orderData) {
    throw new functions.https.HttpsError('invalid-argument', 'Payment and order data are required');
  }

  try {
    const db = admin.firestore();
    const batch = db.batch();

    // Create payment record with status 'pending' for admin review
    const paymentRef = db.collection('payments').doc();
    batch.set(paymentRef, {
      ...paymentData,
      id: paymentRef.id,
      status: 'pending', // Admin will approve/reject this
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Add fields that admin dashboard expects
      description: `Payment for order: ${orderData.productName}`,
      // Ensure all required fields are present
      amount: paymentData.amount,
      currency: paymentData.currency || 'NGN',
      userId: paymentData.userId,
      userName: paymentData.userName,
      userEmail: paymentData.userEmail,
      paymentMethod: paymentData.paymentMethod || 'paystack',
      orderId: null, // Will be updated after order is created
    });

    // Create order record (but mark as unpaid until admin approves payment)
    const orderRef = db.collection('orders').doc();
    batch.set(orderRef, {
      ...orderData,
      id: orderRef.id,
      paid: false, // Will be set to true when admin approves payment
      paymentId: paymentRef.id,
      paymentStatus: 'pending', // Track payment status in order
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update payment with orderId
    batch.update(paymentRef, { orderId: orderRef.id });

    // Commit the batch
    await batch.commit();

    return {
      success: true,
      paymentId: paymentRef.id,
      orderId: orderRef.id,
      message: 'Payment submitted for review. Order will be processed after payment approval.'
    };

  } catch (error) {
    console.error('Payment processing error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process payment');
  }
});

// Function for admin to approve/reject payments
export const updatePaymentStatus = functions.https.onCall(async (data: PaymentStatusData, context: functions.https.CallableContext) => {
  // Check if user is authenticated and is admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  
  // const userDoc = await admin.firestore().collection('admins').doc(context.auth.uid).get();
  // if (!userDoc.exists) {
  //   throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  // }

  const { paymentId, status } = data;

  if (!paymentId || !['approved', 'rejected'].includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid payment ID and status are required');
  }

  try {
    const db = admin.firestore();
    const batch = db.batch();

    // Update payment status
    const paymentRef = db.collection('payments').doc(paymentId);
    batch.update(paymentRef, {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get the payment to find the associated order
    const paymentDoc = await paymentRef.get();
    if (!paymentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Payment not found');
    }

    const paymentData = paymentDoc.data();
    const orderId = paymentData?.orderId;

    if (orderId) {
      const orderRef = db.collection('orders').doc(orderId);
      
      if (status === 'approved') {
        // Mark order as paid and update status
        batch.update(orderRef, {
          paid: true,
          paymentStatus: 'approved',
          status: 'preparing', // Start processing the order
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else if (status === 'rejected') {
        // Mark order as cancelled due to payment rejection
        batch.update(orderRef, {
          paid: false,
          paymentStatus: 'rejected',
          status: 'cancelled',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Commit the batch
    await batch.commit();

    return {
      success: true,
      message: `Payment ${status} successfully`
    };

  } catch (error) {
    console.error('Payment status update error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update payment status');
  }
}); 

// Internal function to send push notification (for use within Cloud Functions)
async function sendInternalPushNotification(data: SendNotificationData): Promise<{ success: boolean; message: string }> {
  const { userId, title, body, type = 'general', data: notificationData = {} } = data;

  if (!userId || !title || !body) {
    throw new Error('User ID, title, and body are required');
  }

  try {
    const db = admin.firestore();
    
    // Get user's push token and preferences
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const pushToken = userData?.expoPushToken;
    const preferences = userData?.notificationPreferences || {
      orders: true,
      messages: true,
      payments: true,
      errands: true,
      general: true,
    };

    // Check if user has enabled notifications for this type
    if (!preferences[type as keyof NotificationPreferences]) {
      return { success: true, message: 'Notification skipped (disabled by user)' };
    }

    if (!pushToken) {
      return { success: true, message: 'No push token available' };
    }

    // Send push notification via Expo
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data: { ...notificationData, type },
        sound: 'default',
        priority: 'high',
        channelId: type === 'order' ? 'orders' : 
                   type === 'message' ? 'messages' : 
                   type === 'payment' ? 'payments' : 
                   type === 'errand' ? 'errands' : 'default',
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('Push notification errors:', result.errors);
      // Handle invalid tokens
      if (result.errors.some((error: any) => error.code === 'DeviceNotRegistered')) {
        await db.collection('users').doc(userId).update({
          expoPushToken: null,
          tokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      throw new Error('Failed to send push notification');
    }

    // Save notification to Firestore
    await db.collection('users').doc(userId).collection('notifications').add({
      title,
      message: body,
      type,
      status: 'unread',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      data: notificationData,
    });

    return { success: true, message: 'Notification sent successfully' };

  } catch (error) {
    console.error('Error sending push notification:', error);
    throw new Error('Failed to send notification');
  }
}

// HTTP callable function to send push notification (for client-side calls)
export const sendPushNotification = functions.https.onCall(async (data: SendNotificationData, context: functions.https.CallableContext) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    return await sendInternalPushNotification(data);
  } catch (error) {
    console.error('Error in sendPushNotification callable:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send notification');
  }
});

// Function to update user's notification preferences
export const updateNotificationPreferences = functions.https.onCall(async (data: NotificationPreferences, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;

  try {
    const db = admin.firestore();
    
    await db.collection('users').doc(userId).update({
      notificationPreferences: data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Notification preferences updated' };

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update preferences');
  }
});

// Function to send notification when order status changes
export const sendOrderNotification = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // Only send notification if status changed
    if (before.status === after.status) {
      return null;
    }

    try {
      const userId = after.userId || after.buyerId;

      if (!userId) {
        return null;
      }

      let title = '';
      let body = '';

      switch (after.status) {
        case 'preparing':
          title = 'Order Update';
          body = `Your order #${orderId} is being prepared`;
          break;
        case 'ready':
          title = 'Order Ready!';
          body = `Your order #${orderId} is ready for pickup`;
          break;
        case 'delivered':
          title = 'Order Delivered';
          body = `Your order #${orderId} has been delivered`;
          break;
        case 'cancelled':
          title = 'Order Cancelled';
          body = `Your order #${orderId} has been cancelled`;
          break;
        default:
          return null;
      }

      // Send notification
      await sendInternalPushNotification({
        userId,
        title,
        body,
        type: 'order',
        data: { orderId, status: after.status },
      });

      return null;

    } catch (error) {
      console.error('Error sending order notification:', error);
      return null;
    }
  });

// Function to send notification when new message is received
export const sendMessageNotification = functions.firestore
  .document('chats/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const messageData = snap.data();
    const chatId = context.params.chatId;

    try {
      const db = admin.firestore();
      
      // Get chat data to find participants
      const chatDoc = await db.collection('chats').doc(chatId).get();
      if (!chatDoc.exists) {
        return null;
      }

      const chatData = chatDoc.data();
      const participants = chatData?.participants || [];
      const senderId = messageData?.senderId;

      // Send notification to all participants except sender
      for (const participantId of participants) {
        if (participantId !== senderId) {
          await sendInternalPushNotification({
            userId: participantId,
            title: `Message from ${messageData?.senderName || 'Someone'}`,
            body: messageData?.text || 'New message received',
            type: 'message',
            data: { chatId, messageId: snap.id },
          });
        }
      }

      return null;

    } catch (error) {
      console.error('Error sending message notification:', error);
      return null;
    }
  });

// Function to send notification when new errand is created
export const sendErrandNotification = functions.firestore
  .document('errands/{errandId}')
  .onCreate(async (snap, context) => {
    const errandData = snap.data();
    const errandId = context.params.errandId;

    try {
      const db = admin.firestore();
      
      // Get all runners
      const runnersSnapshot = await db.collection('users')
        .where('role', '==', 'runner')
        .where('isOnline', '==', true)
        .get();

      const title = 'New Errand Request';
      const body = `New errand request: ${errandData?.title || 'Help needed'}`;

      // Send notification to all online runners
      const notifications = runnersSnapshot.docs.map(doc => 
        sendInternalPushNotification({
          userId: doc.id,
          title,
          body,
          type: 'errand',
          data: { errandId, buyerId: errandData?.buyerId },
        })
      );

      await Promise.all(notifications);
      return null;

    } catch (error) {
      console.error('Error sending errand notification:', error);
      return null;
  }
}); 
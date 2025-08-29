// Admin service for handling admin-related operations
import { db } from '../config/firebase';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'account_status' | 'order_update' | 'payment_update' | 'payout_update';
  data?: any;
  isRead: boolean;
  createdAt: any;
}

export interface AdminAction {
  action: string;
  targetId: string;
  targetType: 'user' | 'order' | 'payment' | 'payout';
  status: string;
  reason?: string;
  notes?: string;
  timestamp: any;
  adminId: string;
}

class AdminService {
  // Listen for admin notifications
  subscribeToAdminNotifications(userId: string, callback: (notifications: AdminNotification[]) => void) {
    return db.collection('users').doc(userId).collection('notifications')
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        const notifications: AdminNotification[] = [];
        snapshot.docs.forEach((doc) => {
          notifications.push({
            id: doc.id,
            ...doc.data()
          } as AdminNotification);
        });
        callback(notifications);
      });
  }

  // Mark notification as read
  async markNotificationAsRead(userId: string, notificationId: string) {
    try {
      await db.collection('users').doc(userId).collection('notifications')
        .doc(notificationId).update({
          isRead: true,
          readAt: new Date()
        });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId: string) {
    try {
      const notificationsSnapshot = await db.collection('users').doc(userId)
        .collection('notifications').where('isRead', '==', false).get();
      
      const batch = db.batch();
      notificationsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          isRead: true,
          readAt: new Date()
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get unread notification count
  async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const snapshot = await db.collection('users').doc(userId)
        .collection('notifications').where('isRead', '==', false).get();
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  // Submit payout request
  async submitPayoutRequest(userId: string, userData: any, payoutData: any) {
    try {
      const payoutRequest = {
        userId,
        userName: userData.displayName || userData.email,
        userEmail: userData.email,
        userRole: userData.role,
        amount: payoutData.amount,
        currency: payoutData.currency || 'NGN',
        status: 'pending',
        bankDetails: {
          accountName: payoutData.accountName,
          accountNumber: payoutData.accountNumber,
          bankName: payoutData.bankName,
          bankCode: payoutData.bankCode
        },
        requestedAt: new Date(),
        totalEarnings: payoutData.totalEarnings,
        previousPayouts: payoutData.previousPayouts,
        availableBalance: payoutData.availableBalance
      };

      const docRef = await db.collection('payoutRequests').add(payoutRequest);
      
      // Create notification for admin
      await this.createAdminNotification({
        title: 'New Payout Request',
        message: `${userData.displayName || userData.email} has requested a payout of ${payoutData.currency} ${payoutData.amount.toLocaleString()}`,
        type: 'payout_request',
        data: {
          payoutId: docRef.id,
          userId,
          amount: payoutData.amount,
          userRole: userData.role
        }
      });

      return docRef.id;
    } catch (error) {
      console.error('Error submitting payout request:', error);
      throw error;
    }
  }

  // Create admin notification (for system notifications)
  private async createAdminNotification(notification: any) {
    try {
      // This would typically be handled by a Cloud Function
      // For now, we'll create it in a system notifications collection
      await db.collection('systemNotifications').add({
        ...notification,
        createdAt: new Date(),
        isRead: false
      });
    } catch (error) {
      console.error('Error creating admin notification:', error);
    }
  }

  // Get user's payout history
  async getPayoutHistory(userId: string) {
    try {
      const snapshot = await db.collection('payoutRequests')
        .where('userId', '==', userId)
        .orderBy('requestedAt', 'desc')
        .get();
      
      const payouts: any[] = [];
      snapshot.docs.forEach((doc) => {
        payouts.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return payouts;
    } catch (error) {
      console.error('Error getting payout history:', error);
      throw error;
    }
  }

  // Check if user can request payout
  async canRequestPayout(userId: string, userRole: string): Promise<{ canRequest: boolean; reason?: string }> {
    try {
      // Check if user has pending payout request
      const pendingSnapshot = await db.collection('payoutRequests')
        .where('userId', '==', userId)
        .where('status', '==', 'pending')
        .get();
      
      if (!pendingSnapshot.empty) {
        return { canRequest: false, reason: 'You have a pending payout request' };
      }

      // Check if user has processing payout request
      const processingSnapshot = await db.collection('payoutRequests')
        .where('userId', '==', userId)
        .where('status', '==', 'processing')
        .get();
      
      if (!processingSnapshot.empty) {
        return { canRequest: false, reason: 'You have a payout request being processed' };
      }

      // Check minimum payout amount (example: ₦5,000)
      const minPayoutAmount = 5000;
      
      // Get user's available balance (this would come from your earnings calculation)
      // For now, we'll assume it's available in user data
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (userData?.availableBalance < minPayoutAmount) {
        return { 
          canRequest: false, 
          reason: `Minimum payout amount is ₦${minPayoutAmount.toLocaleString()}` 
        };
      }

      return { canRequest: true };
    } catch (error) {
      console.error('Error checking payout eligibility:', error);
      return { canRequest: false, reason: 'Error checking eligibility' };
    }
  }

  // Get user's earnings summary
  async getEarningsSummary(userId: string, userRole: string) {
    try {
      let totalEarnings = 0;
      let totalPayouts = 0;
      let availableBalance = 0;

      if (userRole === 'seller') {
        // Calculate seller earnings from completed orders
        const ordersSnapshot = await db.collection('orders')
          .where('sellerId', '==', userId)
          .where('status', '==', 'completed')
          .get();
        
        ordersSnapshot.docs.forEach((doc) => {
          const orderData = doc.data();
          totalEarnings += orderData.totalAmount || 0;
        });
      } else if (userRole === 'runner') {
        // Calculate runner earnings from completed errands
        const errandsSnapshot = await db.collection('errands')
          .where('runnerId', '==', userId)
          .where('status', '==', 'completed')
          .get();
        
        errandsSnapshot.docs.forEach((doc) => {
          const errandData = doc.data();
          totalEarnings += errandData.deliveryFee || 0;
        });
      }

      // Calculate total payouts
      const payoutsSnapshot = await db.collection('payoutRequests')
        .where('userId', '==', userId)
        .where('status', '==', 'completed')
        .get();
      
      payoutsSnapshot.docs.forEach((doc) => {
        const payoutData = doc.data();
        totalPayouts += payoutData.amount || 0;
      });

      availableBalance = totalEarnings - totalPayouts;

      return {
        totalEarnings,
        totalPayouts,
        availableBalance,
        pendingPayouts: 0 // This would be calculated from pending payout requests
      };
    } catch (error) {
      console.error('Error getting earnings summary:', error);
      throw error;
    }
  }
}

export default new AdminService();


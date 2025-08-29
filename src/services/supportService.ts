import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  onSnapshot 
} from 'firebase/firestore';

export interface SupportMessage {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: 'buyer' | 'seller' | 'runner';
  message: string;
  category: 'technical' | 'billing' | 'account' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved';
  timestamp: any;
  adminReplies?: AdminReply[];
  lastActivity?: any;
}

export interface AdminReply {
  id: string;
  adminId: string;
  adminName: string;
  message: string;
  timestamp: any;
}

class SupportService {
  // Submit a support message
  async submitSupportMessage(
    userId: string,
    userName: string,
    userEmail: string,
    userRole: 'buyer' | 'seller' | 'runner',
    message: string,
    category: 'technical' | 'billing' | 'account' | 'general' = 'general',
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<string> {
    try {
      const supportMessage: SupportMessage = {
        userId,
        userName,
        userEmail,
        userRole,
        message: message.trim(),
        category,
        priority,
        status: 'open',
        timestamp: serverTimestamp(),
        adminReplies: [],
        lastActivity: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'supportMessages'), supportMessage);
      
      // Create notification for admin
      await this.createAdminNotification({
        title: 'New Support Message',
        message: `${userName} has sent a support message: ${message.substring(0, 100)}...`,
        type: 'support_message',
        data: {
          messageId: docRef.id,
          userId,
          userName,
          category,
          priority
        }
      });

      return docRef.id;
    } catch (error) {
      console.error('Error submitting support message:', error);
      throw error;
    }
  }

  // Create admin notification
  private async createAdminNotification(notification: any) {
    try {
      await addDoc(collection(db, 'adminNotifications'), {
        ...notification,
        createdAt: serverTimestamp(),
        isRead: false
      });
    } catch (error) {
      console.error('Error creating admin notification:', error);
    }
  }

  // Get support message by ID
  async getSupportMessage(messageId: string): Promise<SupportMessage | null> {
    try {
      const docRef = doc(db, 'supportMessages', messageId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data?.userId || '',
          userName: data?.userName || '',
          userEmail: data?.userEmail || '',
          userRole: data?.userRole || 'buyer',
          message: data?.message || '',
          category: data?.category || 'general',
          priority: data?.priority || 'medium',
          status: data?.status || 'open',
          timestamp: data?.timestamp,
          adminReplies: data?.adminReplies || [],
          lastActivity: data?.lastActivity
        } as SupportMessage;
      }
      return null;
    } catch (error) {
      console.error('Error getting support message:', error);
      throw error;
    }
  }

  // Get user's support messages
  async getUserSupportMessages(userId: string): Promise<SupportMessage[]> {
    try {
      const q = query(
        collection(db, 'supportMessages'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const messages: SupportMessage[] = [];
      
      querySnapshot.forEach((doc: any) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        } as SupportMessage);
      });
      
      return messages;
    } catch (error) {
      console.error('Error getting user support messages:', error);
      throw error;
    }
  }

  // Listen to user's support messages
  subscribeToUserSupportMessages(
    userId: string, 
    callback: (messages: SupportMessage[]) => void
  ) {
    const q = query(
      collection(db, 'supportMessages'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot: any) => {
      const messages: SupportMessage[] = [];
      snapshot.forEach((doc: any) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        } as SupportMessage);
      });
      callback(messages);
    });
  }
}

export default new SupportService();

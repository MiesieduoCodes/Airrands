import { db } from '../config/firebase';
import { sendPushNotification } from './notificationService';
import firebase from 'firebase/compat/app';

export interface MessageNotification {
  type: 'message';
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'buyer' | 'seller' | 'runner';
  message: string;
  timestamp: any;
}

class MessagingService {
  /**
   * Send a message and trigger background notification
   */
  async sendMessage(
    chatId: string,
    senderId: string,
    receiverId: string,
    content: string,
    senderName: string,
    senderRole: 'buyer' | 'seller' | 'runner'
  ): Promise<string> {
    try {
      // Create message data
      const messageData = {
        senderId,
        receiverId,
        content,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        read: false,
        type: 'text' as const,
      };

      // Add message to chat
      const messageRef = await db.collection('chats').doc(chatId).collection('messages').add(messageData);
      
      // Update chat with last message
      await db.collection('chats').doc(chatId).update({
        lastMessage: {
          ...messageData,
          id: messageRef.id,
        },
        lastMessageTime: messageData.timestamp,
        unreadCount: firebase.firestore.FieldValue.increment(senderId !== receiverId ? 1 : 0),
      });

      // Send background notification to receiver
      await this.sendMessageNotification(
        receiverId,
        senderId,
        senderName,
        senderRole,
        content,
        chatId
      );

      return messageRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send background notification for new message
   */
  private async sendMessageNotification(
    receiverId: string,
    senderId: string,
    senderName: string,
    senderRole: 'buyer' | 'seller' | 'runner',
    message: string,
    chatId: string
  ): Promise<void> {
    try {
      // Get receiver's push token
      const receiverDoc = await db.collection('users').doc(receiverId).get();
      const receiverData = receiverDoc.data();
      const pushToken = receiverData?.expoPushToken;

      if (!pushToken) {
        console.log('No push token found for receiver:', receiverId);
        return;
      }

      // Get receiver's role for proper notification text
      const receiverRole = await this.getUserRole(receiverId);
      
      // Create notification title and message
      const title = `New message from ${senderName}`;
      const notificationMessage = this.truncateMessage(message, 50);

      // Send push notification
      await sendPushNotification(
        pushToken,
        title,
        notificationMessage,
        {
          type: 'message',
          chatId,
          senderId,
          senderName,
          senderRole,
          message: message,
          timestamp: new Date().toISOString(),
        }
      );

      console.log(`Message notification sent to ${receiverId} from ${senderId}`);
    } catch (error) {
      console.error('Error sending message notification:', error);
      // Don't throw error - message should still be sent even if notification fails
    }
  }

  /**
   * Get user role from database
   */
  private async getUserRole(userId: string): Promise<'buyer' | 'seller' | 'runner'> {
    try {
      // Check if user is a runner
      const runnerDoc = await db.collection('runners').doc(userId).get();
      if (runnerDoc.exists) {
        return 'runner';
      }

      // Check if user is a seller
      const sellerDoc = await db.collection('sellers').doc(userId).get();
      if (sellerDoc.exists) {
        return 'seller';
      }

      // Default to buyer
      return 'buyer';
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'buyer';
    }
  }

  /**
   * Truncate message for notification
   */
  private truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength) + '...';
  }

  /**
   * Create or get chat between two users
   */
  async getOrCreateChat(userId1: string, userId2: string): Promise<{ chatId: string; isNew: boolean }> {
    try {
      // Sort participant IDs to ensure consistent chatKey
      const participants = [userId1, userId2].sort();
      const chatKey = participants.join('');

      // Check if chat already exists
      const existingChat = await db.collection('chats')
        .where('chatKey', '==', chatKey)
        .limit(1)
        .get();

      if (!existingChat.empty) {
        return { chatId: existingChat.docs[0].id, isNew: false };
      }

      // Create new chat
      const chatData = {
        participants: [userId1, userId2],
        chatKey,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
        unreadCount: 0,
        participantDetails: {},
      };

      const chatRef = await db.collection('chats').add(chatData);
      return { chatId: chatRef.id, isNew: true };
    } catch (error) {
      console.error('Error creating/getting chat:', error);
      throw error;
    }
  }

  /**
   * Get chat messages
   */
  async getChatMessages(chatId: string, limit: number = 50): Promise<any[]> {
    try {
      const messagesSnapshot = await db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting chat messages:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    try {
      // Reset unread count for this user
      await db.collection('chats').doc(chatId).update({
        unreadCount: 0,
      });

      // Mark all messages in this chat as read for this user
      const messagesSnapshot = await db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .where('receiverId', '==', userId)
        .where('read', '==', false)
        .get();

      const batch = db.batch();
      messagesSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Get user's chats
   */
  async getUserChats(userId: string): Promise<any[]> {
    try {
      const chatsSnapshot = await db
        .collection('chats')
        .where('participants', 'array-contains', userId)
        .orderBy('lastMessageTime', 'desc')
        .get();

      return chatsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting user chats:', error);
      throw error;
    }
  }
}

export default new MessagingService();


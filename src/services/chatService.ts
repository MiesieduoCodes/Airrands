import { db } from '../config/firebase';
import firebase from 'firebase/compat/app';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: firebase.firestore.Timestamp;
  read: boolean;
  type: 'text' | 'image' | 'file';
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  lastMessageTime?: firebase.firestore.Timestamp;
  unreadCount: number;
  participantDetails: {
    [userId: string]: {
      name: string;
      avatar?: string;
      role: string;
      isOnline: boolean;
      lastSeen: Date | null;
    };
  };
}

// Check if a chat already exists between two users
export const checkExistingChat = async (userId1: string, userId2: string): Promise<{ exists: boolean; chatId?: string }> => {
  const auth = firebase.auth();
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('User not authenticated');
  }
  
  // Sort participant IDs to ensure consistent chatKey
  const participants = [userId1, userId2].sort();
  const chatKey = participants.join('');
  
  try {
    // Check if chat already exists using chatKey
    const existingChat = await db.collection('chats')
      .where('chatKey', '==', chatKey)
      .limit(1)
      .get();

    if (!existingChat.empty) {
      const chatId = existingChat.docs[0].id;
      return { exists: true, chatId };
    }
    
    return { exists: false };
  } catch (error: any) {
    console.error('Error checking for existing chat:', error);
    throw error;
  }
};

// Main chat creation function - always use the authenticated user and the other user
export const getOrCreateChat = async (otherUserId: string): Promise<{ chatId: string; isNew: boolean }> => {
  const auth = firebase.auth();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');
  if (!otherUserId || currentUser.uid === otherUserId) throw new Error('Cannot create chat with yourself or undefined user');

  // Always use the authenticated user and the other user
  const participants = [currentUser.uid, otherUserId].sort();
  const chatKey = participants.join('');

  // Check if chat already exists
  const existingChat = await db.collection('chats')
    .where('chatKey', '==', chatKey)
    .limit(1)
    .get();

  if (!existingChat.empty) {
    const chatId = existingChat.docs[0].id;
    return { chatId, isNew: false };
  }

  // Create new chat
  const chatData = {
    participants,
    chatKey,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    unreadCount: 0,
    participantDetails: {},
    createdBy: currentUser.uid,
  };

  const chatRef = await db.collection('chats').add(chatData);
  return { chatId: chatRef.id, isNew: true };
};

// Send a message
export const sendMessage = async (chatId: string, senderId: string, receiverId: string, content: string) => {
  const messageData = {
    senderId,
    receiverId,
    content,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    read: false,
    type: 'text' as const,
  };

  try {
    // Add message to chat
    const messageRef = await db.collection('chats').doc(chatId).collection('messages').add(messageData);
    // Update chat with last message
    await db.collection('chats').doc(chatId).update({
      lastMessage: {
        ...messageData,
        id: messageRef.id,
      },
      lastMessageTime: messageData.timestamp,
      // Only increment unread count if the sender is not the same as the receiver
      // This prevents counting your own messages as unread
      unreadCount: firebase.firestore.FieldValue.increment(senderId !== receiverId ? 1 : 0),
    });
    return messageRef.id;
  } catch (error: any) {
    console.error('Error in sendMessage:', error);
    console.error('Error details:', {
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
      chatId,
      senderId,
      receiverId
    });
    throw error;
  }
};

// Get messages for a chat
export const getMessages = (chatId: string, callback: (messages: ChatMessage[]) => void) => {
  return db.collection('chats').doc(chatId).collection('messages')
    .orderBy('timestamp', 'asc')
    .onSnapshot((snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
        } as ChatMessage);
      });
      
      callback(messages);
    }, (error) => {
      console.error('Error in message listener:', error);
    });
};

// Mark messages as read
export const markMessagesAsRead = async (chatId: string, userId: string) => {
  const batch = db.batch();
  
  // Get unread messages for this user
  const unreadMessages = await db.collection('chats').doc(chatId).collection('messages')
    .where('receiverId', '==', userId)
    .where('read', '==', false)
    .get();

  // Mark them as read
  unreadMessages.docs.forEach((doc) => {
    batch.update(doc.ref, { read: true });
  });

  // Update chat unread count
  batch.update(db.collection('chats').doc(chatId), {
    unreadCount: firebase.firestore.FieldValue.increment(-unreadMessages.docs.length),
  });

  await batch.commit();
};

// Get user's chats
export const getUserChats = (userId: string, callback: (chats: Chat[]) => void) => {
  const ref = db.collection('chats').where('participants', 'array-contains', userId);
  return ref.onSnapshot(async (snapshot) => {
    const chats = await Promise.all(
      snapshot.docs.map(async (doc: any) => {
        const chatData = doc.data();
        const participants = chatData.participants || [];
        
        // Get participant details with online status
        const participantDetails: { [userId: string]: { name: string; avatar?: string; role: string; isOnline: boolean; lastSeen: Date | null } } = {};
        
        for (const participantId of participants) {
          try {
            const userRef = db.collection('users').doc(participantId);
            const userDoc = await userRef.get();
              const userData = userDoc.data();
            
              participantDetails[participantId] = {
              name: userData?.name || userData?.displayName || userData?.businessName || 'Unknown User',
              avatar: userData?.image || userData?.photoURL || userData?.avatar || 'https://i.imgur.com/T3zF9bJ.png',
                role: userData?.role || 'user',
              isOnline: userData?.isOnline || false,
              lastSeen: userData?.lastSeen?.toDate?.() || null,
            };
          } catch (error) {
            console.error('Error fetching participant details:', error);
            participantDetails[participantId] = {
              name: 'Unknown User',
              avatar: 'https://i.imgur.com/T3zF9bJ.png',
              role: 'user',
              isOnline: false,
              lastSeen: null,
              };
            }
          }
        
        return {
          id: doc.id,
          participants,
          lastMessage: chatData.lastMessage,
          lastMessageTime: chatData.lastMessageTime,
          unreadCount: chatData.unreadCount || 0,
          participantDetails,
        };
      })
    );
      
    callback(chats);
    });
};

// Get user details for chat
export const getUserDetails = async (userId: string) => {
  const userDoc = await db.collection('users').doc(userId).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    return {
      id: userId,
      name: userData?.name || 'Unknown User',
      avatar: userData?.avatar,
      role: userData?.role || 'user',
    };
  }
  return null;
};

// Get user online status
export const getUserOnlineStatus = async (userId: string): Promise<{ isOnline: boolean; lastSeen: Date | null }> => {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      return {
        isOnline: userData?.isOnline || false,
        lastSeen: userData?.lastSeen?.toDate?.() || null,
      };
    }
    return { isOnline: false, lastSeen: null };
  } catch (error) {
    console.error('Error getting user online status:', error);
    return { isOnline: false, lastSeen: null };
  }
};

// Subscribe to user online status changes
export const subscribeToUserOnlineStatus = (userId: string, callback: (status: { isOnline: boolean; lastSeen: Date | null }) => void) => {
  return db.collection('users').doc(userId).onSnapshot((doc) => {
    if (doc.exists) {
      const userData = doc.data();
      callback({
        isOnline: userData?.isOnline || false,
        lastSeen: userData?.lastSeen?.toDate?.() || null,
      });
    } else {
      callback({ isOnline: false, lastSeen: null });
    }
  });
};

// Utility function to handle chat creation with user feedback - FIXED VERSION
export const handleChatCreation = async (
  userId1: string, 
  userId2: string, 
  onSuccess?: (chatId: string, isNew: boolean) => void,
  onError?: (error: any) => void
): Promise<{ chatId: string; isNew: boolean } | null> => {
  try {
    // Determine which user is the current authenticated user
    const auth = firebase.auth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Determine the other user ID (the one we want to chat with)
    const otherUserId = currentUser.uid === userId1 ? userId2 : userId1;
    
    // Use the main chat creation function
    const chatResult = await getOrCreateChat(otherUserId);
    
    // Provide user feedback based on whether it's a new or existing chat
    if (chatResult.isNew) {
      } else {
      }
    
    // Call success callback if provided
    if (onSuccess) {
      onSuccess(chatResult.chatId, chatResult.isNew);
    }
    
    return chatResult;
  } catch (error: any) {
    console.error('Error in handleChatCreation:', error);
    
    // Call error callback if provided
    if (onError) {
      onError(error);
    }
    
    return null;
  }
}; 

// Get chat history between two specific users
export const getChatHistory = async (userId1: string, userId2: string): Promise<{ chatId: string; messages: ChatMessage[] } | null> => {
  const auth = firebase.auth();
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('User not authenticated');
  }
  
  // Sort participant IDs to ensure consistent chatKey
  const participants = [userId1, userId2].sort();
  const chatKey = participants.join('');
  
  try {
    // Find the chat between these users
    const chatQuery = await db.collection('chats')
      .where('chatKey', '==', chatKey)
      .limit(1)
      .get();

    if (chatQuery.empty) {
      return null;
    }

    const chatDoc = chatQuery.docs[0];
    const chatId = chatDoc.id;
    
    // Get messages for this chat
    const messagesQuery = await db.collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(50) // Limit to last 50 messages
      .get();

    const messages: ChatMessage[] = [];
    messagesQuery.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data,
      } as ChatMessage);
    });
    
    // Reverse to get chronological order
    messages.reverse();
    
    return {
      chatId,
      messages
    };
  } catch (error: any) {
    console.error('Error getting chat history:', error);
    throw error;
  }
}; 
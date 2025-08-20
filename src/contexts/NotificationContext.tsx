import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../services/notificationService';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  timestamp: firebase.firestore.Timestamp;
  type: 'order' | 'message' | 'system' | 'payment' | 'promo';
  isRead: boolean;
  avatar?: string;
  userId: string;
  relatedId?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface NotificationContextProps {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};

// Helper function to convert Firestore timestamp to ISO string
const convertTimestampToString = (timestamp: any): string => {
  try {
    if (!timestamp) return new Date().toISOString();
    
    // If it's already a string, return it
    if (typeof timestamp === 'string') return timestamp;
    
    // If it's a Firestore timestamp object with seconds and nanoseconds
    if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
      // Ensure seconds and nanoseconds are numbers
      const seconds = Number(timestamp.seconds);
      const nanoseconds = Number(timestamp.nanoseconds);
      
      if (isNaN(seconds) || isNaN(nanoseconds)) {
        return new Date().toISOString();
      }
      
      return new Date(seconds * 1000 + nanoseconds / 1000000).toISOString();
    }
    
    // If it's a Date object
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    
    // If it's a number (milliseconds since epoch)
    if (typeof timestamp === 'number') {
      if (isNaN(timestamp)) {
        return new Date().toISOString();
      }
      return new Date(timestamp).toISOString();
    }
    
    // If it's a Firestore Timestamp object (from newer Firebase versions)
    if (timestamp && typeof timestamp.toDate === 'function') {
      try {
        return timestamp.toDate().toISOString();
      } catch (error) {
        return new Date().toISOString();
      }
    }
    
    // If it's an object with a _seconds property (older Firebase versions)
    if (timestamp && timestamp._seconds !== undefined) {
      const seconds = Number(timestamp._seconds);
      if (!isNaN(seconds)) {
        return new Date(seconds * 1000).toISOString();
      }
    }
    
    // Fallback to current time
    return new Date().toISOString();
  } catch (error) {
    console.error('Error converting timestamp:', error, 'Original timestamp:', timestamp);
    return new Date().toISOString();
  }
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    
    // Real-time listener for notifications with error handling
    const unsubscribe = db
      .collection('users')
      .doc(user.uid)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snapshot => {
          try {
            const notifs: Notification[] = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                title: data.title || '',
                message: data.message || '',
                time: convertTimestampToString(data.time || data.createdAt),
                timestamp: data.createdAt || firebase.firestore.Timestamp.now(),
                type: data.type || 'system',
                isRead: data.isRead || false,
                avatar: data.avatar,
                userId: user.uid,
                relatedId: data.orderId || data.messageId || data.errandId,
                priority: data.priority || 'low'
              };
            });
            setNotifications(notifs);
            setLoading(false);
          } catch (error) {
            console.error('Error processing notifications:', error);
            setNotifications([]);
            setLoading(false);
          }
        },
        error => {
          console.error('Firebase listener error:', error);
          // Fallback to empty notifications on error
          setNotifications([]);
          setLoading(false);
        }
      );
    
    return () => unsubscribe();
  }, [user?.uid]);

  const unreadCount = notifications?.filter(n => !n.isRead)?.length || 0;

  const markAsRead = async (id: string) => {
    if (!user?.uid) return;
    try {
      await markNotificationAsRead(id, user.uid);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const markAllAsReadHandler = async () => {
    if (!user?.uid) return;
    try {
      await markAllNotificationsAsRead(user.uid);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  const deleteNotificationHandler = async (id: string) => {
    try {
      await deleteNotification(id);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };
  
  const refresh = async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      const notifsRaw = await getUserNotifications(user.uid);
      const notifs: Notification[] = notifsRaw.map((data: any) => ({
        id: data.id,
        title: data.title || '',
        message: data.message || '',
        time: convertTimestampToString(data.time || data.createdAt),
        timestamp: data.createdAt || firebase.firestore.Timestamp.now(),
        type: data.type || 'system',
        isRead: data.isRead || false,
        avatar: data.avatar,
        userId: user.uid,
        relatedId: data.orderId || data.messageId || data.errandId,
        priority: data.priority || 'low'
      }));
      setNotifications(notifs);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead: markAllAsReadHandler,
      deleteNotification: deleteNotificationHandler,
      refresh,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}; 
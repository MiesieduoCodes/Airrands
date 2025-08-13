import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../services/notificationService';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'order' | 'message' | 'system' | 'payment' | 'promo';
  isRead: boolean;
  avatar?: string;
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
                time: data.time || data.createdAt || new Date().toISOString(),
                type: data.type || 'system',
                isRead: data.isRead || false,
                avatar: data.avatar,
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
        time: data.time || data.createdAt || new Date().toISOString(),
        type: data.type || 'system',
        isRead: data.isRead || false,
        avatar: data.avatar,
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
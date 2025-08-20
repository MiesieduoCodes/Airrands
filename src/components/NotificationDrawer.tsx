import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, Alert } from 'react-native';
import { Text, Avatar, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import firebase from 'firebase/compat/app';

const { width } = Dimensions.get('window');

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  timestamp: firebase.firestore.Timestamp;
  type: 'order' | 'message' | 'system' | 'payment' | 'promo';
  isRead: boolean;
  avatar?: string;
  userId: string;
  relatedId?: string; // orderId, messageId, etc.
  priority?: 'low' | 'medium' | 'high';
}

interface NotificationDrawerProps {
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  onNotificationPress: (notification: Notification) => void;
  onClearAll?: () => void;
  onRefresh?: () => void;
}

const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  visible, onClose, notifications, onNotificationPress, onClearAll, onRefresh
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realTimeNotifications, setRealTimeNotifications] = useState<Notification[]>([]);
  
  const translateX = React.useRef(new Animated.Value(300)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Real-time notifications listener
  useEffect(() => {
    if (!user?.uid || !visible) return;

    setIsLoading(true);
    setError(null);

    const unsubscribe = db
      .collection('notifications')
      .where('userId', '==', user.uid)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .onSnapshot(
        (snapshot) => {
          const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Notification[];
          
          setRealTimeNotifications(notifications);
          setIsLoading(false);
        },
        (error) => {
          console.error('Error fetching notifications:', error);
          setError('Failed to load notifications');
          setIsLoading(false);
        }
      );

    return () => unsubscribe();
  }, [user?.uid, visible]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await db.collection('notifications').doc(notificationId).update({
        isRead: true,
        readAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      const batch = db.batch();
      
      const unreadNotifications = realTimeNotifications.filter(n => !n.isRead);
      unreadNotifications.forEach(notification => {
        const ref = db.collection('notifications').doc(notification.id);
        batch.update(ref, {
          isRead: true,
          readAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (!user?.uid) return;
    
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const batch = db.batch();
              
              realTimeNotifications.forEach(notification => {
                const ref = db.collection('notifications').doc(notification.id);
                batch.delete(ref);
              });
              
              await batch.commit();
              if (onClearAll) onClearAll();
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    const icons = {
      order: 'package-variant',
      message: 'message-text',
      payment: 'credit-card-check',
      system: 'alert-circle',
      promo: 'tag',
    };
    return icons?.[type as keyof typeof icons] || 'bell';
  };

  const getNotificationColor = (type: string) => {
    const colors = {
      order: theme.colors.primary,
      message: theme.colors.secondary,
      payment: theme.colors.tertiary,
      system: theme.colors.error,
    };
    return colors?.[type as keyof typeof colors] || theme.colors.primary;
  };

  const getNotificationIconColor = (type: string) => {
    const colors = {
      order: theme.colors.onPrimary,
      message: theme.colors.onSecondary,
      payment: theme.colors.onTertiary,
      system: theme.colors.onError,
    };
    return colors?.[type as keyof typeof colors] || theme.colors.onPrimary;
  };

  if (!visible) return null;

  return (
    <>
      <Animated.View 
        style={[
          styles.overlay, 
          { 
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.overlayTouch} 
          onPress={onClose} 
          activeOpacity={1}
        />
      </Animated.View>
      
      <Animated.View 
        style={[
          styles.drawer, 
          { 
            backgroundColor: theme.colors.surface,
            transform: [{ translateX }],
            shadowColor: theme.colors.shadow,
          }
        ]}
      >
        <View style={[styles.header, { borderBottomColor: theme.colors.outlineVariant }]}>
          <View style={styles.headerLeft}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              Notifications
            </Text>
            {realTimeNotifications.length > 0 && (
              <Text variant="labelSmall" style={[styles.notificationCount, { color: theme.colors.onSurfaceVariant }]}>
                {realTimeNotifications.filter(n => !n.isRead).length} new
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            {realTimeNotifications.length > 0 && (
              <>
                <TouchableOpacity onPress={markAllAsRead} style={styles.clearButton}>
                <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                    Mark all read
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
                  <Text variant="labelSmall" style={{ color: theme.colors.error }}>
                  Clear all
                </Text>
              </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons 
                name="close" 
                size={20} 
                color={theme.colors.onSurface} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={notifications.length === 0 && styles.emptyContainer}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons 
                name="bell-off-outline" 
                size={48} 
                color={theme.colors.onSurfaceVariant} 
                style={styles.emptyIcon}
              />
              <Text variant="bodyMedium" style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
                No notifications
              </Text>
              <Text variant="bodySmall" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                We'll notify you when something arrives
              </Text>
            </View>
          ) : (notifications.map((notification, index) => (<React.Fragment key={notification.id}>
                <TouchableOpacity
                  onPress={() => onNotificationPress(notification)}
                  style={[
                    styles.notificationItem,
                    !notification.isRead && { 
                      backgroundColor: theme.colors.primaryContainer + '20',
                      borderLeftWidth: 3,
                      borderLeftColor: getNotificationColor(notification.type),
                    }
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Avatar.Icon
                        size={36}
                        icon={getNotificationIcon(notification.type)}
                        style={{ 
                          backgroundColor: getNotificationColor(notification.type),
                          marginRight: 12,
                        }}
                        color={getNotificationIconColor(notification.type)}
                      />
                      <View style={styles.notificationInfo}>
                        <View style={styles.notificationTitleRow}>
                          <Text 
                            variant="bodyMedium" 
                            style={[
                              styles.notificationTitle, 
                              { 
                                color: theme.colors.onSurface,
                                fontWeight: notification.isRead ? 'normal' : '600',
                              }
                            ]}
                            numberOfLines={1}
                          >
                            {notification.title}
                          </Text>
                          {!notification.isRead && (
                            <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
                          )}
                        </View>
                        <Text 
                          variant="bodySmall" 
                          style={[
                            styles.notificationMessage, 
                            { 
                              color: theme.colors.onSurfaceVariant,
                              opacity: notification.isRead ? 0.8 : 1,
                            }
                          ]}
                          numberOfLines={2}
                        >
                          {notification.message}
                        </Text>
                      </View>
                    </View>
                    <Text 
                      variant="labelSmall" 
                      style={[
                        styles.notificationTime, 
                        { 
                          color: theme.colors.onSurfaceVariant,
                          alignSelf: 'flex-end',
                        }
                      ]}
                    >
                      {notification.time}
                    </Text>
                  </View>
                </TouchableOpacity>
                {index < notifications.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                )}
              </React.Fragment>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlayTouch: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: Math.min(width - 32, 380),
    maxHeight: 500,
    borderRadius: 16,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationCount: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  clearButton: {
    padding: 4,
    marginRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyTitle: {
    marginBottom: 4,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 240,
    opacity: 0.6,
  },
  content: {
    maxHeight: 400,
  },
  notificationItem: {
    padding: 16,
    paddingLeft: 13, // account for border
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  notificationTitle: {
    flex: 1,
  },
  notificationMessage: {
    lineHeight: 18,
  },
  notificationTime: {
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorIcon: {
    marginBottom: 16,
    opacity: 0.8,
  },
  errorTitle: {
    marginBottom: 8,
    fontWeight: '500',
  },
  errorText: {
    textAlign: 'center',
    maxWidth: 240,
    opacity: 0.7,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});

export default NotificationDrawer;

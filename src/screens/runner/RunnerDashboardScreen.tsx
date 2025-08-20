import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, Animated, ScrollView } from 'react-native';
import { Text, Card, Button, Switch, Avatar, IconButton, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import NotificationDrawer from '../../components/NotificationDrawer';
import { getProfile } from '../../services/runnerServices';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../services/notificationService';

const RunnerDashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    active: 0,
    completed: 0,
    rating: 4.8,
  });
  const [profile, setProfile] = useState<any>(null);
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationDrawerVisible, setNotificationDrawerVisible] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    // Fetch runner profile
    getProfile(user.uid).then(setProfile);
    
    // Set up real-time listener for notifications
    const unsubscribe = db
      .collection('users')
      .doc(user.uid)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const notifs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotifications(notifs);
      }, (error) => {
        console.error('Error listening to notifications:', error);
      });
    
    // Fetch today's earnings, active/completed errands, and rating
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    db.collection('errands')
      .where('runnerId', '==', user.uid)
      .onSnapshot(snapshot => {
        let todayEarnings = 0, active = 0, completed = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === 'accepted' || data.status === 'in_progress') active++;
          if (data.status === 'completed') {
            completed++;
            if (data.completedAt && data.completedAt.toDate) {
              const completedAt = data.completedAt.toDate();
              if (completedAt >= startOfDay) todayEarnings += data.fee || data.amount || 0;
            }
          }
        });
        setStats(s => ({ ...s, todayEarnings, active, completed }));
      });
    
    // Get actual rating from runner profile
    getProfile(user.uid).then((profileData) => {
      const actualRating = profileData?.rating || 0;
      setStats(s => ({ ...s, rating: actualRating }));
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    // Greeting and time
    const updateGreeting = () => {
      const hour = new Date().getHours();
      setGreeting(
        hour < 12 ? 'Good morning' :
        hour < 18 ? 'Good afternoon' : 'Good evening'
      );
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => n.status === 'unread' || n.isRead === false).length;

  // Mark notification as read in backend
  const handleNotificationPress = async (notification: any) => {
    if (notification.status === 'unread' || notification.isRead === false) {
      await markNotificationAsRead(notification.id, user?.uid);
      // The real-time listener will automatically update the UI
    }
    setNotificationDrawerVisible(false);
    
    // Navigate based on notification type and data
    try {
      switch (notification.type) {
        case 'errand':
          if (notification.data?.errandId) {
            navigation.navigate('Errands', { 
              filter: 'accepted',
              selectedErrandId: notification.data.errandId 
            });
          } else {
            navigation.navigate('Errands', { filter: 'available' });
          }
          break;
        case 'message':
          if (notification.data?.chatId) {
            navigation.navigate('Messages', { 
              selectedChatId: notification.data.chatId 
            });
          } else {
            navigation.navigate('Messages');
          }
          break;
        case 'payment':
          if (notification.data?.paymentId) {
            navigation.navigate('Earnings', { 
              selectedPaymentId: notification.data.paymentId 
            });
          } else {
            navigation.navigate('Earnings');
          }
          break;
        case 'order':
          if (notification.data?.orderId) {
            navigation.navigate('Errands', { 
              filter: 'accepted',
              selectedOrderId: notification.data.orderId 
            });
          } else {
            navigation.navigate('Errands', { filter: 'accepted' });
          }
          break;
        case 'verification':
          navigation.navigate('Profile');
          break;
        case 'general':
        default:
          break;
      }
    } catch (error) {
      console.error('Error navigating from notification:', error);
      navigation.navigate('Errands', { filter: 'available' });
    }
  };

  // Mark all notifications as read in backend
  const handleClearAllNotifications = async () => {
    if (!user?.uid) return;
    await markAllNotificationsAsRead(user.uid);
    // The real-time listener will automatically update the UI
  };

  return (<SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background, flexGrow: 1, paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with avatar, greeting, time, and notification bell */}
        <View style={styles.headerRow}>
          <Avatar.Image
            size={48}
            source={{ uri: profile?.avatar || 'https://picsum.photos/200' }}
            style={{ backgroundColor: theme.colors.primary }}
          />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: 20 }}>
              {greeting}, {profile?.name || user?.displayName || 'Runner'}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {currentTime} &bull; Ready to deliver today?
            </Text>
          </View>
          <TouchableOpacity onPress={() => setNotificationDrawerVisible(true)} style={{ marginLeft: 8 }}>
            <View>
              <IconButton icon="bell" size={28} iconColor={theme.colors.onSurface} />
              {unreadCount > 0 && (
                <Badge
                  style={{ position: 'absolute', top: 6, right: 6, backgroundColor: theme.colors.primary, color: theme.colors.onPrimary, fontSize: 10, zIndex: 1 }}
                  size={16}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </View>
          </TouchableOpacity>
        </View>
        {/* Notification Drawer */}
        <NotificationDrawer
          visible={notificationDrawerVisible}
          onClose={() => setNotificationDrawerVisible(false)}
          notifications={notifications}
          onNotificationPress={handleNotificationPress}
          onClearAll={handleClearAllNotifications}
        />
        {/* Motivational Card if no errands */}
        {stats.active === 0 && (
          <Card style={[styles.motivationCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
            <Card.Content style={{ alignItems: 'center' }}>
              <MaterialCommunityIcons name="run-fast" size={36} color={theme.colors.primary} />
              <Text variant="titleMedium" style={{ marginTop: 8, color: theme.colors.primary }}>
                No active errands
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}>
                Stay online to get new delivery requests and boost your earnings!
              </Text>
            </Card.Content>
          </Card>
        )}
        {/* Online/Offline Toggle in Card */}
        <Card style={[styles.toggleCard, { backgroundColor: theme.colors.surface, borderColor: isOnline ? COLORS.success : COLORS.gray?.[300] }]}> 
          <Card.Content style={styles.toggleContent}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch value={isOnline} onValueChange={setIsOnline} color={theme.colors.primary} />
          </Card.Content>
        </Card>
        {/* Stats Cards as 2x2 grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRowGrid}>
            <Card style={[styles.statCardGrid, { backgroundColor: theme.colors.surface }]}> 
              <Card.Content style={styles.statContentGrid}>
                <MaterialCommunityIcons name="cash" size={32} color={COLORS.success} />
                <Text variant="titleLarge" style={styles.statValueGrid}>₦{stats.todayEarnings.toLocaleString()}</Text>
                <Text variant="bodySmall" style={styles.statLabelGrid}>Today's Earnings</Text>
              </Card.Content>
            </Card>
            <Card style={[styles.statCardGrid, { backgroundColor: theme.colors.surface }]}> 
              <Card.Content style={styles.statContentGrid}>
                <MaterialCommunityIcons name="clipboard-list" size={32} color={theme.colors.primary} />
                <Text variant="titleLarge" style={styles.statValueGrid}>{stats.active}</Text>
                <Text variant="bodySmall" style={styles.statLabelGrid}>Active Errands</Text>
              </Card.Content>
            </Card>
          </View>
          <View style={styles.statsRowGrid}>
            <Card style={[styles.statCardGrid, { backgroundColor: theme.colors.surface }]}> 
              <Card.Content style={styles.statContentGrid}>
                <MaterialCommunityIcons name="check-circle" size={32} color={COLORS.success} />
                <Text variant="titleLarge" style={styles.statValueGrid}>{stats.completed}</Text>
                <Text variant="bodySmall" style={styles.statLabelGrid}>Completed</Text>
              </Card.Content>
            </Card>
            <Card style={[styles.statCardGrid, { backgroundColor: theme.colors.surface }]}> 
              <Card.Content style={styles.statContentGrid}>
                <MaterialCommunityIcons name="star" size={32} color={COLORS.warning} />
                <Text variant="titleLarge" style={styles.statValueGrid}>
                  {stats.rating > 0 ? stats.rating.toFixed(1) : 'No rating'}
                </Text>
                <Text variant="bodySmall" style={styles.statLabelGrid}>Rating</Text>
              </Card.Content>
            </Card>
          </View>
        </View>
        {/* Shortcuts as 2x2 grid */}
        <View style={styles.shortcutsGrid}>
          <View style={styles.shortcutsRowGrid}>
            <ShortcutButton icon="format-list-bulleted" label="Available" onPress={() => navigation.navigate('Errands', { filter: 'available' })} color={theme.colors.primary} />
            <ShortcutButton icon="clipboard-check" label="My Errands" onPress={() => navigation.navigate('Errands', { filter: 'accepted' })} color={COLORS.success} />
          </View>
          <View style={styles.shortcutsRowGrid}>
            <ShortcutButton icon="cash" label="Earnings" onPress={() => navigation.navigate('Earnings')} color={COLORS.info} />
            <ShortcutButton icon="account" label="Profile" onPress={() => navigation.navigate('Profile')} color={theme.colors.secondary} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const ShortcutButton = ({ icon, label, onPress, color }: any) => (
  <TouchableOpacity 
    style={[
      styles.shortcutButton, 
      { 
        backgroundColor: color + '15',
        borderColor: color + '30',
        borderWidth: 1,
      }
    ]} 
    onPress={onPress}
  >
    <View style={styles.shortcutIconContainer}>
      <MaterialCommunityIcons name={icon} size={28} color={color} />
    </View>
    <Text style={[styles.shortcutText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { paddingTop: 45, padding: 24 },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  motivationCard: { 
    borderRadius: 16, 
    borderWidth: 1, 
    marginBottom: 18, 
    marginHorizontal: 2, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toggleCard: { 
    borderRadius: 16, 
    borderWidth: 1, 
    marginBottom: 18, 
    marginHorizontal: 2, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toggleContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    paddingHorizontal: 16,
  },
  statsGrid: { marginBottom: 24 },
  statsRowGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCardGrid: { 
    flex: 1, 
    marginHorizontal: 4, 
    borderRadius: 16, 
    elevation: 3, 
    minHeight: 120, 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statContentGrid: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statValueGrid: { 
    fontWeight: 'bold', 
    fontSize: 24, 
    marginTop: 8,
    textAlign: 'center',
  },
  statLabelGrid: { 
    color: COLORS.gray?.[600], 
    marginTop: 4, 
    fontSize: 13,
    textAlign: 'center',
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { flex: 1, marginHorizontal: 4, borderRadius: 12, elevation: 2 },
  statContent: { alignItems: 'center', justifyContent: 'center' },
  statValue: { fontWeight: 'bold', fontSize: 18, marginTop: 8 },
  statLabel: { color: COLORS.gray?.[600], marginTop: 2 },
  shortcutsGrid: {
    marginTop: 16,
    gap: 16,
  },
  shortcutsRowGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 16,
  },
  shortcutButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    minHeight: 100,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  shortcutIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  shortcutText: {
    fontWeight: '600',
    fontSize: 14,
  },
});

export default RunnerDashboardScreen; 
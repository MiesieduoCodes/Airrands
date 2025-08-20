import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RunnerTabParamList, RunnerNavigatorProps } from './types';
import ErrandsScreen from '../screens/runner/ErrandsScreen';
import MessagesScreen from '../screens/runner/MessagesScreen';
import ProfileScreen from '../screens/runner/ProfileScreen';
import RunnerDashboardScreen from '../screens/runner/RunnerDashboardScreen';
import EarningsScreen from '../screens/runner/EarningsScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from 'react-native-paper';
import { db } from '../config/firebase';

const Tab = createBottomTabNavigator<RunnerTabParamList>();

const RunnerNavigator: React.FC<RunnerNavigatorProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const userId = user?.uid;
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [unreadErrands, setUnreadErrands] = React.useState(0);

  React.useEffect(() => {
    if (!userId) return;

    // Listen for unread messages in chats
    const unsubscribeMessages = db
      .collection('chats')
      .where('participants', 'array-contains', userId)
      .onSnapshot(snapshot => {
        let total = 0;
        snapshot.forEach(doc => {
          const chatData = doc.data();
          // Only count messages not sent by the current user
          if (chatData.unreadCount && chatData.lastMessage?.senderId !== userId) {
            total += chatData.unreadCount || 0;
          }
        });
        setUnreadCount(total);
      });

    // Listen for new errands assigned to this runner
    const unsubscribeErrands = db
      .collection('errands')
      .where('runnerId', '==', userId)
      .where('status', '==', 'assigned')
      .onSnapshot(snapshot => {
        setUnreadErrands(snapshot.size);
      });

    return () => {
      unsubscribeMessages();
      unsubscribeErrands();
    };
  }, [userId]);

  return (<Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          borderTopWidth: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: 20,
          paddingTop: 5,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
            <Tab.Screen
        name="Dashboard"
        component={RunnerDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard', tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <React.Fragment>
              <MaterialCommunityIcons name="home" size={size} color={color} />
              {unreadErrands > 0 && (
                <Badge
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -12,
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.onPrimary,
                    fontSize: 10,
                    zIndex: 1,
                  }}
                  size={16}
                >
                  {unreadErrands > 99 ? '99+' : unreadErrands}
                </Badge>
              )}
            </React.Fragment>
          ),
        }}
      />

      <Tab.Screen
        name="Errands"
        component={ErrandsScreen}
        options={{
          tabBarLabel: 'Errands',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <React.Fragment>
              <MaterialCommunityIcons name="clipboard-list" size={size} color={color} />
              {unreadErrands > 0 && (
                <Badge
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -12,
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.onPrimary,
                    fontSize: 10,
                    zIndex: 1,
                  }}
                  size={16}
                >
                  {unreadErrands > 99 ? '99+' : unreadErrands}
                </Badge>
              )}
            </React.Fragment>
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <React.Fragment>
              <MaterialCommunityIcons name="message" size={size} color={color} />
              {unreadCount > 0 && (
                <Badge
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -12,
                    backgroundColor: theme.colors.primary,
                    color: theme.colors.onPrimary,
                    fontSize: 10,
                    zIndex: 1,
                  }}
                  size={16}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </React.Fragment>
          ),
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          tabBarLabel: 'Earnings',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="cash" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default RunnerNavigator; 
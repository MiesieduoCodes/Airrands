import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SellerTabParamList, SellerNavigatorProps } from './types';
import ProductsScreen from '../screens/seller/ProductsScreen';
import MessagesScreen from '../screens/seller/MessagesScreen';
import OrdersScreen from '../screens/seller/OrdersScreen';
import ProfileScreen from '../screens/seller/ProfileScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from 'react-native-paper';
import { db } from '../config/firebase';

const Tab = createBottomTabNavigator<SellerTabParamList>();

const SellerNavigator: React.FC<SellerNavigatorProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const userId = user?.uid;
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [unreadOrders, setUnreadOrders] = React.useState(0);

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

    // Listen for pending orders
    const unsubscribeOrders = db
      .collection('orders')
      .where('sellerId', '==', userId)
      .where('status', '==', 'pending')
      .onSnapshot(snapshot => {
        setUnreadOrders(snapshot.size);
      });

    return () => {
      unsubscribeMessages();
      unsubscribeOrders();
    };
  }, [userId]);

  return (<Tab.Navigator
      initialRouteName="Products"
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
        headerShown: false, // We're using custom headers in screens
      }}
    >
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="store" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
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
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <React.Fragment>
              <MaterialCommunityIcons name="package" size={size} color={color} />
              {unreadOrders > 0 && (
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
                  {unreadOrders > 99 ? '99+' : unreadOrders}
                </Badge>
              )}
            </React.Fragment>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default SellerNavigator; 
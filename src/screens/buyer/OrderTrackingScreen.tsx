import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Alert, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { Text, Card, Avatar, Divider, Button, Chip, IconButton, TouchableRipple } from 'react-native-paper';
import RealTimeMap from '../../components/RealTimeMap';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../config/firebase';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { updateOrderStatus } from '../../services/buyerServices';
import io from 'socket.io-client';
import * as Location from 'expo-location';
import { PRODUCTION_CONFIG } from '../../config/production';
import { calculateETA } from '../../utils/maps';

interface OrderTrackingScreenProps {
  route: {
    params: {
      jobType?: 'order' | 'errand';
      jobId?: string;
      orderId?: string;
      orderNumber: string;
      type?: 'order' | 'errand'; // for backward compatibility
      id?: string; // for backward compatibility
      role?: 'buyer' | 'seller' | 'runner';
      quantity?: number;
      productName?: string;
      totalAmount?: number;
    };
  };
  navigation: any;
}


const statusLabels: Record<string, string> = {
  available: 'Available',
  accepted: 'Accepted',
  inprogress: 'In Progress',
  completed: 'Completed',
  pending: 'Pending',
  cancelled: 'Cancelled',
  confirmed: 'Confirmed',
  ontheway: 'On The Way',
  delivered: 'Delivered',
  assigned: 'Assigned to Runner',
  picked_up: 'Picked Up',
  out_for_delivery: 'Out for Delivery',
};

const statusColors: Record<string, string> = {
  available: '#4CAF50',
  accepted: '#42A5F5',
  inprogress: '#66BB6A',
  completed: '#4CAF50',
  pending: '#FF9800',
  cancelled: '#F44336',
  confirmed: '#42A5F5',
  ontheway: '#2196F3',
  delivered: '#4CAF50',
  assigned: '#9C27B0',
  picked_up: '#FF5722',
  out_for_delivery: '#3F51B5',
};



const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({ route, navigation }) => {
  // Prefer jobId, fallback to id
  const id = route.params.jobId || route.params.id || route.params.orderId;
  const type = route.params.jobType || route.params.type || 'order';
  const { role } = route.params;
  const { theme } = useTheme();

  // Helper functions for status display
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return 'check-circle-outline' as const;
      case 'available': return 'package-variant' as const;
      case 'assigned': return 'account-check-outline' as const;
      case 'picked_up': return 'package-variant' as const;
      case 'out_for_delivery': return 'bike' as const;
      case 'delivered': return 'check-circle' as const;
      case 'completed': return 'check-circle' as const;
      default: return 'package-variant' as const;
    }
  };

  const getStatusDescription = (status: string): string => {
    switch (status) {
      case 'confirmed': return 'Order confirmed and ready for pickup';
      case 'available': return 'Package is available at the store';
      case 'assigned': return 'Runner has been assigned to your order';
      case 'picked_up': return 'Runner has picked up your package';
      case 'out_for_delivery': return 'Runner is on the way to you';
      case 'delivered': return 'Package has been delivered successfully';
      case 'completed': return 'Order completed successfully';
      default: return 'Processing your order';
    }
  };
  interface OrderDocument {
    id: string;
    status: string;
    orderNumber?: string;
    createdAt: Date;
    updatedAt?: Date;
    
    // Product Information
    productId?: string;
    productName?: string;
    price?: number;
    quantity?: number;
    totalAmount?: number;
    
    // User Information
    buyerId?: string;
    buyerName?: string;
    buyerEmail?: string;
    sellerId?: string;
    sellerName?: string;
    
    // Payment Information
    paymentMethod?: string;
    paymentStatus?: string;
    paymentReference?: string;
    
    // Delivery Information
    deliveryOption?: 'pickup' | 'delivery';
    
    runnerLocation?: {
      latitude: number;
      longitude: number;
      heading?: number;
    };
    store?: {
      name: string;
      address: string;
      phone?: string;
      latitude: number;
      longitude: number;
    };
    customer?: {
      name: string;
      address: string;
      phone?: string;
      latitude: number;
      longitude: number;
    };
    runnerId?: string;
    runnerName?: string;
    runnerPhone?: string;
    runnerAvatar?: string;
    runnerRating?: number;
    lastLocationUpdate?: Date;
    statusHistory?: Array<{
      status: string;
      timestamp: string;
      description: string;
    }>;
  }
  
  const [doc, setDoc] = useState<OrderDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [eta, setEta] = useState<string>('');
  const [distance, setDistance] = useState<number>(0);

  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [runnerLocation, setRunnerLocation] = useState<{latitude: number; longitude: number; heading?: number} | null>(null);

  
  // Socket configuration
  const SOCKET_URL = PRODUCTION_CONFIG.SOCKET_URL;
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);


    

  const normalizeDate = (value: any): Date | undefined => {
  if (!value) return undefined;

  // Firestore Timestamp object
  if (value.toDate && typeof value.toDate === "function") {
    return value.toDate();
  }

  // ISO string or numeric timestamp
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Already a Date object
  if (value instanceof Date) {
    return value;
  }

  return undefined;
};



  // Get user's current location and update map
  const getUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location services to track your order.'
        );
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const newUserLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setUserLocation(newUserLocation);
      

    } catch (error) {
      console.error('Error getting user location:', error);
      Alert.alert('Location Error', 'Unable to get your current location.');
    }
  };

  const handleStatusUpdate = async (newStatus: string, step: string) => {
    if (!id) return;
    setUpdating(true);
    try {
      await updateOrderStatus(id, newStatus, { step });
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  // Enhanced status update with confirmation
  const confirmStatusUpdate = (newStatus: string, step: string) => {
    let message = '';
    if (newStatus === 'delivered') {
      message = 'Are you sure you want to mark this as Delivered? This action cannot be undone.';
    } else if (newStatus === 'cancelled') {
      message = 'Are you sure you want to cancel this order/errand?';
    } else if (newStatus === 'picked_up') {
      message = 'Confirm that the order has been picked up from the store?';
    }
    
    if (message) {
      Alert.alert('Confirm Action', message, [
          { text: 'No', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: () => handleStatusUpdate(newStatus, step) },
        ]
      );
    } else {
      handleStatusUpdate(newStatus, step);
    }
  };



  // Calculate estimated time and distance
  useEffect(() => {
    if (doc?.createdAt) {
      const createdAt = new Date(doc.createdAt);
      const now = new Date();
      const elapsed = now.getTime() - createdAt.getTime();
      const elapsedMinutes = Math.floor(elapsed / (1000 * 60));
      
      if (elapsedMinutes < 60) {
        setEstimatedTime(`${elapsedMinutes} minutes ago`);
      } else {
        const hours = Math.floor(elapsedMinutes / 60);
        setEstimatedTime(`${hours} hour${hours > 1 ? 's' : ''} ago`);
      }
    }

    // Calculate distance and ETA if runner location is available
    if (doc?.runnerLocation && doc?.customer?.latitude && doc?.customer?.longitude) {
      const distanceKm = Math.sqrt(
        Math.pow(doc.runnerLocation.latitude - doc.customer.latitude, 2) +
        Math.pow(doc.runnerLocation.longitude - doc.customer.longitude, 2)
      ) * 111; // Rough conversion to km
      
      setDistance(distanceKm);
      setEta(calculateETA(distanceKm));
    }
  }, [doc]);

  // Initialize Socket.io connection
  useEffect(() => {
    const initSocket = async () => {
      try {
        const newSocket = io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 5,
        });

        newSocket.on('connect', () => {
          console.log('Socket.io connected for order tracking');
          setIsConnected(true);
          
          // Join tracking room
          if (id && type) {
            newSocket.emit('join', { jobId: id, type, role: 'buyer' });
            
            // Request initial runner location
            newSocket.emit('getRunnerLocation', { jobId: id, type });
          }
        });
        
        // Listen for runner location updates
        newSocket.on('locationUpdate', (data) => {
          if (data.jobId === id) {
            const newLocation = {
              latitude: data.latitude,
              longitude: data.longitude,
              heading: data.heading
            };
            setRunnerLocation(newLocation);
            

          }
        });

        newSocket.on('disconnect', () => {
          console.log('Socket.io disconnected');
          setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket.io connection error:', error);
          setIsConnected(false);
        });

        // Listen for real-time updates
        newSocket.on('statusUpdate', (data: { id: string; status: string; data?: Partial<OrderDocument> }) => {
          if (data.id === id) {
            console.log('Received status update:', data);
            // Update the document with new status
            setDoc(prev => prev ? { ...prev, status: data.status, ...(data.data || {}) } : null);
          }
        });

        newSocket.on('locationUpdate', (data) => {
          if (data.id === id) {
            console.log('Received location update:', data);
            // Update runner location
            setDoc(prev => {
              if (!prev) return null;
              return {
                ...prev,
                runnerLocation: data.location,
                lastLocationUpdate: data.timestamp
              };
            });
          }
        });

        newSocket.on('routeUpdate', (data) => {
          if (data.id === id) {
            console.log('Received route update:', data);
            // Update route coordinates
    
          }
        });

        setSocket(newSocket);

        return () => {
          if (id && type) {
            newSocket.emit('leave', { jobId: id, type });
          }
          newSocket.disconnect();
        };
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
    };

    if (id && type) {
      initSocket();
    }
  }, [id, type, SOCKET_URL]);

  // Real-time Firestore listener
  useEffect(() => {
    const collection = type === 'order' ? 'orders' : 'errands';
    const unsubscribe = db.collection(collection).doc(id).onSnapshot(snapshot => {
      if (!snapshot.exists) {
        setDoc(null);
        return;
      }
      const data = snapshot.data();
      if (!data) {
        setDoc(null);
        return;
      }
  
      setDoc({
        id: snapshot.id,
        status: data.status || 'pending',
        createdAt: normalizeDate(data.createdAt) || new Date(),
        updatedAt: normalizeDate(data.updatedAt),
        orderNumber: data.orderNumber,
  
        // Product Information
        productId: data.productId,
        productName: data.productName,
        price: data.price,
        quantity: data.quantity,
        totalAmount: data.totalAmount,
  
        // User Information
        buyerId: data.buyerId,
        buyerName: data.buyerName,
        buyerEmail: data.buyerEmail,
        sellerId: data.sellerId,
        sellerName: data.sellerName,
  
        // Payment Information
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus,
        paymentReference: data.paymentReference,
  
        // Delivery Information
        deliveryOption: data.deliveryOption,
  
        runnerLocation: data.runnerLocation,
        store: data.store,
        customer: data.customer,
        runnerId: data.runnerId,
        runnerName: data.runnerName,
        runnerPhone: data.runnerPhone,
        runnerAvatar: data.runnerAvatar,
        runnerRating: data.runnerRating,
        lastLocationUpdate: normalizeDate(data.lastLocationUpdate),
        statusHistory: (data.statusHistory || []).map((s: any) => ({
          ...s,
          timestamp: normalizeDate(s.timestamp),
        })),
      });
  
      setLoading(false);
    }, (error) => {
      console.error('Firestore listener error:', error);
      setLoading(false);
    });
  
    return () => unsubscribe();
  }, [id, type]);
  

  // Get user location on mount
  useEffect(() => {
    getUserLocation();
  }, []);



  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
          Loading tracking information...
        </Text>
      </View>
    );
  }
  
  if (!doc) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="map-marker-question" size={64} color={theme.colors.onSurfaceVariant} />
        <Text style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
          Order/Errand not found.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View>
              <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                {type === 'order' ? 'Order Tracking' : 'Errand Tracking'}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                {doc.orderNumber || `#${doc.id.slice(-8)}`}
              </Text>
            </View>
            <View style={[styles.connectionStatus, { backgroundColor: isConnected ? theme.colors.primary : theme.colors.error }]}>
              <Text style={styles.connectionText}>
                {isConnected ? '🟢 Live' : '🔴 Offline'}
              </Text>
            </View>
          </View>
          
          {/* ETA and Distance Information */}
          {runnerLocation && userLocation && (
            <View style={styles.trackingInfo}>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} />
                <View style={{ marginLeft: 8 }}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Estimated Time</Text>
                  <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{estimatedTime || 'Calculating...'}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="map-marker-radius" size={24} color={theme.colors.primary} />
                <View style={{ marginLeft: 8 }}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Distance</Text>
                  <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{distance > 0 ? `${distance.toFixed(1)} km` : 'Calculating...'}</Text>
                </View>
              </View>
            </View>
          )}
          
          <Divider style={{ marginVertical: 16 }} />
          
          {/* Order Details */}
          {(doc.productName || doc.totalAmount) && (
            <View style={styles.orderDetails}>
              <Text style={{ fontWeight: 'bold', marginBottom: 12 }}>Order Details</Text>
              {doc.productName && (
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Product:</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                    {doc.productName} {doc.quantity && `(${doc.quantity}x)`}
                  </Text>
                </View>
              )}
              {doc.totalAmount && (
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Total:</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.primary }}>
                    ₦{doc.totalAmount.toLocaleString()}
                  </Text>
                </View>
              )}
              {doc.paymentMethod && (
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Payment:</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                    {doc.paymentMethod.charAt(0).toUpperCase() + doc.paymentMethod.slice(1)}
                    {doc.paymentStatus && ` (${doc.paymentStatus})`}
                  </Text>
                </View>
              )}
              {doc.deliveryOption && (
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Delivery:</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                    {doc.deliveryOption.charAt(0).toUpperCase() + doc.deliveryOption.slice(1)}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          <Divider style={{ marginVertical: 16 }} />
          
          {/* Real-time Status */}
          <View style={styles.statusSection}>
            <Text style={{ fontWeight: 'bold', marginBottom: 12 }}>Live Status</Text>
            
            {/* Current Status with Icon */}
            <View style={styles.liveStatusContainer}>
                    <View style={[
                styles.statusIconLarge,
                { backgroundColor: statusColors?.[doc.status] || theme.colors.primary }
                    ]}>
                      <MaterialCommunityIcons 
                  name={getStatusIcon(doc.status)} 
                  size={24} 
                  color="white" 
                      />
                    </View>
              <View style={styles.statusInfo}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                  {statusLabels?.[doc.status] || doc.status}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {getStatusDescription(doc.status)}
                    </Text>
                  </View>
            </View>

            {/* Live Updates */}
            <View style={styles.liveUpdatesContainer}>
              <View style={styles.updateItem}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.primary} />
                <Text style={{ marginLeft: 8, color: theme.colors.onSurfaceVariant }}>
                  {estimatedTime ? `Started ${estimatedTime}` : 'Just started'}
                </Text>
              </View>
              {eta && (
                <View style={styles.updateItem}>
                  <MaterialCommunityIcons name="map-marker-radius" size={16} color={theme.colors.secondary} />
                  <Text style={{ marginLeft: 8, color: theme.colors.onSurfaceVariant }}>
                    ETA: {eta}
                  </Text>
                </View>
              )}
              {distance && (
                <View style={styles.updateItem}>
                  <MaterialCommunityIcons name="map-marker-radius" size={16} color={theme.colors.tertiary} />
                  <Text style={{ marginLeft: 8, color: theme.colors.onSurfaceVariant }}>
                    Distance: {distance}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Current Status */}
          <View style={styles.currentStatus}>
            <Chip 
              mode="outlined"
              textStyle={{ color: statusColors?.[doc.status] || theme.colors.primary }}
              style={{ borderColor: statusColors?.[doc.status] || theme.colors.primary }}
            >
              {statusLabels?.[doc.status] || doc.status}
            </Chip>
            {estimatedTime && (
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                Started {estimatedTime}
              </Text>
            )}
            {eta && (
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                ETA: {eta}
              </Text>
            )}
            {distance && (
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                Distance: {distance}
              </Text>
            )}
          </View>

          {/* Runner Information */}
          {doc.runnerId && (
            <View style={styles.section}>
              <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Runner</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar.Image size={50} source={{ uri: doc.runnerAvatar || 'https://i.imgur.com/T3zF9bJ.png' }} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>{doc.runnerName || 'Runner'}</Text>
                  {doc.runnerPhone && <Text style={{ color: theme.colors.onSurfaceVariant }}>{doc.runnerPhone}</Text>}
                  {doc.runnerRating && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                      <Text style={{ marginLeft: 4 }}>{doc.runnerRating}</Text>
                    </View>
                  )}
                </View>
                <Button 
                  mode="outlined" 
                  compact 
                  onPress={async () => {
                    try {
                      const { getOrCreateChat } = await import('../../services/chatService');
                      if (!doc.runnerId) {
                        throw new Error('Runner ID not found');
                      }
                      const chatResult = await getOrCreateChat(doc.runnerId);
                      
                      navigation.navigate('Chat', { 
                        chatId: chatResult.chatId,
                        chatName: doc.runnerName || 'Runner',
                        chatAvatar: doc.runnerAvatar || '',
                        chatRole: 'runner'
                      });
                    } catch (error) {
                      console.error('Error creating chat:', error);
                      Alert.alert('Error', 'Failed to start conversation. Please try again.');
                    }
                  }}
                >
                  Message
                </Button>
              </View>
            </View>
          )}

          {/* Store Information */}
          {doc.store && (
            <View style={styles.section}>
              <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Store</Text>
              <View style={styles.locationCard}>
                <MaterialCommunityIcons name="store" size={20} color={theme.colors.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>{doc.store.name}</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>{doc.store.address}</Text>
                  {doc.store.phone && <Text style={{ color: theme.colors.onSurfaceVariant }}>{doc.store.phone}</Text>}
                </View>
              </View>
            </View>
          )}

          {/* Customer Information */}
          {doc.customer && (
            <View style={styles.section}>
              <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Delivery Address</Text>
              <View style={styles.locationCard}>
                <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>{doc.customer.name}</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>{doc.customer.address}</Text>
                  {doc.customer.phone && <Text style={{ color: theme.colors.onSurfaceVariant }}>{doc.customer.phone}</Text>}
                </View>
              </View>
            </View>
          )}

          {/* Enhanced Real-time Map with Route */}
          {doc.runnerLocation && doc.runnerLocation.latitude && doc.runnerLocation.longitude && (<View style={styles.mapSection}>
              <View style={styles.mapHeader}>
                <View style={styles.mapTitleRow}>
                  <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Live Tracking</Text>
                  <IconButton
                    icon="refresh"
                    size={20}
                    onPress={() => {
                      // Trigger a manual refresh
                      if (socket) {
                        socket.emit('requestUpdate', { jobId: id, type });
                      }
                    }}
                  />
                </View>
                <View style={styles.trackingInfo}>
                  {distance && (
                    <Chip mode="outlined" style={styles.infoChip}>
                      <MaterialCommunityIcons name="map-marker-radius" size={16} />
                      <Text style={{ marginLeft: 4 }}>{distance}</Text>
                    </Chip>
                  )}
                  {eta && (
                    <Chip mode="outlined" style={styles.infoChip}>
                      <MaterialCommunityIcons name="clock-outline" size={16} />
                      <Text style={{ marginLeft: 4 }}>ETA: {eta}</Text>
                    </Chip>
                  )}
                  <Chip 
                    mode="outlined" 
                    style={[styles.connectionChip, { backgroundColor: isConnected ? '#4CAF50' : '#FF5722' }]}
                  >
                    <MaterialCommunityIcons 
                      name={isConnected ? "wifi" : "wifi-off"} 
                      size={16} 
                      color="white" 
                    />
                    <Text style={{ marginLeft: 4, color: 'white' }}>
                      {isConnected ? 'Live' : 'Offline'}
                    </Text>
                  </Chip>
                </View>
              </View>
                            <RealTimeMap
                height={300}
                markers={[
                  // Runner marker
                  ...(doc.runnerLocation ? [{
                    id: 'runner',
                    coordinate: {
                    latitude: doc.runnerLocation.latitude,
                    longitude: doc.runnerLocation.longitude,
                    },
                    title: 'Runner',
                    description: 'Your delivery partner',
                    type: 'runner' as const,
                    data: {
                      id: doc.runnerId,
                      name: doc.runnerName,
                      avatar: doc.runnerAvatar,
                      rating: doc.runnerRating,
                      phone: doc.runnerPhone,
                    },
                    onPress: () => {},
                  }] : []),
                  // Store marker
                  ...(doc.store?.latitude && doc.store?.longitude ? [{
                    id: 'store',
                    coordinate: {
                      latitude: doc.store.latitude,
                      longitude: doc.store.longitude,
                    },
                    title: doc.store.name || 'Store',
                    description: 'Pickup location',
                    type: 'store' as const,
                    data: doc.store,
                    onPress: () => {},
                  }] : []),
                  // Customer/Delivery marker
                  ...(doc.customer?.latitude && doc.customer?.longitude ? [{
                    id: 'delivery',
                    coordinate: {
                      latitude: doc.customer.latitude,
                      longitude: doc.customer.longitude,
                    },
                    title: 'Delivery Location',
                    description: 'Your address',
                    type: 'delivery' as const,
                    data: doc.customer,
                    onPress: () => {},
                  }] : []),
                  // User location marker
                  ...(userLocation ? [{
                    id: 'user-location',
                    coordinate: userLocation,
                    title: 'Your Location',
                    description: 'You are here',
                    type: 'user' as const,
                    data: null,
                    onPress: () => {},
                  }] : []),
                ]}
                routes={[
                  // Route from store to delivery location
                  ...(doc.store?.latitude && doc.store?.longitude && doc.customer?.latitude && doc.customer?.longitude ? [{
                    origin: {
                      latitude: doc.store.latitude,
                      longitude: doc.store.longitude,
                    },
                    destination: {
                      latitude: doc.customer.latitude,
                      longitude: doc.customer.longitude,
                    },
                    points: [],
                  }] : []),
                ]}
                realTimeUpdates={true}
                updateInterval={10000}
                onLocationUpdate={(location) => {
                  if (userLocation?.latitude !== location.latitude || userLocation?.longitude !== location.longitude) {
                    setUserLocation(location);
                  }
                }}
              />
              
              {/* Real-time Status Updates */}
              {doc.lastLocationUpdate && (
                <View style={styles.lastUpdateInfo}>
                  <MaterialCommunityIcons name="update" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text style={{ marginLeft: 4, color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                    Last updated: {new Date(doc.lastLocationUpdate).toLocaleTimeString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons for Seller/Runner */}
          {role && (role === 'seller' || role === 'runner') && doc.status !== 'completed' && (<View style={styles.actionButtons}>
              {doc.status === 'confirmed' && (
                <Button mode="contained" onPress={() => confirmStatusUpdate('available', 'available')} loading={updating} style={styles.actionButton}>
                  Mark as Available
                </Button>
              )}
              {doc.status === 'available' && (<Button mode="contained" onPress={() => confirmStatusUpdate('assigned', 'assigned')} loading={updating} style={styles.actionButton}>
                  Mark as Assigned
                </Button>
              )}
              {doc.status === 'assigned' && (<Button mode="contained" onPress={() => confirmStatusUpdate('picked_up', 'picked_up')} loading={updating} style={styles.actionButton}>
                  Mark as Picked Up
                </Button>
              )}
              {doc.status === 'picked_up' && (<Button mode="contained" onPress={() => confirmStatusUpdate('out_for_delivery', 'out_for_delivery')} loading={updating} style={styles.actionButton}>
                  Mark as On The Way
                </Button>
              )}
              {doc.status === 'out_for_delivery' && (<Button mode="contained" onPress={() => confirmStatusUpdate('delivered', 'delivered')} loading={updating} style={styles.actionButton}>
                  Mark as Delivered
                </Button>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 32,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    marginRight: 8,
  },
  card: {
    margin: 16,
    borderRadius: 16,
    elevation: 2,
    padding: 8,
  },
  section: {
    marginTop: 20,
    marginBottom: 8,
  },
  statusSection: {
    marginBottom: 20,
  },
  statusSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusStep: {
    alignItems: 'center',
    flex: 1,
  },
  statusIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  liveStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
  },
  statusInfo: {
    flex: 1,
  },
  liveUpdatesContainer: {
    gap: 12,
  },
  updateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  orderDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  currentStatus: {
    alignItems: 'center',
    marginBottom: 20,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },

  trackingInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  infoChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  connectionChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  lastUpdateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },

  actionButtons: {
    marginTop: 24,
  },
  actionButton: {
    marginBottom: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  connectionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectionText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mapSection: {
    marginBottom: 20,
  },
  mapHeader: {
    marginBottom: 16,
  },
  mapTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default OrderTrackingScreen; 
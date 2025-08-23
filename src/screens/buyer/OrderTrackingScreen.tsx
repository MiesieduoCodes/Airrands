import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Alert, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { Text, Card, Avatar, Divider, Button, ProgressBar, Chip, IconButton, TouchableRipple } from 'react-native-paper';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { useTheme } from '../../contexts/ThemeContext';
import * as polyline from '@mapbox/polyline';
import { db } from '../../config/firebase';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { updateOrderStatus } from '../../services/buyerServices';
import io from 'socket.io-client';
import * as Location from 'expo-location';
import { PRODUCTION_CONFIG } from '../../config/production';

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

import { getDirections, getRegionForCoordinates, calculateETA } from '../../utils/maps';

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
  pickedup: 'Picked Up',
  outfordelivery: 'Out for Delivery',
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
  pickedup: '#FF5722',
  outfordelivery: '#3F51B5',
};

const statusSteps = [
  { key: 'confirmed', label: 'Confirmed', icon: 'check-circle-outline' },
  { key: 'available', label: 'Available', icon: 'package-variant' },
  { key: 'assigned', label: 'Assigned', icon: 'account-check-outline' },
  { key: 'picked_up', label: 'Picked Up', icon: 'package-variant' },
  { key: 'out_for_delivery', label: 'On The Way', icon: 'bike' },
  { key: 'delivered', label: 'Delivered', icon: 'check-circle' },
];

const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({ route, navigation }) => {
  // Prefer jobId, fallback to id
  const id = route.params.jobId || route.params.id || route.params.orderId;
  const type = route.params.jobType || route.params.type || 'order';
  const { role } = route.params;
  const { theme } = useTheme();
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
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{latitude: number; longitude: number}>>([]);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [runnerLocation, setRunnerLocation] = useState<{latitude: number; longitude: number; heading?: number} | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapView>(null);
  
  // Socket configuration
  const SOCKET_URL = PRODUCTION_CONFIG.SOCKET_URL;
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Update route on map
  const updateRouteOnMap = async (start: any, end: any) => {
    try {
      const routeResult = await getDirections(start, end);
      
      if (routeResult) {
        setRouteCoordinates(routeResult.points);
        setDistance(routeResult.distance);
        setEstimatedTime(calculateETA(routeResult.distance));
        
        // Update map region to show the entire route
        const region = getRegionForCoordinates([start, end, ...routeResult.points]);
        setMapRegion(region);
        mapRef.current?.animateToRegion(region, 1000);
      }
    } catch (error) {
      console.error('Error updating route:', error);
    }
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };

  // Calculate ETA based on distance and average speed
  const calculateETA = (distanceKm: number): string => {
    const averageSpeedKmh = 15; // Average delivery speed in km/h
    const timeHours = distanceKm / averageSpeedKmh;
    const timeMinutes = Math.round(timeHours * 60);
    
    if (timeMinutes < 60) {
      return `${timeMinutes} minutes`;
    } else {
      const hours = Math.floor(timeMinutes / 60);
      const minutes = timeMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
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
      
      // If we have runner location, update the route
      if (runnerLocation) {
        updateRouteOnMap(newUserLocation, runnerLocation);
      }
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

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (!doc) return 0;
    const currentIndex = statusSteps.findIndex(step => step.key === doc.status);
    return currentIndex >= 0 ? (currentIndex + 1) / statusSteps.length : 0;
  };

  // Get current step index
  const getCurrentStepIndex = () => {
    if (!doc) return 0;
    return statusSteps.findIndex(step => step.key === doc.status);
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
      const distanceKm = calculateDistance(
        doc.runnerLocation.latitude,
        doc.runnerLocation.longitude,
        doc.customer.latitude,
        doc.customer.longitude
      );
      
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
            
            // Update route if we have both locations
            if (userLocation) {
              updateRouteOnMap(userLocation, newLocation);
            }
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
            setRouteCoordinates(data.route || []);
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
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
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
        lastLocationUpdate: data.lastLocationUpdate?.toDate(),
        statusHistory: data.statusHistory || []
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

  // Auto-fit map to show all markers
  useEffect(() => {
    if (mapRef.current && doc) {
      const coordinates = [];
      
      if (doc.runnerLocation) {
        coordinates.push(doc.runnerLocation);
      }
      if (doc.store?.latitude) {
        coordinates.push({
          latitude: doc.store.latitude,
          longitude: doc.store.longitude,
        });
      }
      if (doc.customer?.latitude) {
        coordinates.push({
          latitude: doc.customer.latitude,
          longitude: doc.customer.longitude,
        });
      }
      if (userLocation) {
        coordinates.push(userLocation);
      }

      if (coordinates.length > 0) {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    }
  }, [doc, userLocation]);

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
                <MaterialCommunityIcons name="map-marker-distance" size={24} color={theme.colors.primary} />
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
          
          {/* Status Progress */}
          <View style={styles.statusSection}>
            <Text style={{ fontWeight: 'bold', marginBottom: 12 }}>Status Progress</Text>
            <ProgressBar 
              progress={getProgressPercentage()} 
              color={theme.colors.primary} 
              style={{ height: 8, borderRadius: 4, marginBottom: 16 }}
            />
            
            {/* Status Steps */}
            <View style={styles.statusSteps}>
              {statusSteps.map((step, index) => {
                const isCompleted = index <= getCurrentStepIndex();
                const isCurrent = index === getCurrentStepIndex();
                return (
                  <View key={step.key} style={styles.statusStep}>
                    <View style={[
                      styles.statusIcon,
                      { 
                        backgroundColor: isCompleted ? theme.colors.primary : theme.colors.surfaceVariant,
                        borderColor: isCurrent ? theme.colors.primary : 'transparent'
                      }
                    ]}>
                      <MaterialCommunityIcons 
                        name={step.icon as any} 
                        size={20} 
                        color={isCompleted ? 'white' : theme.colors.onSurfaceVariant} 
                      />
                    </View>
                    <Text style={[
                      styles.statusLabel,
                      { 
                        color: isCompleted ? theme.colors.primary : theme.colors.onSurfaceVariant,
                        fontWeight: isCurrent ? 'bold' : 'normal'
                      }
                    ]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
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
                      <MaterialCommunityIcons name="map-marker-distance" size={16} />
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
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={mapRegion || {
                  latitude: doc.runnerLocation?.latitude || 0,
                  longitude: doc.runnerLocation?.longitude || 0,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                region={mapRegion || undefined}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                loadingEnabled={true}
                minZoomLevel={12}
              >
                <Marker
                  coordinate={{
                    latitude: doc.runnerLocation.latitude,
                    longitude: doc.runnerLocation.longitude,
                  }}
                  title="Runner"
                  pinColor={theme.colors.primary}
                />
                {doc.store?.latitude && doc.store?.longitude && (
                  <Marker
                    coordinate={{
                      latitude: doc.store.latitude,
                      longitude: doc.store.longitude,
                    }}
                    title="Store"
                    pinColor="#FF9800"
                  />
                )}
                {doc.customer?.latitude && doc.customer?.longitude && (
                  <Marker
                    coordinate={{
                      latitude: doc.customer.latitude,
                      longitude: doc.customer.longitude,
                    }}
                    title="Delivery"
                    pinColor="#4CAF50"
                  />
                )}
                {userLocation && (
                  <Marker
                    coordinate={{
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                    }}
                    title="Your Location"
                    pinColor="#007BFF"
                  />
                )}
                {routeCoordinates.length > 0 && (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeWidth={4}
                    strokeColor={theme.colors.primary}
                  />
                )}
              </MapView>
              
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
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 12,
    textAlign: 'center',
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
  mapSection: {
    marginTop: 20,
  },
  map: {
    height: 250,
    borderRadius: 12,
  },
  mapHeader: {
    marginBottom: 12,
  },
  mapTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  runnerMarker: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  storeMarker: {
    backgroundColor: '#FF9800',
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  deliveryMarker: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  userMarker: {
    backgroundColor: '#2196F3',
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: 'white',
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
});

export default OrderTrackingScreen; 
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Text, Card, Avatar, Divider, Button, ProgressBar, Chip, IconButton } from 'react-native-paper';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../config/firebase';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { updateOrderStatus } from '../../services/buyerServices';
import io from 'socket.io-client';
import * as Location from 'expo-location';

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
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [eta, setEta] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<any>(null);
  const mapRef = useRef<MapView>(null);
  
  // Socket configuration
  const SOCKET_URL = 'https://your-production-domain.com'; // Replace with your actual server URL
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

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

  // Get user's current location
  const getUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting user location:', error);
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
      
      setDistance(`${distanceKm.toFixed(1)} km`);
      setEta(calculateETA(distanceKm));
    }
  }, [doc]);

  // Socket connection for real-time updates
  useEffect(() => {
    if (!id) return;
    
    const s = io(SOCKET_URL, { 
      transports: ['websocket'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    s.on('connect', () => {
      setIsConnected(true);
    s.emit('join', { jobId: id, type });
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Listen for status/location updates
    s.on('statusUpdate', (data) => {
      if (data.id === id) {
        setDoc((prev: any) => ({ ...prev, status: data.status }));
      }
    });

    s.on('locationUpdate', (data) => {
      if (data.id === id) {
        setDoc((prev: any) => ({ 
          ...prev, 
          runnerLocation: data.location,
          lastLocationUpdate: new Date().toISOString()
        }));
      }
    });

    s.on('routeUpdate', (data) => {
      if (data.id === id && data.route) {
        setRouteCoordinates(data.route);
      }
    });

    setSocket(s);
    
    return () => {
      s.emit('leave', { jobId: id, type });
      s.disconnect();
    };
  }, [id, type]);

  // Real-time Firestore listener
  useEffect(() => {
    const collection = type === 'order' ? 'orders' : 'errands';
    const unsubscribe = db.collection(collection).doc(id).onSnapshot(snapshot => {
      setDoc(snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null);
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
          <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {type === 'order' ? 'Order Tracking' : 'Errand Tracking'}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            {doc.orderNumber || `#${doc.id.slice(-8)}`}
          </Text>
          
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
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: doc.runnerLocation.latitude,
                  longitude: doc.runnerLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                region={{
                  latitude: doc.runnerLocation.latitude,
                  longitude: doc.runnerLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
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
});

export default OrderTrackingScreen; 
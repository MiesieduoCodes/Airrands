import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Text, Card, Button, ProgressBar, Chip, IconButton, SegmentedButtons } from 'react-native-paper';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import io from 'socket.io-client';
import * as Location from 'expo-location';
import { updateErrandStatus, updateRunnerLocation } from '../../services/runnerServices';
import { PRODUCTION_CONFIG } from '../../config/production';

interface RunnerTrackingScreenProps {
  route: {
    params: {
      jobId?: string;
      jobType?: 'order' | 'errand';
      orderId?: string;
      errandId?: string;
    };
  };
  navigation: any;
}

const RunnerTrackingScreen: React.FC<RunnerTrackingScreenProps> = ({ route, navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  
  // Get job details from route params
  const jobId = route.params.jobId || route.params.orderId || route.params.errandId;
  const jobType = route.params.jobType || 'errand';
  
  // State management
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [eta, setEta] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracking' | 'details'>('tracking');
  
  // Socket configuration
  const SOCKET_URL = PRODUCTION_CONFIG.SOCKET_URL;
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const mapRef = useRef<MapView>(null);
  const locationInterval = useRef<NodeJS.Timeout | null>(null);

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
        Alert.alert('Permission Denied', 'Location permission is required for tracking.');
        return null;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setUserLocation(currentLocation);
      
      // Update runner location in database
      if (user?.uid) {
        await updateRunnerLocation(user.uid, currentLocation.latitude, currentLocation.longitude);
      }
      
      return currentLocation;
    } catch (error) {
      console.error('Error getting user location:', error);
      Alert.alert('Error', 'Failed to get current location.');
      return null;
    }
  };

  // Start location tracking
  const startLocationTracking = async () => {
    if (!user?.uid) return;
    
    try {
      await getUserLocation();
      setIsTracking(true);
      
      // Update location every 15 seconds
      locationInterval.current = setInterval(async () => {
        const location = await getUserLocation();
        if (location && socket) {
          socket.emit('locationUpdate', {
            id: jobId,
            type: jobType,
            location: location,
            runnerId: user.uid,
          });
        }
      }, 15000);
      
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking.');
    }
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    setIsTracking(false);
    if (locationInterval.current) {
      clearInterval(locationInterval.current);
      locationInterval.current = null;
    }
  };

  // Handle status updates
  const handleStatusUpdate = async (newStatus: string) => {
    if (!jobId || !user?.uid) return;
    
    setUpdating(true);
    try {
      if (jobType === 'errand') {
        await updateErrandStatus(user.uid, jobId, newStatus);
      }
      
      // Emit status update via socket
      if (socket) {
        socket.emit('statusUpdate', { 
          id: jobId, 
          type: jobType, 
          status: newStatus,
          runnerId: user.uid,
        });
      }
      
      // Update local state
      setJob((prev: any) => ({ ...prev, status: newStatus }));
      
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Get progress percentage based on status
  const getProgressPercentage = () => {
    if (!job) return 0;
    
    const statusSteps = {
      'available': 0,
      'accepted': 0.25,
      'in_progress': 0.5,
      'on_the_way': 0.75,
      'completed': 1,
    };
    
    return statusSteps?.[job.status as keyof typeof statusSteps] || 0;
  };

  // Socket connection for real-time updates
  useEffect(() => {
    if (!jobId) return;
    
    const s = io(SOCKET_URL, { 
      transports: ['websocket'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('join', { jobId, type: jobType, role: 'runner' });
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Listen for status updates
    s.on('statusUpdate', (data) => {
      if (data.id === jobId) {
        setJob((prev: any) => ({ ...prev, status: data.status }));
      }
    });

    // Listen for route updates
    s.on('routeUpdate', (data) => {
      if (data.id === jobId && data.route) {
        setRouteCoordinates(data.route);
      }
    });

    // Listen for customer location updates
    s.on('customerLocationUpdate', (data) => {
      if (data.id === jobId) {
        setJob((prev: any) => ({ 
          ...prev, 
          customerLocation: data.location,
          lastCustomerLocationUpdate: new Date().toISOString()
        }));
      }
    });

    setSocket(s);
    
    return () => {
      s.emit('leave', { jobId, type: jobType, role: 'runner' });
      s.disconnect();
    };
  }, [jobId, jobType]);

  // Real-time Firestore listener
  useEffect(() => {
    if (!jobId) return;
    
    const collection = jobType === 'order' ? 'orders' : 'errands';
    const unsubscribe = db.collection(collection).doc(jobId).onSnapshot(snapshot => {
      if (snapshot.exists) {
        const jobData = { id: snapshot.id, ...snapshot.data() } as any;
        setJob(jobData);
        
        // Calculate distance and ETA if we have locations
        if (userLocation && jobData.customerLocation) {
          const dist = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            jobData.customerLocation.latitude,
            jobData.customerLocation.longitude
          );
          setDistance(`${dist.toFixed(1)} km`);
          setEta(calculateETA(dist));
        }
      }
      setLoading(false);
    }, (error) => {
      console.error('Firestore listener error:', error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [jobId, jobType, userLocation]);

  // Get user location on mount
  useEffect(() => {
    getUserLocation();
  }, []);

  // Auto-fit map to show all markers
  useEffect(() => {
    if (mapRef.current && job && userLocation) {
      const coordinates = [];
      
      // Add runner location
      coordinates.push(userLocation);
      
      // Add customer location
      if (job.customerLocation) {
        coordinates.push(job.customerLocation);
      }
      
      // Add pickup location (if different from customer location)
      if (job.pickupLocation && 
          (job.pickupLocation.latitude !== job.customerLocation?.latitude || 
           job.pickupLocation.longitude !== job.customerLocation?.longitude)) {
        coordinates.push(job.pickupLocation);
      }

      if (coordinates.length > 0) {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    }
  }, [job, userLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
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
  
  if (!job) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="map-marker-question" size={64} color={theme.colors.onSurfaceVariant} />
        <Text style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
          Job not found.
        </Text>
      </View>
    );
  }

  return (<SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={theme.colors.onSurface}
        />
        <View style={styles.headerContent}>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
            {jobType === 'order' ? 'Order Tracking' : 'Errand Tracking'}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {job.orderNumber || `#${job.id.slice(-8)}`}
          </Text>
        </View>
        <IconButton
          icon="dots-vertical"
          size={24}
          onPress={() => {/* Add menu options */}}
          iconColor={theme.colors.onSurface}
        />
      </View>

      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'tracking', label: 'Live Tracking', icon: 'map-marker-path' },
            { value: 'details', label: 'Job Details', icon: 'information' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {activeTab === 'tracking' ? (
        <ScrollView style={styles.scrollContainer}>
          {/* Status Progress */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 12 }}>
                Status Progress
              </Text>
              <ProgressBar 
                progress={getProgressPercentage()} 
                color={theme.colors.primary} 
                style={{ height: 8, borderRadius: 4, marginBottom: 16 }}
              />
              
              {/* Status Steps */}
              <View style={styles.statusSteps}>
                {['available', 'accepted', 'in_progress', 'on_the_way', 'completed'].map((step, index) => (
                  <View key={step} style={styles.statusStep}>
                    <View style={[
                      styles.stepDot,
                      { backgroundColor: theme.colors.surfaceVariant },
                      job.status === step && { backgroundColor: theme.colors.primary },
                      ['completed', 'on_the_way'].includes(job.status) && ['available', 'accepted', 'in_progress'].includes(step) && 
                        { backgroundColor: theme.colors.primary },
                    ]} />
                    <Text variant="bodySmall" style={[
                      styles.stepText,
                      { color: theme.colors.onSurfaceVariant },
                      job.status === step && { color: theme.colors.primary, fontWeight: 'bold' },
                    ]}>
                      {step.replace('', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>

          {/* Live Map */}
          {userLocation && (<Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <View style={styles.mapHeader}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                    Live Tracking
                  </Text>
                  <View style={styles.mapControls}>
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
                    <IconButton
                      icon="refresh"
                      size={20}
                      onPress={() => {
                        getUserLocation();
                        if (socket) {
                          socket.emit('requestUpdate', { jobId, type: jobType });
                        }
                      }}
                    />
                  </View>
                </View>
                
                <View style={styles.mapContainer}>
                  <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                    showsCompass={true}
                    showsScale={true}
                    mapType="standard"
                  >
                    {/* Runner Marker */}
                    <Marker
                      coordinate={userLocation}
                      title="Your Location"
                      description="You are here"
                    >
                      <View style={styles.runnerMarker}>
                        <MaterialCommunityIcons 
                          name="bike" 
                          size={24} 
                          color="white" 
                          style={[styles.markerIcon, { backgroundColor: theme.colors.primary }]}
                        />
                      </View>
                    </Marker>

                    {/* Customer Marker */}
                    {job.customerLocation && (
                      <Marker
                        coordinate={job.customerLocation}
                        title="Customer Location"
                        description="Delivery destination"
                      >
                        <View style={styles.customerMarker}>
                          <MaterialCommunityIcons 
                            name="account" 
                            size={24} 
                            color="white" 
                            style={[styles.markerIcon, { backgroundColor: theme.colors.secondary }]}
                          />
                        </View>
                      </Marker>
                    )}

                    {/* Pickup Location Marker */}
                    {job.pickupLocation && (
                      <Marker
                        coordinate={job.pickupLocation}
                        title="Pickup Location"
                        description="Pickup point"
                      >
                        <View style={styles.pickupMarker}>
                          <MaterialCommunityIcons 
                            name="package-variant" 
                            size={24} 
                            color="white" 
                            style={[styles.markerIcon, { backgroundColor: theme.colors.tertiary }]}
                          />
                        </View>
                      </Marker>
                    )}

                    {/* Route Polyline */}
                    {routeCoordinates.length > 1 && (
                      <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={theme.colors.primary}
                        strokeWidth={3}
                      />
                    )}
                  </MapView>
                </View>

                {/* Tracking Info */}
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
                  <Chip mode="outlined" style={styles.infoChip}>
                    <MaterialCommunityIcons name={isTracking ? "play" : "pause"} size={16} />
                    <Text style={{ marginLeft: 4 }}>
                      {isTracking ? 'Tracking Active' : 'Tracking Paused'}
                    </Text>
                  </Chip>
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Action Buttons */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 16 }}>
                Actions
              </Text>
              
              <View style={styles.actionButtons}>
                {job.status === 'accepted' && (<Button
                    mode="contained"
                    onPress={() => handleStatusUpdate('in_progress')}
                    style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                    labelStyle={{ color: 'white' }}
                    icon="bike"
                    loading={updating}
                    disabled={updating}
                  >
                    Start Delivery
                  </Button>
                )}
                
                {job.status === 'in_progress' && (<Button
                    mode="contained"
                    onPress={() => handleStatusUpdate('on_the_way')}
                    style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                    labelStyle={{ color: 'white' }}
                    icon="map-marker-path"
                    loading={updating}
                    disabled={updating}
                  >
                    On The Way
                  </Button>
                )}
                
                {job.status === 'on_the_way' && (<Button
                    mode="contained"
                    onPress={() => handleStatusUpdate('completed')}
                    style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                    labelStyle={{ color: 'white' }}
                    icon="check-circle"
                    loading={updating}
                    disabled={updating}
                  >
                    Mark Delivered
                  </Button>
                )}
                
                <Button
                  mode="outlined"
                  onPress={() => isTracking ? stopLocationTracking() : startLocationTracking()}
                  style={styles.actionButton}
                  icon={isTracking ? "pause" : "play"}
                >
                  {isTracking ? 'Stop Tracking' : 'Start Tracking'}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {/* Job Details */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 16 }}>
                Job Details
              </Text>
              
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="package-variant" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 8 }}>
                  {job.title || job.productName || 'No title'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="account" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 8 }}>
                  {job.customerName || job.buyerName || 'Customer'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="phone" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 8 }}>
                  {job.customerPhone || job.buyerPhone || 'No phone'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="cash" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 8 }}>
                  ₦{job.fee || job.amount || 0}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 8 }}>
                  {new Date(job.createdAt?.toDate?.() || job.createdAt).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 8 }}>
                  {job.location || job.deliveryAddress || 'No address'}
                </Text>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  statusSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  stepText: {
    fontSize: 10,
    textAlign: 'center',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionChip: {
    marginRight: 8,
  },
  mapContainer: {
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  map: {
    flex: 1,
  },
  trackingInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoChip: {
    marginRight: 8,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  runnerMarker: {
    alignItems: 'center',
  },
  customerMarker: {
    alignItems: 'center',
  },
  pickupMarker: {
    alignItems: 'center',
  },
  markerIcon: {
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default RunnerTrackingScreen; 
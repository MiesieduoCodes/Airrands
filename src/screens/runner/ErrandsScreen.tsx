import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl, Alert, ActivityIndicator, Linking } from 'react-native';
import { Text, Card, Button, Chip, Switch, Portal, Dialog, IconButton, Snackbar, Badge, Menu, Divider } from 'react-native-paper';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { RunnerNavigationProp } from '../../navigation/types';
import * as Animatable from 'react-native-animatable';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { collection, query, where, onSnapshot, Query, DocumentData, QuerySnapshot, QueryDocumentSnapshot, FirestoreError, getDocs } from 'firebase/firestore';
import * as Location from 'expo-location';
import { updateRunnerLocation, updateAvailability, getProfile, updateErrandStatus } from '../../services/runnerServices';
import { useRunnerAvailability } from '../../contexts/RunnerAvailabilityContext';
import io from 'socket.io-client';
import { PRODUCTION_CONFIG } from '../../config/production';

interface ErrandsScreenProps {
  navigation: RunnerNavigationProp;
  route: any;
}

interface Store {
  name: string;
  address: string;
  phone: string;
  latitude?: number;
  longitude?: number;
}

interface Customer {
  name: string;
  address: string;
  phone: string;
  latitude?: number;
  longitude?: number;
}

interface ErrandItem {
  name: string;
  quantity: number;
}

interface Errand {
  id: string;
  title?: string;
  store: Store;
  customer: Customer;
  items: ErrandItem[];
  distance: string;
  estimatedTime: string;
  fee: number;
  amount?: number;
  category?: string;
  status: 'available' | 'accepted' | 'in_progress' | 'completed';
  runnerId?: string;
  runnerName?: string;
  buyerId?: string;
  buyerName?: string;
  createdAt?: any;
  updatedAt?: any;
  completedAt?: any;
}

const ErrandsScreen: React.FC<ErrandsScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const [errands, setErrands] = useState<Errand[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('available');
  const [selectedSort, setSelectedSort] = useState('recent');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedErrand, setSelectedErrand] = useState<Errand | null>(null);
  const { theme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, completed: 0, earnings: 0 });
  const [tracking, setTracking] = useState(false);
  const trackingInterval = useRef<NodeJS.Timeout | null>(null);
  const { isAvailable, setAvailability, loading: availabilityLoading } = useRunnerAvailability();
  const [refreshing, setRefreshing] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const SOCKET_URL = PRODUCTION_CONFIG.SOCKET_URL;
  const [socket, setSocket] = useState<any>(null);
  
  // Handle navigation parameters from notifications
  const [highlightedErrandId, setHighlightedErrandId] = useState<string | null>(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

  // Handle route parameters when component mounts or route changes
  useEffect(() => {
    if (route?.params) {
      const { filter, selectedErrandId, selectedOrderId } = route.params;
      
      // Set filter if provided
      if (filter && filters.some(f => f.id === filter)) {
        setSelectedFilter(filter);
      }
      
      // Set highlighted errand/order for visual feedback
      if (selectedErrandId) {
        setHighlightedErrandId(selectedErrandId);
        // Clear highlight after 3 seconds
        setTimeout(() => setHighlightedErrandId(null), 3000);
      }
      
      if (selectedOrderId) {
        setHighlightedOrderId(selectedOrderId);
        // Clear highlight after 3 seconds
        setTimeout(() => setHighlightedOrderId(null), 3000);
      }
    }
  }, [route?.params]);

  const filters = [
    { id: 'available', label: 'Available', icon: 'clock-outline', color: '#FFA726' },
    { id: 'accepted', label: 'Accepted', icon: 'check-circle-outline', color: '#42A5F5' },
    { id: 'in_progress', label: 'In Progress', icon: 'bike', color: '#66BB6A' },
    { id: 'completed', label: 'Completed', icon: 'check-circle', color: '#4CAF50' },
  ];

  const sortOptions = [
    { id: 'recent', label: 'Most Recent', icon: 'clock-outline' },
    { id: 'fee', label: 'Highest Fee', icon: 'cash' },
    { id: 'distance', label: 'Nearest', icon: 'map-marker-distance' },
    { id: 'time', label: 'Quickest', icon: 'timer' },
  ];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    
    // Get ALL errands for the runner (not filtered by status)
    const errandsRef = collection(db, 'errands');
    let q: Query<DocumentData>;
    
    if (selectedFilter === 'available') {
      q = query(errandsRef, where('status', '==', 'available'));
    } else {
      // For other filters, get errands assigned to this runner
      q = query(errandsRef, where('runnerId', '==', user.uid));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const errandsData = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            completedAt: data.completedAt?.toDate?.() || null,
          } as Errand;
        });
        
        // Filter by status if needed
        const filteredErrands = selectedFilter === 'available' 
          ? errandsData 
          : errandsData.filter(errand => errand.status === selectedFilter);
        
        setErrands(filteredErrands);
        setLoading(false);
        calculateRunnerStats();
      },
      (err: FirestoreError) => {
        setError('Failed to fetch errands. Please try again.');
        setSnackbarVisible(true);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user?.uid, selectedFilter]);

  const calculateRunnerStats = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const runnerErrandsRef = collection(db, 'errands');
      const runnerErrandsQuery = query(runnerErrandsRef, where('runnerId', '==', user.uid));
      const runnerErrandsSnapshot = await getDocs(runnerErrandsQuery);
      
      const allRunnerErrands = runnerErrandsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const completed = allRunnerErrands.filter((e: any) => e.status === 'completed').length;
      const active = allRunnerErrands.filter((e: any) => e.status === 'accepted' || e.status === 'in_progress').length;
      const earnings = allRunnerErrands
        .filter((e: any) => e.status === 'completed')
        .reduce((sum: number, e: any) => sum + (e.fee || e.amount || 0), 0);
      
      setStats({ active, completed, earnings });
    } catch (error) {
      console.error('Error calculating runner stats:', error);
    }
  }, [user?.uid]);

  useEffect(() => {
    const s = io(SOCKET_URL, { transports: ['websocket'] });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  const handleAcceptErrand = (errand: Errand) => {
    setSelectedErrand(errand);
    setDialogVisible(true);
  };

  const confirmAcceptErrand = async () => {
    if (selectedErrand && user) {
      try {
        const { updateErrandStatus } = await import('../../services/runnerServices');
        await updateErrandStatus(user.uid, selectedErrand.id, 'accepted');
        
        if (socket) {
          socket.emit('statusUpdate', { id: selectedErrand.id, status: 'accepted' });
        }
        
        try {
          const { sendErrandAcceptanceNotification } = await import('../../services/notificationService');
          const buyerId = selectedErrand.buyerId;
          
          if (buyerId) {
            await sendErrandAcceptanceNotification(
              buyerId,
              user.uid,
              selectedErrand.id,
              user.displayName || 'Runner'
            );
          }
        } catch (notificationError) {
          console.error('Error sending acceptance notification:', notificationError);
        }
        
        setDialogVisible(false);
        // Don't change filter - let user see the accepted errand
      } catch (e) {
        setError('Failed to accept errand. Please try again.');
        setSnackbarVisible(true);
        setDialogVisible(false);
      }
    }
  };

  const handleStartDelivery = async (errand: Errand) => {
    try {
      const { updateErrandStatus } = await import('../../services/runnerServices');
      await updateErrandStatus(user?.uid || '', errand.id, 'in_progress');
      
    if (socket) {
      socket.emit('statusUpdate', { id: errand.id, status: 'in_progress' });
    }
    await startLocationTracking(errand.id);
    } catch (error) {
      console.error('Error starting delivery:', error);
      Alert.alert('Error', 'Failed to start delivery. Please try again.');
    }
  };

  const handleMarkDelivered = async (errand: Errand) => {
    try {
      const { updateErrandStatus } = await import('../../services/runnerServices');
      await updateErrandStatus(user?.uid || '', errand.id, 'completed');
      
    if (socket) {
      socket.emit('statusUpdate', { id: errand.id, status: 'completed' });
    }
    stopLocationTracking();
    } catch (error) {
      console.error('Error marking errand as delivered:', error);
      Alert.alert('Error', 'Failed to mark errand as delivered. Please try again.');
    }
  };

  const startLocationTracking = async (errandId: string) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required for tracking.');
      return;
    }
    setTracking(true);
    trackingInterval.current = setInterval(async () => {
      const location = await Location.getCurrentPositionAsync({});
      if (user?.uid) {
        await updateRunnerLocation(user.uid, location.coords.latitude, location.coords.longitude);
      }
      if (socket) {
        socket.emit('locationUpdate', {
          id: errandId,
          location: { latitude: location.coords.latitude, longitude: location.coords.longitude },
        });
      }
    }, 15000);
  };

  const stopLocationTracking = () => {
    setTracking(false);
    if (trackingInterval.current) {
      clearInterval(trackingInterval.current);
      trackingInterval.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  const openMap = (latitude: number, longitude: number, title: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    Linking.openURL(url);
  };

  const callPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const sortedErrands = [...errands].sort((a, b) => {
    switch (selectedSort) {
      case 'recent':
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case 'fee':
        return (b.fee || 0) - (a.fee || 0);
      case 'distance':
        const distA = parseFloat(a.distance?.replace(/[^\d.]/g, '') || '0');
        const distB = parseFloat(b.distance?.replace(/[^\d.]/g, '') || '0');
        return distA - distB;
      case 'time':
        const timeA = parseInt(a.estimatedTime?.replace(/[^\d]/g, '') || '0');
        const timeB = parseInt(b.estimatedTime?.replace(/[^\d]/g, '') || '0');
        return timeA - timeB;
      default:
        return 0;
    }
  });

  const renderMapPreview = (errand: Errand) => (<TouchableOpacity 
      onPress={() => {
        if (errand.store?.latitude && errand.store?.longitude) {
          openMap(errand.store.latitude, errand.store.longitude, errand.store.name);
        }
      }}
      style={{ marginVertical: 8 }}
    >
    <MapView
        style={{ height: 120, borderRadius: 12 }}
      initialRegion={{
        latitude: errand.store?.latitude || 6.5244,
        longitude: errand.store?.longitude || 3.3792,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      scrollEnabled={false}
      zoomEnabled={false}
    >
      <Marker
        coordinate={{
          latitude: errand.store?.latitude || 6.5244,
          longitude: errand.store?.longitude || 3.3792,
        }}
        title="Pickup"
      />
      <Marker
        coordinate={{
          latitude: errand.customer?.latitude || 6.5244,
          longitude: errand.customer?.longitude || 3.3792,
        }}
        title="Delivery"
        pinColor={COLORS.primary}
      />
    </MapView>
      <View style={styles.mapOverlay}>
        <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary} />
        <Text style={[styles.mapOverlayText, { color: theme.colors.primary }]}>
          Tap to open in Maps
        </Text>
        </View>
        </TouchableOpacity>
  );

  const renderErrandCard = (errand: Errand, index: number) => {
    const isHighlighted = highlightedErrandId === errand.id || highlightedOrderId === errand.id;
    
    return (
    <Animatable.View
      key={errand.id}
        animation={isHighlighted ? "pulse" : "fadeInUp"}
        delay={isHighlighted ? 0 : index * 100}
        duration={isHighlighted ? 1000 : 500}
        style={[
          styles.errandCard,
          isHighlighted && {
            borderWidth: 2,
            borderColor: theme.colors.primary,
            borderRadius: 16,
            backgroundColor: theme.colors.primaryContainer + '20',
          }
        ]}
    >
        <Card style={[
          styles.card, 
          { backgroundColor: theme.colors.surface },
          isHighlighted && {
            borderWidth: 2,
            borderColor: theme.colors.primary,
            elevation: 8,
          }
        ]}>
        <Card.Content>
          {/* Header with status and fee */}
          <View style={styles.cardHeader}>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: getStatusColor(errand.status) }
              ]} />
              <Text style={[
                styles.statusText,
                { color: getStatusColor(errand.status) }
              ]}>
                {getStatusLabel(errand.status)}
              </Text>
                {isHighlighted && (
                  <View style={[styles.highlightBadge, { backgroundColor: theme.colors.primary }]}>
                    <MaterialCommunityIcons name="bell" size={12} color="white" />
                  </View>
                )}
            </View>
            <Text style={[styles.feeText, { color: theme.colors.primary }]}>
              ₦{errand.fee?.toLocaleString() || '0'}
            </Text>
          </View>

          {/* Errand details */}
          <View style={styles.errandDetails}>
            <Text style={[styles.titleText, { color: theme.colors.onSurface }]}>
              {errand.title || 'Errand Request'}
            </Text>
            
            {/* Store information */}
            {errand.store && (<View style={styles.locationInfo}>
                <MaterialCommunityIcons name="store" size={16} color={theme.colors.primary} />
                <Text style={[styles.locationText, { color: theme.colors.onSurfaceVariant }]}>
                  {errand.store.name} • {errand.store.address}
                </Text>
                {errand.store.phone && (
                  <TouchableOpacity 
                    onPress={() => callPhone(errand.store.phone)}
                    style={styles.phoneButton}
                  >
                    <MaterialCommunityIcons name="phone" size={14} color={theme.colors.primary} />
                    <Text style={[styles.phoneText, { color: theme.colors.primary }]}>
                      {errand.store.phone}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Customer information */}
            {errand.customer && (<View style={styles.locationInfo}>
                <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary} />
                <Text style={[styles.locationText, { color: theme.colors.onSurfaceVariant }]}>
                  {errand.customer.name} • {errand.customer.address}
                </Text>
                {errand.customer.phone && (
                  <TouchableOpacity 
                    onPress={() => callPhone(errand.customer.phone)}
                    style={styles.phoneButton}
                  >
                    <MaterialCommunityIcons name="phone" size={14} color={theme.colors.primary} />
                    <Text style={[styles.phoneText, { color: theme.colors.primary }]}>
                      {errand.customer.phone}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Items list */}
            {errand.items && errand.items.length > 0 && (
              <View style={styles.itemsContainer}>
                <Text style={[styles.itemsTitle, { color: theme.colors.onSurface }]}>
                  Items ({errand.items.length}):
                </Text>
                {errand.items.slice(0, 3).map((item: any, idx: number) => (
                  <Text key={idx} style={[styles.itemText, { color: theme.colors.onSurfaceVariant }]}>
                    • {item.name} x{item.quantity}
                  </Text>
                ))}
                {errand.items.length > 3 && (
                  <Text style={[styles.itemText, { color: theme.colors.onSurfaceVariant }]}>
                    • +{errand.items.length - 3} more items
                  </Text>
                )}
              </View>
            )}

            {/* Distance and time */}
            <View style={styles.metaInfo}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="map-marker-distance" size={16} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>
                  {errand.distance || 'N/A'}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>
                  {errand.estimatedTime || 'N/A'}
                </Text>
              </View>
            </View>

            {/* Interactive map */}
            {errand.store?.latitude && errand.store?.longitude && (
              renderMapPreview(errand)
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            {errand.status === 'available' && (<Button
                mode="contained"
                onPress={() => handleAcceptErrand(errand)}
                style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                labelStyle={{ color: 'white' }}
                icon="check"
              >
                Accept Errand
              </Button>
            )}
            
            {errand.status === 'accepted' && (<View style={styles.progressActions}>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('RunnerTrackingScreen', {
                    jobId: errand.id,
                    jobType: 'errand',
                    errandId: errand.id
                  })}
                  style={styles.actionButton}
                  icon="map-marker"
                >
                  Track
                </Button>
              <Button
                mode="contained"
                onPress={() => handleStartDelivery(errand)}
                style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                labelStyle={{ color: 'white' }}
                icon="bike"
              >
                Start Delivery
              </Button>
              </View>
            )}
            
            {errand.status === 'in_progress' && (<View style={styles.progressActions}>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('RunnerTrackingScreen', {
                    jobId: errand.id,
                    jobType: 'errand',
                    errandId: errand.id
                  })}
                  style={styles.actionButton}
                  icon="map-marker"
                >
                  Track
                </Button>
                <Button
                  mode="contained"
                  onPress={() => handleMarkDelivered(errand)}
                  style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                  labelStyle={{ color: 'white' }}
                  icon="check-circle"
                >
                  Mark Delivered
                </Button>
              </View>
            )}
            
            {errand.status === 'completed' && (<Button
                mode="outlined"
                onPress={() => navigation.navigate('RunnerTrackingScreen', {
                  jobId: errand.id,
                  jobType: 'errand',
                  errandId: errand.id
                })}
                style={styles.actionButton}
                icon="eye"
              >
                View Details
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    </Animatable.View>
  );
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: '#FFA726',
      accepted: '#42A5F5',
      inprogress: '#66BB6A',
      completed: '#4CAF50',
    };
    return colors?.[status] || '#757575';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      available: 'Available',
      accepted: 'Accepted',
      inprogress: 'In Progress',
      completed: 'Completed',
    };
    return labels?.[status] || status;
  };

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 45, backgroundColor: theme.colors.background }}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>Loading errands...</Text>
        </View>
      ) : error ? (<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={COLORS.error} />
          <Text style={{ color: COLORS.error, marginTop: 12 }}>{error}</Text>
          <Button mode="outlined" onPress={() => { setError(null); setLoading(true); }} style={{ marginTop: 16 }}>Retry</Button>
        </View>
      ) : errands.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <MaterialCommunityIcons name="run-fast" size={64} color={theme.colors.onSurfaceVariant} />
          <Text style={{ color: theme.colors.onSurface, marginTop: 16, fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
            {selectedFilter === 'available' ? 'No Available Errands' : 'No Errands Found'}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
            {selectedFilter === 'available' 
              ? 'Stay online to receive new delivery requests. New errands appear here when buyers request deliveries.'
              : selectedFilter === 'accepted' 
                ? 'You haven\'t accepted any errands yet. Check the "Available" tab to see new requests.'
                : selectedFilter === 'in_progress'
                  ? 'You don\'t have any errands in progress. Start accepting errands to see them here.'
                  : 'You haven\'t completed any errands yet. Complete your first delivery to see it here.'
            }
          </Text>
          {selectedFilter === 'available' && (
            <View style={{ marginTop: 24, alignItems: 'center' }}>
              <MaterialCommunityIcons name="wifi" size={32} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, marginTop: 8, fontSize: 14, fontWeight: '600' }}>
                Make sure you're online to receive requests
              </Text>
            </View>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* Header Card */}
          <Card style={[styles.headerCard, { backgroundColor: theme.colors.surface }]}> 
            <Card.Content style={styles.headerContentCard}>
              <Text variant="headlineMedium" style={[styles.headerTitle, { color: theme.colors.primary, fontWeight: 'bold' }]}>Errands</Text>
            </Card.Content>
          </Card>

          {/* Availability Toggle Card */}
          <Card style={[styles.availabilityCard, { backgroundColor: theme.colors.surface }]}> 
            <Card.Content style={styles.availabilityContent}>
              <MaterialCommunityIcons name="run-fast" size={24} color={isAvailable ? COLORS.success : COLORS.gray?.[500]} style={{ marginRight: 10 }} />
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>Available for Deliveries</Text>
              <Switch value={isAvailable} onValueChange={setAvailability} disabled={availabilityLoading} color={theme.colors.primary} />
            </Card.Content>
          </Card>

          {/* Only show errands and filters if available */}
          {isAvailable ? (
            <>
              {/* Stats Card */}
              {selectedFilter !== 'available' && (
                <Card style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}> 
                  <Card.Content style={styles.statsContent}>
                    <View style={styles.statsItem}>
                      <MaterialCommunityIcons name="bike" size={22} color={theme.colors.primary} />
                      <Text style={styles.statsLabel}>Active</Text>
                      <Text style={styles.statsValue}>{stats.active}</Text>
                    </View>
                    <View style={styles.statsItem}>
                      <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.success} />
                      <Text style={styles.statsLabel}>Completed</Text>
                      <Text style={styles.statsValue}>{stats.completed}</Text>
                    </View>
                    <View style={styles.statsItem}>
                      <MaterialCommunityIcons name="cash" size={22} color={COLORS.primary} />
                      <Text style={styles.statsLabel}>Earnings</Text>
                      <Text style={styles.statsValue}>₦{stats.earnings.toLocaleString()}</Text>
                    </View>
                  </Card.Content>
                </Card>
              )}

              {/* Filters and Sort Bar */}
              <View style={[styles.filtersContainer, { backgroundColor: theme.colors.surface, marginTop: 16 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
                {filters.map(filter => (
                    <Chip 
                      key={filter.id} 
                      selected={selectedFilter === filter.id} 
                      onPress={() => setSelectedFilter(filter.id)} 
                      style={styles.filterChip} 
                      selectedColor={theme.colors.primary} 
                      textStyle={{ fontSize: 16, fontWeight: '600', paddingHorizontal: 8 }}
                    >
                      {filter.label}
                    </Chip>
                ))}
              </ScrollView>
                
                {/* Sort Menu */}
                <View style={styles.sortContainer}>
                  <Menu
                    visible={sortMenuVisible}
                    onDismiss={() => setSortMenuVisible(false)}
                    anchor={
                      <TouchableOpacity 
                        onPress={() => setSortMenuVisible(true)}
                        style={styles.sortButton}
                      >
                        <MaterialCommunityIcons name="sort" size={20} color={theme.colors.primary} />
                        <Text style={[styles.sortButtonText, { color: theme.colors.primary }]}>
                          Sort: {sortOptions.find(opt => opt.id === selectedSort)?.label}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.primary} />
                      </TouchableOpacity>
                    }
                  >
                    {sortOptions.map(option => (
                      <Menu.Item
                        key={option.id}
                        onPress={() => {
                          setSelectedSort(option.id);
                          setSortMenuVisible(false);
                        }}
                        title={option.label}
                        leadingIcon={option.icon}
                      />
                    ))}
                  </Menu>
                </View>
              </View>

              {/* Errands List */}
              <View style={styles.errandsContainer}>
                {loading ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ marginTop: 16, color: theme.colors.onSurfaceVariant, fontSize: 16 }}>Loading errands...</Text>
                  </View>
                ) : sortedErrands.length === 0 ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                    <MaterialCommunityIcons 
                      name={
                        selectedFilter === 'available' ? 'clock-outline' :
                        selectedFilter === 'accepted' ? 'clipboard-check' :
                        selectedFilter === 'in_progress' ? 'bike' :
                        'check-circle'
                      } 
                      size={56} 
                      color={theme.colors.onSurfaceVariant} 
                    />
                    <Text style={{ 
                      marginTop: 16, 
                      color: theme.colors.onSurface, 
                      fontSize: 18, 
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}>
                      {selectedFilter === 'available' ? 'No Available Errands' :
                       selectedFilter === 'accepted' ? 'No Accepted Errands' :
                       selectedFilter === 'in_progress' ? 'No Active Deliveries' :
                       'No Completed Errands'}
                    </Text>
                    <Text style={{ 
                      marginTop: 8, 
                      color: theme.colors.onSurfaceVariant, 
                      fontSize: 16,
                      textAlign: 'center',
                      lineHeight: 24
                    }}>
                      {selectedFilter === 'available' 
                        ? 'New delivery requests will appear here when buyers need your services.'
                        : selectedFilter === 'accepted' 
                          ? 'Accepted errands will show here once you start accepting deliveries.'
                          : selectedFilter === 'in_progress'
                            ? 'Active deliveries will appear here when you start delivering.'
                            : 'Completed errands will be listed here after successful deliveries.'
                      }
                    </Text>
                    {selectedFilter === 'available' && (
                      <View style={{ marginTop: 16, alignItems: 'center' }}>
                        <MaterialCommunityIcons name="wifi" size={24} color={theme.colors.primary} />
                        <Text style={{ color: theme.colors.primary, marginTop: 4, fontSize: 14, fontWeight: '600' }}>
                          Stay online to receive requests
                        </Text>
                  </View>
                    )}
                            </View>
                ) : (sortedErrands.map((errand, idx) => renderErrandCard(errand, idx))
                )}
              </View>
            </>
          ) : (
            <View style={styles.unavailableMessageCentered}>
              <MaterialCommunityIcons name="run-fast" size={56} color={theme.colors.onSurfaceVariant} />
              <Text style={{ marginTop: 16, color: theme.colors.onSurfaceVariant, fontSize: 18, textAlign: 'center' }}>
                You are currently unavailable for deliveries.
              </Text>
            </View>
          )}

          <Portal>
            <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={[styles.dialog, { backgroundColor: theme.colors.surface }]}> 
              <Dialog.Title style={{ color: theme.colors.onSurface }}>Accept Delivery</Dialog.Title>
              <Dialog.Content> 
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  Are you sure you want to accept this delivery? Make sure you can complete it within the estimated time.
                </Text> 
              </Dialog.Content>
              <Dialog.Actions> 
                <Button onPress={() => setDialogVisible(false)} textColor={theme.colors.onSurface}>Cancel</Button> 
                <Button onPress={confirmAcceptErrand} textColor={theme.colors.primary}>Accept</Button> 
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 55,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  notificationContainer: {
    position: 'relative',
  },
  notificationIcon: {
    margin: 0,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  filtersContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  filterChip: {
    marginRight: 12,
  },
  errandsContainer: {
    padding: 24,
  },
  errandCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
  },
  cardContent: {
    padding: 16,
  },
  headerInfo: {
    marginBottom: 12,
  },
  storeName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  distance: {
    color: '#666',
    fontSize: 14,
  },
  fee: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  phone: {
    color: '#666',
    fontSize: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  feeText: {
    fontWeight: 'bold',
  },
  errandDetails: {
    marginBottom: 16,
  },
  titleText: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    marginLeft: 4,
  },
  itemsContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  itemsTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  itemText: {
    fontSize: 14,
    marginLeft: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    marginLeft: 4,
  },
  actionButtons: {
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    borderRadius: 8,
  },
  progressActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  unavailableMessageCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 64,
  },
  dialog: {
    borderRadius: 16,
  },
  headerCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 8,
  },
  headerContentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  availabilityCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 1,
    marginBottom: 12,
  },
  availabilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statsCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 1,
    marginBottom: 12,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statsItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsLabel: {
    fontSize: 13,
    color: COLORS.gray?.[600],
    marginTop: 2,
  },
  statsValue: {
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 2,
  },
  errandTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  categoryChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  locationsContainer: {
    marginVertical: 12,
  },
  locationSection: {
    marginBottom: 12,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationTitle: {
    marginLeft: 4,
  },
  acceptButton: {
    marginTop: 12,
    borderRadius: 8,
  },
  mapOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapOverlayText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 2,
  },
  phoneText: {
    fontSize: 12,
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
  sortContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  highlightBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
});

export default ErrandsScreen; 
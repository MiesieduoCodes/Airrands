import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  ScrollView, 
  TouchableOpacity, 
  Animated, 
  SafeAreaView,
  Alert
} from 'react-native';
import { 
  Text, 
  Card, 
  Avatar, 
  Button, 
  IconButton, 
  Chip, 
  ActivityIndicator 
} from 'react-native-paper';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { BuyerNavigationProp } from '../../navigation/types';
import NotificationDrawer from '../../components/NotificationDrawer';
import NotificationBadge from '../../components/NotificationBadge';
import ErrandRequestModal from '../../components/ErrandRequestModal';
import { PAYSTACK_PUBLIC_KEY } from '../../config/paystack';
import ReviewPromptModal from '../../components/ReviewPromptModal';
import * as Animatable from 'react-native-animatable';
import { getStores, getRunners, getNotifications, getProducts } from '../../services/buyerServices';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase'; // adjust path as needed
import { sendPushNotification } from '../../services/notificationService'; // adjust path if needed
import { useNotification } from '../../contexts/NotificationContext';
import { DocumentReference } from 'firebase/firestore';
import { haversineDistance, formatDistance, calculateAndFormatDistance, isValidCoordinate } from '../../utils/distance';
import { addSampleData, checkDataExists } from '../../utils/sampleData';
const PaystackWebView = require('react-native-paystack-webview').default;
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

// Interfaces with proper typing and optional fields
interface Store {
  id: string;
  name: string;
  rating: number;
  distance: string;
  image: string;
  latitude: number;
  longitude: number;
  type: string;
}

interface Runner {
  id: string;
  name: string;
  rating: number;
  deliveries: number;
  image: string;
  latitude: number;
  longitude: number;
  status: 'available' | 'busy' | 'offline';
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'order' | 'message' | 'payment' | 'system' | 'promo';
  isRead: boolean;
}

interface FullErrandData {
  runnerId: string;
  runnerName: string;
  runnerImage: string;
  buyerId: string;
  buyerName: string | null;
  buyerEmail: string | null;
  status: string;
  createdAt: string;
  sellerId?: string;
  title?: string;
  location?: string;
  distance?: string;
  fee?: number;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  [key: string]: any; // allow extra fields from errandData
}

const BuyerHomeScreen: React.FC<{ navigation: BuyerNavigationProp }> = ({ navigation }) => {
  // State
  const { theme } = useTheme();
  const { user } = useAuth();
  const [notificationDrawerVisible, setNotificationDrawerVisible] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading: notifLoading } = useNotification();
  const [errandModalVisible, setErrandModalVisible] = useState(false);
  const [selectedRunner, setSelectedRunner] = useState<Runner | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [mapHeight] = useState(new Animated.Value(height * 0.4));
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [greeting, setGreeting] = useState('Good morning');
  const [currentTime, setCurrentTime] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]); // State for products
  const [error, setError] = useState<string | null>(null); // State for error messages
  const [reviewPromptVisible, setReviewPromptVisible] = useState(false);
  
  // Payment state for errand requests
  const [showPaystack, setShowPaystack] = useState(false);
  const [pendingErrand, setPendingErrand] = useState<any>(null);
  const [paystackTxnRef, setPaystackTxnRef] = useState('');


  const categories = [
    { id: 'all', name: 'All'},
    { id: 'food', name: 'Food'},
    { id: 'groceries', name: 'Groceries'},
    { id: 'electronics', name: 'Electronics'},
    { id: 'fashion', name: 'Fashion'},
    { id: 'health', name: 'Health & Beauty'},
    { id: 'home', name: 'Home & Office'},
  ];

  // Data validation and normalization
  const normalizeData = (data: any[], type: 'store' | 'runner'): Store[] | Runner[] => {
    if (type === 'store') {
      return data.map(item => {
        // Ensure coordinates are valid numbers
        const latitude = typeof item.latitude === 'number' ? item.latitude :
                         typeof item.latitude === 'string' ? parseFloat(item.latitude) || 6.5244 : 6.5244;
        const longitude = typeof item.longitude === 'number' ? item.longitude :
                          typeof item.longitude === 'string' ? parseFloat(item.longitude) || 3.3792 : 3.3792;

        // Ensure rating is a valid number
        const rating = typeof item.rating === 'number' ? item.rating :
                       typeof item.rating === 'string' ? parseFloat(item.rating) || 4.0 : 4.0;

        return {
          id: item.id || Math.random().toString(),
          name: item.name || item.displayName || 'Unknown',
          image: item.image || item.photoURL || item.avatar || 'https://i.imgur.com/T3zF9bJ.png',
          latitude,
          longitude,
          rating: Math.min(5, Math.max(0, rating)), // Clamp between 0-5
          type: item.type || item.businessType || 'convenience',
          distance: item.distance || '1.5 km',
        } as Store;
      });
    } else {
      return data.map(item => {
        // Ensure coordinates are valid numbers
        const latitude = typeof item.latitude === 'number' ? item.latitude :
                         typeof item.latitude === 'string' ? parseFloat(item.latitude) || 6.5244 : 6.5244;
        const longitude = typeof item.longitude === 'number' ? item.longitude :
                          typeof item.longitude === 'string' ? parseFloat(item.longitude) || 3.3792 : 3.3792;

        // Ensure rating is a valid number
        const rating = typeof item.rating === 'number' ? item.rating :
                       typeof item.rating === 'string' ? parseFloat(item.rating) || 4.0 : 4.0;

        return {
          id: item.id || Math.random().toString(),
          name: item.name || item.displayName || 'Unknown',
          image: item.image || item.photoURL || item.avatar || 'https://i.imgur.com/T3zF9bJ.png',
          latitude,
          longitude,
          rating: Math.min(5, Math.max(0, rating)), // Clamp between 0-5
          deliveries: typeof item.deliveries === 'number' ? item.deliveries :
                     typeof item.deliveries === 'string' ? parseInt(item.deliveries) || 0 : 0,
          status: ['available', 'busy', 'offline'].includes(item.status) ? 
                 item.status : 'available',
        } as Runner;
      });
    }
  };

  // Safe number formatting
  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  // Get default region
  const getDefaultRegion = () => {
    // If user location is available, center on it
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01, // More zoomed in (was 0.0922)
        longitudeDelta: 0.01, // More zoomed in (was 0.0421)
      };
    }
    
    // If no user location, try to center on stores/runners with valid coordinates
    const allLocations = [...stores, ...runners].filter(item => 
      item.latitude && item.longitude && isValidCoordinate(item.latitude, item.longitude)
    );
    
    if (allLocations.length > 0) {
      return {
        latitude: allLocations?.[0].latitude,
        longitude: allLocations?.[0].longitude,
        latitudeDelta: 0.01, // More zoomed in (was 0.0922)
        longitudeDelta: 0.01, // More zoomed in (was 0.0421)
      };
    }
    
    // If no valid locations found, return null to let MapView handle it
    return null;
  };

  // Calculate distance from user to a location
  const calculateDistance = (lat: number, lng: number) => {
    if (!userLocation) return 'Unknown';
    
    // Validate coordinates
    if (!isValidCoordinate(lat, lng) || !isValidCoordinate(userLocation.latitude, userLocation.longitude)) {
      return 'Unknown';
    }
    
    const distance = haversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      lat,
      lng
    );
    
    return formatDistance(distance);
  };

  // Filtered data with real-time distance calculation
  const filteredStores = stores.filter(store => 
    activeCategory === 'all' || store.type === activeCategory
  ).map(store => ({
    ...store,
    distance: calculateDistance(store.latitude, store.longitude)
  }));

  const filteredRunners = runners.map(runner => ({
    ...runner,
    distance: calculateDistance(runner.latitude, runner.longitude)
  }));

  // Effects
  useEffect(() => {
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check if we have any data in Firebase
        const dataCheck = await checkDataExists();
        console.log('Data check result:', dataCheck);
        
        // If no stores or runners exist, add sample data
        if (!dataCheck.hasStores || !dataCheck.hasRunners) {
          console.log('No data found, adding sample data...');
          const result = await addSampleData();
          if (result.success) {
            console.log('Sample data added successfully');
          } else {
            console.error('Failed to add sample data:', result.error);
          }
        }

        // Fetch stores and products in parallel
        const [storesData, productsData] = await Promise.allSettled([
          getStores(),
          getProducts()
        ]);

        // Handle stores data
        if (storesData.status === 'fulfilled') {
          setStores(storesData.value);
          console.log('Stores loaded:', storesData.value.length);
        } else {
          console.error('Failed to fetch stores:', storesData.reason);
          setError('Failed to load stores. Please try again.');
        }

        // Handle products data
        if (productsData.status === 'fulfilled') {
          setProducts(productsData.value);
          console.log('Products loaded:', productsData.value.length);
        } else {
          console.error('Failed to fetch products:', productsData.reason);
          setError('Failed to load products. Please try again.');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Check for pending reviews when screen loads
  useEffect(() => {
    const checkPendingReviews = async () => {
      if (!user?.uid) return;

      try {
        const { reviewService } = await import('../../services/reviewService');
        const pendingPrompts = await reviewService.getPendingReviewPrompts(user.uid);
        
        if (pendingPrompts.length > 0) {
          // Show review prompt modal after a short delay
          setTimeout(() => {
            setReviewPromptVisible(true);
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking pending reviews:', error);
      }
    };

    checkPendingReviews();
  }, [user?.uid]);

  // Real-time location tracking for stores and runners
  useEffect(() => {
    if (!user?.uid) return;

    // Listen for real-time updates from sellers (stores)
    const sellersListener = db.collection('users')
      .where('role', '==', 'seller')
      .onSnapshot((snapshot) => {
        console.log('Sellers snapshot received:', snapshot.docs.length, 'documents');
        
        const updatedStores = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          console.log('Seller data:', doc.id, data);
          
          // Use actual location data from Firestore, no default coordinates
          const latitude = data.currentLocation?.latitude || data.latitude;
          const longitude = data.currentLocation?.longitude || data.longitude;
          
          console.log('Seller coordinates:', { latitude, longitude });
          
          // Only include stores with valid coordinates
          if (!latitude || !longitude || !isValidCoordinate(latitude, longitude)) {
            console.log('Invalid coordinates for seller:', doc.id);
            return null;
          }
          
          const store = {
            id: doc.id,
            name: data.name || data.displayName || data.businessName || 'Unknown Store',
            image: data.image || data.photoURL || data.avatar || 'https://i.imgur.com/T3zF9bJ.png',
            rating: data.rating || 4.0,
            distance: calculateDistance(latitude, longitude),
            type: data.type || data.businessType || 'convenience',
            latitude,
            longitude,
            isOnline: data.isOnline || false,
            lastSeen: data.lastSeen,
          };
          
          console.log('Processed store:', store);
          return store;
        }).filter(store => store !== null); // Remove stores without valid coordinates
        
        console.log('Final stores array:', updatedStores.length, 'stores');
        setStores(updatedStores);
      }, (error) => {
        console.error('Error listening to sellers:', error);
      });

    // Listen for real-time updates from runners
    const runnersListener = db.collection('users')
      .where('role', '==', 'runner')
      .onSnapshot((snapshot) => {
        console.log('Runners snapshot received:', snapshot.docs.length, 'documents');
        
        const updatedRunners = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          console.log('Runner data:', doc.id, data);
          
          // Use actual location data from Firestore, no default coordinates
          const latitude = data.currentLocation?.latitude || data.latitude;
          const longitude = data.currentLocation?.longitude || data.longitude;
          
          console.log('Runner coordinates:', { latitude, longitude });
          
          // Only include runners with valid coordinates
          if (!latitude || !longitude || !isValidCoordinate(latitude, longitude)) {
            console.log('Invalid coordinates for runner:', doc.id);
            return null;
          }
          
          const runner = {
            id: doc.id,
            name: data.name || data.displayName || 'Unknown Runner',
            image: data.image || data.photoURL || data.avatar || 'https://i.imgur.com/T3zF9bJ.png',
            rating: data.rating || 4.0,
            distance: calculateDistance(latitude, longitude),
            status: data.status || data.availability || 'available',
            latitude,
            longitude,
            isOnline: data.isOnline || false,
            lastSeen: data.lastSeen,
            vehicle: data.vehicle || 'Motorcycle',
            experience: data.experience || '1 year',
            deliveries: data.deliveries || 0,
          };
          
          console.log('Processed runner:', runner);
          return runner;
        }).filter(runner => runner !== null); // Remove runners without valid coordinates
        
        console.log('Final runners array:', updatedRunners.length, 'runners');
        setRunners(updatedRunners);
      }, (error) => {
        console.error('Error listening to runners:', error);
      });

    // Cleanup listeners
    return () => {
      sellersListener();
      runnersListener();
    };
  }, [user?.uid, userLocation]); // Add userLocation as dependency to recalculate distances when user location changes

  useEffect(() => {
    const getLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          console.warn('Location permission denied');
          return;
        }

        // Try to get high accuracy location first
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 10000,
          maximumAge: 60000,
        });
        
        if (location && location.coords) {
          setUserLocation({ 
            latitude: location.coords.latitude, 
            longitude: location.coords.longitude 
          });
          console.log('User location obtained:', location.coords);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        
        // Fallback to lower accuracy if high accuracy fails
        try {
          let fallbackLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            timeout: 15000,
            maximumAge: 300000,
          });
          
          if (fallbackLocation && fallbackLocation.coords) {
            setUserLocation({ 
              latitude: fallbackLocation.coords.latitude, 
              longitude: fallbackLocation.coords.longitude 
            });
            console.log('Fallback location obtained:', fallbackLocation.coords);
          }
        } catch (fallbackError) {
          setErrorMsg('Unable to get your location. Please check location settings.');
          console.error('Fallback location error:', fallbackError);
        }
      }
    };

    getLocation();
  }, []);

  // Handlers
  const toggleMapSize = () => {
    const newHeight = isMapExpanded ? height * 0.4 : height * 0.6;
    Animated.timing(mapHeight, {
      toValue: newHeight,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setIsMapExpanded(!isMapExpanded);
  };

  const handleNotificationPress = async (notification: any) => {
    if (notification.status === 'unread' || notification.isRead === false) {
      await markAsRead(notification.id);
    }
    setNotificationDrawerVisible(false);
    
    // Navigate based on notification type and data
    try {
      switch (notification.type) {
        case 'order':
          if (notification.data?.orderId) {
            navigation.navigate('Orders', { 
              selectedOrderId: notification.data.orderId 
            });
          } else {
            navigation.navigate('Orders');
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
            navigation.navigate('Orders', { 
              selectedPaymentId: notification.data.paymentId 
            });
          } else {
            navigation.navigate('Orders');
          }
          break;
        case 'errand':
          if (notification.data?.errandId) {
            navigation.navigate('OrderTracking', {
              jobType: 'errand',
              jobId: notification.data.errandId,
              orderNumber: notification.data.errandId,
            });
          } else {
            navigation.navigate('Orders');
          }
          break;
        case 'general':
        default:
          break;
      }
    } catch (error) {
      console.error('Error navigating from notification:', error);
      navigation.navigate('Orders');
    }
  };

  const handleErrandSubmit = async (errandData: Record<string, any>) => {
    if (!selectedRunner || !user) {
      Alert.alert('Error', 'No runner selected or user not logged in.');
      return;
    }

    // Get pickup and dropoff coordinates
    // Use the coordinates from errandData if provided, otherwise use default values
    const pickupLat = errandData.pickupLatitude || 6.5244; // Default to Lagos coordinates
    const pickupLng = errandData.pickupLongitude || 3.3792;
    const dropoffLat = errandData.dropoffLatitude || 6.5244; // Default to Lagos coordinates
    const dropoffLng = errandData.dropoffLongitude || 3.3792;

    if (pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null) {
      Alert.alert('Error', 'Pickup and dropoff locations must have coordinates.');
      return;
    }

    // Calculate distance in km
    const distance = haversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
    // Calculate fee: 1km = ₦1000
    const fee = Math.round(distance * 1000);

    const fullErrandData: FullErrandData = {
      ...errandData,
      runnerId: selectedRunner.id,
      runnerName: selectedRunner.name,
      runnerImage: selectedRunner.image,
      buyerId: user.uid,
      buyerName: user.displayName,
      buyerEmail: user.email,
      status: 'available',
      createdAt: new Date().toISOString(),
      distance: distance.toFixed(2) + ' km',
      fee,
    };

    let errandDocRef = await db.collection('errands').add(fullErrandData) as unknown as DocumentReference;
    if (!errandDocRef) return;
    setErrandModalVisible(false);
    Alert.alert('Success', 'Your errand request has been sent!', [
        {
          text: 'Track Errand', 
          onPress: () => navigation.navigate('OrderTracking', {
            jobType: 'errand',
            jobId: errandDocRef.id,
            orderNumber: errandDocRef.id,
          })
        }
      ]
    );

    // Notification logic (separate try/catch)
    try {
      // Fetch runner's push token
      const runnerDoc = await db.collection('users').doc(selectedRunner.id).get();
      const runnerData = runnerDoc.data();
      const runnerPushToken = runnerData?.expoPushToken;

      // Fetch buyer's push token
      const buyerDoc = await db.collection('users').doc(user.uid).get();
      const buyerData = buyerDoc.data();
      const buyerPushToken = buyerData?.expoPushToken;

      // Fetch seller's push token if sellerId is present
      let sellerPushToken = null;
      if (fullErrandData.sellerId) {
        const sellerDoc = await db.collection('users').doc(fullErrandData.sellerId).get();
        const sellerData = sellerDoc.data();
        sellerPushToken = sellerData?.expoPushToken;
      }

      // Custom notification messages
      const runnerMessage = `${user.displayName || 'A buyer'} requested: "${fullErrandData.title}" at ${fullErrandData.location}.`;
      const buyerMessage = `Your request "${fullErrandData.title}" to ${selectedRunner.name} was sent!`;
      const sellerMessage = `${user.displayName || 'A buyer'} requested: "${fullErrandData.title}". Check your orders.`;

      // Send push notifications
      if (runnerPushToken) {
        await sendPushNotification(
          runnerPushToken,
          'New Errand Request',
          runnerMessage
        );
      }
      if (buyerPushToken) {
        await sendPushNotification(
          buyerPushToken,
          'Errand Request Sent',
          buyerMessage
        );
      }
      if (fullErrandData.sellerId && sellerPushToken) {
        await sendPushNotification(
          sellerPushToken,
          'New Order/Errand',
          sellerMessage
        );
      }

      // Save in-app notifications to Firestore
      const notificationObj = (title: string, message: string, type: string) => ({
        title,
        message,
        type,
        isRead: false,
        createdAt: new Date().toISOString(),
        errandId: errandDocRef.id,
      });
      // Runner in-app notification
      await db.collection('users').doc(selectedRunner.id)
        .collection('notifications').add(notificationObj('New Errand Request', runnerMessage, 'errand'));
      // Buyer in-app notification
      await db.collection('users').doc(user.uid)
        .collection('notifications').add(notificationObj('Errand Request Sent', buyerMessage, 'errand'));
      // Seller in-app notification
      if (fullErrandData.sellerId) {
        await db.collection('users').doc(fullErrandData.sellerId)
          .collection('notifications').add(notificationObj('New Order/Errand', sellerMessage, 'order'));
      }
    } catch (notificationError) {
      // Only show a warning, not a full error
      Alert.alert('Warning', 'Errand sent, but notifications may not have been delivered.');
      console.error('Notification error:', notificationError);
    }
  };

  // Payment handling for errand requests
  const handlePaymentRequired = (errandData: any, amount: number) => {
    // Generate unique transaction reference
    const ref = `errand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setPaystackTxnRef(ref);
    setPendingErrand(errandData);
    setShowPaystack(true);
  };

  const handlePaystackSuccess = async (response: any) => {
    setShowPaystack(false);
    
    if (!pendingErrand || !selectedRunner || !user) {
      Alert.alert('Error', 'Payment successful but errand data is missing.');
      return;
    }

    try {
      // Create the errand with payment confirmation
      const pickupLat = pendingErrand.pickupLatitude || 6.5244;
      const pickupLng = pendingErrand.pickupLongitude || 3.3792;
      const dropoffLat = pendingErrand.dropoffLatitude || 6.5244;
      const dropoffLng = pendingErrand.dropoffLongitude || 3.3792;

      const distance = haversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
      const fee = Math.round(distance * 1000);

      const fullErrandData: FullErrandData = {
        ...pendingErrand,
        runnerId: selectedRunner.id,
        runnerName: selectedRunner.name,
        runnerImage: selectedRunner.image,
        buyerId: user.uid,
        buyerName: user.displayName,
        buyerEmail: user.email,
        status: 'available',
        createdAt: new Date().toISOString(),
        distance: distance.toFixed(2) + ' km',
        fee,
        paymentStatus: 'paid',
        paymentReference: paystackTxnRef,
        paystackData: response.data,
      };

      const errandDocRef = await db.collection('errands').add(fullErrandData) as unknown as DocumentReference;
      
      setErrandModalVisible(false);
      setPendingErrand(null);
      
      Alert.alert('Success', 'Your errand request has been submitted and paid for!', [
        {
          text: 'Track Errand', 
          onPress: () => navigation.navigate('OrderTracking', {
            jobType: 'errand',
            jobId: errandDocRef.id,
            orderNumber: errandDocRef.id,
          })
        }
      ]);

      // Send notifications (same logic as before)
      try {
        const runnerDoc = await db.collection('users').doc(selectedRunner.id).get();
        const runnerData = runnerDoc.data();
        const runnerPushToken = runnerData?.expoPushToken;

        const buyerDoc = await db.collection('users').doc(user.uid).get();
        const buyerData = buyerDoc.data();
        const buyerPushToken = buyerData?.expoPushToken;

        if (runnerPushToken) {
          await sendPushNotification(
            runnerPushToken,
            'New Errand Request',
            `${user.displayName || 'A buyer'} requested: "${fullErrandData.title}" at ${fullErrandData.location}.`
          );
        }
        if (buyerPushToken) {
          await sendPushNotification(
            buyerPushToken,
            'Errand Request Sent',
            `Your request "${fullErrandData.title}" to ${selectedRunner.name} was sent!`
          );
        }
      } catch (error) {
        console.error('Error sending notifications:', error);
      }
    } catch (error) {
      Alert.alert('Error', 'Payment successful but failed to create errand. Please contact support.');
      console.error('Error creating errand after payment:', error);
    }
  };

  const handlePaystackCancel = () => {
    setShowPaystack(false);
    setPendingErrand(null);
    Alert.alert('Payment Cancelled', 'Your errand request was not submitted.');
  };

  const handleStorePress = (store: Store) => {
    navigation.navigate('SellerProfile', { 
      sellerId: store.id, 
      sellerName: store.name 
    });
  };

  const handleRunnerPress = (runner: Runner) => {
    navigation.navigate('RunnerProfile', { 
      runnerId: runner.id, 
      runnerName: runner.name 
    });
  };

  const handleRunnerSelect = (runner: Runner) => {
    if (runner.status === 'available') {
      setSelectedRunner(runner);
      setErrandModalVisible(true);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Avatar.Icon
              icon={greeting.includes('Good morning') || greeting.includes('Good afternoon') ? 'white-balance-sunny' : 'moon-waning-crescent'} 
              size={36}
              style={[styles.headerAvatar, { backgroundColor: theme.colors.surfaceVariant }]}
              color={theme.colors.primary}
            />
            <View>
              <Text style={[styles.greetingText, { color: theme.colors.onSurfaceVariant }]}>
                {greeting}
              </Text>
              <Text style={[styles.timeText, { color: theme.colors.onSurfaceVariant }]}>
                {currentTime}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setNotificationDrawerVisible(true)}>
            <Animatable.View
              animation={unreadCount > 0 ? 'bounce' : undefined}
              iterationCount="infinite"
              duration={1200}
              style={styles.notificationContainer}
            >
              <IconButton
                icon="bell"
                size={24}
                iconColor={theme.colors.onSurface}
              />
              <NotificationBadge count={unreadCount} size="medium" />
            </Animatable.View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Section */}
      <Animated.View style={[styles.mapContainer, { height: mapHeight }]}>
        {getDefaultRegion() ? (
          <MapView
            style={styles.map}
            initialRegion={getDefaultRegion()!}
            onMapReady={() => setMapReady(true)}
            loadingEnabled={!mapReady}
            provider={PROVIDER_DEFAULT}
            showsUserLocation={true}
            showsMyLocationButton={true}
            showsCompass={true}
            showsScale={true}
            showsTraffic={false}
            showsBuildings={true}
            showsIndoors={true}
            mapType="standard"
          >
            
            
            {/* Store Markers */}
            {filteredStores.map((store) => (<Marker
                key={`store-${store.id}`}
                coordinate={{
                  latitude: store.latitude, longitude: store.longitude}}
                onPress={() => handleStorePress(store)}
              >
                <View style={styles.markerContainer}>
                  <MaterialCommunityIcons 
                    name={
                      store.type === 'restaurant' ? 'food' : 
                      store.type === 'grocery' ? 'basket' : 'store'
                    }
                    size={24}
                    color={theme.colors.onPrimary}
                    style={[styles.markerIcon, { backgroundColor: theme.colors.primary }]}
                  />
                  <View style={[styles.markerBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.markerText}>⭐ {formatRating(store.rating)}</Text>
                  </View>
                </View>
              </Marker>
            ))}
            
            {/* Runner Markers */}
            {filteredRunners.map((runner) => (<Marker
                key={`runner-${runner.id}`}
                coordinate={{
                  latitude: runner.latitude, longitude: runner.longitude}}
                onPress={() => handleRunnerPress(runner)}
              >
                <View style={styles.runnerMarker}>
                  <Avatar.Image 
                    source={{ uri: runner.image }} 
                    size={40}
                    style={[
                      styles.runnerAvatar,
                      { 
                        borderColor: runner.status === 'available' 
                          ? theme.colors.secondary 
                          : theme.colors.outline 
                      }
                    ]}
                  />
                  {runner.status === 'available' && (
                    <View style={[styles.runnerBadge, { backgroundColor: theme.colors.secondary }]} />
                  )}
                </View>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={[styles.map, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant, marginTop: 16 }]}>
              Loading map...
            </Text>
          </View>
        )}
        <TouchableOpacity 
          onPress={toggleMapSize}
          style={[styles.mapToggle, { backgroundColor: theme.colors.surface }]}
        >
          <MaterialCommunityIcons 
            name={isMapExpanded ? 'chevron-down' : 'chevron-up'} 
            size={24} 
            color={theme.colors.onSurface} 
          />
        </TouchableOpacity>
        

      </Animated.View>

      {/* Info Section */}
      <View style={[styles.infoContainer, { backgroundColor: theme.colors.surface }]}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Debug Section - Remove after testing */}
          <View style={{ padding: 16, backgroundColor: theme.colors.errorContainer, marginBottom: 16, borderRadius: 8 }}>
            <Text style={{ color: theme.colors.onErrorContainer, marginBottom: 8 }}>
              Debug: Stores: {stores.length}, Runners: {runners.length}
            </Text>
            <Button 
              mode="contained" 
              onPress={async () => {
                console.log('Manual data refresh triggered');
                const result = await addSampleData();
                console.log('Sample data result:', result);
                Alert.alert('Debug', `Added sample data. Check console for details.`);
              }}
              style={{ marginBottom: 8 }}
            >
              Add Sample Data
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => {
                console.log('Current stores:', stores);
                console.log('Current runners:', runners);
                Alert.alert('Debug', `Stores: ${stores.length}, Runners: ${runners.length}. Check console for details.`);
              }}
            >
              Log Current Data
            </Button>
          </View>

          {/* Categories */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map(category => (
              <Chip
                key={category.id}
                mode="outlined"
                selected={activeCategory === category.id}
                onPress={() => setActiveCategory(category.id)}
                style={[
                  styles.categoryChip,
                  { 
                    backgroundColor: activeCategory === category.id 
                      ? theme.colors.primaryContainer 
                      : theme.colors.surfaceVariant,
                    borderColor: theme.colors.outline,
                  }
                ]}
                textStyle={{
                  color: activeCategory === category.id 
                    ? theme.colors.onPrimaryContainer 
                    : theme.colors.onSurfaceVariant,
                }}
              >
                {category.name}
              </Chip>
            ))}
          </ScrollView>

          {/* Nearby Stores */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Nearby Stores
              </Text>
              <Button 
                mode="text" 
                onPress={() => navigation.navigate('Stores')}
                labelStyle={{ color: theme.colors.primary }}
              >
                See all
              </Button>
            </View>
            
            {filteredStores.length === 0 ? (
              <View style={styles.emptySection}>
                <MaterialCommunityIcons 
                  name="store-remove-outline" 
                  size={60} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                  No stores found
                </Text>
              </View>
            ) : (filteredStores.map((store) => (<Card 
                  key={store.id}
                  style={[styles.card, { backgroundColor: theme.colors.surface }]} 
                  mode="outlined"
                  onPress={() => handleStorePress(store)}
                >
                  <Card.Content style={styles.cardContent}>
                    <Avatar.Image 
                      source={{ uri: store.image }} 
                      size={60} 
                      style={styles.storeImage}
                    />
                    <View style={styles.cardText}>
                      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                        {store.name}
                      </Text>
                      <View style={styles.cardDetails}>
                        <View style={styles.ratingContainer}>
                          <MaterialCommunityIcons 
                            name="star" 
                            size={16} 
                            color={theme.colors.primary} 
                          />
                          <Text style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                            {formatRating(store.rating)}
                          </Text>
                        </View>
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>
                          • {store.distance}
                        </Text>
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>
                          • {categories.find(c => c.id === store.type)?.name || store.type}
                        </Text>
                      </View>
                    </View>
                    <IconButton
                      icon="chevron-right"
                      size={24}
                      iconColor={theme.colors.onSurfaceVariant}
                    />
                  </Card.Content>
                </Card>
              ))
            )}
          </View>

          {/* Available Runners */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Available Runners
              </Text>
              <Button 
                mode="text" 
                onPress={() => navigation.navigate('Runners')}
                labelStyle={{ color: theme.colors.primary }}
              >
                See all
              </Button>
            </View>
            
            {filteredRunners.length === 0 ? (
              <View style={styles.emptySection}>
                <MaterialCommunityIcons 
                  name="run-fast" 
                  size={60} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                  No runners available
                </Text>
              </View>
            ) : (filteredRunners.map((runner) => (<Card 
                  key={runner.id}
                  style={[
                    styles.card, { 
                      backgroundColor: theme.colors.surface, opacity: runner.status === 'available' ? 1 : 0.6}
                  ]} 
                  mode="outlined"
                  onPress={() => runner.status === 'available' && handleRunnerSelect(runner)}
                >
                  <Card.Content style={styles.cardContent}>
                    <Avatar.Image 
                      source={{ uri: runner.image }} 
                      size={60} 
                      style={[
                        styles.runnerImage,
                        { 
                          borderColor: runner.status === 'available' 
                            ? theme.colors.secondary 
                            : theme.colors.outline 
                        }
                      ]}
                    />
                    <View style={styles.cardText}>
                      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                        {runner.name}
                      </Text>
                      <View style={styles.cardDetails}>
                        <View style={styles.ratingContainer}>
                          <MaterialCommunityIcons 
                            name="star" 
                            size={16} 
                            color={theme.colors.primary} 
                          />
                          <Text style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                            {formatRating(runner.rating)}
                          </Text>
                        </View>
                        <Text style={{ color: theme.colors.onSurfaceVariant }}>
                          • {runner.deliveries} deliveries
                        </Text>
                      </View>
                      <View style={styles.statusContainer}>
                        <View 
                          style={[
                            styles.statusDot,
                            { 
                              backgroundColor: runner.status === 'available' 
                                ? theme.colors.secondary 
                                : theme.colors.outline
                            }
                          ]} 
                        />
                        <Text 
                          style={[
                            styles.statusText,
                            { 
                              color: runner.status === 'available' 
                                ? theme.colors.onSurface 
                                : theme.colors.onSurfaceVariant 
                            }
                          ]}
                        >
                          {runner.status === 'available' ? 'Available now' : 'Currently busy'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.runnerActions}>
                      <TouchableOpacity
                        onPress={() => handleRunnerPress(runner)}
                        style={[
                          styles.actionIcon,
                          { backgroundColor: theme.colors.surfaceVariant }
                        ]}
                      >
                        <MaterialCommunityIcons 
                          name="account" 
                          size={20} 
                          color={theme.colors.onSurfaceVariant} 
                        />
                      </TouchableOpacity>
                      {runner.status === 'available' && (<TouchableOpacity
                          onPress={() => handleRunnerSelect(runner)}
                          style={[
                            styles.actionIcon,
                            { backgroundColor: theme.colors.secondary }
                          ]}
                        >
                          <MaterialCommunityIcons 
                            name="check" 
                            size={20} 
                            color={theme.colors.onPrimary} 
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      {/* Notification Drawer */}
      <NotificationDrawer
        visible={notificationDrawerVisible}
        onClose={() => setNotificationDrawerVisible(false)}
        notifications={notifications}
        onNotificationPress={notification => {
          markAsRead(notification.id);
          setNotificationDrawerVisible(false);
          handleNotificationPress(notification);
        }}
        onClearAll={markAllAsRead}
      />

      {/* Errand Request Modal */}
      <ErrandRequestModal
        visible={errandModalVisible}
        onDismiss={() => setErrandModalVisible(false)}
        onSubmit={handleErrandSubmit}
        onPaymentRequired={handlePaymentRequired}
      />

      {/* Review Prompt Modal */}
      <ReviewPromptModal
        visible={reviewPromptVisible}
        onClose={() => setReviewPromptVisible(false)}
        onReviewSubmitted={(prompt) => {
          // Navigate to review screen with prompt data
          navigation.navigate('ReviewSubmission', {
            targetId: prompt.targetId,
            targetType: prompt.targetType,
            targetName: prompt.targetName,
            targetImage: prompt.targetImage,
            triggerId: prompt.id,
            orderId: prompt.orderId,
            errandId: prompt.errandId,
          });
          setReviewPromptVisible(false);
        }}
      />

      {/* PayStack Payment for Errand Requests */}
      {showPaystack && pendingErrand && (
        <PaystackWebView
          paystackKey={PAYSTACK_PUBLIC_KEY}
          amount={Number(pendingErrand.budget)}
          billingEmail={user?.email || ''}
          billingName={user?.displayName || 'User'}
          activityIndicatorColor={theme.colors.primary}
          onSuccess={handlePaystackSuccess}
          onCancel={handlePaystackCancel}
          reference={paystackTxnRef}
          autoStart={true}
          channels={["card", "bank", "ussd"]}
          currency="NGN"
          description={`Payment for errand: ${pendingErrand.title}`}
        />
      )}
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 1,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    backgroundColor: COLORS.primary,
  },
  greetingText: {
    fontSize: 14,
  },
  timeText: {
    fontSize: 12,
    marginTop: 2,
  },
  notificationContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mapContainer: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  map: {
    flex: 1,
  },
  mapToggle: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 16,
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  categoriesContainer: {
    paddingBottom: 16,
  },
  categoryChip: {
    marginRight: 8,
    borderRadius: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  storeImage: {
    borderRadius: 12,
    marginRight: 16,
  },
  runnerImage: {
    borderRadius: 12,
    marginRight: 16,
    borderWidth: 2,
  },
  cardText: {
    flex: 1,
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  runnerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerContainer: {
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerIcon: {
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  markerBadge: {
    position: 'absolute',
    bottom: -8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  markerText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  runnerMarker: {
    alignItems: 'center',
    position: 'relative',
  },
  runnerAvatar: {
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  runnerBadge: {
    position: 'absolute',
    bottom: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
});

export default BuyerHomeScreen;
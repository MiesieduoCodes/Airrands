
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Image
} from 'react-native';
import { 
  Text, 
  Button, 
  TextInput, 
  Divider,
  Chip,
  IconButton,
  HelperText,
  Switch,
  Card,
  Portal,
  Modal
} from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { RootNavigationProp } from '../../navigation/types';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { validateField, ValidationRule } from '../../utils/validation';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
// @ts-ignore
const PaystackWebView = require('react-native-paystack-webview');
import { getFunctions, httpsCallable } from 'firebase/functions';
import * as Location from 'expo-location';
import ErrorBoundary from '../../components/ErrorBoundary';

import { getRunners } from '../../services/buyerServices';
import { sendOrderNotification } from '../../services/notificationService';
import { getProfile } from '../../services/sellerServices';
import Constants from 'expo-constants';
import { PAYSTACK_PUBLIC_KEY } from '../../config/paystack';
import ConfettiCannon from 'react-native-confetti-cannon';

// Utility function for accurate distance calculation using Haversine formula
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

// Configuration for runner selection
const RUNNER_SELECTION_CONFIG = {
  maxDistance: 10, // Maximum distance in kilometers
  minRating: 3.5, // Minimum rating for runners
  availabilityTimeout: 300000, // 5 minutes - how long to consider a runner available
};

// Generate unique order number
const generateOrderNumber = (orderId: string): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const shortId = orderId.slice(-6).toUpperCase();
  return `ORD-${year}${month}${day}-${shortId}`;
};

interface CheckoutScreenProps {
  navigation: RootNavigationProp;
  route: {
    params: {
      productId: string;
      sellerId: string;
      productName: string;
      price: number;
      quantity?: number;
    };
  };
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'wallet' | 'bank';
  name: string;
  details: string;
  icon: string;
  color: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'paystack',
    type: 'card',
    name: 'Pay with Paystack',
    details: 'Card, Bank, USSD, etc.',
    icon: 'credit-card',
    color: '#08C16C',
  },
];

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation, route }: CheckoutScreenProps) => {
  const { theme } = useTheme();
  const { productId, sellerId, productName, price } = route.params;
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('1');
  const [quantity, setQuantity] = useState(route.params.quantity || 1);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPaystack, setShowPaystack] = useState(false);
  const paystackRef = useRef<any>(null);
  const [paystackTxnRef, setPaystackTxnRef] = useState('');
  const [showRunnerSelection, setShowRunnerSelection] = useState(false);
  const [runners, setRunners] = useState<any[]>([]);
  const [selectedRunner, setSelectedRunner] = useState<any>(null);
  const [buyerLocation, setBuyerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [orderId, setOrderId] = useState<string>('');
  const [deliveryOption, setDeliveryOption] = useState<'pickup' | 'delivery'>('delivery');
  const [sellerInfo, setSellerInfo] = useState<{name: string; avatar?: string; address?: string} | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch seller information
  useEffect(() => {
    const fetchSellerInfo = async () => {
      if (!sellerId) return;
      
      setLoadingSeller(true);
      try {
        const seller = await getProfile(sellerId);
        if (seller) {
          setSellerInfo({
            name: seller.name || 'Unknown Store',
            avatar: seller.avatar,
            address: seller.address,
          });
        }
      } catch (error) {
        setSellerInfo({
          name: 'Unknown Store',
        });
      } finally {
        setLoadingSeller(false);
      }
    };

    fetchSellerInfo();
  }, [sellerId]);

  useEffect(() => {
    if (showRunnerSelection) {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to find nearby runners.');
          return;
        }
        let location = await Location.getCurrentPositionAsync({});
        setBuyerLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
        
        // Fetch runners and filter by proximity and availability
        const allRunners = await getRunners();
        const currentTime = Date.now();
        
        const nearbyRunners = allRunners.filter((runner: any) => {
          // Calculate accurate distance using Haversine formula
          const distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            runner.latitude,
            runner.longitude
          );
          
          // Check if runner is within maximum distance
          const isWithinDistance = distance <= RUNNER_SELECTION_CONFIG.maxDistance;
          
          // Check if runner meets minimum rating requirement
          const meetsRating = (runner.rating || 0) >= RUNNER_SELECTION_CONFIG.minRating;
          
          // Check if runner is available (last seen within timeout period)
          const lastSeen = runner.lastSeen ? new Date(runner.lastSeen).getTime() : 0;
          const isAvailable = (currentTime - lastSeen) <= RUNNER_SELECTION_CONFIG.availabilityTimeout;
          
          // Check if runner is online/active
          const isOnline = runner.isOnline === true;
          
          // Check if runner is not currently on a delivery
          const isNotOnDelivery = !runner.currentDeliveryId;
          
          return isWithinDistance && meetsRating && isAvailable && isOnline && isNotOnDelivery;
        });
        
        // Sort runners by distance (closest first) and rating
        nearbyRunners.sort((a: any, b: any) => {
          const distanceA = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            a.latitude,
            a.longitude
          );
          const distanceB = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            b.latitude,
            b.longitude
          );
          
          // Primary sort by distance, secondary by rating
          if (Math.abs(distanceA - distanceB) < 0.1) {
            return (b.rating || 0) - (a.rating || 0);
          }
          return distanceA - distanceB;
        });
        
        setRunners(nearbyRunners);
        
        if (nearbyRunners.length === 0) {
          Alert.alert(
            'No Runners Available',
            `No runners are available within ${RUNNER_SELECTION_CONFIG.maxDistance}km of your location. Please try again later or consider pickup option.`
          );
        }
      })();
    }
  }, [showRunnerSelection]);

  useEffect(() => {
    if (orderPlaced) {
      setShowConfetti(true);
      
      // Fade in animation for success icon
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
      
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [orderPlaced]);

  const { user } = useAuth();
  const functions = getFunctions();

  const handlePlaceOrder = async () => {
    if (!user?.email) {
      Alert.alert('Missing Email', 'You must have a valid email to checkout.');
      return;
    }
    if (selectedPaymentMethod === 'paystack') {
      // Check if Paystack key is properly configured
      if (!PAYSTACK_PUBLIC_KEY || PAYSTACK_PUBLIC_KEY === 'pk_live_your_production_paystack_public_key_here') {
        Alert.alert(
          'Payment Configuration Error', 
          'Paystack is not properly configured. Please contact support or try another payment method.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Generate a unique reference for Paystack
      const ref = `AIRRANDS_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      setPaystackTxnRef(ref);
      
      // Small delay to ensure state is set before showing modal
      setTimeout(() => {
        setShowPaystack(true);
      }, 100);
      return;
    }
    setLoading(true);
    try {
      // Only allow direct order creation for non-paystack methods
      const orderRef = await db.collection('orders').add({
        productId: route.params.productId,
        sellerId: route.params.sellerId,
        sellerName: sellerInfo?.name || 'Unknown Store',
        productName: route.params.productName,
        price: route.params.price,
        quantity,
        totalAmount: route.params.price * quantity,
        buyerId: user?.uid,
        buyerName: user?.displayName || 'Unknown Buyer',
        buyerEmail: user?.email,
        deliveryOption: deliveryOption,
        status: 'confirmed',
        statusHistory: [
          {
            status: 'confirmed',
            timestamp: new Date().toISOString(),
            description: 'Order received and is being prepared for ' + (deliveryOption === 'delivery' ? 'delivery' : 'pickup') + '.'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      // Update order with generated order number
      const orderNumber = generateOrderNumber(orderRef.id);
      await db.collection('orders').doc(orderRef.id).update({
        orderNumber: orderNumber
      });
      
      setOrderId(orderRef.id);
      setOrderPlaced(true);
    } catch (error) {
      Alert.alert('Order Error', 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackOrder = () => {
    navigation.navigate('OrderTracking', {
      jobType: 'order',
      jobId: orderId,
      orderNumber: generateOrderNumber(orderId),
      quantity: quantity,
      productName: productName,
      totalAmount: price * quantity,
    });
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const handleRunnerSelection = async () => {
    if (!selectedRunner) {
      Alert.alert('Select Runner', 'Please select a runner for delivery.');
      return;
    }

    try {
      // Verify runner is still available before assignment
      const currentTime = Date.now();
      const lastSeen = selectedRunner.lastSeen ? new Date(selectedRunner.lastSeen).getTime() : 0;
      const isStillAvailable = (currentTime - lastSeen) <= RUNNER_SELECTION_CONFIG.availabilityTimeout;
      
      if (!isStillAvailable) {
        Alert.alert(
          'Runner No Longer Available',
          'The selected runner is no longer available. Please select another runner.',
          [{ text: 'OK' }]
        );
        // Refresh runner list
        setShowRunnerSelection(false);
        setTimeout(() => setShowRunnerSelection(true), 100);
        return;
      }

      // Update the order with runner information
      await db.collection('orders').doc(orderId).update({
        runnerId: selectedRunner.id,
        runnerName: selectedRunner.name,
        deliveryStatus: 'assigned',
        assignedAt: new Date().toISOString(),
        statusHistory: [
          {
            status: 'assigned',
            timestamp: new Date().toISOString(),
            description: `Order assigned to runner ${selectedRunner.name}.`
          }
        ],
      });

      // Update runner's current delivery status
      await db.collection('runners').doc(selectedRunner.id).update({
        currentDeliveryId: orderId,
        lastAssignedAt: new Date().toISOString(),
      });

      Alert.alert(
        'Runner Assigned!',
        `Your order has been assigned to ${selectedRunner.name}. They will contact you shortly.`,
        [{ text: 'OK' }]
      );

      // Navigate to order tracking
      navigation.navigate('OrderTracking', {
        jobType: 'order',
        jobId: orderId,
        orderNumber: generateOrderNumber(orderId),
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to assign runner. Please try again.');
    }
  };

  const refreshRunners = async () => {
    if (!buyerLocation) return;
    
    try {
      const allRunners = await getRunners();
      const currentTime = Date.now();
      
      const nearbyRunners = allRunners.filter((runner: any) => {
        const distance = calculateDistance(
          buyerLocation.latitude,
          buyerLocation.longitude,
          runner.latitude,
          runner.longitude
        );
        
        const isWithinDistance = distance <= RUNNER_SELECTION_CONFIG.maxDistance;
        const meetsRating = (runner.rating || 0) >= RUNNER_SELECTION_CONFIG.minRating;
        const lastSeen = runner.lastSeen ? new Date(runner.lastSeen).getTime() : 0;
        const isAvailable = (currentTime - lastSeen) <= RUNNER_SELECTION_CONFIG.availabilityTimeout;
        const isOnline = runner.isOnline === true;
        const isNotOnDelivery = !runner.currentDeliveryId;
        
        return isWithinDistance && meetsRating && isAvailable && isOnline && isNotOnDelivery;
      });
      
      nearbyRunners.sort((a: any, b: any) => {
        const distanceA = calculateDistance(
          buyerLocation.latitude,
          buyerLocation.longitude,
          a.latitude,
          a.longitude
        );
        const distanceB = calculateDistance(
          buyerLocation.latitude,
          buyerLocation.longitude,
          b.latitude,
          b.longitude
        );
        
        if (Math.abs(distanceA - distanceB) < 0.1) {
          return (b.rating || 0) - (a.rating || 0);
        }
        return distanceA - distanceB;
      });
      
      setRunners(nearbyRunners);
    } catch (error) {
      // Error refreshing runners
    }
  };

  const handlePaystackSuccess = async (response: any) => {
    setShowPaystack(false);
    setPaystackTxnRef(''); // Clear the transaction reference
    
    if (!response || !response.transactionRef || !response.transactionRef.reference) {
      Alert.alert(
        'Payment Error',
        'Invalid payment response received. Please try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setLoading(true);
    try {
      // Step 1: Verify the transaction with Paystack
      const verifyTransaction = httpsCallable(functions, 'verifyPaystackTransaction');
      const verificationResult = await verifyTransaction({
        reference: response.transactionRef.reference
      });
      const verificationData = verificationResult.data as any;
      if (!verificationData.success) {
        Alert.alert(
          'Payment Verification Failed',
          verificationData.message || 'Unable to verify payment. Please contact support.',
          [{ text: 'OK' }]
        );
        return;
      }
      // Step 2: Process the successful payment and create order
      const processPayment = httpsCallable(functions, 'processSuccessfulPayment');
      const paymentData = {
        reference: response.transactionRef.reference,
        status: 'success',
        amount: price * quantity,
        currency: 'NGN',
        userId: user?.uid,
        userEmail: user?.email,
        userName: user?.displayName,
        paymentMethod: 'paystack',
        paystackData: verificationData.data, // Store Paystack's response data
      };
      const orderData = {
        productId: route.params.productId,
        sellerId: route.params.sellerId,
        sellerName: sellerInfo?.name || 'Unknown Store',
        productName: route.params.productName,
        price: route.params.price,
        quantity,
        totalAmount: route.params.price * quantity,
        buyerId: user?.uid,
        buyerEmail: user?.email,
        buyerName: user?.displayName,
        status: 'confirmed',
        paymentReference: response.transactionRef.reference,
        paymentStatus: 'completed',
        paymentMethod: 'paystack',
        deliveryOption: deliveryOption,
        statusHistory: [
          {
            status: 'confirmed',
            timestamp: new Date().toISOString(),
            description: 'Order received and payment confirmed. Being prepared for ' + (deliveryOption === 'delivery' ? 'delivery' : 'pickup') + '.'
          }
        ],
      };
      const processResult = await processPayment({
        paymentData,
        orderData
      });
      const processData = processResult.data as any;
      if (processData.success) {
        setOrderId(processData.orderId);
        setOrderPlaced(true);
        
        // Send notification to seller about new order
        try {
          await sendOrderNotification(
            route.params.sellerId, // Seller's user ID
            user?.uid || '', // Buyer's user ID
            processData.orderId, // Order ID
            route.params.productName, // Product name
            price * quantity, // Amount
            user?.displayName || 'a customer' // Buyer name
          );
          
          // Save in-app notification for seller
          await db.collection('users').doc(route.params.sellerId)
            .collection('notifications').add({
              title: 'New Order Received',
              message: `New order for ${route.params.productName} from ${user?.displayName || 'a customer'}`,
              type: 'order',
              isRead: false,
              createdAt: new Date().toISOString(),
              orderId: processData.orderId,
              buyerId: user?.uid,
              buyerName: user?.displayName,
            });
          
          // Send notification to buyer about order confirmation
          await sendOrderNotification(
            user?.uid || '', // Buyer's user ID
            route.params.sellerId, // Seller's user ID
            processData.orderId, // Order ID
            route.params.productName, // Product name
            price * quantity, // Amount
            sellerInfo?.name || 'Store' // Seller name
          );
          
          // Save in-app notification for buyer
          await db.collection('users').doc(user?.uid || '')
            .collection('notifications').add({
              title: 'Order Confirmed',
              message: `Your order for ${route.params.productName} has been confirmed and is being prepared.`,
              type: 'order',
              isRead: false,
              createdAt: new Date().toISOString(),
              orderId: processData.orderId,
              sellerId: route.params.sellerId,
              productName: route.params.productName,
            });
            
        } catch (notificationError) {
          // Don't fail the order if notification fails
        }
        
        Alert.alert(
          'Payment Submitted!',
          'Your payment has been submitted for review. Your order will be processed once the payment is approved by our team.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(processData.message || 'Failed to process payment');
      }
    } catch (error: any) {
      Alert.alert(
        'Payment Error',
        error.message || 'An error occurred while processing your payment. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackCancel = () => {
    setShowPaystack(false);
    setPaystackTxnRef(''); // Clear the transaction reference
  };



  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <IconButton
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          iconColor={theme.colors.onSurface}
          size={24}
        />
        <Text 
          variant="titleMedium" 
          style={[styles.headerTitle, { color: theme.colors.onSurface }]}
        >
          Checkout
        </Text>
        <View style={{ width: 56 }} />
      </View>

      {!orderPlaced ? (
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Product Summary */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Order Summary
            </Text>
            
            <View style={styles.productRow}>
              <View style={styles.productInfo}>
                <Text variant="bodyLarge" style={[styles.productName, { color: theme.colors.onSurface }]}>
                  {productName}
                </Text>
                <Text variant="bodyMedium" style={[styles.sellerName, { color: theme.colors.onSurfaceVariant }]}>
                  {loadingSeller ? 'Loading seller...' : (sellerInfo?.name || 'Unknown Store')}
                </Text>
                <Text variant="bodyMedium" style={[styles.unitPrice, { color: theme.colors.onSurfaceVariant }]}>
                  ₦{price.toLocaleString()} each
                </Text>
              </View>
            
            <View style={styles.quantityContainer}>
                <TouchableOpacity
                  onPress={() => handleQuantityChange(quantity - 1)}
                  style={[styles.quantityButton, { borderColor: theme.colors.outline }]}
                >
                  <MaterialIcons name="remove" size={20} color={theme.colors.onSurface} />
                </TouchableOpacity>
                
                <Text variant="bodyLarge" style={[styles.quantityText, { color: theme.colors.onSurface }]}>
                  {quantity}
                </Text>
                
                <TouchableOpacity
                  onPress={() => handleQuantityChange(quantity + 1)}
                  style={[styles.quantityButton, { borderColor: theme.colors.outline }]}
                >
                  <MaterialIcons name="add" size={20} color={theme.colors.onSurface} />
                </TouchableOpacity>
              </View>
            </View>
            
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
            
            <View style={styles.priceRow}>
              <Text variant="titleMedium" style={[styles.totalLabel, { color: theme.colors.onSurface }]}>
                Total
              </Text>
              <Text variant="titleMedium" style={[styles.totalValue, { color: theme.colors.primary }]}>
                ₦{(price * quantity).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Payment Methods */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Payment Method
            </Text>
            
            {paymentMethods.map((method: PaymentMethod) => (
              <TouchableOpacity
                key={method.id}
                  onPress={() => setSelectedPaymentMethod(method.id)}
                style={[
                  styles.paymentMethod,
                  selectedPaymentMethod === method.id && {
                    borderColor: method.color,
                    backgroundColor: `${method.color}10`
                  }
                ]}
              >
                <View style={styles.paymentMethodIcon}>
                    <MaterialCommunityIcons 
                      name={method.icon as any} 
                      size={24} 
                    color={selectedPaymentMethod === method.id ? method.color : theme.colors.onSurfaceVariant} 
                    />
                </View>
                
                <View style={styles.paymentMethodInfo}>
                      <Text 
                    variant="bodyLarge" 
                    style={[
                      styles.paymentMethodName,
                      selectedPaymentMethod === method.id && { color: method.color }
                    ]}
                      >
                        {method.name}
                      </Text>
                      <Text 
                        variant="bodySmall" 
                    style={[
                      styles.paymentMethodDetails,
                      { color: theme.colors.onSurfaceVariant }
                    ]}
                      >
                        {method.details}
                      </Text>
                    </View>
                
                {selectedPaymentMethod === method.id && (
                  <View style={[styles.paymentMethodCheck, { backgroundColor: method.color }]}>
                    <MaterialIcons name="check" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
            </View>
            
          {/* Place Order Button */}
          <Button
            mode="contained"
            onPress={handlePlaceOrder}
            disabled={loading}
            loading={loading}
            style={[styles.placeOrderButton, { backgroundColor: theme.colors.primary }]}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon="check"
          >
            Place Order
          </Button>
        </ScrollView>
      ) : (
        <ScrollView style={styles.successContainer}>
          {/* Confetti Animation */}
          {showConfetti && (
            <ConfettiCannon
              count={200}
              origin={{ x: Dimensions.get('window').width / 2, y: 0 }}
              fallSpeed={3000}
              fadeOut={true}
              autoStart={true}
              ref={confettiRef}
            />
          )}
          
          {/* Success Icon with Animation */}
          <Animated.View 
            style={[
              styles.successIconContainer,
              { opacity: fadeAnim }
            ]}
          >
            <View style={[styles.successIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
              <MaterialIcons name="check-circle" size={80} color={theme.colors.primary} />
            </View>
          </Animated.View>
          
          <Text variant="headlineSmall" style={[styles.successTitle, { color: theme.colors.onSurface }]}>
            Order Confirmed!
          </Text>
          
          <Text variant="bodyLarge" style={[styles.successMessage, { color: theme.colors.onSurfaceVariant }]}>
            Your order has been placed successfully. Your order number is:
          </Text>
          
          <View style={[styles.orderNumberContainer, { backgroundColor: theme.colors.primary + '15' }]}>
            <Text variant="titleMedium" style={[styles.orderNumber, { color: theme.colors.primary }]}>
              {generateOrderNumber(orderId)}
            </Text>
          </View>

          {/* Order Summary Card */}
          <View style={[styles.orderSummaryCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.orderSummaryHeader}>
              <MaterialIcons name="receipt" size={20} color={theme.colors.primary} />
              <Text variant="titleMedium" style={[styles.orderSummaryTitle, { color: theme.colors.onSurface }]}>
                Order Details
              </Text>
            </View>
            
            <View style={styles.orderSummaryDivider} />
            
            <View style={styles.orderSummaryRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Product:
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, textAlign: 'right', flex: 1 }}>
                {productName}
              </Text>
            </View>
            
            <View style={styles.orderSummaryRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Quantity:
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {quantity}
              </Text>
            </View>
            
            <View style={styles.orderSummaryRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Unit Price:
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                ₦{price.toLocaleString()}
              </Text>
            </View>
            
            <View style={[styles.orderSummaryDivider, { marginVertical: 12 }]} />
            
            <View style={[styles.orderSummaryRow, styles.totalRow]}>
              <Text variant="titleMedium" style={[styles.totalLabel, { color: theme.colors.onSurface }]}>
                Total:
              </Text>
              <Text variant="titleMedium" style={[styles.totalValue, { color: theme.colors.primary }]}>
                ₦{(price * quantity).toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.orderSummaryDivider} />
            
            <View style={styles.orderSummaryRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Delivery Method:
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {deliveryOption === 'delivery' ? 'Home Delivery' : 'Store Pickup'}
              </Text>
            </View>
            
            <View style={styles.orderSummaryRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Status:
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                  CONFIRMED
                </Text>
              </View>
            </View>
          </View>

          {/* Next Steps Card */}
          <View style={[styles.nextStepsCard, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleMedium" style={[styles.nextStepsTitle, { color: theme.colors.onSurface }]}>
              What's Next?
            </Text>
            
            <View style={styles.nextStepItem}>
              <View style={[styles.stepIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                <MaterialIcons name="access-time" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.stepText}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '500' }}>
                  Seller is preparing your order
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  You'll be notified when it's ready for {deliveryOption === 'delivery' ? 'delivery' : 'pickup'}
                </Text>
              </View>
            </View>
            
            {deliveryOption === 'delivery' && (
              <View style={styles.nextStepItem}>
                <View style={[styles.stepIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                  <MaterialCommunityIcons name="bike" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.stepText}>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '500' }}>
                    Arrange delivery
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    Select a runner to deliver your order
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <Button
              mode="contained"
              onPress={handleTrackOrder}
              style={[styles.trackButton, { backgroundColor: theme.colors.primary }]}
              contentStyle={styles.trackButtonContent}
              labelStyle={styles.trackButtonLabel}
              icon="map-marker-path"
            >
              Track Order
            </Button>
            
            {deliveryOption === 'delivery' && (
              <Button
                mode="outlined"
                onPress={() => setShowRunnerSelection(true)}
                style={[styles.runnerButton, { borderColor: theme.colors.primary }]}
                contentStyle={styles.runnerButtonContent}
                labelStyle={{ color: theme.colors.primary }}
                icon="account-plus"
              >
                Select Runner
              </Button>
            )}
            
            <Button
              mode="text"
              onPress={() => navigation.navigate('BuyerApp')}
              style={styles.homeButton}
              contentStyle={styles.homeButtonContent}
              textColor={theme.colors.onSurfaceVariant}
              icon="home"
            >
              Back to Home
            </Button>
          </View>
        </ScrollView>

      )}
      {showPaystack && paystackTxnRef && (
        <Portal>
          <Modal 
            visible={showPaystack}
            onDismiss={handlePaystackCancel}
            contentContainerStyle={styles.paystackModal}
          >
            <View style={styles.paystackContainer}>
              <View style={styles.paystackHeader}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  Complete Payment
                </Text>
                <IconButton
                  icon="close"
                  onPress={handlePaystackCancel}
                  iconColor={theme.colors.onSurface}
                  size={20}
                />
              </View>
              {paystackTxnRef ? (
                <View style={{ flex: 1 }}>
                  <ErrorBoundary>
                    <PaystackWebView
                      buttonText="Pay Now"
                      showPayButton={true}
                      paystackKey={PAYSTACK_PUBLIC_KEY}
                      amount={price * quantity}
                      billingEmail={user?.email || 'customer@example.com'}
                      billingName={user?.displayName || 'Customer'}
                      billingMobile=""
                      activityIndicatorColor={theme.colors.primary}
                      onSuccess={handlePaystackSuccess}
                      onCancel={handlePaystackCancel}
                      onError={(error: any) => {
                        Alert.alert(
                          'Payment Error',
                          'There was an error loading the payment interface. Please try again.',
                          [{ text: 'OK', onPress: handlePaystackCancel }]
                        );
                      }}
                      autoStart={false}
                      ref={paystackRef}
                      currency="NGN"
                      channels={["card", "bank", "ussd", "qr"]}
                      reference={paystackTxnRef}
                    />
                  </ErrorBoundary>
                </View>
              ) : (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={{ marginTop: 16, textAlign: 'center' }}>
                    Preparing payment...
                  </Text>
                </View>
              )}
            </View>
          </Modal>
        </Portal>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 35,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 12,
    elevation: 2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 14,
  },
  unitPrice: {
    fontSize: 14,
    marginTop: 2,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 16,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
    height: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontWeight: '600',
  },
  totalValue: {
    fontWeight: '700',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  paymentMethodIcon: {
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontWeight: '500',
    marginBottom: 2,
  },
  paymentMethodDetails: {
    fontSize: 12,
  },
  paymentMethodCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeOrderButton: {
    borderRadius: 12,
    marginTop: 8,
  },
  buttonContent: {
    height: 52,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // NEW STYLES FOR ORDER CONFIRMATION SCREEN
  successContainer: {
    flex: 1,
    padding: 20,
    paddingBottom: 40,
  },
  successIconContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 24,
  },
  successMessage: {
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  orderNumberContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  orderNumber: {
    fontWeight: '700',
    letterSpacing: 1,
  },
  orderSummaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderSummaryTitle: {
    fontWeight: '600',
    marginLeft: 8,
  },
  orderSummaryDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nextStepsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nextStepsTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepText: {
    flex: 1,
  },
  actionButtonsContainer: {
    width: '100%',
    paddingBottom: 40,
  },
  trackButton: {
    borderRadius: 12,
    marginBottom: 12,
  },
  trackButtonContent: {
    height: 52,
  },
  trackButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  runnerButton: {
    borderRadius: 12,
    marginBottom: 12,
  },
  runnerButtonContent: {
    height: 52,
  },
  homeButton: {
    marginTop: 8,
  },
  homeButtonContent: {
    height: 52,
  },
  
  // Runner selection styles (kept from original)
  runnerToggleSection: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  runnerToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  runnerToggleInfo: {
    flex: 1,
  },
  runnerToggleTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  runnerToggleSubtitle: {
    fontSize: 12,
  },
  runnerSelectionContainer: {
    marginTop: 12,
  },
  runnerSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  runnerSelectionTitle: {
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  runnerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  runnerOptionInfo: {
    flex: 1,
  },
  runnerName: {
    fontWeight: '500',
    marginBottom: 2,
  },
  runnerRating: {
    fontSize: 12,
  },
  runnerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  lastSeenText: {
    fontSize: 10,
  },
  assignRunnerButton: {
    borderRadius: 12,
    marginTop: 12,
  },
  assignRunnerButtonContent: {
    height: 52,
  },
  noRunnersText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  deliveryOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 1,
    marginHorizontal: 4,
  },
  deliveryOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deliveryOptionName: {
    fontWeight: '500',
    marginBottom: 2,
  },
  deliveryOptionDetails: {
    fontSize: 12,
  },
  deliveryOptionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runnerSelectionSection: {
    marginTop: 16,
  },
  runnerSelectionButton: {
    borderRadius: 12,
    width: '100%',
  },
  paystackModal: {
    flex: 1,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  paystackContainer: {
    flex: 1,
  },
  paystackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
export default CheckoutScreen;
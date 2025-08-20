import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Platform, StatusBar } from 'react-native';
import { Text, Card, Button, Chip, Divider, Portal, Dialog, ProgressBar, Searchbar, Badge, Checkbox, Surface, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { SellerNavigationProp } from '../../navigation/types';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getOrders, updateOrderStatus, subscribeToOrderUpdates } from '../../services/sellerServices';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');

interface OrdersScreenProps {
  navigation: SellerNavigationProp;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Customer {
  name: string;
  phone: string;
}

interface Order {
  id: string;
  date: string;
  status: string;
  customer: Customer;
  items: OrderItem[];
  total: number;
  orderNumber?: string;
}

interface Filter {
  id: string;
  label: string;
  icon: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return COLORS.warning;
    case 'confirmed':
      return COLORS.info;
    case 'available':
      return COLORS.success;
    case 'cancelled':
      return COLORS.error;
    default:
      return COLORS.gray?.[500];
  }
};

const getStatusText = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return 'clock-outline';
    case 'confirmed':
      return 'check-circle-outline';
    case 'available':
      return 'package-variant';
    case 'cancelled':
      return 'close-circle-outline';
    default:
      return 'help-circle-outline';
  }
};

const OrdersScreen: React.FC<OrdersScreenProps> = ({ navigation }: OrdersScreenProps) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'customer'>('date');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkActionModalVisible, setBulkActionModalVisible] = useState(false);
  const [orderDetailsModalVisible, setOrderDetailsModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [orderSubscription, setOrderSubscription] = useState<any>(null);

  const filters = [
    { id: 'all', label: 'All Orders', icon: 'format-list-bulleted' },
    { id: 'pending', label: 'New Orders', icon: 'clock-outline' },
    { id: 'confirmed', label: 'Confirmed', icon: 'check-circle-outline' },
    { id: 'available', label: 'Available', icon: 'package-variant' },
    { id: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' },
  ];

  useEffect(() => {
    if (!user?.uid) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const data = await getOrders(user.uid);
        setOrders(data);
      } catch (e) {
        console.error('Failed to fetch orders:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to real-time order updates
    const subscription = subscribeToOrderUpdates(user.uid, (updatedOrders) => {
      setOrders(updatedOrders);
    });

    setOrderSubscription(subscription);

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription();
      }
    };
  }, [user?.uid]);

  useEffect(() => {
    return () => {
      if (orderSubscription) {
        orderSubscription();
      }
    };
  }, [orderSubscription]);

  const filteredOrders = selectedStatus === 'all'
    ? orders
    : orders.filter((order: Order) => order.status === selectedStatus);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!user?.uid) return;
    try {
      await updateOrderStatus(user.uid, orderId, newStatus);
      setOrders((prev: Order[]) => prev.map((order: Order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    } catch (e) {
      console.error('Failed to update order status:', e);
    }
  };

  const handleCancelOrder = (order: Order) => {
    setSelectedOrder(order);
    setOrderDetailsModalVisible(true);
  };

  const confirmCancelOrder = () => {
    if (selectedOrder) {
      handleUpdateStatus(selectedOrder.id, 'cancelled');
    }
    setOrderDetailsModalVisible(false);
  };

  const handleBulkAction = async (action: string) => {
    if (!user?.uid) return;
    setBulkLoading(true);
    setBulkResult(null);
    let successCount = 0;
    let failCount = 0;
    
    switch (action) {
      case 'available': {
        for (const orderId of selectedOrders) {
          const order = orders.find(o => o.id === orderId);
          if (order && order.status === 'confirmed') {
            try {
              await updateOrderStatus(user.uid, orderId, 'available');
              successCount++;
            } catch (e) {
              failCount++;
            }
          }
        }
        setOrders((prev) => prev.map(order => selectedOrders.includes(order.id) && order.status === 'confirmed' ? { ...order, status: 'available' } : order));
        setBulkResult(`Marked Available: ${successCount}, Failed: ${failCount}`);
        break;
      }
      case 'cancel': {
        for (const orderId of selectedOrders) {
          try {
            await updateOrderStatus(user.uid, orderId, 'cancelled');
            successCount++;
          } catch (e) {
            failCount++;
          }
        }
        setOrders((prev) => prev.map(order => selectedOrders.includes(order.id) ? { ...order, status: 'cancelled' } : order));
        setBulkResult(`Cancelled: ${successCount}, Failed: ${failCount}`);
        break;
      }
    }
    setBulkLoading(false);
    setSelectedOrders([]);
    setTimeout(() => {
      setBulkActionModalVisible(false);
      setBulkResult(null);
    }, 1500);
  };

  const renderOrderCard = (order: Order, index: number) => (
    <Animatable.View 
      animation="fadeInUp" 
      delay={index * 100} 
      duration={400}
      style={styles.animatableContainer}
    >
      <Surface style={[styles.orderCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <View style={styles.orderNumberContainer}>
              <MaterialIcons 
                name="receipt" 
                size={20} 
                color={theme.colors.primary} 
              />
              <Text variant="titleMedium" style={[styles.orderNumber, { color: theme.colors.onSurface }]}>
                #{order.id.slice(-6)}
              </Text>
            </View>
            <Text variant="bodySmall" style={[styles.orderDate, { color: theme.colors.onSurfaceVariant }]}>
              {new Date(order.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          
          <View style={styles.statusContainer}>
            <Chip
              style={[
                styles.statusChip,
                { backgroundColor: getStatusColor(order.status) + '15' },
              ]}
              icon={getStatusIcon(order.status)}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(order.status) },
                ]}
              >
                {getStatusText(order.status)}
              </Text>
            </Chip>
          </View>
        </View>

        <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

        <View style={styles.customerInfo}>
          <View style={styles.customerHeader}>
            <MaterialIcons 
              name="person" 
              size={16} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text variant="bodyMedium" style={[styles.customerName, { color: theme.colors.onSurface }]}>
              {order.customer.name}
            </Text>
          </View>
          {order.customer.phone && (
            <View style={styles.customerHeader}>
              <MaterialIcons 
                name="phone" 
                size={16} 
                color={theme.colors.onSurfaceVariant} 
              />
              <Text variant="bodySmall" style={[styles.customerPhone, { color: theme.colors.onSurfaceVariant }]}>
                {order.customer.phone}
              </Text>
            </View>
          )}
        </View>

        <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

        <View style={styles.itemsContainer}>
          {order.items.map((item: OrderItem, itemIndex: number) => (
            <View key={itemIndex} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text variant="bodyMedium" style={[styles.itemName, { color: theme.colors.onSurface }]}>
                  {item.name}
                </Text>
                <Text variant="bodySmall" style={[styles.itemQuantity, { color: theme.colors.onSurfaceVariant }]}>
                  Qty: {item.quantity}
                </Text>
              </View>
              <Text variant="bodyMedium" style={[styles.itemPrice, { color: theme.colors.onSurface }]}>
                ₦{(item.price * item.quantity).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

        <View style={styles.totalRow}>
          <Text variant="titleMedium" style={[styles.totalLabel, { color: theme.colors.onSurface }]}>
            Total
          </Text>
          <Text variant="titleLarge" style={[styles.totalAmount, { color: theme.colors.primary }]}>
            ₦{order.total.toLocaleString()}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          {order.status === 'pending' && (<View style={styles.buttonRow}>
              <Button
                mode="contained"
                onPress={() => handleUpdateStatus(order.id, 'confirmed')}
                style={[styles.actionButton, styles.confirmButton]}
                buttonColor={COLORS.success}
              >
                <MaterialIcons name="check" size={16} color="white" />
                Confirm
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleCancelOrder(order)}
                style={[styles.actionButton, styles.cancelButton]}
                textColor={COLORS.error}
              >
                <MaterialIcons name="close" size={16} color={COLORS.error} />
                Cancel
              </Button>
            </View>
          )}
          {order.status === 'confirmed' && (<Button
              mode="contained"
              onPress={() => handleUpdateStatus(order.id, 'available')}
              style={[styles.actionButton, styles.availableButton]}
              buttonColor={COLORS.info}
            >
              <MaterialIcons name="inventory" size={16} color="white" />
              Mark Available
            </Button>
          )}
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('OrderTracking', { 
              jobId: order.id, 
              jobType: 'order', 
              role: 'seller', 
              orderNumber: order.orderNumber || '' 
            })}
            style={[styles.actionButton, styles.trackButton]}
            textColor={theme.colors.primary}
          >
            <MaterialIcons name="location-on" size={16} color={theme.colors.primary} />
            Track Order
          </Button>
        </View>
      </Surface>
    </Animatable.View>
  );

  const renderEmptyState = () => (
    <Animatable.View animation="fadeIn" duration={800} style={styles.emptyState}>
      <View style={[styles.emptyStateIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons 
          name="package-variant-closed" 
          size={48} 
          color={theme.colors.onSurfaceVariant} 
        />
      </View>
      <Text variant="headlineSmall" style={[styles.emptyStateTitle, { color: theme.colors.onSurface }]}>
        No orders yet
      </Text>
      <Text variant="bodyMedium" style={[styles.emptyStateSubtitle, { color: theme.colors.onSurfaceVariant }]}>
        Orders will appear here once customers start buying your products
      </Text>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={theme.colors.surface}
        translucent={false}
      />
      {/* Enhanced Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text variant="headlineLarge" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
              Orders
            </Text>
            <Text variant="bodyLarge" style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Manage your customer orders
            </Text>
            <View style={styles.orderStats}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="package-variant" size={20} color={theme.colors.primary} />
                <Text variant="titleMedium" style={[styles.statNumber, { color: theme.colors.primary }]}>
                  {filteredOrders.length}
                </Text>
                <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Total Orders
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.warning} />
                <Text variant="titleMedium" style={[styles.statNumber, { color: COLORS.warning }]}>
                  {orders.filter(o => o.status === 'pending').length}
                </Text>
                <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Pending
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                <Text variant="titleMedium" style={[styles.statNumber, { color: COLORS.success }]}>
                  {orders.filter(o => o.status === 'confirmed').length}
                </Text>
                <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Confirmed
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Enhanced Search and Filters */}
      <View style={styles.searchAndFiltersContainer}>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search orders by customer name, order number..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
            iconColor={theme.colors.onSurfaceVariant}
            inputStyle={[styles.searchInput, { color: theme.colors.onSurface }]}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            elevation={0}
          />
        </View>

        <View style={styles.filtersHeader}>
          <Text variant="titleMedium" style={[styles.filtersTitle, { color: theme.colors.onSurface }]}>
            Filter by Status
          </Text>
          <Text variant="bodySmall" style={[styles.filtersSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {selectedStatus === 'all' ? 'Showing all orders' : `Showing ${selectedStatus} orders`}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filter: Filter) => (<TouchableOpacity
              key={filter.id}
              onPress={() => setSelectedStatus(filter.id)}
              style={[
                styles.filterChip,
                selectedStatus === filter.id && { 
                  backgroundColor: COLORS.primary,
                  transform: [{ scale: 1.05 }]
                }
              ]}
            >
              <MaterialCommunityIcons 
                name={filter.icon as any} 
                size={20} 
                color={selectedStatus === filter.id ? 'white' : theme.colors.onSurfaceVariant} 
              />
              <Text style={[
                styles.filterText,
                { color: selectedStatus === filter.id ? 'white' : theme.colors.onSurface }
              ]}>
                {filter.label}
              </Text>
              {selectedStatus === filter.id && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {filter.id === 'all' ? orders.length : orders.filter(o => o.status === filter.id).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedOrders.length > 0 && (<Surface style={[styles.bulkActionBar, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <View style={styles.bulkActionContent}>
            <Text style={[styles.selectedCount, { color: theme.colors.onSurface }]}>
              {selectedOrders.length} selected
            </Text>
            <View style={styles.bulkActionButtons}>
              <Button 
                mode="outlined" 
                onPress={() => setBulkActionModalVisible(true)} 
                disabled={bulkLoading}
                style={styles.bulkActionButton}
              >
                Bulk Actions
              </Button>
              <Button 
                mode="text" 
                onPress={() => setSelectedOrders([])} 
                disabled={bulkLoading}
                style={styles.bulkActionButton}
              >
                Clear
              </Button>
            </View>
          </View>
        </Surface>
      )}

      <ScrollView 
        style={styles.ordersContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.ordersContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ProgressBar progress={0.5} color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
              Loading orders...
            </Text>
          </View>
        ) : filteredOrders.length > 0 ? (filteredOrders.map((order: Order, index: number) => renderOrderCard(order, index))
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={orderDetailsModalVisible} onDismiss={() => setOrderDetailsModalVisible(false)}>
          <Dialog.Title>Cancel Order</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to cancel this order? This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setOrderDetailsModalVisible(false)}>No</Button>
            <Button onPress={confirmCancelOrder} textColor={COLORS.error}>
              Yes, Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog visible={bulkActionModalVisible} onDismiss={() => setBulkActionModalVisible(false)}>
          <Dialog.Title>Bulk Actions</Dialog.Title>
          <Dialog.Content>
            {bulkLoading && (
              <View style={styles.bulkLoadingContainer}>
                <ProgressBar progress={0.5} color={theme.colors.primary} />
                <Text style={[styles.bulkLoadingText, { color: theme.colors.primary }]}>
                  Processing...
                </Text>
              </View>
            )}
            {bulkResult && (
              <Text style={[styles.bulkResultText, { color: theme.colors.primary }]}>
                {bulkResult}
              </Text>
            )}
            <Button 
              mode="outlined" 
              onPress={() => handleBulkAction('available')} 
              disabled={bulkLoading} 
              style={styles.bulkActionDialogButton}
              icon="package-variant"
            >
              Mark as Available
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => handleBulkAction('cancel')} 
              disabled={bulkLoading} 
              style={styles.bulkActionDialogButton}
              textColor={COLORS.error}
              icon="close"
            >
              Cancel Orders
            </Button>
            <Button 
              mode="text" 
              onPress={() => setBulkActionModalVisible(false)} 
              disabled={bulkLoading}
            >
              Close
            </Button>
          </Dialog.Content>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray?.[50],
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray?.[200],
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    color: COLORS.gray?.[900],
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.gray?.[600],
    marginBottom: 20,
  },
  orderStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingHorizontal: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: COLORS.gray?.[300],
  },
  searchAndFiltersContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  filtersHeader: {
    marginTop: 16,
    marginBottom: 8,
  },
  filtersTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  filtersSubtitle: {
    fontSize: 12,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filtersContent: {
    paddingRight: 24,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray?.[200],
    minWidth: 100,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray?.[600],
  },
  filterTextActive: {
    color: COLORS.white,
  },
  filterBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  filterBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchBar: {
    borderRadius: 16,
    elevation: 0,
    backgroundColor: COLORS.gray?.[100],
    borderWidth: 1,
    borderColor: COLORS.gray?.[200],
  },
  searchInput: {
    fontSize: 16,
  },
  bulkActionBar: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 12,
  },
  bulkActionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  selectedCount: {
    fontWeight: '600',
  },
  bulkActionButtons: {
    flexDirection: 'row',
  },
  bulkActionButton: {
    marginLeft: 8,
  },
  ordersContainer: {
    flex: 1,
  },
  ordersContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  animatableContainer: {
    marginBottom: 16,
  },
  orderCard: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  orderDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    marginVertical: 20,
    backgroundColor: COLORS.gray?.[200],
    height: 1,
  },
  customerInfo: {
    marginBottom: 20,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  customerPhone: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.gray?.[600],
  },
  itemsContainer: {
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.gray?.[100],
    borderRadius: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: COLORS.gray?.[600],
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: COLORS.gray?.[100],
    borderRadius: 16,
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
  },
  actionButtons: {
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 12,
    elevation: 0,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.success,
  },
  cancelButton: {
    flex: 1,
    borderColor: COLORS.error,
  },
  availableButton: {
    backgroundColor: COLORS.info,
  },
  trackButton: {
    borderColor: COLORS.primary,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray?.[600],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 80,
  },
  emptyStateIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: COLORS.gray?.[100],
  },
  emptyStateTitle: {
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 18,
    color: COLORS.gray?.[900],
  },
  emptyStateSubtitle: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
    color: COLORS.gray?.[600],
  },
  bulkLoadingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bulkLoadingText: {
    marginTop: 8,
    fontWeight: '600',
    color: COLORS.gray?.[600],
  },
  bulkResultText: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
    color: COLORS.success,
  },
  bulkActionDialogButton: {
    marginBottom: 12,
    borderRadius: 16,
    paddingVertical: 12,
  },
});

export default OrdersScreen;
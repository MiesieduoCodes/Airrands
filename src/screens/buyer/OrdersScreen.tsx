import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Alert, StatusBar } from 'react-native';
import { Text, Card, Button, Chip, ProgressBar, Divider, ActivityIndicator } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { getOrders, getErrands } from '../../services/buyerServices';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import * as Animatable from 'react-native-animatable';

const getStatusColor = (status: string, theme: any) => {
  switch (status) {
    case 'pending':
      return theme.colors.warning || '#FFA726';
    case 'in_progress':
      return theme.colors.info || '#42A5F5';
    case 'delivered':
      return theme.colors.success || '#66BB6A';
    default:
      return theme.colors.onSurfaceVariant;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'in_progress':
      return 'In Progress';
    case 'delivered':
      return 'Delivered';
    default:
      return status;
  }
};

const OrdersScreen = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<RootNavigationProp>();

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    
    Promise.all([
      getOrders(user.uid),
      getErrands(user.uid)
    ])
      .then(([ordersData, errandsData]) => {
        // Combine orders and errands with type identification
        const allItems = [
          ...ordersData.map((order: any) => ({ ...order, type: 'order' })),
          ...errandsData.map((errand: any) => ({ ...errand, type: 'errand' }))
        ];
        
        // Sort by creation date (newest first)
        allItems.sort((a: any, b: any) => {
          const dateA = a.createdAt?.toMillis?.() || a.createdAt || 0;
          const dateB = b.createdAt?.toMillis?.() || b.createdAt || 0;
          return dateB - dateA;
        });
        
        setOrders(allItems);
      })
      .catch(e => {
        setError('Failed to fetch orders and errands. Please try again.');
        console.error('Failed to fetch orders and errands:', e);
      })
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const filters = [
    { id: 'all', label: 'All', icon: 'view-grid' },
    { id: 'orders', label: 'Orders', icon: 'package-variant' },
    { id: 'errands', label: 'Errands', icon: 'bike' },
    { id: 'pending', label: 'Pending', icon: 'clock-outline' },
    { id: 'in_progress', label: 'In Progress', icon: 'truck-delivery' },
    { id: 'delivered', label: 'Delivered', icon: 'check-circle' },
  ];

  const filteredOrders = selectedFilter === 'all'
    ? orders
    : selectedFilter === 'orders'
    ? orders.filter(item => item.type === 'order')
    : selectedFilter === 'errands'
    ? orders.filter(item => item.type === 'errand')
    : orders.filter(item => item.status === selectedFilter);

  const renderTrackingBar = (tracking: any) => {
    const steps = ['confirmed', 'available', 'onTheWay', 'delivered'];
    const progress = steps.filter(step => tracking?.[step]).length / steps.length;

    return (<View style={styles.trackingContainer}>
        <ProgressBar
          progress={progress}
          color={theme.colors.primary}
          style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]}
        />
        <View style={styles.trackingSteps}>
          {steps.map((step, index) => (
            <View key={step} style={styles.trackingStep}>
              <View
                style={[
                  styles.stepDot,
                  { backgroundColor: theme.colors.surfaceVariant },
                  tracking?.[step] && [styles.stepDotCompleted, { backgroundColor: theme.colors.primary }],
                ]}
              />
              <Text variant="bodySmall" style={[styles.stepText, { color: theme.colors.onSurfaceVariant }]}>
                {step.charAt(0).toUpperCase() + step.slice(1)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <Animatable.View 
      animation="fadeIn" 
      duration={600}
      style={styles.emptyState}
      useNativeDriver
    >
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons 
          name="package-variant" 
          size={48} 
          color={theme.colors.onSurfaceVariant} 
        />
      </View>
      <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
        No orders or errands yet
      </Text>
      <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
        Start shopping or request an errand to see your activities here!
      </Text>
    </Animatable.View>
  );

  const renderErrorState = () => (<Animatable.View 
      animation="fadeIn" 
      duration={600}
      style={styles.errorState}
      useNativeDriver
    >
      <View style={[styles.errorIconContainer, { backgroundColor: theme.colors.errorContainer }]}>
        <MaterialCommunityIcons 
          name="alert-circle-outline" 
          size={48} 
          color={theme.colors.error} 
        />
      </View>
      <Text variant="titleMedium" style={[styles.errorTitle, { color: theme.colors.onSurface }]}>
        Something went wrong
      </Text>
      <Text variant="bodyMedium" style={[styles.errorText, { color: theme.colors.onSurfaceVariant }]}>
        {error}
      </Text>
      <Button 
        mode="outlined" 
        onPress={() => { 
          if (!user?.uid) return; 
          setError(null); 
          setLoading(true); 
          Promise.all([
            getOrders(user.uid),
            getErrands(user.uid)
          ]).then(([ordersData, errandsData]) => {
            const allItems = [
              ...ordersData.map((order: any) => ({ ...order, type: 'order' })),
              ...errandsData.map((errand: any) => ({ ...errand, type: 'errand' }))
            ];
            allItems.sort((a: any, b: any) => {
              const dateA = a.createdAt?.toMillis?.() || a.createdAt || 0;
              const dateB = b.createdAt?.toMillis?.() || b.createdAt || 0;
              return dateB - dateA;
            });
            setOrders(allItems);
          }).catch(e => setError('Failed to fetch orders and errands. Please try again.')).finally(() => setLoading(false)); 
        }} 
        style={[styles.retryButton, { borderColor: theme.colors.primary }]}
        textColor={theme.colors.primary}
      >
        Try Again
      </Button>
    </Animatable.View>
  );

  const renderLoadingState = () => (
    <Animatable.View 
      animation="fadeIn" 
      duration={600}
      style={styles.loadingState}
      useNativeDriver
    >
      <View style={[styles.loadingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons 
          name="package-variant" 
          size={48} 
          color={theme.colors.primary} 
        />
      </View>
      <Text variant="titleMedium" style={[styles.loadingTitle, { color: theme.colors.onSurface }]}>
        Loading orders...
      </Text>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: theme.colors.background 
    }}>
      <StatusBar 
        backgroundColor={theme.colors.background} 
        barStyle={theme.dark ? 'light-content' : 'dark-content'} 
      />
      
      <View style={[styles.container, { 
        backgroundColor: theme.colors.background 
      }]}>
        {/* Header */}
        <Animatable.View 
          animation="fadeInDown" 
          duration={500}
          style={[styles.header, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.headerContent}>
            <Text style={[styles.screenTitle, { color: theme.colors.onSurface }]}>
              My Orders
            </Text>
            <Text style={[styles.screenSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Track your purchases
            </Text>
          </View>
        </Animatable.View>

      {loading ? (
          renderLoadingState()
      ) : error ? (
          renderErrorState()
      ) : filteredOrders.length === 0 ? (
          renderEmptyState()
      ) : (<>
            {/* Filters */}
            <Animatable.View 
              animation="fadeInUp" 
              delay={100}
              duration={500}
              style={[styles.filtersContainer, { backgroundColor: theme.colors.surface }]}
            >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContent}
      >
                {filters.map((filter, index) => (<Animatable.View 
                    key={filter.id}
                    animation="fadeInRight" 
                    delay={index * 100}
                    duration={400}
                    useNativeDriver
                  >
          <Chip
            selected={selectedFilter === filter.id}
            onPress={() => setSelectedFilter(filter.id)}
            style={[
              styles.filterChip,
                        { 
                          backgroundColor: selectedFilter === filter.id 
                            ? theme.colors.primary 
                            : theme.colors.surfaceVariant,
                          borderColor: theme.colors.outline,
                        }
            ]}
            textStyle={{
                        color: selectedFilter === filter.id 
                          ? theme.colors.onPrimary 
                          : theme.colors.onSurfaceVariant,
                        fontWeight: '600',
                        fontSize: 13,
            }}
                      compact
                    >
                      <View style={styles.filterContent}>
                        <MaterialCommunityIcons 
                          name={filter.icon as keyof typeof MaterialCommunityIcons.glyphMap} 
                          size={16} 
                          color={selectedFilter === filter.id 
                            ? theme.colors.onPrimary 
                            : theme.colors.onSurfaceVariant
                          } 
                        />
                        <Text 
                          style={[
                            styles.filterText,
                            { 
                              color: selectedFilter === filter.id 
                                ? theme.colors.onPrimary 
                                : theme.colors.onSurfaceVariant
                            }
                          ]}
          >
            {filter.label}
                        </Text>
                      </View>
          </Chip>
                  </Animatable.View>
        ))}
      </ScrollView>
            </Animatable.View>

            {/* Orders List */}
            <ScrollView 
              style={styles.ordersContainer}
              showsVerticalScrollIndicator={false}
            >
              {filteredOrders.map((order, index) => (
                <Animatable.View 
                  key={order.id}
                  animation="fadeInUp" 
                  delay={index * 100}
                  duration={400}
                  useNativeDriver
                >
                  <Card 
                    style={[
                      styles.orderCard, 
                      { 
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outline,
                      }
                    ]} 
                    mode="outlined"
                  >
                    <Card.Content style={styles.cardContent}>
                      <View style={styles.orderHeader}>
                        <View style={styles.orderInfo}>
                          <View style={styles.titleRow}>
                            <MaterialCommunityIcons 
                              name={order.type === 'errand' ? 'bike' : 'package-variant'} 
                              size={16} 
                              color={theme.colors.primary} 
                              style={styles.typeIcon}
                            />
                            <Text variant="titleMedium" style={[styles.storeName, { color: theme.colors.onSurface }]}>
                              {order.type === 'errand' ? 'Errand' : order.store}
                            </Text>
                          </View>
                          <Text variant="bodySmall" style={[styles.orderDate, { color: theme.colors.onSurfaceVariant }]}>
                            {order.date}
                          </Text>
                        </View>
                        <Chip
                          style={[
                            styles.statusChip,
                            { backgroundColor: getStatusColor(order.status, theme) + '20' },
                          ]}
                          compact
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: getStatusColor(order.status, theme) },
                            ]}
                          >
                            {getStatusText(order.status)}
                          </Text>
                        </Chip>
                      </View>

                      <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

                      {order.items.map((item: any, itemIndex: number) => (
                        <View key={itemIndex} style={styles.itemRow}>
                          <Text variant="bodyMedium" style={[styles.itemText, { color: theme.colors.onSurface }]}>
                    {item.quantity}x {item.name}
                  </Text>
                          <Text variant="bodyMedium" style={[styles.itemPrice, { color: theme.colors.primary }]}>
                    ₦{item.price.toLocaleString()}
                  </Text>
                </View>
              ))}

                      <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

              <View style={styles.totalRow}>
                        <Text variant="titleMedium" style={[styles.totalLabel, { color: theme.colors.onSurface }]}>
                          Total
                        </Text>
                        <Text variant="titleMedium" style={[styles.totalAmount, { color: theme.colors.primary }]}>
                  ₦{order.total.toLocaleString()}
                </Text>
              </View>

              {renderTrackingBar(order.tracking)}

              {order.runner && (
                        <View style={[styles.runnerInfo, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <MaterialCommunityIcons 
                            name="bike" 
                            size={16} 
                            color={theme.colors.primary} 
                            style={styles.runnerIcon}
                          />
                          <Text variant="bodyMedium" style={[styles.runnerText, { color: theme.colors.onSurface }]}>
                            {order.runner.name} • {order.runner.phone}
                  </Text>
                </View>
              )}
            </Card.Content>
                    <Card.Actions style={styles.cardActions}>
              <Button
                mode="contained-tonal"
                onPress={() => navigation.navigate('OrderTracking', { 
                  jobId: order.id, 
                  jobType: order.type === 'errand' ? 'errand' : 'order', 
                  orderNumber: order.orderNumber || order.id 
                })}
                style={[styles.actionButton, { backgroundColor: theme.colors.primaryContainer }]}
                textColor={theme.colors.onPrimaryContainer}
                icon="map-marker-path"
              >
                Track {order.type === 'errand' ? 'Errand' : 'Order'}
              </Button>
              <Button
                mode="contained-tonal"
                onPress={async () => {
                  try {
                    if (order.status === 'pending') {
                      // Create chat with seller
                      const { getOrCreateChat } = await import('../../services/chatService');
                      const chatResult = await getOrCreateChat(order.sellerId);
                      
                      navigation.navigate('Chat', {
                        chatId: chatResult.chatId,
                        chatName: order.store,
                        chatAvatar: '',
                        chatRole: 'seller',
                      });
                    } else if (order.runner) {
                      // Create chat with runner
                      const { getOrCreateChat } = await import('../../services/chatService');
                      const chatResult = await getOrCreateChat(order.runner.id);
                      
                      navigation.navigate('Chat', {
                        chatId: chatResult.chatId,
                        chatName: order.runner.name,
                        chatAvatar: '',
                        chatRole: 'runner',
                      });
                    }
                  } catch (error) {
                    console.error('Error creating chat:', error);
                    Alert.alert('Error', 'Failed to start conversation. Please try again.');
                  }
                }}
                        style={[styles.actionButton, { backgroundColor: theme.colors.secondaryContainer }]}
                        textColor={theme.colors.onSecondaryContainer}
                        icon="message-text"
              >
                Contact {order.status === 'pending' ? 'Seller' : 'Runner'}
              </Button>
            </Card.Actions>
          </Card>
                </Animatable.View>
        ))}
      </ScrollView>
        </>
      )}
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,

  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  screenSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  filtersContainer: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filtersContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  filterChip: {
    marginRight: 8,
    borderRadius: 16,
    height: 36,
    borderWidth: 1,
    minWidth: 80,
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  ordersContainer: {
    padding: 12,
  },
  orderCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  typeIcon: {
    marginRight: 6,
  },
  storeName: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
  },
  statusChip: {
    borderRadius: 8,
    height: 24,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemText: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    fontWeight: '600',
    fontSize: 16,
  },
  totalAmount: {
    fontWeight: '700',
    fontSize: 16,
  },
  trackingContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  trackingSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  trackingStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  stepDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepText: {
    fontSize: 10,
    textAlign: 'center',
  },
  runnerInfo: {
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  runnerIcon: {
    marginRight: 6,
  },
  runnerText: {
    fontSize: 13,
    flex: 1,
  },
  cardActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    minHeight: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 250,
    lineHeight: 18,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    maxWidth: 250,
    lineHeight: 18,
    marginBottom: 16,
  },
  retryButton: {
    borderRadius: 8,
    minWidth: 100,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingTitle: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default OrdersScreen; 
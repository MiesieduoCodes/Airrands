import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  SafeAreaView,
  RefreshControl,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { 
  Text, 
  Button, 
  FAB, 
  Portal, 
  Modal, 
  TextInput, 
  IconButton,
  Chip,
  Checkbox,
  SegmentedButtons,
  Menu,
  Badge,
  HelperText,
  Surface,
  Searchbar
} from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { SellerNavigationProp } from '../../navigation/types';
import NotificationDrawer from '../../components/NotificationDrawer';
import * as Animatable from 'react-native-animatable';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import DraggableFlatList, { 
  RenderItemParams, 
  ScaleDecorator 
} from 'react-native-draggable-flatlist';
import { validateField, ValidationRule } from '../../utils/validation';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getProducts, addProduct, updateProduct, deleteProduct, uploadProductImages, getCategories, subscribeToProductUpdates } from '../../services/sellerServices';

const { width } = Dimensions.get('window');

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  description: string;
  categoryId: string;
  available: boolean;
  stockLevel: number;
  lowStockThreshold: number;
  variants: Array<{ id: string; name: string; price: number }>;
  addOns: Array<{ id: string; name: string; price: number }>;
  rating: number;
  reviews: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
}

interface ProductsScreenProps {
  navigation: SellerNavigationProp;
}

const ProductsScreen: React.FC<ProductsScreenProps> = ({ navigation }: ProductsScreenProps) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();

  if (!user) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>;
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [bulkActionModalVisible, setBulkActionModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    available: true,
    categoryId: '',
    stockLevel: '',
    lowStockThreshold: '',
    images: [] as string[],
    variants: [] as any[],
    addOns: [] as any[],
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({
    name: [],
    price: [],
    description: [],
    stockLevel: [],
    lowStockThreshold: [],
  });

  const validationRules: Record<string, ValidationRule> = {
    name: {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    price: {
      required: true,
      minValue: 0
    },
    description: {
      required: true,
      minLength: 10,
      maxLength: 500
    },
    stockLevel: {
      required: true,
      minValue: 0
    },
    lowStockThreshold: {
      required: true,
      minValue: 0
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string[]> = {};
    Object.keys(validationRules).forEach(field => {
      const value = formData[field as keyof typeof formData];
      const rule = validationRules[field];
      if (rule) {
        const fieldErrors = validateField(value?.toString() || '', rule);
        if (fieldErrors.errors && fieldErrors.errors.length > 0) {
          newErrors[field] = fieldErrors.errors;
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field] && errors[field].length > 0) {
      setErrors(prev => ({ ...prev, [field]: [] }));
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        if (user?.uid) {
          const uploadedUrl = await uploadProductImages(user.uid, imageUri);
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, uploadedUrl]
          }));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleDragEnd = ({ data }: { data: Product[] }) => {
    setProducts(data);
  };

  const handleBulkAction = async (action: string) => {
    if (!user?.uid) return;
    setBulkLoading(true);
    setBulkError(null);
    setBulkResult(null);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const productId of selectedProducts) {
        try {
          switch (action) {
            case 'delete':
              await deleteProduct(user.uid, productId);
              break;
            case 'activate':
              await updateProduct(user.uid, productId, { available: true });
              break;
            case 'deactivate':
              await updateProduct(user.uid, productId, { available: false });
              break;
          }
          successCount++;
        } catch (error) {
          failCount++;
        }
      }
      
      setBulkResult(`${action}ed ${successCount} products${failCount > 0 ? `, ${failCount} failed` : ''}`);
      
      // Refresh products
      const updatedProducts = await getProducts(user.uid);
      setProducts(updatedProducts);
      setSelectedProducts([]);
      
    } catch (error) {
      setBulkError(`Failed to ${action} products. Please try again.`);
    } finally {
      setBulkLoading(false);
      setTimeout(() => {
        setBulkActionModalVisible(false);
      }, 2000);
    }
  };

  const renderProductItem = ({ item, drag, isActive }: RenderItemParams<Product>) => (
    <ScaleDecorator>
      <Animatable.View 
        animation="fadeInUp" 
        duration={400}
        style={styles.animatableContainer}
      >
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        style={[
          styles.productCard,
            { backgroundColor: theme.colors.surface }
        ]}
          activeOpacity={0.8}
      >
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={3}>
          <View style={styles.cardHeader}>
            <Checkbox
              status={selectedProducts.includes(item.id) ? 'checked' : 'unchecked'}
              onPress={() => {
                setSelectedProducts((prev: string[]) =>
                  prev.includes(item.id) 
                    ? prev.filter((id: string) => id !== item.id)
                    : [...prev, item.id]
                );
              }}
              color={theme.colors.primary}
            />
            <View style={styles.productInfo}>
              <Text variant="titleMedium" style={[styles.productName, { color: theme.colors.onSurface }]}>
                {item.name}
              </Text>
                <Text variant="bodyLarge" style={[styles.productPrice, { color: theme.colors.primary }]}>
                ₦{item.price.toLocaleString()}
              </Text>
            </View>
            <View style={styles.cardHeaderActions}>
              {item.rating > 0 && (
                <View style={styles.ratingContainer}>
                  <MaterialIcons name="star" size={16} color={theme.colors.primary} />
                  <Text style={[styles.ratingText, { color: theme.colors.onSurfaceVariant }]}>
                    {item.rating.toFixed(1)} ({item.reviews})
                  </Text>
                </View>
              )}
              <Menu
                visible={menuVisible === item.id}
                onDismiss={() => setMenuVisible(null)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    onPress={() => setMenuVisible(item.id)}
                    iconColor={theme.colors.onSurfaceVariant}
                    style={styles.menuButton}
                  />
                }
              >
                <Menu.Item onPress={() => handleEditProduct(item)} title="Edit" />
                <Menu.Item onPress={() => handleDeleteProduct(item.id)} title="Delete" />
                <Menu.Item onPress={() => {}} title="Duplicate" />
              </Menu>
            </View>
          </View>

          <View style={styles.imageContainer}>
              <Image source={{ uri: item.images?.[0] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=200&fit=crop' }} style={styles.productImage} />
            {item.images.length > 1 && (
                <Badge style={[styles.imageCountBadge, { backgroundColor: theme.colors.primary }]}>
                  {item.images.length}
                </Badge>
            )}
            {item.stockLevel <= item.lowStockThreshold && (
                <View style={[styles.lowStockWarning, { backgroundColor: theme.colors.error }]}>
                  <Text style={[styles.lowStockText, { color: theme.colors.onError }]}>Low Stock</Text>
              </View>
            )}
          </View>

            <View style={styles.cardContent}>
            <Text variant="bodySmall" style={[styles.productDescription, { color: theme.colors.onSurfaceVariant }]}>
              {item.description}
            </Text>
            
            <View style={styles.productMeta}>
              <Chip 
                mode="outlined" 
                  style={[styles.categoryChip, { borderColor: theme.colors.primary }]}
                textStyle={{ color: theme.colors.primary }}
              >
                  {categories.find((c: Category) => c.id === item.categoryId)?.name || 'Uncategorized'}
              </Chip>
              
              <View style={styles.stockInfo}>
                <MaterialCommunityIcons 
                  name="package-variant" 
                  size={16} 
                  color={item.stockLevel <= item.lowStockThreshold ? theme.colors.error : theme.colors.onSurfaceVariant} 
                />
                <Text 
                  variant="bodySmall" 
                  style={[
                    styles.stockText, 
                    { color: item.stockLevel <= item.lowStockThreshold ? theme.colors.error : theme.colors.onSurfaceVariant }
                  ]}
                >
                  {item.stockLevel} in stock
                </Text>
              </View>
            </View>

            {item.variants.length > 0 && (
              <View style={styles.variantsInfo}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.variants.length} variants available
                </Text>
              </View>
            )}
            </View>

            <View style={styles.cardActions}>
            <Button
              mode="outlined"
              onPress={() => handleEditProduct(item)}
              style={styles.actionButton}
                textColor={theme.colors.primary}
            >
              Edit
            </Button>
            <Button
              mode="contained"
              onPress={() => handleEditProduct(item)}
                style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            >
              View Details
            </Button>
            </View>
          </Surface>
      </TouchableOpacity>
      </Animatable.View>
    </ScaleDecorator>
  );

  const renderGridItem = ({ item, drag, isActive }: RenderItemParams<Product>) => (
    <ScaleDecorator>
      <Animatable.View 
        animation="fadeInUp" 
        duration={400}
        style={styles.animatableGridContainer}
      >
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        style={styles.gridProductCard}
          activeOpacity={0.8}
        >
          <Surface style={[styles.gridCard, { backgroundColor: theme.colors.surface }]} elevation={3}>
            <View style={styles.gridImageContainer}>
              <Image source={{ uri: item.images?.[0] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=200&fit=crop' }} style={styles.gridProductImage} />
              {item.stockLevel <= item.lowStockThreshold && (
                <View style={[styles.gridLowStockWarning, { backgroundColor: theme.colors.error }]}>
                  <Text style={[styles.gridLowStockText, { color: theme.colors.onError }]}>Low Stock</Text>
                </View>
              )}
              {item.images.length > 1 && (
                <View style={[styles.gridImageCountBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.gridImageCountText, { color: theme.colors.onPrimary }]}>
                    +{item.images.length - 1}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.gridCardContent}>
              <Text variant="titleSmall" style={[styles.gridProductName, { color: theme.colors.onSurface }]} numberOfLines={2}>
              {item.name}
            </Text>
              <Text variant="bodyLarge" style={[styles.gridProductPrice, { color: theme.colors.primary }]}>
              ₦{item.price.toLocaleString()}
            </Text>
              <View style={styles.gridProductMeta}>
                <Chip 
                  mode="outlined" 
                  style={[styles.gridCategoryChip, { borderColor: theme.colors.primary }]}
                  textStyle={{ color: theme.colors.primary, fontSize: 10 }}
                >
                  {categories.find((c: Category) => c.id === item.categoryId)?.name || 'Uncategorized'}
                </Chip>
                <View style={styles.gridStockInfo}>
                  <MaterialCommunityIcons 
                    name="package-variant" 
                    size={12} 
                    color={item.stockLevel <= item.lowStockThreshold ? theme.colors.error : theme.colors.onSurfaceVariant} 
                  />
                  <Text 
                    variant="bodySmall" 
                    style={[
                      styles.gridStockText, 
                      { color: item.stockLevel <= item.lowStockThreshold ? theme.colors.error : theme.colors.onSurfaceVariant }
                    ]}
                  >
                    {item.stockLevel}
                  </Text>
                </View>
              </View>
            </View>
          </Surface>
      </TouchableOpacity>
      </Animatable.View>
    </ScaleDecorator>
  );

  const handleNotificationPress = async (notification: any) => {
    if (notification.status === 'unread' || notification.isRead === false) {
      await markAsRead(notification.id);
    }
    setShowNotifications(false);
    
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
        case 'general':
        default:
          break;
      }
    } catch (error) {
      console.error('Error navigating from notification:', error);
      navigation.navigate('Orders');
    }
  };

  const handleClearAllNotifications = async () => {
    await markAllAsRead();
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      description: product.description,
      available: product.available,
      categoryId: product.categoryId,
      stockLevel: product.stockLevel.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      images: product.images,
      variants: product.variants,
      addOns: product.addOns,
    });
    setModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please check the form and try again.');
      return;
    }

    if (!user?.uid) return;

    try {
      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        available: formData.available,
        categoryId: formData.categoryId,
        stockLevel: parseInt(formData.stockLevel),
        lowStockThreshold: parseInt(formData.lowStockThreshold),
        images: formData.images,
        variants: formData.variants,
        addOns: formData.addOns,
      };

      if (editingProduct) {
        await updateProduct(user.uid, editingProduct.id, productData);
        setProducts((prev: Product[]) => prev.map((p: Product) => 
          p.id === editingProduct.id ? { ...p, ...productData } : p
        ));
      } else {
        const id = await addProduct(user.uid, { ...productData, sellerId: user.uid });
        setProducts((prev: Product[]) => [...prev, { ...productData, id, sellerId: user.uid, rating: 0, reviews: 0 }]);
      }

      setModalVisible(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        price: '',
        description: '',
        available: true,
        categoryId: '',
        stockLevel: '',
        lowStockThreshold: '',
        images: [],
        variants: [],
        addOns: [],
      });
    } catch (error) {
      console.error('Failed to save product:', error);
      Alert.alert('Error', 'Failed to save product. Please try again.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert('Delete Product', 'Are you sure you want to delete this product? This action cannot be undone.', [
        { text: 'Cancel', style: 'cancel' }, {
          text: 'Delete', style: 'destructive', onPress: async () => {
            if (!user?.uid) return;
    try {
              await deleteProduct(user.uid, productId);
      setProducts((prev: Product[]) => prev.filter((p: Product) => p.id !== productId));
            } catch (error) {
              console.error('Failed to delete product:', error);
              Alert.alert('Error', 'Failed to delete product. Please try again.');
    }
          },
        },
      ]
    );
  };

  const [productSubscription, setProductSubscription] = useState<any>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const data = await getProducts(user.uid);
        setProducts(data);
      } catch (e) {
        console.error('Failed to fetch products:', e);
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      if (!user?.uid) return;
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (e) {
        console.error('Failed to fetch categories:', e);
      }
    };

    fetchProducts();
    fetchCategories();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to real-time product updates
    const subscription = subscribeToProductUpdates(user.uid, (updatedProducts) => {
      setProducts(updatedProducts);
    });

    setProductSubscription(subscription);

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription();
      }
    };
  }, [user?.uid]);

  useEffect(() => {
    return () => {
      if (productSubscription) {
        productSubscription();
      }
    };
  }, [productSubscription]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // setCurrentTime(now.toLocaleTimeString('en-US', { 
      //   hour: '2-digit', 
      //   minute: '2-digit',
      //   hour12: true 
      // }));
    };
    
    // updateTime();
    // const interval = setInterval(updateTime, 60000);
    
    return () => {
      // clearInterval(interval);
    };
  }, []);

  const filteredProducts = products
    .filter((item: Product) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a: Product, b: Product) => {
      // Placeholder for sorting - can be implemented later
      return 0;
    });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.uid) {
      try {
        const data = await getProducts(user.uid);
        setProducts(data);
      } catch (e) {
        console.error('Failed to refresh products:', e);
      }
    }
    setRefreshing(false);
  }, [user?.uid]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={theme.colors.surface}
        translucent={false}
      />
        {/* Modern Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text variant="headlineLarge" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                My Products
              </Text>
              <View style={styles.headerStats}>
                <View style={[styles.statItem, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text variant="titleMedium" style={[styles.statNumber, { color: theme.colors.primary }]}>
                    {products.length}
                  </Text>
                  <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Products
                  </Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <Text variant="titleMedium" style={[styles.statNumber, { color: theme.colors.secondary }]}>
                    {products.filter(p => p.available).length}
                  </Text>
                  <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Active
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => {
                  try {
                    setShowNotifications(true);
                  } catch (error) {
                    console.error('Error opening notifications:', error);
                    Alert.alert('Error', 'Unable to open notifications. Please try again.');
                  }
                }}
                style={[styles.notificationButton, { backgroundColor: theme.colors.surfaceVariant }]}
              >
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={24}
                  color={theme.colors.onSurface}
                />
                {(unreadCount || 0) > 0 && (
                  <View style={[styles.notificationBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.onPrimary }]}>
                      {(unreadCount || 0) > 99 ? '99+' : (unreadCount || 0)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            
              <TouchableOpacity
                style={[styles.viewToggleButton, { backgroundColor: theme.colors.surfaceVariant }]}
                onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                <MaterialCommunityIcons
                  name={viewMode === 'grid' ? 'view-list' : 'view-grid'}
                  size={20}
                  color={theme.colors.onSurface}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Modern Search and Filters */}
          <View style={styles.searchContainer}>
            <View style={styles.searchSection}>
              <View style={[styles.searchBarContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialIcons name="search" size={20} color={theme.colors.onSurfaceVariant} style={styles.searchIcon} />
                <TextInput
                  placeholder="Search products..."
                  onChangeText={setSearchQuery}
                  value={searchQuery}
                  style={[styles.searchInput, { color: theme.colors.onSurface }]}
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                    <MaterialIcons name="close" size={18} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                )}
              </View>
              
              <TouchableOpacity 
                style={[styles.filterToggleButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowFilters(!showFilters)}
              >
                <MaterialIcons name="tune" size={20} color={theme.colors.onPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
              <Chip
                selected={selectedCategory === 'all'}
                onPress={() => setSelectedCategory('all')}
                style={[
                  styles.filterChip, 
                  selectedCategory === 'all' && { 
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary
                  }
                ]}
                textStyle={{ 
                  color: selectedCategory === 'all' ? theme.colors.onPrimary : theme.colors.onSurface 
                }}
                mode={selectedCategory === 'all' ? 'flat' : 'outlined'}
              >
                All
              </Chip>
              {categories.filter((c: Category) => !c.parentId).map((category: Category) => (
                <Chip
                  key={category.id}
                  selected={selectedCategory === category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  style={[
                    styles.filterChip, 
                    selectedCategory === category.id && { 
                      backgroundColor: theme.colors.primary,
                      borderColor: theme.colors.primary
                    }
                  ]}
                  textStyle={{ 
                    color: selectedCategory === category.id ? theme.colors.onPrimary : theme.colors.onSurface 
                  }}
                  mode={selectedCategory === category.id ? 'flat' : 'outlined'}
                >
                  {category.name}
                </Chip>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (<Surface style={[styles.bulkActions, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Text variant="bodyMedium" style={[styles.selectedCount, { color: theme.colors.onSurface }]}>
              {selectedProducts.length} selected
            </Text>
            <View style={styles.bulkButtons}>
              <Button
                mode="outlined"
                onPress={() => setBulkActionModalVisible(true)}
                style={styles.bulkButton}
              >
                Bulk Actions
              </Button>
              <Button
                mode="text"
                onPress={() => setSelectedProducts([])}
              textColor={theme.colors.primary}
              >
                Clear
              </Button>
            </View>
        </Surface>
        )}

        {/* Products List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Loading products...
          </Text>
        </View>
      ) : (<DraggableFlatList
          data={filteredProducts}
          renderItem={viewMode === 'grid' ? renderGridItem : renderProductItem}
          keyExtractor={(item: Product) => item.id}
          onDragEnd={handleDragEnd}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={[
            styles.productsList,
            viewMode === 'grid' && styles.gridProductsList
          ]}
          showsVerticalScrollIndicator={false}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={`products-list-${viewMode}`}
        />
      )}

        {/* FAB for adding product */}
        <FAB
          icon="plus"
          onPress={() => setModalVisible(true)}
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        />

        {/* Add/Edit Product Modal */}
        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
            contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>

              {/* Images Section */}
              <View style={styles.imagesSection}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Product Images
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {formData.images.map((image: string, index: number) => (<View key={index} style={styles.imageItem}>
                      <Image source={{ uri: image }} style={styles.uploadedImage} />
                      <IconButton
                        icon="close"
                        size={16}
                        onPress={() => setFormData((prev: typeof formData) => ({
                          ...prev, images: prev.images.filter((_: string, i: number) => i !== index)
                        }))}
                        style={styles.removeImageButton}
                      />
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                    <MaterialIcons name="add-photo-alternate" size={32} color={theme.colors.primary} />
                  <Text style={[styles.addImageText, { color: theme.colors.primary }]}>Add Image</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              <TextInput
                label="Product Name"
                value={formData.name}
                onChangeText={(value) => handleFieldChange('name', value)}
                mode="outlined"
                style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
                error={errors.name && errors.name.length > 0}
                theme={{
                  colors: {
                    primary: theme.colors.primary,
                    placeholder: theme.colors.onSurfaceVariant,
                    error: theme.colors.error,
                  }
                }}
              />
              {errors.name && errors.name.length > 0 && (
                <HelperText type="error" visible={errors.name.length > 0}>
                  {errors.name[0]}
                </HelperText>
              )}

              <TextInput
                label="Price"
                value={formData.price}
                onChangeText={(value) => handleFieldChange('price', value)}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
                error={errors.price && errors.price.length > 0}
                theme={{
                  colors: {
                    primary: theme.colors.primary,
                    placeholder: theme.colors.onSurfaceVariant,
                    error: theme.colors.error,
                  }
                }}
              />
              {errors.price && errors.price.length > 0 && (
                <HelperText type="error" visible={errors.price.length > 0}>
                  {errors.price[0]}
                </HelperText>
              )}

              <TextInput
                label="Description"
                value={formData.description}
                onChangeText={(value) => handleFieldChange('description', value)}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
                error={errors.description && errors.description.length > 0}
                theme={{
                  colors: {
                    primary: theme.colors.primary,
                    placeholder: theme.colors.onSurfaceVariant,
                    error: theme.colors.error,
                  }
                }}
              />
              {errors.description && errors.description.length > 0 && (
                <HelperText type="error" visible={errors.description.length > 0}>
                  {errors.description[0]}
                </HelperText>
              )}

              <TextInput
                label="Stock Level"
                value={formData.stockLevel}
                onChangeText={(value) => handleFieldChange('stockLevel', value)}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
                error={errors.stockLevel && errors.stockLevel.length > 0}
                theme={{
                  colors: {
                    primary: theme.colors.primary,
                    placeholder: theme.colors.onSurfaceVariant,
                    error: theme.colors.error,
                  }
                }}
              />
              {errors.stockLevel && errors.stockLevel.length > 0 && (
                <HelperText type="error" visible={errors.stockLevel.length > 0}>
                  {errors.stockLevel[0]}
                </HelperText>
              )}

              <TextInput
                label="Low Stock Threshold"
                value={formData.lowStockThreshold}
                onChangeText={(value) => handleFieldChange('lowStockThreshold', value)}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
                error={errors.lowStockThreshold && errors.lowStockThreshold.length > 0}
                theme={{
                  colors: {
                    primary: theme.colors.primary,
                    placeholder: theme.colors.onSurfaceVariant,
                    error: theme.colors.error,
                  }
                }}
              />
              {errors.lowStockThreshold && errors.lowStockThreshold.length > 0 && (
                <HelperText type="error" visible={errors.lowStockThreshold.length > 0}>
                  {errors.lowStockThreshold[0]}
                </HelperText>
              )}

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveProduct}
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                >
                {editingProduct ? 'Update' : 'Add'} Product
                </Button>
              </View>
            </ScrollView>
          </Modal>
        </Portal>

        {/* Bulk Actions Modal */}
        <Portal>
          <Modal
            visible={bulkActionModalVisible}
            onDismiss={() => setBulkActionModalVisible(false)}
            contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
          >
            <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Bulk Actions</Text>
            {bulkLoading && <Text style={{ color: theme.colors.primary, textAlign: 'center', marginBottom: 12 }}>Processing...</Text>}
            {bulkResult && <Text style={{ color: theme.colors.primary, textAlign: 'center', marginBottom: 12 }}>{bulkResult}</Text>}
            {bulkError && <Text style={{ color: theme.colors.error, textAlign: 'center', marginBottom: 12 }}>{bulkError}</Text>}
            <Button
              mode="outlined"
              onPress={() => handleBulkAction('delete')}
              style={styles.bulkActionButton}
              textColor={theme.colors.error}
              disabled={bulkLoading}
            >
              Delete Selected
            </Button>
            <Button
              mode="outlined"
            onPress={() => handleBulkAction('activate')}
              style={styles.bulkActionButton}
              disabled={bulkLoading}
            >
            Activate Selected
          </Button>
          <Button
            mode="outlined"
            onPress={() => handleBulkAction('deactivate')}
            style={styles.bulkActionButton}
            disabled={bulkLoading}
          >
            Deactivate Selected
            </Button>
            <Button
              mode="outlined"
              onPress={() => setBulkActionModalVisible(false)}
              style={styles.bulkActionButton}
              disabled={bulkLoading}
            >
              Cancel
            </Button>
          </Modal>
        </Portal>

      {/* Notification Drawer */}
        <NotificationDrawer
        visible={showNotifications}
          notifications={notifications}
          onNotificationPress={handleNotificationPress}
          onClearAll={handleClearAllNotifications}
          onClose={() => setShowNotifications(false)}
        />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 16,
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationIcon: {
    margin: 0,
    borderRadius: 12,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  searchContainer: {
    marginBottom: 0,
  },
  searchBar: {
    borderRadius: 16,
    elevation: 0,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchInput: {
    fontSize: 16,
    fontWeight: '500',
  },
  filtersContainer: {
    marginBottom: 0,
  },
  filterChip: {
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C757D',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 4,
  },
  viewToggleButton: {
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewToggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewToggleTextActive: {
    color: '#007AFF',
  },
  viewToggleTextInactive: {
    color: '#6C757D',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  productCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  productImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  productContent: {
    padding: 24,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 16,
    lineHeight: 26,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#34C759',
  },
  productDescription: {
    fontSize: 15,
    color: '#6C757D',
    lineHeight: 22,
    marginBottom: 20,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    borderColor: '#FF3B30',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#007AFF',
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    margin: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  imagesSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 16,
    fontSize: 18,
    color: '#1A1A1A',
  },
  imageItem: {
    position: 'relative',
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addImageButton: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  addImageText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    color: '#6C757D',
  },
  input: {
    marginBottom: 12,
    borderRadius: 16,
    elevation: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  halfInput: {
    flex: 1,
    borderRadius: 16,
    elevation: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 16,
  },
  modalButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  bulkActionButton: {
    marginBottom: 16,
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
    color: '#CBD5E1',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  menuButton: {
    margin: 0,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  imageCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lowStockWarning: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lowStockText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 16,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  variantsInfo: {
    marginTop: 8,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  gridProductCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  gridProductImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  gridProductPrice: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  gridProductMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  gridMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridMetaIcon: {
    marginRight: 4,
  },
  gridMetaText: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '600',
  },
  gridProductActions: {
    flexDirection: 'row',
    gap: 8,
  },
  gridActionButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    elevation: 0,
  },
  gridButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Add missing styles
  animatableContainer: {
    flex: 1,
  },
  animatableGridContainer: {
    flex: 1,
  },
  gridCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gridImageContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridLowStockWarning: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gridLowStockText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gridImageCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  gridImageCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gridCardContent: {
    padding: 12,
  },
  gridProductName: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 16,
  },
  gridCategoryChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  gridStockInfo: {
    marginTop: 8,
  },
  gridStockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  filterToggleButton: {
    borderRadius: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sortSection: {
    marginBottom: 16,
  },
  sortLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flex: 1,
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
  },
  selectedCount: {
    fontWeight: '600',
  },
  bulkButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkButton: {
    paddingHorizontal: 16,
  },
  productsList: {
    padding: 16,
  },
  gridProductsList: {
    paddingHorizontal: 8,
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  clearSearchButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 20,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default ProductsScreen;
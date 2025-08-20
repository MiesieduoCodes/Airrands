import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
  RefreshControl,
  Alert
} from 'react-native';
import { 
  Text, 
  Button, 
  Chip, 
  Divider,
  IconButton,
  Searchbar,
  ActivityIndicator,
  Card
} from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { RootNavigationProp } from '../../navigation/types';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { getStores, getStoreStatus, favoriteStore, unfavoriteStore } from '../../services/buyerServices';
import { useAuth } from '../../contexts/AuthContext';
import * as Location from 'expo-location';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

interface StoresScreenProps {
  navigation: RootNavigationProp;
}

interface Store {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  categories: string[];
  isOpen: boolean;
  address: string;
  distance: string;
  coverImage?: string;
  type: string;
  description?: string;
  phone?: string;
  email?: string;
  isFavorite?: boolean;
  deliveryTime?: string;
  minimumOrder?: number;
  deliveryFee?: number;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  businessHours?: {
    [key: string]: string;
  };
  featured?: boolean;
}

const categories = [
  { id: 'all', name: 'All', icon: 'view-grid' },
  { id: 'restaurant', name: 'Food', icon: 'food' },
  { id: 'grocery', name: 'Groceries', icon: 'cart' },
  { id: 'pharmacy', name: 'Pharmacy', icon: 'medical-bag' },
  { id: 'convenience', name: 'Convenience', icon: 'store' },
  { id: 'electronics', name: 'Electronics', icon: 'laptop' },
  { id: 'fashion', name: 'Fashion', icon: 'tshirt-crew' },
];

const StoresScreen: React.FC<StoresScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'deliveryTime' | 'deliveryFee'>('rating');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [favoritingStore, setFavoritingStore] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Get user location for distance calculation
  const getUserLocation = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      }
  }, []);

  const loadStores = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Get user location first
      await getUserLocation();

      // Fetch stores with real-time status
      const storesData = await getStores();
      
      // Try to get store status, but don't fail if it's not available
      let statusData = [];
      try {
        statusData = await getStoreStatus();
      } catch (error) {
        // Provide default status data
        statusData = storesData.map(store => ({
          storeId: store.id,
          isOpen: store.isOpen || true,
          lastUpdated: new Date(),
          currentLocation: store.currentLocation,
        }));
      }

      // Merge stores data with status data
      const enhancedStores = storesData.map((store: any) => {
        const status = statusData.find((st: any) => st.storeId === store.id);
        const distance = userLocation ? calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          store.currentLocation?.latitude || 0,
          store.currentLocation?.longitude || 0
        ) : store.distance || 'Unknown';

        return {
          id: store.id || Math.random().toString(),
          name: store.name || store.displayName || store.businessName || 'Unknown Store',
          rating: typeof store.rating === 'number' ? store.rating :
                 typeof store.rating === 'string' ? parseFloat(store.rating) || 4.0 : 4.0,
          distance: distance,
          image: store.image || store.photoURL || store.avatar || store.logo || 'https://i.imgur.com/T3zF9bJ.png',
          type: store.type || store.businessType || store.category || 'convenience',
          isOpen: status?.isOpen ?? store.isOpen ?? true,
          categories: store.categories || store.businessCategories || ['General'],
          coverImage: store.coverImage || store.bannerImage || store.image,
          reviews: store.reviews || 0,
          address: store.address || store.location || 'Address not available',
          description: store.description || store.bio,
          phone: store.phone,
          email: store.email,
          isFavorite: store.isFavorite || false,
          deliveryTime: store.deliveryTime || '30-45 min',
          minimumOrder: store.minimumOrder || 0,
          deliveryFee: store.deliveryFee || 0,
          currentLocation: store.currentLocation,
          businessHours: store.businessHours,
          featured: store.featured || false,
        };
      });

      setStores(enhancedStores);
    } catch (e) {
      setError('Failed to load stores. Please try again.');
      console.error('Error loading stores:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userLocation]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const onRefresh = useCallback(() => {
    loadStores(true);
  }, [loadStores]);

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  };

  // Filter and sort logic
  const filteredStores = stores.filter((store) => {
    const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         store.categories.some(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || store.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedStores = [...filteredStores].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'distance':
        const distA = parseFloat(a.distance.replace(/[^\d.]/g, ''));
        const distB = parseFloat(b.distance.replace(/[^\d.]/g, ''));
        return distA - distB;
      case 'deliveryTime':
        const timeA = parseInt(a.deliveryTime?.split('-')[0] || '30');
        const timeB = parseInt(b.deliveryTime?.split('-')[0] || '30');
        return timeA - timeB;
      case 'deliveryFee':
        return (a.deliveryFee || 0) - (b.deliveryFee || 0);
      default:
        return 0;
    }
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100, 150],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp'
  });

  const renderRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <MaterialIcons 
            key={i} 
            name="star" 
            size={16} 
            color={theme.colors.primary} 
          />
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <MaterialIcons 
            key={i} 
            name="star-half" 
            size={16} 
            color={theme.colors.primary} 
          />
        );
      } else {
        stars.push(
          <MaterialIcons 
            key={i} 
            name="star-outline" 
            size={16} 
            color={theme.colors.primary} 
          />
        );
      }
    }
    
    return stars;
  };

  const handleStorePress = (store: Store) => {
    navigation.navigate('SellerProfile', { 
      sellerId: store.id, 
      sellerName: store.name 
    });
  };

  const handleFavoriteToggle = async (store: Store) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to favorite stores.');
      return;
    }

    setFavoritingStore(store.id);
    
    try {
      if (store.isFavorite) {
        await unfavoriteStore(user.uid, store.id);
        setStores(prev => prev.map(s => 
          s.id === store.id ? { ...s, isFavorite: false } : s
        ));
      } else {
        await favoriteStore(user.uid, store.id);
        setStores(prev => prev.map(s => 
          s.id === store.id ? { ...s, isFavorite: true } : s
        ));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite status.');
    } finally {
      setFavoritingStore(null);
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || 'tag';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Enhanced Animated Header */}
      <Animated.View 
        style={[
          styles.header, 
          { 
            backgroundColor: theme.colors.surface,
            elevation: headerOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 4]
            })
          }
        ]}
      >
        <IconButton
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          iconColor={theme.colors.primary}
          size={24}
        />
        <View style={styles.headerContent}>
          <Text 
            variant="titleMedium" 
            style={[styles.headerTitle, { color: theme.colors.onSurface }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Stores
          </Text>
          <Text 
            variant="bodySmall" 
            style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            {sortedStores.length} store{sortedStores.length !== 1 ? 's' : ''} found
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <MaterialCommunityIcons name="refresh" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Enhanced Search Section */}
        <Animatable.View 
          animation="fadeInDown"
          duration={500}
          style={[styles.searchSection, { backgroundColor: theme.colors.surface }]}
        >
          <Searchbar
            placeholder="Search stores by name or category..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
            iconColor={theme.colors.onSurfaceVariant}
            inputStyle={{ color: theme.colors.onSurface }}
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />
        </Animatable.View>

        {/* Enhanced Categories */}
        <Animatable.View 
          animation="fadeInUp"
          delay={100}
          duration={500}
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
        >
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((category) => (<TouchableOpacity
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={[
                  styles.categoryPill,
                  selectedCategory === category.id && {
                    backgroundColor: theme.colors.primaryContainer,
                  }
                ]}
              >
                <MaterialCommunityIcons 
                  name={category.icon as any} 
                  size={20} 
                  color={
                    selectedCategory === category.id 
                      ? theme.colors.onPrimaryContainer 
                      : theme.colors.onSurfaceVariant
                  } 
                />
                <Text 
                  style={[
                    styles.categoryText,
                    selectedCategory === category.id && {
                      color: theme.colors.onPrimaryContainer,
                    }
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animatable.View>

        {/* Enhanced Sort Options */}
        <Animatable.View 
          animation="fadeInUp"
          delay={200}
          duration={500}
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Sort By
          </Text>
          <View style={styles.sortOptions}>
            {[
              { key: 'rating', icon: 'star', label: 'Rating' },
              { key: 'distance', icon: 'map-marker-distance', label: 'Distance' },
              { key: 'deliveryTime', icon: 'clock-outline', label: 'Delivery Time' },
              { key: 'deliveryFee', icon: 'currency-usd', label: 'Delivery Fee' },
            ].map((sortOption) => (<Button
                key={sortOption.key}
                mode={sortBy === sortOption.key ? 'contained-tonal' : 'outlined'}
                icon={sortBy === sortOption.key ? 'check' : sortOption.icon}
                onPress={() => setSortBy(sortOption.key as any)}
                style={styles.sortButton}
                buttonColor={sortBy === sortOption.key ? theme.colors.secondaryContainer : undefined}
              >
                {sortOption.label}
              </Button>
            ))}
          </View>
        </Animatable.View>
            
        {/* Results Count */}
        <Text variant="bodyMedium" style={[styles.resultsCount, { color: theme.colors.onSurfaceVariant }]}>
          {sortedStores.length} store{sortedStores.length !== 1 ? 's' : ''} found
        </Text>

        {/* Enhanced Stores List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
              Loading stores...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={40} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
            <Button mode="contained" onPress={onRefresh} style={styles.retryButton}>
              Try Again
            </Button>
          </View>
        ) : sortedStores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="store-remove-outline" size={40} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              No stores found
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
              Try adjusting your filters or search terms
            </Text>
          </View>
        ) : (sortedStores.map((store: Store, index: number) => (<Animatable.View
              key={store.id}
              animation="fadeInUp"
              delay={index * 100}
              duration={500}
            >
              <Card style={styles.storeCard}>
                <Card.Content style={{ padding: 0 }}>
                  <TouchableOpacity 
                    onPress={() => handleStorePress(store)}
                    style={styles.storeCardInner}
                  >
                    <View style={styles.storeCoverContainer}>
                      <Image 
                        source={{ uri: store.coverImage || store.image }} 
                        style={styles.storeCoverImage}
                        resizeMode="cover"
                      />
                      {store.featured && (
                        <View style={[styles.featuredBadge, { backgroundColor: theme.colors.primary }]}>
                          <MaterialCommunityIcons name="star" size={12} color="white" />
                          <Text style={styles.featuredText}>Featured</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={() => handleFavoriteToggle(store)}
                        disabled={favoritingStore === store.id}
                      >
                        <MaterialCommunityIcons 
                          name={store.isFavorite ? 'heart' : 'heart-outline'} 
                          size={24} 
                          color={store.isFavorite ? '#FF6B6B' : theme.colors.onSurface} 
                        />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.storeContent}>
                      <View style={styles.storeHeader}>
                        <Image 
                          source={{ uri: store.image }} 
                          style={styles.storeAvatar}
                        />
                        <View style={styles.storeInfo}>
                          <Text 
                            variant="titleMedium" 
                            style={[styles.storeName, { color: theme.colors.onSurface }]}
                            numberOfLines={1}
                          >
                            {store.name}
                          </Text>
                          <View style={styles.ratingContainer}>
                            {renderRatingStars(store.rating)}
                            <Text 
                              variant="bodyMedium" 
                              style={[styles.ratingText, { color: theme.colors.onSurfaceVariant }]}
                            >
                              {store.rating} • {store.distance}
                            </Text>
                          </View>
                        </View>
                        <Chip 
                          mode={store.isOpen ? 'flat' : 'outlined'}
                          textStyle={{ color: store.isOpen ? theme.colors.onPrimary : theme.colors.onSurface }}
                          style={[
                            styles.statusChip,
                            store.isOpen ? { backgroundColor: theme.colors.primary } : {}
                          ]}
                        >
                          {store.isOpen ? 'Open' : 'Closed'}
                        </Chip>
                      </View>
                      
                      <View style={styles.storeDetails}>
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons 
                            name="map-marker" 
                            size={16} 
                            color={theme.colors.onSurfaceVariant} 
                          />
                          <Text variant="bodySmall" style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
                            {store.address}
                          </Text>
                        </View>
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons 
                            name="clock-outline" 
                            size={16} 
                            color={theme.colors.onSurfaceVariant} 
                          />
                          <Text variant="bodySmall" style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
                            {store.deliveryTime}
                          </Text>
                        </View>
                        {store.deliveryFee !== undefined && (
                          <View style={styles.detailItem}>
                            <MaterialCommunityIcons 
                              name="currency-usd" 
                              size={16} 
                              color={theme.colors.onSurfaceVariant} 
                            />
                            <Text variant="bodySmall" style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
                              ₦{store.deliveryFee} delivery
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.categoriesContainer}>
                        {store.categories.slice(0, 3).map((category: string, index: number) => (
                          <Chip
                            key={index}
                            mode="outlined"
                            textStyle={{ color: theme.colors.onSurfaceVariant }}
                            icon={getCategoryIcon(category.toLowerCase())}
                          >
                            {category}
                          </Chip>
                        ))}
                        {store.categories.length > 3 && (
                          <Text variant="bodySmall" style={[styles.moreText, { color: theme.colors.onSurfaceVariant }]}>
                            +{store.categories.length - 3} more
                          </Text>
                        )}
                      </View>
                      
                      <View style={styles.storeActions}>
                        <Button
                          mode="outlined"
                          onPress={() => handleStorePress(store)}
                          style={styles.viewButton}
                          textColor={theme.colors.primary}
                        >
                          View Store
                        </Button>
                        <Button
                          mode="contained"
                          onPress={() => handleStorePress(store)}
                          style={styles.orderButton}
                          buttonColor={theme.colors.primary}
                          disabled={!store.isOpen}
                        >
                          Order Now
                        </Button>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Card.Content>
              </Card>
            </Animatable.View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 25,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 30,
    paddingBottom: 12,
    zIndex: 100,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingTop: 80,
  },
  searchSection: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    borderRadius: 12,
    elevation: 0,
  },
  section: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingBottom: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sortButton: {
    flex: 1,
    borderRadius: 8,
    minWidth: 100,
  },
  resultsCount: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    textAlign: 'center',
  },
  storeCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
  },
  storeCardInner: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  storeCoverContainer: {
    position: 'relative',
  },
  storeCoverImage: {
    width: '100%',
    height: 120,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 4,
  },
  storeContent: {
    padding: 16,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: 12,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
  },
  statusChip: {
    borderRadius: 12,
  },
  storeDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 4,
  },
  moreText: {
    marginLeft: 4,
  },
  storeActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  viewButton: {
    flex: 1,
    borderRadius: 8,
  },
  orderButton: {
    flex: 1,
    borderRadius: 8,
  },
});

export default StoresScreen;
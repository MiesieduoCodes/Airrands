import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import { 
  Searchbar, 
  Text, 
  Card, 
  Chip, 
  ActivityIndicator,
  IconButton,
  Avatar,
  Divider
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../../navigation/types';
import { getProducts, getStores } from '../../services/buyerServices';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface ProductType {
  id: string;
  name: string;
  price: number;
  store: string;
  rating: number;
  image: string;
  category: string;
  sellerId: string;
  description: string;
  reviews?: number;
  deliveryTime?: string;
}

interface StoreType {
  id: string;
  name: string;
  rating: number;
  distance: string;
  image: string;
  latitude: number;
  longitude: number;
  type: string;
  isOnline?: boolean;
}

const categories = [
  { id: 'all', name: 'All', icon: 'view-grid-outline' },
  { id: 'food', name: 'Food', icon: 'food-outline' },
  { id: 'groceries', name: 'Groceries', icon: 'basket-outline' },
  { id: 'electronics', name: 'Electronics', icon: 'laptop' },
  { id: 'fashion', name: 'Fashion', icon: 'tshirt-crew-outline' },
  { id: 'health', name: 'Health & Beauty', icon: 'spa-outline' },
  { id: 'home', name: 'Home & Office', icon: 'home-outline' },
];

const SearchScreen = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchType, setSearchType] = useState<'all' | 'products' | 'stores'>('all');
  const [allProducts, setAllProducts] = useState<ProductType[]>([]);
  const [allStores, setAllStores] = useState<StoreType[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const navigation = useNavigation<RootNavigationProp>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsData, storesData] = await Promise.all([
        getProducts(),
        getStores()
      ]);
      
      setAllProducts(productsData);
      setAllStores(storesData);
      setSearchResults([...productsData, ...storesData]);
        setIsLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
        setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    
    setTimeout(() => {
      let filtered: any[] = [];
      
      if (searchType === 'all' || searchType === 'products') {
        const filteredProducts = allProducts.filter(product =>
          (selectedCategory === 'all' || product.category === selectedCategory) &&
          (product.name.toLowerCase().includes(query.toLowerCase()) ||
           product.store?.toLowerCase().includes(query.toLowerCase()) ||
           product.description?.toLowerCase().includes(query.toLowerCase()))
        );
        filtered.push(...filteredProducts);
      }
      
      if (searchType === 'all' || searchType === 'stores') {
        const filteredStores = allStores.filter(store =>
          (selectedCategory === 'all' || store.type === selectedCategory) &&
          (store.name.toLowerCase().includes(query.toLowerCase()) ||
           store.type?.toLowerCase().includes(query.toLowerCase()))
        );
        filtered.push(...filteredStores);
      }
      
      setSearchResults(filtered);
      setIsSearching(false);
    }, 300);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsSearching(true);
    
    setTimeout(() => {
      let filtered: any[] = [];
      
      if (searchType === 'all' || searchType === 'products') {
        const filteredProducts = categoryId === 'all'
        ? allProducts
        : allProducts.filter(product => product.category === categoryId);
        filtered.push(...filteredProducts);
      }
      
      if (searchType === 'all' || searchType === 'stores') {
        const filteredStores = categoryId === 'all'
          ? allStores
          : allStores.filter(store => store.type === categoryId);
        filtered.push(...filteredStores);
      }
      
      setSearchResults(filtered);
      setIsSearching(false);
    }, 200);
  };

  const handleSearchTypeChange = (type: 'all' | 'products' | 'stores') => {
    setSearchType(type);
    setIsSearching(true);
    
    setTimeout(() => {
      let filtered: any[] = [];
      
      if (type === 'all' || type === 'products') {
        const filteredProducts = selectedCategory === 'all'
          ? allProducts
          : allProducts.filter(product => product.category === selectedCategory);
        filtered.push(...filteredProducts);
      }
      
      if (type === 'all' || type === 'stores') {
        const filteredStores = selectedCategory === 'all'
          ? allStores
          : allStores.filter(store => store.type === selectedCategory);
        filtered.push(...filteredStores);
      }
      
      setSearchResults(filtered);
      setIsSearching(false);
    }, 200);
  };

  const renderProduct = ({ item, index }: { item: ProductType; index: number }) => (
    <Animatable.View 
      animation="fadeInUp" 
      delay={index * 50}
      duration={400}
      useNativeDriver
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => navigation.navigate('ProductDetail', {
          productId: item.id,
          sellerId: item.sellerId,
          productName: item.name,
          price: item.price,
          description: item.description || '',
          image: item.image || '',
          rating: item.rating,
          reviews: item.reviews,
          category: item.category,
          deliveryTime: item.deliveryTime
        })}
        style={styles.productTouchable}
      >
        <View 
          style={[
            styles.productCard, 
            { 
              backgroundColor: theme.colors.surface,
              shadowColor: theme.dark ? '#000' : '#000',
            }
          ]}
        >
          {/* Product Image with Overlay */}
          <View style={styles.imageContainer}>
            <Card.Cover 
              source={{ uri: item.image }} 
              style={styles.productImage} 
            />
            {/* Rating Badge */}
            <View style={[styles.ratingBadge, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
              <MaterialCommunityIcons 
                name="star" 
                size={12} 
                color="#FFC107" 
              />
              <Text style={styles.ratingBadgeText}>
                {item.rating ? item.rating.toFixed(1) : 'N/A'}
              </Text>
            </View>
            {/* Heart Icon */}
            <TouchableOpacity 
              style={[styles.heartIcon, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
              onPress={(e) => {
                e.stopPropagation();
                // Handle favorite toggle
              }}
            >
              <MaterialCommunityIcons 
                name="heart-outline" 
                size={16} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Product Content */}
          <View style={styles.productContent}>
            <Text 
              style={[styles.productName, { color: theme.colors.onSurface }]} 
              numberOfLines={2}
            >
              {item.name}
            </Text>
            
            <Text 
              style={[styles.storeName, { color: theme.colors.onSurfaceVariant }]} 
              numberOfLines={1}
            >
              {item.store}
            </Text>
            
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: theme.colors.primary }]}>
                ₦{item.price ? item.price.toLocaleString() : 'N/A'}
              </Text>
              {item.reviews && (
                <Text style={[styles.reviewCount, { color: theme.colors.onSurfaceVariant }]}>
                  ({item.reviews} reviews)
                </Text>
              )}
            </View>
            
            {item.deliveryTime && (
              <View style={styles.deliveryInfo}>
                <MaterialCommunityIcons 
                  name="truck-delivery-outline" 
                  size={12} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text style={[styles.deliveryText, { color: theme.colors.onSurfaceVariant }]}>
                  {item.deliveryTime}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderStore = ({ item, index }: { item: StoreType; index: number }) => (
    <Animatable.View 
      animation="fadeInUp" 
      delay={index * 50}
      duration={400}
      useNativeDriver
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => navigation.navigate('SellerProfile', {
          sellerId: item.id,
          sellerName: item.name,
        })}
        style={styles.storeTouchable}
      >
        <View 
          style={[
            styles.storeCard, 
            { 
              backgroundColor: theme.colors.surface,
              shadowColor: theme.dark ? '#000' : '#000',
            }
          ]}
        >
          {/* Store Image with Overlay */}
          <View style={styles.imageContainer}>
            <Card.Cover 
              source={{ uri: item.image }} 
              style={styles.storeImage} 
            />
            {/* Rating Badge */}
            <View style={[styles.ratingBadge, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
              <MaterialCommunityIcons 
                name="star" 
                size={12} 
                color="#FFC107" 
              />
              <Text style={styles.ratingBadgeText}>
                {item.rating ? item.rating.toFixed(1) : 'N/A'}
              </Text>
            </View>
            {/* Online Status */}
            {item.isOnline && (
              <View style={[styles.onlineStatus, { backgroundColor: '#4CAF50' }]}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineStatusText}>Online</Text>
              </View>
            )}
          </View>
          
          {/* Store Content */}
          <View style={styles.storeContent}>
            <Text 
              style={[styles.storeTitle, { color: theme.colors.onSurface }]} 
              numberOfLines={1}
            >
              {item.name}
            </Text>
            
            <Text 
              style={[styles.storeType, { color: theme.colors.onSurfaceVariant }]} 
              numberOfLines={1}
            >
              {item.type}
            </Text>
            
            <View style={styles.storeFooter}>
              <View style={styles.distanceContainer}>
                <MaterialCommunityIcons 
                  name="map-marker-outline" 
                  size={12} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text style={[styles.distance, { color: theme.colors.onSurfaceVariant }]}>
                  {item.distance}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    // Check if item is a product or store based on properties
    if (item.price !== undefined) {
      return renderProduct({ item: item as ProductType, index });
    } else {
      return renderStore({ item: item as StoreType, index });
    }
  };

  const renderCategory = ({ item, index }: { item: typeof categories[0]; index: number }) => (<Animatable.View 
      animation="fadeInRight" 
      delay={index * 100}
      duration={400}
      useNativeDriver
    >
      <Chip
        selected={selectedCategory === item.id}
        onPress={() => handleCategorySelect(item.id)}
        style={[
          styles.categoryChip,
          { 
            backgroundColor: selectedCategory === item.id 
              ? theme.colors.primary 
              : theme.colors.surfaceVariant,
            borderColor: theme.colors.outline,
          }
        ]}
        textStyle={{
          color: selectedCategory === item.id 
            ? theme.colors.onPrimary 
            : theme.colors.onSurfaceVariant,
        }}
        compact
      >
        <View style={styles.categoryContent}>
          <MaterialCommunityIcons 
            name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap} 
            size={18} 
            color={selectedCategory === item.id 
              ? theme.colors.onPrimary 
              : theme.colors.onSurfaceVariant
            } 
          />
          <Text 
            style={[
              styles.categoryText,
              { 
                color: selectedCategory === item.id 
                  ? theme.colors.onPrimary 
                  : theme.colors.onSurfaceVariant
              }
            ]}
          >
            {item.name}
          </Text>
        </View>
      </Chip>
    </Animatable.View>
  );

  const renderEmptyState = () => (
    <Animatable.View 
      animation="fadeIn" 
      duration={600}
      style={styles.emptyState}
      useNativeDriver
    >
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons 
          name="magnify" 
          size={48} 
          color={theme.colors.onSurfaceVariant} 
        />
      </View>
      <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
        No results found
      </Text>
      <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
        Try adjusting your search or select a different category
      </Text>
    </Animatable.View>
  );

  return (<SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        backgroundColor={theme.colors.background} 
        barStyle={theme.dark ? 'light-content' : 'dark-content'} 
      />
      
      {/* Header */}
        <Animatable.View 
          animation="fadeInDown" 
          duration={500}
        style={[styles.header, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.headerContent}>
          <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            Search
          </Text>
          <Text variant="bodyMedium" style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Find products and stores
          </Text>
        </View>
        
          <Searchbar
            placeholder="Search stores or products..."
            onChangeText={handleSearch}
            value={searchQuery}
          style={[
            styles.searchBar, { 
              backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline}
          ]}
          inputStyle={[
            styles.searchInput, { color: theme.colors.onSurface }
          ]}
          iconColor={theme.colors.primary}
          placeholderTextColor={theme.colors.onSurfaceVariant}
            elevation={0}
            theme={{
              colors: {
              primary: theme.colors.primary, onSurface: theme.colors.onSurface, elevation: {
                  level2: 'transparent'}, }, roundness: 12}}
          />
        </Animatable.View>

      {/* Search Type Tabs */}
      <Animatable.View 
        animation="fadeInUp" 
        delay={100}
        duration={500}
        style={[styles.searchTypeContainer, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.searchTypeButtons}>
          {[
            { key: 'all', label: 'All', icon: 'view-grid' }, { key: 'products', label: 'Products', icon: 'package-variant' }, { key: 'stores', label: 'Stores', icon: 'store' }
          ].map((type) => (<TouchableOpacity
              key={type.key}
              onPress={() => handleSearchTypeChange(type.key as 'all' | 'products' | 'stores')}
              style={[
                styles.searchTypeButton,
                {
                  backgroundColor: searchType === type.key 
                    ? theme.colors.primary 
                    : theme.colors.surfaceVariant,
                  borderColor: theme.colors.outline,
                }
              ]}
            >
              <MaterialCommunityIcons 
                name={type.icon as keyof typeof MaterialCommunityIcons.glyphMap} 
                size={16} 
                color={searchType === type.key 
                  ? theme.colors.onPrimary 
                  : theme.colors.onSurfaceVariant
                } 
              />
              <Text 
                style={[
                  styles.searchTypeText,
                  { 
                    color: searchType === type.key 
                      ? theme.colors.onPrimary 
                      : theme.colors.onSurfaceVariant
                  }
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
      </View>
      </Animatable.View>

      {/* Categories */}
      <Animatable.View 
        animation="fadeInUp" 
        delay={200}
        duration={500}
        style={[styles.categoriesContainer, { backgroundColor: theme.colors.surface }]}
      >
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={renderCategory}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.categoriesList}
        />
      </Animatable.View>

      <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={theme.colors.primary} 
            animating={true}
          />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Loading products...
          </Text>
        </View>
      ) : isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={theme.colors.primary} 
            animating={true}
          />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Searching...
          </Text>
        </View>
      ) : searchResults.length > 0 ? (<FlatList
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.resultsRow}
        />
      ) : (
        renderEmptyState()
      )}
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    marginBottom: 12,
  },
  productTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
    lineHeight: 20,
  },
  headerTitle: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerSubtitle: {
    opacity: 0.8,
  },
  searchBar: {
    borderRadius: 12,
    borderWidth: 1,
    elevation: 0,
  },
  searchInput: {
    minHeight: 44,
    fontSize: 16,
  },
  searchTypeContainer: {
    paddingVertical: 8
  },
  searchTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  searchTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 80,
    minHeight: 32,
  },
  searchTypeText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  categoriesContainer: {
    paddingVertical: 12
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    marginRight: 8,
    borderRadius: 16,
    height: 36,
    borderWidth: 1,
    minWidth: 70,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  resultsList: {
    padding: 16,
    paddingBottom: 24,
  },
  resultsRow: {
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  productTouchable: {
    flex: 1,
    marginHorizontal: 4,
    maxWidth: (width - 48) / 2,
  },
  storeTouchable: {
    flex: 1,
    marginHorizontal: 4,
    maxWidth: (width - 48) / 2,
  },
  productCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    marginBottom: 4,
  },
  storeCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    marginBottom: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  productImage: {
    height: 160,
    resizeMode: 'cover',
  },
  storeImage: {
    height: 160,
    resizeMode: 'cover',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 2,
  },
  ratingBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  heartIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineStatus: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  onlineStatusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  productContent: {
    padding: 16,
    minHeight: 120,
  },
  storeContent: {
    padding: 16,
    minHeight: 100,
  },
  productName: {
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 6,
  },
  storeTitle: {
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 6,
  },
  storeName: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 10,
    fontWeight: '500',
  },
  storeType: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 10,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  price: {
    fontWeight: '800',
    fontSize: 17,
  },
  reviewCount: {
    fontSize: 11,
    opacity: 0.6,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  deliveryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  storeFooter: {
    marginTop: 8,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distance: {
    fontSize: 12,
    fontWeight: '500',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SearchScreen;
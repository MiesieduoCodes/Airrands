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
        activeOpacity={0.9}
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
        <Card 
          style={[
            styles.productCard, 
            { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            }
          ]} 
          mode="outlined"
        >
          <Card.Cover 
            source={{ uri: item.image }} 
            style={styles.productImage} 
            theme={{ roundness: 12 }}
          />
          <Card.Content style={styles.cardContent}>
            <View style={styles.productHeader}>
              <Text 
                variant="titleMedium" 
                style={[styles.productTitle, { color: theme.colors.onSurface }]} 
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <View style={styles.ratingContainer}>
                <MaterialCommunityIcons 
                  name="star" 
                  size={16} 
                  color={theme.colors.primary} 
                />
                <Text 
                  variant="labelMedium" 
                  style={[styles.ratingText, { color: theme.colors.onSurfaceVariant }]}
                >
                  {item.rating ? item.rating.toFixed(1) : 'N/A'}
                </Text>
              </View>
            </View>
            
            <Text 
              variant="bodyMedium" 
              style={[styles.storeName, { color: theme.colors.onSurfaceVariant }]} 
              numberOfLines={1}
            >
              {item.store}
            </Text>
            
            <View style={styles.priceContainer}>
              <Text variant="titleLarge" style={[styles.price, { color: theme.colors.primary }]}>
                ₦{item.price ? item.price.toLocaleString() : 'N/A'}
              </Text>
              <IconButton
                icon="heart-outline"
                size={20}
                iconColor={theme.colors.onSurfaceVariant}
                style={styles.heartButton}
              />
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderStore = ({ item, index }: { item: StoreType; index: number }) => (<Animatable.View 
      animation="fadeInUp" 
      delay={index * 50}
      duration={400}
      useNativeDriver
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('SellerProfile', {
          sellerId: item.id,
          sellerName: item.name,
        })}
        style={styles.storeTouchable}
      >
        <Card 
          style={[
            styles.storeCard, 
            { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            }
          ]} 
          mode="outlined"
        >
          <Card.Cover 
            source={{ uri: item.image }} 
            style={styles.storeImage} 
            theme={{ roundness: 12 }}
          />
          <Card.Content style={styles.cardContent}>
            <View style={styles.storeHeader}>
              <Text 
                variant="titleMedium" 
                style={[styles.storeTitle, { color: theme.colors.onSurface }]} 
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <View style={styles.ratingContainer}>
                <MaterialCommunityIcons 
                  name="star" 
                  size={16} 
                  color={theme.colors.primary} 
                />
                <Text 
                  variant="labelMedium" 
                  style={[styles.ratingText, { color: theme.colors.onSurfaceVariant }]}
                >
                  {item.rating ? item.rating.toFixed(1) : 'N/A'}
                </Text>
              </View>
            </View>
            
            <Text 
              variant="bodyMedium" 
              style={[styles.storeType, { color: theme.colors.onSurfaceVariant }]} 
              numberOfLines={1}
            >
              {item.type}
              </Text>

            <View style={styles.storeFooter}>
              <Text variant="bodySmall" style={[styles.distance, { color: theme.colors.onSurfaceVariant }]}>
                {item.distance}
              </Text>
              {item.isOnline && (
                <View style={[styles.onlineIndicator, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.onlineText, { color: theme.colors.onPrimary }]}>
                    Online
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
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
    padding: 12,
    paddingBottom: 20,
  },
  resultsRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productTouchable: {
    flex: 1,
    marginHorizontal: 3,
  },
  storeTouchable: {
    flex: 1,
    marginHorizontal: 3,
  },
  productCard: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  storeCard: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productImage: {
    height: 120,
  },
  storeImage: {
    height: 120,
  },
  cardContent: {
    padding: 10,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productName: {
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
    fontSize: 13,
    lineHeight: 16,
  },
  storeTitle: {
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
    fontSize: 13,
    lineHeight: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontWeight: '600',
    fontSize: 11,
  },
  storeName: {
    marginBottom: 6,
    fontSize: 11,
  },
  storeType: {
    marginBottom: 6,
    fontSize: 11,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontWeight: '700',
    fontSize: 14,
  },
  heartButton: {
    margin: 0,
    marginLeft: 2,
  },
  storeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distance: {
    fontSize: 11,
  },
  onlineIndicator: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  onlineText: {
    fontSize: 9,
    fontWeight: '600',
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
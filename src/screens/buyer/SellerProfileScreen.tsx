import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Dimensions,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Animated,
  Alert,
  SafeAreaView,
  StatusBar,
  Linking
} from 'react-native';
import { 
  Text, 
  Button, 
  Chip, 
  Divider,
  IconButton,
  Searchbar,
  Card,
  Avatar,
  List
} from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { RootNavigationProp } from '../../navigation/types';
import { MaterialCommunityIcons, MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { getSellerProfile, getSellerProducts } from '../../services/buyerServices';
import { useAuth } from '../../contexts/AuthContext';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const IMAGE_HEIGHT = 350;

type SellerProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'SellerProfile'>;

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  rating: number;
  reviews: number;
  sellerId: string;
  images?: string[];
  status: string;
  stock?: number;
}

interface Seller {
  id: string;
  name: string;
  image: string;
  coverImage: string;
  rating: number;
  reviews: number;
  description: string;
  address: string;
  phone: string;
  email: string;
  categories: string[];
  isOpen: boolean;
  businessType?: string;
  totalSales?: number;
  memberSince?: string;
  operatingHours?: any;
  deliveryRadius?: number;
  averageProcessingTime?: number;
  isOnline?: boolean;
  lastSeen?: string;
  verified?: boolean;
  featured?: boolean;
}

const SellerProfileScreen: React.FC<SellerProfileScreenProps> = ({ navigation, route }: SellerProfileScreenProps) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { sellerId, sellerName } = route.params;
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;

  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animated values
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, IMAGE_HEIGHT - 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (!sellerId) return;
    setLoading(true);
    setError(null);
    
    const fetchData = async () => {
      try {
        const [sellerData, productsData] = await Promise.all([
          getSellerProfile(sellerId),
          getSellerProducts(sellerId)
        ]);
        
        // Create a complete seller object with default values if API returns incomplete data
        const completeSellerData: Seller = {
          id: sellerData?.id || sellerId,
          name: (sellerData as any)?.name || (sellerData as any)?.displayName || (sellerData as any)?.businessName || 'Unknown Seller',
          image: (sellerData as any)?.image || (sellerData as any)?.photoURL || (sellerData as any)?.avatar || 'https://picsum.photos/200',
          coverImage: (sellerData as any)?.coverImage || (sellerData as any)?.coverPhoto || 'https://picsum.photos/400/200',
          rating: (sellerData as any)?.rating || 0,
          reviews: (sellerData as any)?.reviews || 0,
          description: (sellerData as any)?.description || (sellerData as any)?.bio || 'No description available',
          address: (sellerData as any)?.address || (sellerData as any)?.location || 'Address not available',
          phone: (sellerData as any)?.phone || (sellerData as any)?.phoneNumber || '',
          email: (sellerData as any)?.email || '',
          categories: (sellerData as any)?.categories || (sellerData as any)?.businessType || [],
          isOpen: (sellerData as any)?.isOpen ?? true,
          businessType: (sellerData as any)?.businessType || 'General',
          totalSales: (sellerData as any)?.totalSales || 0,
          memberSince: (sellerData as any)?.memberSince || 'Unknown',
          operatingHours: (sellerData as any)?.operatingHours || null,
          deliveryRadius: (sellerData as any)?.deliveryRadius || 5,
          averageProcessingTime: (sellerData as any)?.averageProcessingTime || 15,
          isOnline: (sellerData as any)?.isOnline || false,
          lastSeen: (sellerData as any)?.lastSeen || 'Unknown',
          verified: (sellerData as any)?.verified || false,
          featured: (sellerData as any)?.featured || false,
        };
        
        setSeller(completeSellerData);
        setProducts(productsData || []);
      } catch (e) {
        console.error('Failed to fetch seller data:', e);
        setError('Failed to load seller information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [sellerId]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <View style={styles.loadingContainer}>
          <Animatable.View animation="pulse" iterationCount="infinite">
            <MaterialCommunityIcons name="store" size={64} color={theme.colors.primary} />
          </Animatable.View>
          <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
            Loading seller profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !seller) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.onSurface }]}>
            {error || 'Seller not found'}
          </Text>
          <Button mode="contained" onPress={() => navigation.goBack()}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const categories = ['all', ...seller.categories];
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = searchText === '' || 
      product.name.toLowerCase().includes(searchText.toLowerCase()) ||
      product.description.toLowerCase().includes(searchText.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleMessageSeller = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to message this seller');
      return;
    }
    
    try {
      // Create or get chat with seller
      const messagingService = await import('../../services/messagingService');
      const { chatId, isNew } = await messagingService.default.getOrCreateChat(user.uid, seller.id);
      
      // Navigate to chat with seller
      navigation.navigate('Chat', { 
        chatId,
        chatName: seller.name,
        chatAvatar: seller.image,
        chatRole: 'seller'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to start conversation with seller');
    }
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { 
      productId: product.id,
      sellerId: seller.id,
      productName: product.name,
      price: product.price,
      description: product.description,
      image: product.image,
      rating: product.rating,
      reviews: product.reviews,
      category: product.category
    });
  };

  const handleCallSeller = () => {
    if (seller.phone) {
      Alert.alert(
        `Call ${seller.name}?`,
        'Would you like to call this seller?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => Linking.openURL(`tel:${seller.phone}`) }
        ]
      );
    }
  };

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

  const formatOperatingHours = (hours: any) => {
    if (!hours || !Array.isArray(hours)) return 'Hours not available';
    
    const today = new Date().getDay();
    const todayHours = hours.find((h: any) => h.day === today);
    
    if (todayHours) {
      return `${todayHours.open} - ${todayHours.close}`;
    }
    return 'Hours not available';
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.header, 
          { 
            backgroundColor: theme.colors.surface,
            opacity: headerOpacity,
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
          iconColor={theme.colors.onSurface}
          size={24}
        />
        <Text 
          variant="titleMedium" 
          style={[styles.headerTitle, { color: theme.colors.onSurface }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {seller.name}
        </Text>
        <View style={{ width: 56 }} />
      </Animated.View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Hero Section with Cover Image */}
        <Animatable.View animation="fadeIn" duration={800}>
          <View style={styles.heroContainer}>
            <Image 
              source={{ uri: seller.coverImage }} 
              style={styles.coverImage}
              resizeMode="cover"
            />
            <View style={styles.heroOverlay} />
            
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            {/* Seller Info Overlay */}
            <View style={styles.sellerInfoOverlay}>
              <View style={styles.sellerAvatarContainer}>
                <Avatar.Image 
                  source={{ uri: seller.image }} 
                  size={100}
                  style={styles.sellerAvatar}
                />
                {seller.verified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: theme.colors.primary }]}>
                    <MaterialIcons name="verified" size={16} color="#fff" />
                  </View>
                )}
                <Chip 
                  mode={seller.isOpen ? 'flat' : 'outlined'}
                  style={[styles.statusChip, { 
                    backgroundColor: seller.isOpen ? theme.colors.primary : 'transparent',
                    borderColor: seller.isOpen ? 'transparent' : theme.colors.outline
                  }]}
                >
                  {seller.isOpen ? 'Open Now' : 'Closed'}
                </Chip>
              </View>
              
              <View style={styles.sellerBasicInfo}>
                <Text 
                  variant="headlineMedium" 
                  style={[styles.sellerName, { color: '#fff' }]}
                  numberOfLines={1}
                >
                  {seller.name}
                </Text>
                <View style={styles.ratingContainer}>
                  {renderRatingStars(seller.rating)}
                  <Text 
                    variant="bodyMedium" 
                    style={[styles.ratingText, { color: 'rgba(255,255,255,0.9)' }]}
                  >
                    {seller.rating.toFixed(1)} ({seller.reviews} reviews)
                  </Text>
                </View>
                <View style={styles.sellerTags}>
                  {seller.featured && (
                    <Chip mode="flat" style={[styles.tagChip, { backgroundColor: theme.colors.secondary }]}>
                      Featured
                    </Chip>
                  )}
                  <Chip mode="flat" style={[styles.tagChip, { backgroundColor: theme.colors.tertiary }]}>
                    {seller.businessType}
                  </Chip>
                </View>
              </View>
            </View>
          </View>
        </Animatable.View>

        {/* Main Content */}
        <View style={[styles.mainContent, { backgroundColor: theme.colors.background }]}>
          
          {/* Quick Stats Bar */}
          <Animatable.View animation="fadeInUp" delay={200} duration={600}>
            <Card style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} />
                  <Text variant="titleSmall" style={[styles.statValue, { color: theme.colors.onSurface }]}>
                    {seller.averageProcessingTime} min
                  </Text>
                  <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Prep Time
                  </Text>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="map-marker-radius" size={24} color={theme.colors.primary} />
                  <Text variant="titleSmall" style={[styles.statValue, { color: theme.colors.onSurface }]}>
                    {seller.deliveryRadius} km
                  </Text>
                  <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Delivery
                  </Text>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="shopping" size={24} color={theme.colors.primary} />
                  <Text variant="titleSmall" style={[styles.statValue, { color: theme.colors.onSurface }]}>
                    {seller.totalSales}
                  </Text>
                  <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Sales
                  </Text>
                </View>
              </View>
            </Card>
          </Animatable.View>

          {/* Contact & Action Buttons */}
          <Animatable.View animation="fadeInUp" delay={300} duration={600}>
            <Card style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  icon="message"
                  onPress={handleMessageSeller}
                  style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                  labelStyle={styles.actionButtonLabel}
                >
                  Message
                </Button>
                
                <Button
                  mode="outlined"
                  icon="phone"
                  onPress={handleCallSeller}
                  style={[styles.actionButton, { borderColor: theme.colors.primary }]}
                  labelStyle={[styles.actionButtonLabel, { color: theme.colors.primary }]}
                >
                  Call
                </Button>
              </View>
            </Card>
          </Animatable.View>

          {/* About Section */}
          <Animatable.View animation="fadeInUp" delay={400} duration={600}>
            <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="information" size={24} color={theme.colors.primary} />
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  About
                </Text>
              </View>
              <Text variant="bodyMedium" style={[styles.sectionText, { color: theme.colors.onSurfaceVariant }]}>
                {seller.description}
              </Text>
            </Card>
          </Animatable.View>

          {/* Business Information */}
          <Animatable.View animation="fadeInUp" delay={500} duration={600}>
            <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="store" size={24} color={theme.colors.primary} />
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Business Info
                </Text>
              </View>
              
              <List.Item
                title="Address"
                description={seller.address}
                left={props => <List.Icon {...props} icon="map-marker" color={theme.colors.primary} />}
                titleStyle={[styles.listItemTitle, { color: theme.colors.onSurface }]}
                descriptionStyle={[styles.listItemDescription, { color: theme.colors.onSurfaceVariant }]}
              />
              
              <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
              
              <List.Item
                title="Operating Hours"
                description={formatOperatingHours(seller.operatingHours)}
                left={props => <List.Icon {...props} icon="clock-outline" color={theme.colors.primary} />}
                titleStyle={[styles.listItemTitle, { color: theme.colors.onSurface }]}
                descriptionStyle={[styles.listItemDescription, { color: theme.colors.onSurfaceVariant }]}
              />
              
              <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
              
              <List.Item
                title="Member Since"
                description={seller.memberSince}
                left={props => <List.Icon {...props} icon="calendar-account" color={theme.colors.primary} />}
                titleStyle={[styles.listItemTitle, { color: theme.colors.onSurface }]}
                descriptionStyle={[styles.listItemDescription, { color: theme.colors.onSurfaceVariant }]}
              />
            </Card>
          </Animatable.View>

          {/* Categories */}
          <Animatable.View animation="fadeInUp" delay={600} duration={600}>
            <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="tag" size={24} color={theme.colors.primary} />
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Categories
                </Text>
              </View>
              
              <Searchbar
                placeholder="Search products..."
                value={searchText}
                onChangeText={setSearchText}
                style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
                iconColor={theme.colors.onSurfaceVariant}
              />
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    style={[
                      styles.categoryPill,
                      selectedCategory === category && {
                        backgroundColor: theme.colors.primary,
                      }
                    ]}
                  >
                    <Text 
                      style={[
                        styles.categoryText,
                        selectedCategory === category && {
                          color: theme.colors.onPrimary,
                        }
                      ]}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Card>
          </Animatable.View>

          {/* Products Section */}
          <Animatable.View animation="fadeInUp" delay={700} duration={600}>
            <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="package-variant" size={24} color={theme.colors.primary} />
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Products ({filteredProducts.length})
                </Text>
              </View>
              
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product, index) => (
                  <Animatable.View 
                    key={product.id} 
                    animation="fadeInUp" 
                    delay={800 + (index * 100)} 
                    duration={600}
                  >
                    <TouchableOpacity
                      onPress={() => handleProductPress(product)}
                      style={styles.productCard}
                    >
                      <Image 
                        source={{ uri: product.images?.[0] || product.image }} 
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                      <View style={styles.productDetails}>
                        <View>
                          <Text 
                            variant="titleMedium" 
                            style={[styles.productName, { color: theme.colors.onSurface }]}
                            numberOfLines={1}
                          >
                            {product.name}
                          </Text>
                          <Text 
                            variant="bodySmall" 
                            style={[styles.productDescription, { color: theme.colors.onSurfaceVariant }]}
                            numberOfLines={2}
                          >
                            {product.description}
                          </Text>
                          <View style={styles.productRating}>
                            {renderRatingStars(product.rating)}
                            <Text 
                              variant="bodySmall" 
                              style={[styles.ratingText, { color: theme.colors.onSurfaceVariant }]}
                            >
                              ({product.reviews})
                            </Text>
                          </View>
                        </View>
                        <View style={styles.productFooter}>
                          <Text variant="titleMedium" style={[styles.productPrice, { color: theme.colors.primary }]}>
                            ₦{product.price.toLocaleString()}
                          </Text>
                          <Button
                            mode="contained"
                            onPress={() => handleProductPress(product)}
                            style={[styles.orderButton, { backgroundColor: theme.colors.primary }]}
                            labelStyle={styles.orderButtonLabel}
                          >
                            Order
                          </Button>
                        </View>
                      </View>
                    </TouchableOpacity>
                    {index < filteredProducts.length - 1 && (
                      <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                    )}
                  </Animatable.View>
                ))
              ) : (
                <View style={styles.noProductsContainer}>
                  <MaterialCommunityIcons name="package-variant-closed" size={64} color={theme.colors.onSurfaceVariant} />
                  <Text style={[styles.noProductsText, { color: theme.colors.onSurfaceVariant }]}>
                    No products found
                  </Text>
                  <Text style={[styles.noProductsSubtext, { color: theme.colors.onSurfaceVariant }]}>
                    This seller hasn't added any products yet.
                  </Text>
                </View>
              )}
            </Card>
          </Animatable.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 12,
    zIndex: 100,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  heroContainer: {
    height: IMAGE_HEIGHT,
    width: '100%',
    position: 'relative',
    zIndex: 1,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 2,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sellerInfoOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 30,
    zIndex: 3,
  },
  sellerAvatarContainer: {
    position: 'relative',
  },
  sellerAvatar: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusChip: {
    position: 'absolute',
    bottom: -10,
    right: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sellerBasicInfo: {
    flex: 1,
    marginLeft: 16,
    marginBottom: 8,
  },
  sellerName: {
    fontWeight: '700',
    marginBottom: 4,
    fontSize: 22,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
  },
  sellerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tagChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  mainContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingBottom: 24,
  },
  statsCard: {
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e0e0e0',
  },
  actionCard: {
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCard: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    marginLeft: 8,
  },
  sectionText: {
    lineHeight: 22,
    marginBottom: 16,
  },
  searchBar: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoriesContainer: {
    paddingBottom: 4,
  },
  categoryPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  productCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8f8f8',
    marginBottom: 16,
  },
  productImage: {
    width: 100,
    height: 100,
  },
  productDetails: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  productName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  productDescription: {
    marginBottom: 4,
    lineHeight: 18,
  },
  productRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  productPrice: {
    fontWeight: '700',
  },
  orderButton: {
    borderRadius: 8,
  },
  orderButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  noProductsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noProductsText: {
    fontSize: 16,
    textAlign: 'center',
  },
  noProductsSubtext: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  divider: {
    height: 1,
  },
  listItemTitle: {
    fontWeight: '600',
  },
  listItemDescription: {
    fontSize: 14,
  },
});

export default SellerProfileScreen;
import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  Animated,
  ActivityIndicator
} from 'react-native';
import { 
  Text, 
  Button, 
  IconButton, 
  Divider,
  Chip
} from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import ReviewsDisplay from '../../components/ReviewsDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import firebase from 'firebase/compat/app';

type ProductDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

interface ProductData {
  id: string;
  productName: string;
  price: number;
  description: string;
  image: string;
  rating: number;
  reviewCount: number;
  category: string;
  sellerId: string;
  sellerName?: string;
  availability?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const {
    productId,
    sellerId,
    productName: fallbackProductName,
    price: fallbackPrice,
    description: fallbackDescription,
    image: fallbackImage,
  } = route.params || {};
  
  const [quantity, setQuantity] = useState(1);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollY = new Animated.Value(0);
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150, 200],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp'
  });

  // Fetch product data from Firebase
  useEffect(() => {
    const fetchProductData = async () => {
      if (!productId) {
        setError('Product ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch product details
        const productDoc = await db.collection('products').doc(productId).get();
        
        if (!productDoc.exists) {
          setError('Product not found');
          setLoading(false);
          return;
        }

        const productInfo = productDoc.data();
        
        // Calculate rating from reviews
        const reviewsSnapshot = await db.collection('reviews')
          .where('targetId', '==', productId)
          .where('targetType', '==', 'product')
          .get();

        let totalRating = 0;
        let reviewCount = 0;
        
        reviewsSnapshot.docs.forEach(doc => {
          const review = doc.data();
          if (review.rating && typeof review.rating === 'number') {
            totalRating += review.rating;
            reviewCount++;
          }
        });

        const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;

        // Fetch seller information
        let sellerName = 'Unknown Seller';
        if (productInfo?.sellerId || sellerId) {
          const sellerDoc = await db.collection('sellers').doc(productInfo?.sellerId || sellerId).get();
          if (sellerDoc.exists) {
            const sellerData = sellerDoc.data();
            sellerName = sellerData?.businessName || sellerData?.displayName || 'Unknown Seller';
          }
        }

        const productData: ProductData = {
          id: productDoc.id,
          productName: productInfo?.productName || fallbackProductName || 'Unknown Product',
          price: productInfo?.price || fallbackPrice || 0,
          description: productInfo?.description || fallbackDescription || 'No description available',
          image: productInfo?.image || fallbackImage || '',
          rating: averageRating,
          reviewCount: reviewCount,
          category: productInfo?.category || 'Uncategorized',
          sellerId: productInfo?.sellerId || sellerId,
          sellerName: sellerName,
          availability: productInfo?.availability !== false, // Default to true if not specified
          createdAt: productInfo?.createdAt,
          updatedAt: productInfo?.updatedAt,
        };

        setProductData(productData);
      } catch (err) {
        console.error('Error fetching product data:', err);
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [productId, sellerId, fallbackProductName, fallbackPrice, fallbackDescription, fallbackImage]);

  const handleOrder = () => {
    const currentProductData = productData || {
      productName: fallbackProductName,
      price: fallbackPrice,
    };
    
    navigation.navigate('Checkout', {
      productId,
      sellerId: productData?.sellerId || sellerId,
      productName: currentProductData.productName,
      price: currentProductData.price,
      quantity,
    });
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
            size={20} 
            color={theme.colors.primary} 
          />
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <MaterialIcons 
            key={i} 
            name="star-half" 
            size={20} 
            color={theme.colors.primary} 
          />
        );
      } else {
        stars.push(
          <MaterialIcons 
            key={i} 
            name="star-outline" 
            size={20} 
            color={theme.colors.primary} 
          />
        );
      }
    }
    return stars;
  };

  const { user } = useAuth();

  // Get current product data with fallbacks
  const currentData = productData || {
    productName: fallbackProductName || 'Loading...',
    price: fallbackPrice || 0,
    description: fallbackDescription || 'Loading...',
    image: fallbackImage || '',
    rating: 0,
    reviewCount: 0,
    category: 'Loading...',
    availability: true,
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text 
          variant="bodyLarge" 
          style={[styles.loadingText, { color: theme.colors.onBackground }]}
        >
          Loading product details...
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialIcons name="error" size={64} color={theme.colors.error} />
        <Text 
          variant="headlineSmall" 
          style={[styles.errorTitle, { color: theme.colors.error }]}
        >
          Error
        </Text>
        <Text 
          variant="bodyMedium" 
          style={[styles.errorMessage, { color: theme.colors.onBackground }]}
        >
          {error}
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
          {currentData.productName}
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
        {/* Product Image */}
        <Image 
          source={{ uri: currentData.image }} 
          style={styles.productImage}
          resizeMode="cover"
        />

        {/* Product Info */}
        <View style={[styles.infoSection, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.categoryRow}>
            <Chip 
              mode="outlined"
              style={{ borderColor: theme.colors.outline }}
              textStyle={{ color: theme.colors.onSurfaceVariant }}
            >
              {currentData.category}
            </Chip>
            <View style={styles.deliveryInfo}>
              <MaterialCommunityIcons 
                name="clock" 
                size={16} 
                color={theme.colors.onSurfaceVariant} 
              />
              <Text 
                variant="bodySmall" 
                style={[styles.deliveryText, { color: theme.colors.onSurfaceVariant }]}
              >
                Processing: 20-30 min
              </Text>
            </View>
          </View>

          <Text 
            variant="headlineSmall" 
            style={[styles.productName, { color: theme.colors.onSurface }]}
          >
            {currentData.productName}
          </Text>

          <View style={styles.ratingRow}>
            {renderRatingStars(currentData.rating)}
            <Text 
              variant="bodyMedium" 
              style={[styles.ratingText, { color: theme.colors.onSurfaceVariant }]}
            >
              {currentData.rating.toFixed(1)} ({currentData.reviewCount} reviews)
            </Text>
          </View>

          <Text 
            variant="titleLarge" 
            style={[styles.price, { color: theme.colors.primary }]}
          >
            ₦{currentData.price.toLocaleString()}
          </Text>
          
          {quantity > 1 && (
            <Text 
              variant="bodyMedium" 
              style={[styles.unitPriceNote, { color: theme.colors.onSurfaceVariant }]}
            >
              ₦{currentData.price.toLocaleString()} each
            </Text>
          )}

          <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

          <Text 
            variant="titleMedium" 
            style={[styles.descriptionTitle, { color: theme.colors.onSurface }]}
          >
            Description
          </Text>
          <Text 
            variant="bodyMedium" 
            style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
          >
            {currentData.description}
          </Text>

          {/* Reviews Section */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text 
                variant="titleMedium" 
                style={[styles.reviewsTitle, { color: theme.colors.onSurface }]}
              >
                Reviews
              </Text>
              {user && (<Button
                  mode="outlined"
                  onPress={() => navigation.navigate('ReviewSubmission', {
                    targetId: productId,
                    targetType: 'product',
                    targetName: currentData.productName,
                    targetImage: currentData.image,
                  })}
                  style={styles.writeReviewButton}
                >
                  Write Review
                </Button>
              )}
            </View>
            
            <ReviewsDisplay
              targetId={productId}
              targetType="product"
              targetName={currentData.productName}
              onWriteReview={() => navigation.navigate('ReviewSubmission', {
                targetId: productId,
                targetType: 'product',
                targetName: currentData.productName,
                targetImage: currentData.image,
              })}
              maxReviews={3}
              showWriteButton={false}
            />
          </View>

          {/* Quantity Selector */}
          <View style={styles.quantityRow}>
            <Text 
              variant="bodyLarge" 
              style={[styles.quantityLabel, { color: theme.colors.onSurface }]}
            >
              Quantity:
            </Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity 
                onPress={() => setQuantity(q => Math.max(1, q - 1))} 
                style={[
                  styles.qtyBtn, 
                  { backgroundColor: theme.colors.surfaceVariant }
                ]}
              >
                <MaterialIcons 
                  name="remove" 
                  size={22} 
                  color={theme.colors.onSurfaceVariant} 
                />
              </TouchableOpacity>
              <Text 
                variant="titleMedium" 
                style={[styles.quantityValue, { color: theme.colors.onSurface }]}
              >
                {quantity}
              </Text>
              <TouchableOpacity 
                onPress={() => setQuantity(q => q + 1)} 
                style={[
                  styles.qtyBtn, 
                  { backgroundColor: theme.colors.surfaceVariant }
                ]}
              >
                <MaterialIcons 
                  name="add" 
                  size={22} 
                  color={theme.colors.onSurfaceVariant} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Order Button */}
      <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.priceSummary}>
          <Text 
            variant="bodyMedium" 
            style={[styles.totalLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            Total:
          </Text>
          <Text 
            variant="titleLarge" 
            style={[styles.totalPrice, { color: theme.colors.primary }]}
          >
            ₦{(currentData.price * quantity).toLocaleString()}
          </Text>
        </View>
        <Button
          mode="contained"
          onPress={handleOrder}
          style={[styles.orderBtn, { backgroundColor: theme.colors.primary }]}
          contentStyle={styles.orderBtnContent}
          labelStyle={styles.orderBtnLabel}
        >
          Order Now
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorTitle: {
    marginTop: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  errorMessage: {
    marginTop: 8,
    textAlign: 'center',
    marginHorizontal: 20,
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
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingBottom: 80,
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
  productImage: {
    width: '100%',
    height: 300,
  },
  infoSection: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 24,
    paddingBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    marginLeft: 4,
  },
  productName: {
    fontWeight: '700',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    marginLeft: 8,
  },
  price: {
    fontWeight: '700',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
    height: 1,
  },
  descriptionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    lineHeight: 22,
    marginBottom: 24,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quantityLabel: {
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: {
    marginHorizontal: 16,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  priceSummary: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalPrice: {
    fontWeight: '700',
  },
  orderBtn: {
    flex: 1,
    borderRadius: 12,
    marginLeft: 16,
  },
  orderBtnContent: {
    height: 52,
  },
  orderBtnLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  reviewsSection: {
    marginBottom: 24,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewsTitle: {
    fontWeight: '600',
  },
  writeReviewButton: {
    marginLeft: 16,
    borderRadius: 8,
  },
  unitPriceNote: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default ProductDetailScreen;

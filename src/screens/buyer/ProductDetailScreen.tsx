import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  Animated
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

type ProductDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const {
    productId,
    sellerId,
    productName,
    price,
    description,
    image,
    rating = 4.5,
    reviews = 20,
    category = 'Food',
  } = route.params || {};
  
  const [quantity, setQuantity] = useState(1);
  const scrollY = new Animated.Value(0);
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150, 200],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp'
  });

  const handleOrder = () => {
    navigation.navigate('Checkout', {
      productId,
      sellerId,
      productName,
      price,
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
          {productName}
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
          source={{ uri: image }} 
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
              {category}
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
            {productName}
          </Text>

          <View style={styles.ratingRow}>
            {renderRatingStars(rating)}
            <Text 
              variant="bodyMedium" 
              style={[styles.ratingText, { color: theme.colors.onSurfaceVariant }]}
            >
              {rating.toFixed(1)} ({reviews} reviews)
            </Text>
          </View>

          <Text 
            variant="titleLarge" 
            style={[styles.price, { color: theme.colors.primary }]}
          >
            ₦{(price * quantity).toLocaleString()}
          </Text>

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
            {description}
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
                    targetName: productName,
                    targetImage: image,
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
              targetName={productName}
              onWriteReview={() => navigation.navigate('ReviewSubmission', {
                targetId: productId,
                targetType: 'product',
                targetName: productName,
                targetImage: image,
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
            ₦{(price * quantity).toLocaleString()}
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
  },
});

export default ProductDetailScreen;

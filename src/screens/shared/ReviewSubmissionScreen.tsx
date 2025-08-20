import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  IconButton,
  HelperText,
} from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { RootNavigationProp } from '../../navigation/types';
import { MaterialIcons } from '@expo/vector-icons';
import RatingStars from '../../components/RatingStars';
import ratingService, { Rating } from '../../services/ratingService';
import { reviewService } from '../../services/reviewService';
import * as ImagePicker from 'expo-image-picker';
import { validateField, ValidationRule } from '../../utils/validation';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

interface ReviewSubmissionScreenProps {
  navigation: RootNavigationProp;
  route: {
    params: {
      targetId: string;
      targetType: 'product' | 'store' | 'runner';
      targetName: string;
      targetImage?: string;
      existingRating?: Rating;
      triggerId?: string; // For review triggers
      orderId?: string; // For order reviews
      errandId?: string; // For errand reviews
    };
  };
}

const ReviewSubmissionScreen: React.FC<ReviewSubmissionScreenProps> = ({
  navigation, route
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { 
    targetId, 
    targetType, 
    targetName, 
    targetImage, 
    existingRating,
    triggerId,
    orderId,
    errandId
  } = route.params;

  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [review, setReview] = useState(existingRating?.review || '');
  const [images, setImages] = useState<string[]>(existingRating?.images || []);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // Check if user has already rated this target
  useEffect(() => {
    const checkExistingRating = async () => {
      if (user?.uid) {
        try {
          const hasRated = await reviewService.hasUserRated(user.uid, targetId, targetType);
          
          if (hasRated && !existingRating) {
            // Get existing rating
            const existingRatingData = await reviewService.getUserRating(user.uid, targetId, targetType);
            if (existingRatingData) {
              setRating(existingRatingData.rating);
              setReview(existingRatingData.review || '');
              setImages(existingRatingData.images || []);
            }
          }
        } catch (error) {
          console.error('Error checking existing rating:', error);
        }
      }
    };

    checkExistingRating();
  }, [user?.uid, targetId, targetType, existingRating]);

  const validationRules: Record<string, ValidationRule> = {
    rating: {
      required: true,
      minValue: 1,
      maxValue: 5
    },
    review: {
      minLength: 10,
      maxLength: 500
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string[]> = {};

    // Validate rating
    const ratingResult = validateField(rating, validationRules.rating);
    newErrors.rating = ratingResult.errors;

    // Validate review (optional but if provided, validate length)
    if (review.trim().length > 0) {
      const reviewResult = validateField(review, validationRules.review);
      newErrors.review = reviewResult.errors;
    }

    setErrors(newErrors);
    return Object.values(newErrors).every(errorArray => errorArray.length === 0);
  };

  const handleFieldChange = (field: string, value: string | number) => {
    if (field === 'rating') {
      setRating(value as number);
    } else if (field === 'review') {
      setReview(value as string);
    }

    // Clear error when user starts typing
    if (errors?.[field] && errors?.[field].length > 0) {
      setErrors((prev) => ({ ...prev, [field]: [] }));
    }
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to add images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImages(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const getTargetTypeLabel = () => {
    switch (targetType) {
      case 'store':
        return 'Store';
      case 'runner':
        return 'Runner';
      default:
        return 'Service';
    }
  };

  const getRatingLabels = () => {
    const labels = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent',
    };
    return labels?.[rating as keyof typeof labels] || '';
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit a review.');
      return;
    }

    setLoading(true);

    try {
      const ratingData = {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userEmail: user.email || '',
        userImage: user.photoURL || undefined,
        targetId,
        targetType,
        rating,
        review: review || undefined,
        images: images.length > 0 ? images : undefined,
      };

      if (triggerId) {
        // This is a review trigger from completed order/errand
        await reviewService.submitReviewAndComplete(triggerId, ratingData);
        Alert.alert('Success', 'Thank you for your review!');
      } else if (existingRating) {
        // Update existing rating
        await ratingService.updateRating(existingRating.id!, {
          rating,
          review: review || undefined,
          images: images.length > 0 ? images : undefined,
        });
        Alert.alert('Success', 'Your review has been updated successfully!');
      } else {
        // Submit new rating
        await ratingService.submitRating(ratingData);
        Alert.alert('Success', 'Thank you for your review!');
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', error.message || 'Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (triggerId) {
      try {
        await reviewService.markReviewSkipped(triggerId);
        Alert.alert('Skipped', 'Review prompt skipped.');
        navigation.goBack();
      } catch (error) {
        console.error('Error skipping review:', error);
        Alert.alert('Error', 'Failed to skip review. Please try again.');
      }
    } else {
      navigation.goBack();
    }
  };

  const isFormValid = () => {
    return rating > 0 && Object.values(errors).every(errorArray => errorArray.length === 0);
  };

  return (<View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
          {existingRating ? 'Edit Review' : 'Write a Review'}
        </Text>
        <View style={{ width: 56 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Target Info */}
          <Animated.View entering={FadeIn.duration(600)}>
            <View style={[styles.targetSection, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.targetInfo}>
                {targetImage && (
                  <Image source={{ uri: targetImage }} style={styles.targetImage} />
                )}
                <View style={styles.targetDetails}>
                  <Text
                    variant="titleMedium"
                    style={[styles.targetName, { color: theme.colors.onSurface }]}
                  >
                    {targetName}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[styles.targetType, { color: theme.colors.onSurfaceVariant }]}
                  >
                    {getTargetTypeLabel()}
                  </Text>
                  {(orderId || errandId) && (
                    <Text
                      variant="bodySmall"
                      style={[styles.orderInfo, { color: theme.colors.onSurfaceVariant }]}
                    >
                      {orderId ? `Order #${orderId}` : `Errand #${errandId}`}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Rating Section */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <View style={[styles.ratingSection, { backgroundColor: theme.colors.surface }]}>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Rate your experience
              </Text>

              <View style={styles.ratingContainer}>
                <RatingStars
                  rating={rating}
                  onRatingChange={setRating}
                  size={32}
                  editable={true}
                />
                {rating > 0 && (
                <Text
                    variant="bodyMedium"
                    style={[styles.ratingLabel, { color: theme.colors.primary }]}
                >
                  {getRatingLabels()}
                </Text>
                )}
              </View>

              {errors?.rating && errors?.rating.length > 0 && (
                <HelperText type="error" visible={true}>
                  {errors?.rating?.[0]}
                </HelperText>
              )}
            </View>
          </Animated.View>

          {/* Review Section */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)}>
            <View style={[styles.reviewSection, { backgroundColor: theme.colors.surface }]}>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Write a review (optional)
              </Text>

              <TextInput
                mode="outlined"
                multiline
                numberOfLines={4}
                placeholder="Write your review (optional)"
                value={review}
                onChangeText={setReview}
                style={{ marginBottom: 16 }}
                maxLength={500}
                error={errors?.review && errors.review.length > 0}
              />
              
                <Text
                  variant="bodySmall"
                  style={[styles.charCount, { color: theme.colors.onSurfaceVariant }]}
                >
                  {review.length}/500 characters
                </Text>

              {errors?.review && errors?.review.length > 0 && (
                <HelperText type="error" visible={true}>
                  {errors?.review?.[0]}
                </HelperText>
              )}
            </View>
          </Animated.View>

          {/* Images Section */}
          <Animated.View entering={FadeInDown.delay(600).duration(600)}>
            <View style={[styles.imagesSection, { backgroundColor: theme.colors.surface }]}>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Add photos (optional)
              </Text>

              <View style={styles.imagesContainer}>
                {images.map((image, index) => (<View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: image }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <MaterialIcons name="close" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}

                {images.length < 3 && (
                  <TouchableOpacity style={styles.addImageButton} onPress={handleImagePick}>
                    <MaterialIcons name="add-photo-alternate" size={24} color={theme.colors.primary} />
                    <Text style={[styles.addImageText, { color: theme.colors.primary }]}>
                      Add Photo
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View entering={FadeInDown.delay(800).duration(600)}>
            <View style={styles.actionButtons}>
              {triggerId && (
                <Button
                  mode="outlined"
                  onPress={handleSkip}
                  style={styles.skipButton}
                  textColor={theme.colors.onSurfaceVariant}
                >
                  Skip Review
                </Button>
              )}
              
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={!isFormValid() || loading}
            loading={loading}
                style={styles.submitButton}
                buttonColor={theme.colors.primary}
          >
                {loading ? 'Submitting...' : 'Submit Review'}
          </Button>
        </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  targetSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  targetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  targetDetails: {
    flex: 1,
  },
  targetName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  targetType: {
    marginBottom: 2,
  },
  orderInfo: {
    fontStyle: 'italic',
  },
  ratingSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingLabel: {
    marginTop: 8,
    fontWeight: 'bold',
  },
  reviewSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewInput: {
    marginBottom: 8,
  },
  charCount: {
    textAlign: 'right',
    marginBottom: 8,
  },
  imagesSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'red',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 12,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});

export default ReviewSubmissionScreen; 
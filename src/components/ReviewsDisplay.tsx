import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Chip, Divider, IconButton } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import RatingStars from './RatingStars';
import ratingService, { Rating, RatingSummary, RatingFilters } from '../services/ratingService';

interface ReviewsDisplayProps {
  targetId: string;
  targetType: 'product' | 'store' | 'runner';
  targetName: string;
  onWriteReview?: () => void;
  maxReviews?: number;
  showWriteButton?: boolean;
}

const ReviewsDisplay: React.FC<ReviewsDisplayProps> = ({
  targetId, targetType, targetName, onWriteReview, maxReviews = 5, showWriteButton = true, }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'helpful'>('newest');
  const [userRating, setUserRating] = useState<Rating | null>(null);

  useEffect(() => {
    loadReviews();
    if (user) {
      loadUserRating();
    }
  }, [targetId, filter, sortBy]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const [summaryData, reviewsData] = await Promise.all([
        ratingService.getRatingSummary(targetId, targetType),
        ratingService.getRatings(targetId, targetType, {
          rating: filter || undefined,
          sortBy,
          limit: maxReviews,
        }),
      ]);
      setSummary(summaryData);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRating = async () => {
    if (!user) return;
    try {
      const rating = await ratingService.getUserRating(user.uid, targetId, targetType);
      setUserRating(rating);
    } catch (error) {
      console.error('Error loading user rating:', error);
    }
  };

  const handleMarkHelpful = async (ratingId: string) => {
    try {
      await ratingService.markHelpful(ratingId);
      loadReviews();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark review as helpful.');
    }
  };

  const handleReportReview = async (ratingId: string) => {
    Alert.prompt('Report Review', 'Please provide a reason for reporting this review:', [
        { text: 'Cancel', style: 'cancel' }, {
          text: 'Report', onPress: async (reason) => {
            if (reason) {
              try {
                await ratingService.reportRating(ratingId, reason);
                Alert.alert('Success', 'Review reported successfully.');
              } catch (error) {
                Alert.alert('Error', 'Failed to report review.');
              }
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRatingPercentage = (count: number) => {
    if (!summary || summary.totalRatings === 0) return 0;
    return Math.round((count / summary.totalRatings) * 100);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
          Loading reviews...
        </Text>
      </View>
    );
  }

  if (!summary || summary.totalRatings === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.noReviewsText, { color: theme.colors.onSurfaceVariant }]}>
          No reviews yet
        </Text>
        {showWriteButton && onWriteReview && (
          <Button mode="outlined" onPress={onWriteReview} style={styles.writeButton}>
            Be the first to review
          </Button>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Rating Summary */}
      <View style={styles.summarySection}>
        <View style={styles.summaryHeader}>
          <View style={styles.averageRating}>
            <Text variant="displaySmall" style={[styles.ratingNumber, { color: theme.colors.primary }]}>
              {summary.averageRating.toFixed(1)}
            </Text>
            <RatingStars rating={summary.averageRating} size={20} editable={false} />
            <Text variant="bodySmall" style={[styles.totalRatings, { color: theme.colors.onSurfaceVariant }]}>
              {summary.totalRatings} reviews
            </Text>
          </View>
          
          {showWriteButton && onWriteReview && (
            <Button
              mode="contained"
              onPress={onWriteReview}
              style={[styles.writeButton, { backgroundColor: theme.colors.primary }]}
            >
              {userRating ? 'Edit Review' : 'Write Review'}
            </Button>
          )}
        </View>

        {/* Rating Distribution */}
        <View style={styles.distributionContainer}>
          {[5, 4, 3, 2, 1].map((star) => (
            <View key={star} style={styles.distributionRow}>
              <Text variant="bodySmall" style={[styles.starLabel, { color: theme.colors.onSurfaceVariant }]}>
                {star}★
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${getRatingPercentage(summary.ratingDistribution?.[star as keyof typeof summary.ratingDistribution])}%`,
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                />
              </View>
              <Text variant="bodySmall" style={[styles.countText, { color: theme.colors.onSurfaceVariant }]}>
                {summary.ratingDistribution?.[star as keyof typeof summary.ratingDistribution]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

      {/* Filters */}
      <View style={styles.filtersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip
            selected={filter === null}
            onPress={() => setFilter(null)}
            style={styles.filterChip}
          >
            All
          </Chip>
          {[5, 4, 3, 2, 1].map((star) => (<Chip
              key={star}
              selected={filter === star}
              onPress={() => setFilter(filter === star ? null : star)}
              style={styles.filterChip}
            >
              {star}★
            </Chip>
          ))}
        </ScrollView>

        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'newest' && { backgroundColor: theme.colors.primaryContainer }]}
            onPress={() => setSortBy('newest')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'newest' && { color: theme.colors.primary }]}>
              Newest
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'rating' && { backgroundColor: theme.colors.primaryContainer }]}
            onPress={() => setSortBy('rating')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'rating' && { color: theme.colors.primary }]}>
              Highest
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'helpful' && { backgroundColor: theme.colors.primaryContainer }]}
            onPress={() => setSortBy('helpful')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'helpful' && { color: theme.colors.primary }]}>
              Most Helpful
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reviews List */}
      <ScrollView style={styles.reviewsList} showsVerticalScrollIndicator={false}>
        {reviews.map((review) => (
          <View key={review.id} style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewerInfo}>
                <Text variant="bodyMedium" style={[styles.reviewerName, { color: theme.colors.onSurface }]}>
                  {review.userName}
                </Text>
                <RatingStars rating={review.rating} size={16} editable={false} />
                <Text variant="bodySmall" style={[styles.reviewDate, { color: theme.colors.onSurfaceVariant }]}>
                  {formatDate(review.createdAt)}
                </Text>
              </View>
              
              <View style={styles.reviewActions}>
                <TouchableOpacity onPress={() => handleMarkHelpful(review.id!)}>
                  <Text variant="bodySmall" style={[styles.helpfulText, { color: theme.colors.primary }]}>
                    Helpful ({review.helpful})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleReportReview(review.id!)}>
                  <IconButton icon="flag-outline" size={16} iconColor={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            </View>

            {review.review && (
              <Text variant="bodyMedium" style={[styles.reviewText, { color: theme.colors.onSurface }]}>
                {review.review}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
  },
  noReviewsText: {
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  writeButton: {
    marginTop: 12,
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  averageRating: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  totalRatings: {
    marginTop: 4,
  },
  distributionContainer: {
    marginTop: 12,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  starLabel: {
    width: 30,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  countText: {
    width: 30,
    textAlign: 'right',
  },
  divider: {
    marginVertical: 16,
  },
  filtersSection: {
    marginBottom: 16,
  },
  filterChip: {
    marginRight: 8,
  },
  sortButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sortButtonText: {
    fontSize: 12,
  },
  reviewsList: {
    flex: 1,
  },
  reviewItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewDate: {
    marginTop: 4,
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpfulText: {
    marginRight: 8,
  },
  reviewText: {
    lineHeight: 20,
  },
});

export default ReviewsDisplay; 
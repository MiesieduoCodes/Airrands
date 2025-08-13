import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface RatingStarsProps {
  rating: number;
  size?: number;
  editable?: boolean;
  onRatingChange?: (rating: number) => void;
  showHalfStars?: boolean;
  style?: any;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  rating, size = 20, editable = false, onRatingChange, showHalfStars = true, style
}) => {
  const { theme } = useTheme();

  const handleStarPress = (starIndex: number) => {
    if (editable && onRatingChange) {
      onRatingChange(starIndex + 1);
    }
  };

  const handleHalfStarPress = (starIndex: number) => {
    if (editable && onRatingChange && showHalfStars) {
      onRatingChange(starIndex + 0.5);
    }
  };

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        // Full star
        stars.push(<TouchableOpacity
            key={`star-${i}`}
            onPress={() => handleStarPress(i)}
            disabled={!editable}
            style={editable ? styles.starTouchable : undefined}
          >
            <MaterialIcons
              name="star"
              size={size}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        );
      } else if (i === fullStars && hasHalfStar && showHalfStars) {
        // Half star
        stars.push(<TouchableOpacity
            key={`half-star-${i}`}
            onPress={() => handleHalfStarPress(i)}
            disabled={!editable}
            style={editable ? styles.starTouchable : undefined}
          >
            <MaterialIcons
              name="star-half"
              size={size}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        );
      } else {
        // Empty star
        stars.push(<TouchableOpacity
            key={`empty-star-${i}`}
            onPress={() => handleStarPress(i)}
            disabled={!editable}
            style={editable ? styles.starTouchable : undefined}
          >
            <MaterialIcons
              name="star-outline"
              size={size}
              color={theme.colors.outline}
            />
          </TouchableOpacity>
        );
      }
    }

    return stars;
  };

  return (
    <View style={[styles.container, style]}>
      {renderStars()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starTouchable: {
    padding: 2,
  },
});

export default RatingStars; 
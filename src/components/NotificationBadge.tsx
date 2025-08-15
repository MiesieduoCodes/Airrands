import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
}

// Type for valid sizes
type BadgeSize = 'small' | 'medium' | 'large';

const NotificationBadge: React.FC<NotificationBadgeProps> = memo(({ 
  count, size = 'medium' 
}) => {
  const { theme } = useTheme();

  // Early return for invalid count
  if (count <= 0) return null;

  const sizeMap: Record<BadgeSize, { width: number; height: number; fontSize: number }> = {
    small: { width: 16, height: 16, fontSize: 10 },
    medium: { width: 20, height: 20, fontSize: 12 },
    large: { width: 24, height: 24, fontSize: 14 },
  };

  // Validate size and provide fallback
  const validSize: BadgeSize = sizeMap[size] ? size : 'medium';
  const badgeSize = sizeMap[validSize];

  return (
    <View
      style={[
        styles.badge,
        {
          width: badgeSize.width,
          height: badgeSize.height,
          backgroundColor: theme.colors.error,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${count} unread notifications`}
      accessibilityHint="Shows the number of unread notifications"
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: badgeSize.fontSize,
            color: theme.colors.onError,
          },
        ]}
        accessibilityRole="text"
      >
        {count > 999 ? '999+' : count > 99 ? '99+' : count.toString()}
      </Text>
    </View>
  );
});

NotificationBadge.displayName = 'NotificationBadge';

const styles = StyleSheet.create({
  badge: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 3,
  },
  text: {
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default NotificationBadge; 
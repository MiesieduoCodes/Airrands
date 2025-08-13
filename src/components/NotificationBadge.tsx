import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, size = 'medium' 
}) => {
  const { theme } = useTheme();

  if (count === 0) return null;

  const sizeMap = {
    small: { width: 16, height: 16, fontSize: 10 },
    medium: { width: 20, height: 20, fontSize: 12 },
    large: { width: 24, height: 24, fontSize: 14 },
  };

  const badgeSize = sizeMap?.[size];

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
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: badgeSize.fontSize,
            color: theme.colors.onError,
          },
        ]}
      >
        {count > 99 ? '99+' : count.toString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 16,
  },
  text: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default NotificationBadge; 
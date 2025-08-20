import { MD3LightTheme } from 'react-native-paper';
import { COLORS } from '../constants/colors';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    primaryContainer: COLORS.primaryLight,
    secondary: COLORS.secondary,
    secondaryContainer: COLORS.secondaryLight,
    tertiary: COLORS.accent,
    error: COLORS.error,
    errorContainer: COLORS.error + '20',
    surface: COLORS.white,
    surfaceVariant: COLORS.gray?.[100],
    background: COLORS.white,
    onPrimary: COLORS.white,
    onSecondary: COLORS.white,
    onTertiary: COLORS.white,
    onError: COLORS.white,
    onSurface: COLORS.black,
    onSurfaceVariant: COLORS.gray?.[600],
    onBackground: COLORS.black,
    outline: COLORS.gray?.[300],
    outlineVariant: COLORS.gray?.[200],
    shadow: COLORS.black,
    scrim: COLORS.black,
    inverseSurface: COLORS.gray?.[900],
    inverseOnSurface: COLORS.white,
    inversePrimary: COLORS.primaryLight,
    elevation: {
      level0: 'transparent',
      level1: COLORS.white,
      level2: COLORS.white,
      level3: COLORS.white,
      level4: COLORS.white,
      level5: COLORS.white,
    },
  },
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  shadows: {
    none: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 5,
    },
  },
};

export type Theme = typeof theme;

export default theme;
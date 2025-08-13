import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { COLORS, DARK_THEME, LIGHT_THEME } from '../constants/colors';

// Light theme
const lightTheme = {
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
    surface: LIGHT_THEME.surface,
    surfaceVariant: COLORS.gray?.[100],
    background: LIGHT_THEME.background,
    onPrimary: COLORS.white,
    onSecondary: COLORS.white,
    onTertiary: COLORS.white,
    onError: COLORS.white,
    onSurface: LIGHT_THEME.text,
    onSurfaceVariant: COLORS.gray?.[600],
    onBackground: LIGHT_THEME.text,
    outline: COLORS.gray?.[300],
    outlineVariant: COLORS.gray?.[200],
    shadow: COLORS.black,
    scrim: COLORS.black,
    inverseSurface: DARK_THEME.surface,
    inverseOnSurface: COLORS.white,
    inversePrimary: COLORS.primaryLight,
    elevation: {
      level0: 'transparent',
      level1: LIGHT_THEME.surface,
      level2: LIGHT_THEME.surface,
      level3: LIGHT_THEME.surface,
      level4: LIGHT_THEME.surface,
      level5: LIGHT_THEME.surface,
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

// Dark theme
const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: COLORS.primary,
    primaryContainer: COLORS.primaryLight,
    secondary: COLORS.secondary,
    secondaryContainer: COLORS.secondaryLight,
    tertiary: COLORS.accent,
    error: COLORS.error,
    errorContainer: COLORS.error + '20',
    surface: DARK_THEME.surface,
    surfaceVariant: COLORS.gray?.[700],
    background: DARK_THEME.background,
    onPrimary: COLORS.white,
    onSecondary: COLORS.white,
    onTertiary: COLORS.white,
    onError: COLORS.white,
    onSurface: COLORS.white,
    onSurfaceVariant: COLORS.gray?.[200],
    onBackground: COLORS.white,
    outline: COLORS.gray?.[600],
    outlineVariant: COLORS.gray?.[700],
    shadow: COLORS.black,
    scrim: COLORS.black,
    inverseSurface: LIGHT_THEME.surface,
    inverseOnSurface: COLORS.gray?.[900],
    inversePrimary: COLORS.primaryLight,
    elevation: {
      level0: 'transparent',
      level1: DARK_THEME.surface,
      level2: DARK_THEME.surface,
      level3: DARK_THEME.surface,
      level4: DARK_THEME.surface,
      level5: DARK_THEME.surface,
    },
  },
  typography: lightTheme.typography,
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  shadows: lightTheme.shadows,
};

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: typeof lightTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  const value: ThemeContextType = {
    isDarkMode,
    toggleTheme,
    theme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 
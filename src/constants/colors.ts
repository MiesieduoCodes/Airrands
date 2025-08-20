export const COLORS = {
  primary: '#E89C31',
  primaryLight: '#8ecae6',
  primaryDark: '#023047',
  secondary: '#219ebc',
  secondaryLight: '#ffd166',
  secondaryDark: '#DBA858',
  accent: '#DBA858',
  accentLight: '#ffb703',
  accentDark: '#e76f51',
  success: '#2a9d8f',
  warning: '#FFB03B',
  error: '#e76f51',
  info: '#219ebc',
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  }
};

export const DARK_THEME = {
  background: COLORS.gray?.[900],
  surface: COLORS.gray?.[800],
  text: COLORS.gray?.[50],
  border: COLORS.gray?.[700],
};

export const LIGHT_THEME = {
  background: COLORS.white,
  surface: COLORS.gray?.[50],
  text: COLORS.gray?.[900],
  border: COLORS.gray?.[200],
}; 
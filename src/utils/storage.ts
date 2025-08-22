import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  REMEMBER_ME: '@airrands_remember_me',
  USER_CREDENTIALS: '@airrands_user_credentials',
  ONBOARDING_VIEWED: '@viewedOnboarding',
  USER_PREFERENCES: '@airrands_user_preferences',
} as const;

// Remember Me functionality
export const setRememberMe = async (remember: boolean): Promise<void> => {
  try {
    if (AsyncStorage && AsyncStorage.setItem) {
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify(remember));
    } else {
      console.warn('AsyncStorage not available, using fallback');
      // Fallback to localStorage for web or in-memory for other platforms
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify(remember));
      }
    }
  } catch (error) {
    console.error('Error saving remember me preference:', error);
  }
};

export const getRememberMe = async (): Promise<boolean> => {
  try {
    if (AsyncStorage && AsyncStorage.getItem) {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
      return value ? JSON.parse(value) : true; // Default to true for better UX
    } else {
      // Fallback to localStorage for web
      if (typeof localStorage !== 'undefined') {
        const value = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
        return value ? JSON.parse(value) : true;
      }
      return true;
    }
  } catch (error) {
    console.error('Error getting remember me preference:', error);
    return true;
  }
};

// User credentials (only email for security)
export const saveUserEmail = async (email: string): Promise<void> => {
  try {
    if (AsyncStorage && AsyncStorage.setItem) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_CREDENTIALS, JSON.stringify({ email }));
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.USER_CREDENTIALS, JSON.stringify({ email }));
    }
  } catch (error) {
    console.error('Error saving user email:', error);
  }
};

export const getUserEmail = async (): Promise<string | null> => {
  try {
    if (AsyncStorage && AsyncStorage.getItem) {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.USER_CREDENTIALS);
      if (value) {
        const credentials = JSON.parse(value);
        return credentials.email || null;
      }
    } else if (typeof localStorage !== 'undefined') {
      const value = localStorage.getItem(STORAGE_KEYS.USER_CREDENTIALS);
      if (value) {
        const credentials = JSON.parse(value);
        return credentials.email || null;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
};

export const clearUserCredentials = async (): Promise<void> => {
  try {
    if (AsyncStorage && AsyncStorage.removeItem) {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_CREDENTIALS);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.USER_CREDENTIALS);
    }
  } catch (error) {
    console.error('Error clearing user credentials:', error);
  }
};

// Onboarding
export const setOnboardingViewed = async (): Promise<void> => {
  try {
    if (AsyncStorage && AsyncStorage.setItem) {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_VIEWED, 'true');
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_VIEWED, 'true');
    }
  } catch (error) {
    console.error('Error saving onboarding status:', error);
  }
};

export const hasViewedOnboarding = async (): Promise<boolean> => {
  try {
    if (AsyncStorage && AsyncStorage.getItem) {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_VIEWED);
      return value === 'true';
    } else if (typeof localStorage !== 'undefined') {
      const value = localStorage.getItem(STORAGE_KEYS.ONBOARDING_VIEWED);
      return value === 'true';
    }
    return false;
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    return false;
  }
};

// User preferences
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
}

export const saveUserPreferences = async (preferences: Partial<UserPreferences>): Promise<void> => {
  try {
    const existing = await getUserPreferences();
    const updated = { ...existing, ...preferences };
    if (AsyncStorage && AsyncStorage.setItem) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
    }
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
};

export const getUserPreferences = async (): Promise<UserPreferences> => {
  try {
    if (AsyncStorage && AsyncStorage.getItem) {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (value) {
        return JSON.parse(value);
      }
    } else if (typeof localStorage !== 'undefined') {
      const value = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (value) {
        return JSON.parse(value);
      }
    }
    return {
      theme: 'system',
      notifications: true,
      language: 'en',
    };
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return {
      theme: 'system',
      notifications: true,
      language: 'en',
    };
  }
};

// Clear all app data (for logout)
export const clearAllAppData = async (): Promise<void> => {
  try {
    if (AsyncStorage && AsyncStorage.multiRemove) {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.REMEMBER_ME,
        STORAGE_KEYS.USER_CREDENTIALS,
        STORAGE_KEYS.USER_PREFERENCES,
      ]);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
      localStorage.removeItem(STORAGE_KEYS.USER_CREDENTIALS);
      localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES);
    }
  } catch (error) {
    console.error('Error clearing app data:', error);
  }
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage keys
const STORAGE_KEYS = {
  REMEMBER_ME: '@airrands_remember_me',
  USER_CREDENTIALS: '@airrands_user_credentials',
  ONBOARDING_VIEWED: '@viewedOnboarding',
  USER_PREFERENCES: '@airrands_user_preferences',
} as const;

// Safe AsyncStorage wrapper with proper error handling
const safeAsyncStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage directly on web
        localStorage.setItem(key, value);
      } else {
        // Use AsyncStorage on native platforms
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`Storage setItem error for key ${key}:`, error);
      // Additional fallback for web
      if (Platform.OS === 'web') {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
          } else {
            console.warn('localStorage not available, storage operation skipped');
          }
        } catch (fallbackError) {
          console.error('localStorage fallback failed:', fallbackError);
          // Don't throw on web, just log the error
        }
      } else {
        // On native platforms, this is more critical
        throw new Error(`AsyncStorage setItem failed: ${error}`);
      }
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage directly on web
        return localStorage.getItem(key);
      } else {
        // Use AsyncStorage on native platforms
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error(`Storage getItem error for key ${key}:`, error);
      // Additional fallback for web
      if (Platform.OS === 'web') {
        try {
          if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(key);
          }
        } catch (fallbackError) {
          console.error('localStorage fallback failed:', fallbackError);
        }
      }
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage directly on web
        localStorage.removeItem(key);
      } else {
        // Use AsyncStorage on native platforms
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Storage removeItem error for key ${key}:`, error);
      // Additional fallback for web
      if (Platform.OS === 'web') {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(key);
          } else {
            console.warn('localStorage not available, remove operation skipped');
          }
        } catch (fallbackError) {
          console.error('localStorage fallback failed:', fallbackError);
          // Don't throw on web, just log the error
        }
      } else {
        // On native platforms, this is more critical
        throw new Error(`AsyncStorage removeItem failed: ${error}`);
      }
    }
  },

  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage directly on web
        localStorage.clear();
      } else {
        // Use AsyncStorage on native platforms
        await AsyncStorage.clear();
      }
    } catch (error) {
      console.error('AsyncStorage clear error:', error);
      // Additional fallback for web
      if (Platform.OS === 'web') {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.clear();
          } else {
            console.warn('localStorage not available, clear operation skipped');
          }
        } catch (fallbackError) {
          console.error('localStorage fallback failed:', fallbackError);
          // Don't throw on web, just log the error
        }
      } else {
        // On native platforms, this is more critical
        throw new Error(`AsyncStorage clear failed: ${error}`);
      }
    }
  }
};

// Remember Me functionality
export const setRememberMe = async (remember: boolean): Promise<void> => {
  try {
    await safeAsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify(remember));
  } catch (error) {
    console.error('Error setting remember me preference:', error);
    throw error;
  }
};

export const getRememberMe = async (): Promise<boolean> => {
  try {
    const value = await safeAsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
    return value ? JSON.parse(value) : true; // Default to true for better UX
  } catch (error) {
    console.error('Error getting remember me preference:', error);
    return true;
  }
};

// User credentials (only email for security)
export const saveUserEmail = async (email: string): Promise<void> => {
  try {
    await safeAsyncStorage.setItem(STORAGE_KEYS.USER_CREDENTIALS, JSON.stringify({ email }));
  } catch (error) {
    console.error('Error saving user email:', error);
    throw error;
  }
};

export const getUserEmail = async (): Promise<string | null> => {
  try {
    const value = await safeAsyncStorage.getItem(STORAGE_KEYS.USER_CREDENTIALS);
    if (value) {
      const credentials = JSON.parse(value);
      return credentials.email || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
};

export const clearUserCredentials = async (): Promise<void> => {
  try {
    await safeAsyncStorage.removeItem(STORAGE_KEYS.USER_CREDENTIALS);
  } catch (error) {
    console.error('Error clearing user credentials:', error);
    throw error;
  }
};

// Onboarding
export const setOnboardingViewed = async (): Promise<void> => {
  try {
    await safeAsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_VIEWED, 'true');
  } catch (error) {
    console.error('Error setting onboarding viewed:', error);
    throw error;
  }
};

export const hasViewedOnboarding = async (): Promise<boolean> => {
  try {
    const value = await safeAsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_VIEWED);
    return value === 'true';
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
    await safeAsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
};

export const getUserPreferences = async (): Promise<UserPreferences> => {
  try {
    const value = await safeAsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    if (value) {
      return JSON.parse(value);
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
    await safeAsyncStorage.clear();
  } catch (error) {
    console.error('Error clearing all app data:', error);
    throw error;
  }
};

// Debug function to test storage operations
export const testStorage = async (): Promise<void> => {
  console.log('Testing storage operations...');
  console.log('Platform:', Platform.OS);
  
  try {
    // Test setItem
    await safeAsyncStorage.setItem('test_key', 'test_value');
    console.log('✓ setItem works');
    
    // Test getItem
    const value = await safeAsyncStorage.getItem('test_key');
    console.log('✓ getItem works, value:', value);
    
    // Test removeItem
    await safeAsyncStorage.removeItem('test_key');
    console.log('✓ removeItem works');
    
    // Verify removal
    const removedValue = await safeAsyncStorage.getItem('test_key');
    console.log('✓ Verification works, removed value:', removedValue);
    
    console.log('All storage operations working correctly!');
  } catch (error) {
    console.error('Storage test failed:', error);
  }
};

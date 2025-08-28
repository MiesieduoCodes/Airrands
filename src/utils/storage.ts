import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage keys
const STORAGE_KEYS = {
  REMEMBER_ME: '@airrands_remember_me',
  USER_CREDENTIALS: '@airrands_user_credentials',
  ONBOARDING_VIEWED: '@viewedOnboarding',
  USER_PREFERENCES: '@airrands_user_preferences',
} as const;

// Check if we are on web and localStorage exists
const hasWebStorage = (): boolean =>
  Platform.OS === 'web' && typeof window !== 'undefined' && !!window.localStorage;

// Check if AsyncStorage is available
const hasAsyncStorage = (): boolean => {
  try {
    return !!AsyncStorage && 
           typeof AsyncStorage.setItem === 'function' &&
           typeof AsyncStorage.getItem === 'function' &&
           typeof AsyncStorage.removeItem === 'function';
  } catch {
    return false;
  }
};

// In-memory fallback storage
const memoryStorage: { [key: string]: string } = {};

// Safe storage wrapper
const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (hasWebStorage()) {
        return window.localStorage.getItem(key);
      } else if (hasAsyncStorage()) {
        return await AsyncStorage.getItem(key);
      } else {
        return memoryStorage[key] || null;
      }
    } catch {
      return memoryStorage[key] || null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (hasWebStorage()) {
        window.localStorage.setItem(key, value);
      } else if (hasAsyncStorage()) {
        await AsyncStorage.setItem(key, value);
      } else {
        memoryStorage[key] = value;
      }
    } catch {
      memoryStorage[key] = value;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (hasWebStorage()) {
        window.localStorage.removeItem(key);
      } else if (hasAsyncStorage()) {
        await AsyncStorage.removeItem(key);
      } else {
        delete memoryStorage[key];
      }
    } catch {
      delete memoryStorage[key];
    }
  },

  async clear(): Promise<void> {
    try {
      if (hasWebStorage()) {
        window.localStorage.clear();
      } else if (hasAsyncStorage()) {
        await AsyncStorage.clear();
      } else {
        Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
      }
    } catch {
      Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
    }
  },
};

// Remember Me functions
export const setRememberMe = async (remember: boolean): Promise<void> => {
  try {
    await safeStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify(remember));
  } catch (error) {
    console.error('Error setting remember me:', error);
  }
};

export const getRememberMe = async (): Promise<boolean> => {
  try {
    const value = await safeStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
    return value ? JSON.parse(value) : true;
  } catch {
    return true;
  }
};

// User Credentials functions
export const saveUserEmail = async (email: string): Promise<void> => {
  try {
    await safeStorage.setItem(STORAGE_KEYS.USER_CREDENTIALS, JSON.stringify({ email }));
  } catch (error) {
    console.error('Error saving user email:', error);
  }
};

export const getUserEmail = async (): Promise<string | null> => {
  try {
    const value = await safeStorage.getItem(STORAGE_KEYS.USER_CREDENTIALS);
    if (value) {
      const parsed = JSON.parse(value);
      return parsed.email || null;
    }
    return null;
  } catch {
    return null;
  }
};

export const clearUserCredentials = async (): Promise<void> => {
  try {
    await safeStorage.removeItem(STORAGE_KEYS.USER_CREDENTIALS);
  } catch (error) {
    console.error('Error clearing user credentials:', error);
  }
};

// Onboarding functions
export const setOnboardingViewed = async (): Promise<void> => {
  try {
    await safeStorage.setItem(STORAGE_KEYS.ONBOARDING_VIEWED, 'true');
  } catch (error) {
    console.error('Error setting onboarding viewed:', error);
  }
};

export const hasViewedOnboarding = async (): Promise<boolean> => {
  try {
    const value = await safeStorage.getItem(STORAGE_KEYS.ONBOARDING_VIEWED);
    return value === 'true';
  } catch {
    return false;
  }
};

// User Preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
}

export const saveUserPreferences = async (prefs: Partial<UserPreferences>): Promise<void> => {
  try {
    const current = await getUserPreferences();
    const updated = { ...current, ...prefs };
    await safeStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
};

export const getUserPreferences = async (): Promise<UserPreferences> => {
  try {
    const value = await safeStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    if (value) {
      return JSON.parse(value);
    }
    return { theme: 'system', notifications: true, language: 'en' };
  } catch {
    return { theme: 'system', notifications: true, language: 'en' };
  }
};

// Clear all app data
export const clearAllAppData = async (): Promise<void> => {
  try {
    await safeStorage.clear();
  } catch (error) {
    console.error('Error clearing all app data:', error);
  }
};
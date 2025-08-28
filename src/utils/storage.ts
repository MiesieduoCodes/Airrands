import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
    // Temporary debug logging
    console.log('[safeStorage] AsyncStorage object:', AsyncStorage);
    console.log('[safeStorage] AsyncStorage.setItem type:', typeof AsyncStorage?.setItem);
    
    return !!AsyncStorage && 
           typeof AsyncStorage.setItem === 'function' &&
           typeof AsyncStorage.getItem === 'function' &&
           typeof AsyncStorage.removeItem === 'function';
  } catch (error) {
    console.error('AsyncStorage not available:', error);
    return false;
  }
};

// Initialize storage availability check
let storageAvailable = false;
try {
  storageAvailable = hasWebStorage() || hasAsyncStorage();
  console.log('[safeStorage] Storage available:', storageAvailable, 'Platform:', Platform.OS);
  
  // Emergency fallback: if storage is not available, force memory mode
  if (!storageAvailable) {
    console.warn('[safeStorage] No persistent storage available, forcing memory-only mode');
  }
} catch (error) {
  console.error('[safeStorage] Storage initialization error:', error);
  storageAvailable = false;
  console.warn('[safeStorage] Forcing memory-only mode due to initialization error');
}

// In-memory fallback storage for when no persistent storage is available
const memoryStorage: { [key: string]: string } = {};



const safeStorage = {
  // async setItem(key: string, value: string): Promise<void> {
  //   try {
  //     if (hasWebStorage()) {
  //       window.localStorage.setItem(key, value);
  //     } else {
  //       await AsyncStorage.setItem(key, value);
  //     }
  //   } catch (error) {
  //     console.error(`Storage setItem error for "${key}":`, error);
  //   }
  // },

  async getItem(key: string): Promise<string | null> {
    try {
      if (hasWebStorage()) {
        return window.localStorage.getItem(key);
      } else if (hasAsyncStorage()) {
        return await AsyncStorage.getItem(key);
      } else {
        console.warn('[safeStorage] No persistent storage available, checking memory for', key);
        return memoryStorage[key] || null;
      }
    } catch (error) {
      console.error(`Storage getItem error for "${key}":`, error);
      // Fallback to memory storage
      try {
        return memoryStorage[key] || null;
      } catch (fallbackError) {
        console.error('[safeStorage] Memory storage fallback failed:', fallbackError);
        return null;
      }
    }
  },
  async removeItem(key: string): Promise<void> {
    console.log('[safeStorage] removeItem called with', key, 'on', Platform.OS);
    try {
      if (hasWebStorage()) {
        console.log('[safeStorage] using window.localStorage');
        window.localStorage.removeItem(key);
      } else if (hasAsyncStorage()) {
        console.log('[safeStorage] using AsyncStorage');
        await AsyncStorage.removeItem(key);
      } else {
        console.warn('[safeStorage] No persistent storage available, removing from memory for', key);
        delete memoryStorage[key];
      }
    } catch (error) {
      console.error('[safeStorage] removeItem error:', error);
      // Fallback to memory storage
      try {
        delete memoryStorage[key];
        console.log('[safeStorage] Fallback to memory storage removal for', key);
      } catch (fallbackError) {
        console.error('[safeStorage] Memory storage removal failed:', fallbackError);
      }
    }
  },

  // async removeItem(key: string): Promise<void> {
  //   try {
  //     if (hasWebStorage()) {
  //       window.localStorage.removeItem(key);
  //     } else {
  //       await AsyncStorage.removeItem(key);
  //     }
  //   } catch (error) {
  //     console.error(`Storage removeItem error for "${key}":`, error);
  //   }
  // },

  async clear(): Promise<void> {
    try {
      if (hasWebStorage()) {
        window.localStorage.clear();
      } else if (hasAsyncStorage()) {
        await AsyncStorage.clear();
      } else {
        console.warn('[safeStorage] No storage available, skipping clear');
      }
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    console.log('[safeStorage] setItem called with', key, 'on', Platform.OS);
    try {
      if (hasWebStorage()) {
        console.log('[safeStorage] using window.localStorage');
        window.localStorage.setItem(key, value);
      } else if (hasAsyncStorage()) {
        console.log('[safeStorage] using AsyncStorage');
        await AsyncStorage.setItem(key, value);
      } else {
        console.warn('[safeStorage] No persistent storage available, using memory fallback for', key);
        memoryStorage[key] = value;
      }
    } catch (error) {
      console.error('[safeStorage] setItem error:', error);
      // Fallback to memory storage
      try {
        memoryStorage[key] = value;
        console.log('[safeStorage] Fallback to memory storage for', key);
      } catch (fallbackError) {
        console.error('[safeStorage] Even memory storage failed:', fallbackError);
      }
    }
  },
};

// --- Remember Me ---
export const setRememberMe = async (remember: boolean) => {
  try {
    await safeStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify(remember));
  } catch (error) {
    console.error('Error setting remember me:', error);
  }
};

export const getRememberMe = async (): Promise<boolean> => {
  const value = await safeStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
  return value ? JSON.parse(value) : true;
};

// --- User Credentials ---
export const saveUserEmail = async (email: string) => {
  try {
    await safeStorage.setItem(STORAGE_KEYS.USER_CREDENTIALS, JSON.stringify({ email }));
  } catch (error) {
    console.error('Error saving user email:', error);
  }
};

export const getUserEmail = async (): Promise<string | null> => {
  const value = await safeStorage.getItem(STORAGE_KEYS.USER_CREDENTIALS);
  if (value) {
    try {
      const parsed = JSON.parse(value);
      return parsed.email || null;
    } catch {
      return null;
    }
  }
  return null;
};

export const clearUserCredentials = async () => {
  try {
    await safeStorage.removeItem(STORAGE_KEYS.USER_CREDENTIALS);
  } catch (error) {
    console.error('Error clearing user credentials:', error);
    // Don't throw the error, just log it
  }
};

// --- Onboarding ---
export const setOnboardingViewed = async () => {
  try {
    await safeStorage.setItem(STORAGE_KEYS.ONBOARDING_VIEWED, 'true');
  } catch (error) {
    console.error('Error setting onboarding viewed:', error);
  }
};

export const hasViewedOnboarding = async (): Promise<boolean> => {
  const value = await safeStorage.getItem(STORAGE_KEYS.ONBOARDING_VIEWED);
  return value === 'true';
};

// --- User Preferences ---
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
}

export const saveUserPreferences = async (prefs: Partial<UserPreferences>) => {
  try {
    const current = await getUserPreferences();
    const updated = { ...current, ...prefs };
    await safeStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
};

export const getUserPreferences = async (): Promise<UserPreferences> => {
  const value = await safeStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
  if (value) {
    try {
      return JSON.parse(value);
    } catch {
      return { theme: 'system', notifications: true, language: 'en' };
    }
  }
  return { theme: 'system', notifications: true, language: 'en' };
};

// --- Clear all app data ---
export const clearAllAppData = async () => {
  try {
    await safeStorage.clear();
  } catch (error) {
    console.error('Error clearing all app data:', error);
  }
};

// Test storage functionality on initialization
const testStorage = async () => {
  try {
    const testKey = '@airrands_storage_test';
    const testValue = 'test_value';
    
    await safeStorage.setItem(testKey, testValue);
    const retrieved = await safeStorage.getItem(testKey);
    
    if (retrieved === testValue) {
      console.log('[safeStorage] Storage test passed');
      await safeStorage.removeItem(testKey);
    } else {
      console.warn('[safeStorage] Storage test failed - retrieved:', retrieved);
    }
  } catch (error) {
    console.error('[safeStorage] Storage test error:', error);
  }
};

// Run storage test
testStorage();

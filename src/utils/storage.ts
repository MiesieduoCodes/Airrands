
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// --- Storage keys ---
const STORAGE_KEYS = {
  REMEMBER_ME: '@airrands_remember_me',
  USER_CREDENTIALS: '@airrands_user_credentials',
  ONBOARDING_VIEWED: '@viewedOnboarding',
  USER_PREFERENCES: '@airrands_user_preferences',
} as const;

// --- Safe wrapper ---
const safeStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      } else {
        // Ensure AsyncStorage is available before using it
        if (!AsyncStorage) {
          throw new Error('AsyncStorage is not available');
        }
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`Failed to setItem for key "${key}":`, error);
      throw error; // Re-throw to handle upstream
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      } else {
        // Ensure AsyncStorage is available before using it
        if (!AsyncStorage) {
          console.warn('AsyncStorage is not available');
          return null;
        }
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error(`Failed to getItem for key "${key}":`, error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      } else {
        // Ensure AsyncStorage is available before using it
        if (!AsyncStorage) {
          throw new Error('AsyncStorage is not available');
        }
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Failed to removeItem for key "${key}":`, error);
      throw error; // Re-throw to handle upstream
    }
  },

  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      } else {
        // Ensure AsyncStorage is available before using it
        if (!AsyncStorage) {
          throw new Error('AsyncStorage is not available');
        }
        await AsyncStorage.clear();
      }
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error; // Re-throw to handle upstream
    }
  },
  
  async multiSet(keyValuePairs: Array<[string, string]>): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        keyValuePairs.forEach(([key, value]) => {
          window.localStorage.setItem(key, value);
        });
      } else {
        // Ensure AsyncStorage is available before using it
        if (!AsyncStorage) {
          throw new Error('AsyncStorage is not available');
        }
        await AsyncStorage.multiSet(keyValuePairs);
      }
    } catch (error) {
      console.error('Failed to multiSet:', error);
      throw error; // Re-throw to handle upstream
    }
  },

  async multiGet(keys: string[]): Promise<(string | null)[]> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return keys.map(key => window.localStorage.getItem(key));
      } else {
        // Ensure AsyncStorage is available before using it
        if (!AsyncStorage) {
          console.warn('AsyncStorage is not available');
          return keys.map(() => null);
        }
        const results = await AsyncStorage.multiGet(keys);
        return results.map(([key, value]) => value);
      }
    } catch (error) {
      console.error('Failed to multiGet:', error);
      return keys.map(() => null);
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        keys.forEach(key => {
          window.localStorage.removeItem(key);
        });
      } else {
        // Ensure AsyncStorage is available before using it
        if (!AsyncStorage) {
          throw new Error('AsyncStorage is not available');
        }
        await AsyncStorage.multiRemove(keys);
      }
    } catch (error) {
      console.error('Failed to multiRemove:', error);
      throw error; // Re-throw to handle upstream
    }
  },
};

// --- Remember Me ---
export const setRememberMe = async (remember: boolean) =>
  safeStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify(remember));

export const getRememberMe = async (): Promise<boolean> => {
  const value = await safeStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
  return value ? JSON.parse(value) : true;
};

// --- User Credentials ---
export const saveUserEmail = async (email: string) =>
  safeStorage.setItem(STORAGE_KEYS.USER_CREDENTIALS, JSON.stringify({ email }));

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

export const clearUserCredentials = async () =>
  safeStorage.removeItem(STORAGE_KEYS.USER_CREDENTIALS);

// --- Onboarding ---
export const setOnboardingViewed = async () =>
  safeStorage.setItem(STORAGE_KEYS.ONBOARDING_VIEWED, 'true');

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
  const current = await getUserPreferences();
  const updated = { ...current, ...prefs };
  await safeStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
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
export const clearAllAppData = async () => safeStorage.clear();

// --- Debug / Test ---
export const testStorage = async () => {
  console.log('--- Testing storage ---', Platform.OS);

  await safeStorage.setItem('test_key', 'test_value');
  console.log('✓ setItem works');

  const value = await safeStorage.getItem('test_key');
  console.log('✓ getItem works:', value);

  await safeStorage.removeItem('test_key');
  console.log('✓ removeItem works');

  const removedValue = await safeStorage.getItem('test_key');
  console.log('✓ Verification works, removed value:', removedValue);

  await safeStorage.clear();
  console.log('✓ clear works');
  console.log('--- Storage test completed ---');
};

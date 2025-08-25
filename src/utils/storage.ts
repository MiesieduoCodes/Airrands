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

const safeStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (hasWebStorage()) {
        window.localStorage.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`Storage setItem error for "${key}":`, error);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (hasWebStorage()) {
        return window.localStorage.getItem(key);
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error(`Storage getItem error for "${key}":`, error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (hasWebStorage()) {
        window.localStorage.removeItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Storage removeItem error for "${key}":`, error);
    }
  },

  async clear(): Promise<void> {
    try {
      if (hasWebStorage()) {
        window.localStorage.clear();
      } else {
        await AsyncStorage.clear();
      }
    } catch (error) {
      console.error('Storage clear error:', error);
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

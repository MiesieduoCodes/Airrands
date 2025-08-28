import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../config/firebase';
import firebase from 'firebase/compat/app';
import { UserRole } from '../navigation/types';
import {
  setRememberMe,
  getRememberMe,
  saveUserEmail,
  getUserEmail,
  clearUserCredentials,
} from '../utils/storage';

// User type
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

// Context type
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, role: 'buyer' | 'seller' | 'runner') => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  resendVerificationEmail: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  deleteUserAccount: () => Promise<void>;
  checkEmailAvailability: (email: string) => Promise<boolean>;
  reloadUser: () => Promise<void>;
  checkAndReloadEmailVerification: () => Promise<boolean>;
  getStoredEmail: () => Promise<string | null>;
  getRememberMePreference: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Ensure user profile exists in Firestore
const ensureUserProfile = async (firebaseUser: firebase.User): Promise<string> => {
  try {
    const userRef = db.collection('users').doc(firebaseUser.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        role: 'buyer',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        emailVerified: firebaseUser.emailVerified,
        phoneNumber: firebaseUser.phoneNumber || '',
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      await userRef.set(userData);
      return 'buyer';
    } else {
      const userData = userDoc.data();
      return userData?.role || 'buyer';
    }
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    return 'buyer';
  }
};

// AuthProvider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const rememberMe = await getRememberMe();
        await auth.setPersistence(
          rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
        );
      } catch (error) {
        console.error('Failed to initialize persistence:', error);
        try {
          await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } catch (fallbackError) {
          console.error('Failed to set fallback persistence:', fallbackError);
        }
      }
    };

    initializeAuth();

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userData: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
          };
          setUser(userData);

          const userRole = await ensureUserProfile(firebaseUser);
          setRole(userRole as UserRole);
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string, rememberMe: boolean = true) => {
    setLoading(true);
    try {
      // Handle storage operations with error handling
      try {
        await setRememberMe(rememberMe);
        if (rememberMe) {
          await saveUserEmail(email);
        } else {
          await clearUserCredentials();
        }
      } catch (storageError) {
        console.error('Storage error during login (non-critical):', storageError);
      }

      await auth.setPersistence(
        rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
      );

      const cred = await auth.signInWithEmailAndPassword(email, password);
      if (cred.user) {
        await cred.user.reload();

        const userData: User = {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName,
          photoURL: cred.user.photoURL,
          emailVerified: cred.user.emailVerified,
        };
        setUser(userData);

        const userRole = await ensureUserProfile(cred.user);
        setRole(userRole as UserRole);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (email: string, password: string, role: 'buyer' | 'seller' | 'runner') => {
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      if (!cred.user) {
        throw new Error('User creation failed');
      }

      const userDataToSave = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName,
        photoURL: cred.user.photoURL,
        emailVerified: cred.user.emailVerified,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        role,
        verificationStatus: 'pending',
      };

      await db.collection('users').doc(cred.user.uid).set(userDataToSave);

      const roleCollection = role === 'buyer' ? 'buyers' : role === 'seller' ? 'sellers' : 'runners';
      await db.collection(roleCollection).doc(cred.user.uid).set(userDataToSave);

      if (role === 'seller' || role === 'runner') {
        const notificationData = {
          title: 'NIN Verification Required',
          message: `Please verify your NIN to start ${role === 'seller' ? 'selling' : 'running errands'}. Tap to verify now.`,
          type: 'verification',
          isRead: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          action: 'navigate_to_verification',
          userRole: role,
        };
        await db.collection('users').doc(cred.user.uid).collection('notifications').add(notificationData);
      }

      try {
        await cred.user.sendEmailVerification();
      } catch (emailError) {
        console.error('Failed to send verification email after registration:', emailError);
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Clear user credentials (don't fail if this fails)
      try {
        await clearUserCredentials();
      } catch (storageError) {
        console.error('Storage error during logout (non-critical):', storageError);
      }
      
      // Sign out from Firebase
      await auth.signOut();
      setUser(null);
      setRole(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw the error to prevent app crashes
      // Still try to clear local state
      setUser(null);
      setRole(null);
    }
  }, []);

  // Email verification functions
  const sendVerificationEmail = useCallback(async () => {
    try {
      if (!auth.currentUser || auth.currentUser.emailVerified) return;
      
      const actionCodeSettings = { 
        url: 'https://airrands.com/verify-email', 
        handleCodeInApp: false 
      };
      
      try {
        await auth.currentUser.sendEmailVerification(actionCodeSettings);
      } catch {
        await auth.currentUser.sendEmailVerification();
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw error;
    }
  }, []);

  const resendVerificationEmail = useCallback(() => sendVerificationEmail(), [sendVerificationEmail]);

  // Delete account function
  const deleteUserAccount = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user signed in');
      }

      const uid = currentUser.uid;
      const batch = db.batch();

      batch.delete(db.collection('users').doc(uid));
      batch.delete(db.collection('buyers').doc(uid));
      batch.delete(db.collection('sellers').doc(uid));
      batch.delete(db.collection('runners').doc(uid));

      const notificationsRef = db.collection('users').doc(uid).collection('notifications');
      const snapshot = await notificationsRef.get();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));

      await batch.commit();
      await currentUser.delete();
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw error;
    }
  }, []);

  // Helper functions
  const checkEmailAvailability = useCallback(async (email: string): Promise<boolean> => {
    try {
      const methods = await auth.fetchSignInMethodsForEmail(email);
      return methods.length === 0;
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  }, []);

  const checkAndReloadEmailVerification = useCallback(async (): Promise<boolean> => {
    try {
      if (!auth.currentUser) return false;
      
      await auth.currentUser.reload();
      const userData: User = {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName,
        photoURL: auth.currentUser.photoURL,
        emailVerified: auth.currentUser.emailVerified,
      };
      setUser(userData);
      return userData.emailVerified;
    } catch (error) {
      console.error('Error checking email verification:', error);
      return false;
    }
  }, []);

  const reloadUser = useCallback(async () => {
    try {
      if (auth.currentUser) {
        const userData: User = {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName,
          photoURL: auth.currentUser.photoURL,
          emailVerified: auth.currentUser.emailVerified,
        };
        setUser(userData);
        const userRole = await ensureUserProfile(auth.currentUser);
        setRole(userRole as UserRole);
      }
    } catch (error) {
      console.error('Error reloading user:', error);
    }
  }, []);

  const getStoredEmail = useCallback(async (): Promise<string | null> => {
    try {
      return await getUserEmail();
    } catch (error) {
      console.error('Error getting stored email:', error);
      return null;
    }
  }, []);

  const getRememberMePreference = useCallback(async (): Promise<boolean> => {
    try {
      return await getRememberMe();
    } catch (error) {
      console.error('Error getting remember me preference:', error);
      return true;
    }
  }, []);

  // Context value
  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    role,
    login,
    register,
    logout,
    loading,
    resendVerificationEmail,
    sendVerificationEmail,
    deleteUserAccount,
    checkEmailAvailability,
    reloadUser,
    checkAndReloadEmailVerification,
    getStoredEmail,
    getRememberMePreference,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
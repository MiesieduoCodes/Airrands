import React, { createContext, useContext, useState, useEffect } from 'react';
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

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const rememberMe = await getRememberMe();
        try {
          await auth.setPersistence(
            rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
          );
        } catch (err) {
          console.error('Firebase persistence initialization error:', err);
        }
      } catch (storageErr) {
        console.error('Storage error - Failed to get remember me preference:', storageErr);
        // Use default persistence if storage fails
        try {
          await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } catch (defaultErr) {
          console.error('Failed to set default persistence:', defaultErr);
        }
      }
    };

    initializeAuth();

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
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
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    setLoading(true);
    try {
      // Handle storage operations with better error handling
      try {
        await setRememberMe(rememberMe);
      } catch (storageErr) {
        console.error('Storage error - Failed to save remember me preference:', storageErr);
        // Continue with login even if storage fails
      }

      try {
        await auth.setPersistence(
          rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
        );
      } catch (persistenceErr) {
        console.error('Firebase persistence error:', persistenceErr);
        // Continue with login even if persistence setting fails
      }

      if (rememberMe) {
        try {
          await saveUserEmail(email);
        } catch (storageErr) {
          console.error('Storage error - Failed to save user email:', storageErr);
          // Continue with login even if email saving fails
        }
      } else {
        try {
          await clearUserCredentials();
        } catch (storageErr) {
          console.error('Storage error - Failed to clear user credentials:', storageErr);
          // Continue with login even if clearing fails
        }
      }

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
  };

  const register = async (email: string, password: string, role: 'buyer' | 'seller' | 'runner') => {
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      if (!cred.user) throw new Error('User creation failed');

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
  };

  const logout = async () => {
    try {
      try {
        await clearUserCredentials();
      } catch (storageErr) {
        console.error('Storage error - Failed to clear credentials on logout:', storageErr);
        // Continue with logout even if storage clearing fails
      }
      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    if (!auth.currentUser || auth.currentUser.emailVerified) return;

    try {
      const actionCodeSettings = { url: 'https://airrands.com/verify-email', handleCodeInApp: false };
      await auth.currentUser.sendEmailVerification(actionCodeSettings);
    } catch {
      await auth.currentUser?.sendEmailVerification();
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser || auth.currentUser.emailVerified) return;

    try {
      const actionCodeSettings = { url: 'https://airrands.com/verify-email', handleCodeInApp: false };
      await auth.currentUser.sendEmailVerification(actionCodeSettings);
    } catch {
      await auth.currentUser?.sendEmailVerification();
    }
  };

  const deleteUserAccount = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No user signed in');

      const uid = currentUser.uid;
      const batch = db.batch();

      const userRef = db.collection('users').doc(uid);
      batch.delete(userRef);
      batch.delete(db.collection('buyers').doc(uid));
      batch.delete(db.collection('sellers').doc(uid));
      batch.delete(db.collection('runners').doc(uid));

      const notificationsRef = db.collection('users').doc(uid).collection('notifications');
      const snapshot = await notificationsRef.get();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));

      await batch.commit();
      await currentUser.delete();
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw error;
    }
  };

  const checkEmailAvailability = async (email: string): Promise<boolean> => {
    try {
      const methods = await auth.fetchSignInMethodsForEmail(email);
      return methods.length === 0;
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  };

  const checkAndReloadEmailVerification = async (): Promise<boolean> => {
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
  };

  const reloadUser = async () => {
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
  };

  const getStoredEmail = async (): Promise<string | null> => await getUserEmail();
  const getRememberMePreference = async (): Promise<boolean> => await getRememberMe();

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import firebase from 'firebase/compat/app';
import { UserRole } from '../navigation/types';

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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: 'buyer' | 'seller' | 'runner') => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  resendVerificationEmail: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  deleteUserAccount: () => Promise<void>;
  checkEmailAvailability: (email: string) => Promise<boolean>;
  reloadUser: () => Promise<void>;
  checkAndReloadEmailVerification: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ensureUserProfile = async (firebaseUser: firebase.User): Promise<string> => {
  try {
    const userRef = db.collection('users').doc(firebaseUser.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Create new user profile with default role
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
      const userRole = userData?.role || 'buyer';
      return userRole;
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
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Convert Firebase User to our User interface
        const userData: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
        };
        
        setUser(userData);
        
        // Ensure user profile exists
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

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {  
      const cred = await auth.signInWithEmailAndPassword(email, password);
      if (cred.user) {
        // Login successful
        
        // Reload user to get latest verification status
        await cred.user.reload();
        
        // Update user state with fresh data
        const userData: User = {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName,
          photoURL: cred.user.photoURL,
          emailVerified: cred.user.emailVerified,
        };
        setUser(userData);
        
        // Ensure user profile exists and get role
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
      
      if (!cred.user) {
        throw new Error('User creation failed');
      }
      
      // Create user profile
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

      // Create role-specific profile
      const roleCollection = role === 'buyer' ? 'buyers' : role === 'seller' ? 'sellers' : 'runners';
      await db.collection(roleCollection).doc(cred.user.uid).set(userDataToSave);

      // Add NIN verification notification for sellers and runners
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
        
        await db.collection('users').doc(cred.user.uid)
          .collection('notifications').add(notificationData);
      }

      // Send verification email immediately after registration
      try {
        await cred.user.sendEmailVerification();
        } catch (emailError) {
        console.error('Failed to send verification email after registration:', emailError);
        // Don't throw error here as registration was successful
      }

      } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
      } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    try {
      if (!auth.currentUser) {
        throw new Error('No user is currently signed in');
      }

      if (auth.currentUser.emailVerified) {
        return;
      }

      // Try multiple approaches for better deliverability
      try {
        // First attempt: Use minimal settings
        const actionCodeSettings = {
          url: 'https://airrands.com/verify-email',
          handleCodeInApp: false
        };
        await auth.currentUser.sendEmailVerification(actionCodeSettings);
        } catch (customError) {
        // Fallback: Use default settings
        await auth.currentUser.sendEmailVerification();
        }
      
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  };

  const resendVerificationEmail = async () => {
    try {
      if (!auth.currentUser) {
        throw new Error('No user is currently signed in');
      }

      if (auth.currentUser.emailVerified) {
        return;
      }

      // Try multiple approaches for better deliverability
      try {
        // First attempt: Use minimal settings
        const actionCodeSettings = {
          url: 'https://airrands.com/verify-email',
          handleCodeInApp: false
        };
        await auth.currentUser.sendEmailVerification(actionCodeSettings);
        } catch (customError) {
        // Fallback: Use default settings
        await auth.currentUser.sendEmailVerification();
        }
      
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  };

  const deleteUserAccount = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user is currently signed in');
      }

      const uid = currentUser.uid;

      // Delete from all Firestore collections
      const batch = db.batch();
      
      // Delete from users collection
      const userRef = db.collection('users').doc(uid);
      batch.delete(userRef);

      // Delete from role-specific collections
      const buyersRef = db.collection('buyers').doc(uid);
      const sellersRef = db.collection('sellers').doc(uid);
      const runnersRef = db.collection('runners').doc(uid);
      
      batch.delete(buyersRef);
      batch.delete(sellersRef);
      batch.delete(runnersRef);

      // Delete user's notifications
      const notificationsRef = db.collection('users').doc(uid).collection('notifications');
      const notificationsSnapshot = await notificationsRef.get();
      notificationsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Execute batch delete
      await batch.commit();

      // Delete from Firebase Auth
      await currentUser.delete();
      
      } catch (error) {
      console.error('Error deleting user account:', error);
      throw error;
    }
  };

  const checkEmailAvailability = async (email: string): Promise<boolean> => {
    try {
      // Check if email exists in Firebase Auth
      const methods = await auth.fetchSignInMethodsForEmail(email);
      return methods.length === 0;
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  };

  const checkAndReloadEmailVerification = async (): Promise<boolean> => {
    try {
      if (!auth.currentUser) {
        return false;
      }

      // Reload user to get latest verification status
      await auth.currentUser.reload();
      
      // Update user state with fresh verification status
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 
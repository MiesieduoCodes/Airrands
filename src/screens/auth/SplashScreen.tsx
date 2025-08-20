import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { AuthNavigationProp } from '../../navigation/types';
import { useTheme } from '../../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { auth, db } from '../../config/firebase';
import * as Animatable from 'react-native-animatable';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  navigation: AuthNavigationProp;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { isAuthenticated, loading } = useAuth();

  const checkUserProfile = async (userId: string) => {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        return userData;
      } else {
        // Create default profile if none exists
        const defaultProfile = {
          name: 'User',
          email: auth.currentUser?.email || '',
          role: 'buyer',
          createdAt: new Date(),
          isOnline: false,
          lastSeen: new Date(),
        };
        await db.collection('users').doc(userId).set(defaultProfile);
        return defaultProfile;
      }
    } catch (error: any) {
      console.error('Error checking user profile:', error);
      // Continue with app flow even if profile loading fails
    }
  };

  const initializeApp = async () => {
    try {
      // Wait for auth state to be determined
      if (loading) {
        return;
      }

      const viewed = await AsyncStorage.getItem('@viewedOnboarding');
    
      if (!viewed) {
        navigation.replace('Onboarding');
      } else if (isAuthenticated && auth.currentUser) {
        // Load user profile from backend
        await checkUserProfile(auth.currentUser.uid);
        // Navigate to login since we're in auth flow
        navigation.replace('Register');
      } else {
        // Changed from Login to Register for better UX
        navigation.replace('Login');
      }
    } catch (error: any) {
      
      // Fallback navigation
      const viewed = await AsyncStorage.getItem('@viewedOnboarding');
      if (!viewed) {
        navigation.replace('Onboarding');
      } else {
        navigation.replace('Register');
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      await initializeApp();
    }, 4000); // Stay on splash screen for 4 seconds

    return () => clearTimeout(timer); // Clear timeout on unmount
  }, [navigation, loading]);

  return (
    <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Animatable.Image
            animation="fadeInDown"
            duration={1200}
            delay={200}
            source={require('../../../assets/App-icon.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Airrands delivery illustration"
          />
        </View>
        
        <View style={styles.textContainer}>
          <Animatable.Text
            animation="fadeInUp"
            duration={1000}
            delay={600}
            style={[styles.title, { color: '#E89C31' }]}
          >
            Airrands
          </Animatable.Text>
          <Animatable.Text
            animation="fadeInUp"
            duration={1000}
            delay={900}
            style={[styles.subtitle, { color: '#666666' }]}
          >
            Your One-Stop Delivery Solution
          </Animatable.Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: width * 0.6,
    height: width * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    gap: 18,
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 43,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.8,
    fontSize: 23,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

export default SplashScreen;
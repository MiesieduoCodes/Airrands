import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList, UserRole } from './types';
import AuthNavigator from './AuthNavigator';
import BuyerNavigator from './BuyerNavigator';
import SellerNavigator from './SellerNavigator';
import RunnerNavigator from './RunnerNavigator';
import ChatScreen from '../screens/shared/ChatScreen';
import HelpCenterScreen from '../screens/shared/HelpCenterScreen';
import FeedbackScreen from '../screens/shared/FeedbackScreen';
import TermsOfServiceScreen from '../screens/shared/TermsOfServiceScreen';
import PrivacyPolicyScreen from '../screens/shared/PrivacyPolicyScreen';
import DeactivateAccountScreen from '../screens/shared/DeactivateAccountScreen';
import VerificationScreen from '../screens/shared/VerificationScreen';
import OrderTrackingScreen from '../screens/buyer/OrderTrackingScreen';
import RunnerTrackingScreen from '../screens/runner/RunnerTrackingScreen';
import CheckoutScreen from '../screens/buyer/CheckoutScreen';
import SellerProfileScreen from '../screens/buyer/SellerProfileScreen';
import RunnerProfileScreen from '../screens/buyer/RunnerProfileScreen';
import StoresScreen from '../screens/buyer/StoresScreen';
import RunnersScreen from '../screens/buyer/RunnersScreen';
import ProductDetailScreen from '../screens/buyer/ProductDetailScreen';
import ReviewSubmissionScreen from '../screens/shared/ReviewSubmissionScreen';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { View, Text, ActivityIndicator } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { user, loading, role } = useAuth();
  const { theme } = useTheme();

  // Get user role and authentication status
  const isAuthenticated = !!user;
  const isEmailVerified = user?.emailVerified || false;
  
  // Require email verification
  const shouldShowAuth = !isAuthenticated || !isEmailVerified;

  // Show loading while auth state is being determined
  if (loading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{
          color: theme.colors.onBackground,
          marginTop: 16,
          fontSize: 16,
        }}>
          Logging in...
        </Text>
      </View>
    );
  }

  // Fallback UI if no valid screens would be rendered
  if (!shouldShowAuth && !['buyer', 'seller', 'runner'].includes(role ?? '')) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {shouldShowAuth ? (
        // Auth flow
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        // Main app flow - Only render one of these based on role
        // Move shared screens inside each conditional to ensure proper navigation
        <>
          {role === 'buyer' && (
            <>
              <Stack.Screen name="BuyerApp" component={BuyerNavigator} />
              
              {/* Shared screens for buyer */}
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ 
                  headerShown: true,
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="OrderTracking"
                component={OrderTrackingScreen}
                options={{ 
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Checkout"
                component={CheckoutScreen}
                options={{ 
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="SellerProfile"
                component={SellerProfileScreen}
                options={{ 
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="RunnerProfile"
                component={RunnerProfileScreen}
                options={{ 
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Stores"
                component={StoresScreen}
                options={{ 
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Runners"
                component={RunnersScreen}
                options={{ 
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{ 
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="ReviewSubmission"
                component={ReviewSubmissionScreen}
                options={{ 
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="HelpCenter"
                component={HelpCenterScreen}
                options={{ 
                  headerShown: true,
                  title: 'Help Center',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              
              {/* Temporary Notification Tester - Remove in production */}
              <Stack.Screen
                name="Feedback"
                component={FeedbackScreen}
                options={{ 
                  headerShown: true,
                  title: 'Feedback',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="TermsOfService"
                component={TermsOfServiceScreen}
                options={{ 
                  headerShown: true,
                  title: 'Terms of Service',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="PrivacyPolicy"
                component={PrivacyPolicyScreen}
                options={{ 
                  headerShown: true,
                  title: 'Privacy Policy',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="DeactivateAccount"
                component={DeactivateAccountScreen}
                options={{ 
                  headerShown: true,
                  title: 'Deactivate Account',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="Verification"
                component={VerificationScreen}
                options={{ 
                  headerShown: true,
                  title: 'Verification',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
            </>
          )}
          
          {role === 'seller' && (
            <>
              <Stack.Screen name="SellerApp" component={SellerNavigator} />
              
              {/* Shared screens for seller */}
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ 
                  headerShown: true,
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="ReviewSubmission"
                component={ReviewSubmissionScreen}
                options={{ 
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="HelpCenter"
                component={HelpCenterScreen}
                options={{ 
                  headerShown: true,
                  title: 'Help Center',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="Feedback"
                component={FeedbackScreen}
                options={{ 
                  headerShown: true,
                  title: 'Feedback',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="TermsOfService"
                component={TermsOfServiceScreen}
                options={{ 
                  headerShown: true,
                  title: 'Terms of Service',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="PrivacyPolicy"
                component={PrivacyPolicyScreen}
                options={{ 
                  headerShown: true,
                  title: 'Privacy Policy',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="DeactivateAccount"
                component={DeactivateAccountScreen}
                options={{ 
                  headerShown: true,
                  title: 'Deactivate Account',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="Verification"
                component={VerificationScreen}
                options={{ 
                  headerShown: true,
                  title: 'Verification',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
            </>
          )}
          
          {role === 'runner' && (
            <>
              <Stack.Screen name="RunnerApp" component={RunnerNavigator} />
              
              {/* Runner-specific screens */}
              <Stack.Screen
                name="RunnerTrackingScreen"
                component={RunnerTrackingScreen}
                options={{ 
                  headerShown: false,
                }}
              />
              
              {/* Shared screens for runner */}
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ 
                  headerShown: true,
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="ReviewSubmission"
                component={ReviewSubmissionScreen}
                options={{ 
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="HelpCenter"
                component={HelpCenterScreen}
                options={{ 
                  headerShown: true,
                  title: 'Help Center',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="Feedback"
                component={FeedbackScreen}
                options={{ 
                  headerShown: true,
                  title: 'Feedback',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="TermsOfService"
                component={TermsOfServiceScreen}
                options={{ 
                  headerShown: true,
                  title: 'Terms of Service',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="PrivacyPolicy"
                component={PrivacyPolicyScreen}
                options={{ 
                  headerShown: true,
                  title: 'Privacy Policy',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="DeactivateAccount"
                component={DeactivateAccountScreen}
                options={{ 
                  headerShown: true,
                  title: 'Deactivate Account',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
              <Stack.Screen
                name="Verification"
                component={VerificationScreen}
                options={{ 
                  headerShown: true,
                  title: 'Verification',
                  headerStyle: {
                    backgroundColor: theme.colors.surface,
                  },
                  headerTintColor: theme.colors.onSurface,
                  headerTitleStyle: {
                    color: theme.colors.onSurface,
                    fontWeight: '600',
                  },
                }}
              />
            </>
          )}
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
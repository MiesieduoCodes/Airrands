import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Checkbox } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import firebase from 'firebase/compat/app';

const DeactivateAccountScreen: React.FC = () => {
  const { theme } = useTheme();
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [password, setPassword] = useState('');
  const [confirmDeactivation, setConfirmDeactivation] = useState(false);
  const [loading, setLoading] = useState(false);
  const { logout, user } = useAuth();

  const deactivationReasons = [
    'I\'m not using the app anymore',
    'I found a better alternative',
    'I\'m concerned about privacy',
    'I had a bad experience',
    'The app doesn\'t meet my needs',
    'I\'m moving to a different location',
    'Other',
  ];

  const deleteUserData = async (userId: string) => {
    try {
      // Delete user data from Firestore
      const batch = db.batch();
      
      // Delete user document
      const userRef = db.collection('users').doc(userId);
      batch.delete(userRef);
      
      // Delete user's orders
      const ordersRef = db.collection('orders').where('userId', '==', userId);
      const ordersSnap = await ordersRef.get();
      ordersSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete user's errands
      const errandsRef = db.collection('errands').where('buyerId', '==', userId);
      const errandsSnap = await errandsRef.get();
      errandsSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete user's chats
      const chatsRef = db.collection('chats').where('participants', 'array-contains', userId);
      const chatsSnap = await chatsRef.get();
      chatsSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete user's notifications
      const notificationsRef = db.collection('users').doc(userId).collection('notifications');
      const notificationsSnap = await notificationsRef.get();
      notificationsSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete review triggers
      const reviewTriggersRef = db.collection('reviewTriggers').where('userId', '==', userId);
      const reviewTriggersSnap = await reviewTriggersRef.get();
      reviewTriggersSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Commit the batch
      await batch.commit();
      
      } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  };

  const handleDeactivate = async () => {
    if (!confirmDeactivation) {
      Alert.alert('Error', 'Please confirm that you understand the consequences of deactivating your account.');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password to confirm deactivation.');
      return;
    }

    if (!user?.email) {
      Alert.alert('Error', 'User email not found. Please try again.');
      return;
    }

    Alert.alert('Confirm Deactivation', 'Are you sure you want to permanently delete your account? This action cannot be undone.', [
        {
          text: 'Cancel', style: 'cancel' }, {
          text: 'Delete Account', style: 'destructive', onPress: async () => {
            setLoading(true);
            try {
              // Re-authenticate user before deletion
              if (!user.email) {
                Alert.alert('Error', 'User email not found. Please try again.');
                return;
              }
              
              const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                password
              );
              
              await firebase.auth().currentUser?.reauthenticateWithCredential(credential);
              
              // Delete user data from Firestore
              await deleteUserData(user.uid);
              
              // Delete user account from Firebase Auth
              await firebase.auth().currentUser?.delete();
              
              Alert.alert('Account Deleted', 'Your account has been permanently deleted. You will be logged out.', [
                  {
                    text: 'OK', onPress: () => logout(),
                  },
                ]
              );
            } catch (error: any) {
              console.error('Error deleting account:', error);
              
              let errorMessage = 'Failed to delete account. Please try again.';
              
              if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password. Please try again.';
              } else if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'For security reasons, please log out and log back in before deleting your account.';
              } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection and try again.';
              }
              
              Alert.alert('Error', errorMessage);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (<ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.error }]}>
          Deactivate Account
        </Text>
        <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          We're sorry to see you go. Please let us know why you're leaving.
        </Text>
      </View>

      <View style={[styles.warningSection, { 
        backgroundColor: theme.colors.errorContainer, borderLeftColor: theme.colors.error 
      }]}>
        <Text variant="titleMedium" style={[styles.warningTitle, { color: theme.colors.error }]}>
          ⚠️ Important Information
        </Text>
        <Text variant="bodyMedium" style={[styles.warningText, { color: theme.colors.onSurfaceVariant }]}>
          Deactivating your account will:{'\n'}
          • Remove your profile and personal data{'\n'}
          • Cancel any pending orders{'\n'}
          • Delete your chat history{'\n'}
          • Remove your saved addresses and preferences{'\n'}
          • This action cannot be undone
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Why are you leaving?
        </Text>
        <Text variant="bodySmall" style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
          Your feedback helps us improve our service
        </Text>
        
        {deactivationReasons.map((deactivationReason) => (<TouchableOpacity
            key={deactivationReason}
            style={styles.radioItem}
            onPress={() => setReason(deactivationReason)}
          >
            <View style={styles.radioContent}>
              <MaterialIcons
                name={reason === deactivationReason ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={24}
                color={reason === deactivationReason ? theme.colors.error : theme.colors.outline}
              />
              <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>
                {deactivationReason}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {reason === 'Other' && (
          <TextInput
            mode="outlined"
            placeholder="Please tell us more..."
            value={otherReason}
            onChangeText={setOtherReason}
            multiline
            numberOfLines={3}
            style={styles.otherReasonInput}
            textColor={theme.colors.onSurface}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Confirm Your Password
        </Text>
        <Text variant="bodySmall" style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
          Enter your password to confirm account deactivation
        </Text>
        
        <TextInput
          mode="outlined"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.passwordInput}
          textColor={theme.colors.onSurface}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
        />
      </View>

      <View style={styles.section}>
        <Checkbox.Item
          label="I understand that deactivating my account will permanently delete my data and this action cannot be undone"
          status={confirmDeactivation ? 'checked' : 'unchecked'}
          onPress={() => setConfirmDeactivation(!confirmDeactivation)}
          style={styles.checkboxItem}
          labelStyle={{ color: theme.colors.onSurface }}
          color={theme.colors.primary}
        />
      </View>

      <View style={[styles.alternativesSection, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text variant="titleMedium" style={[styles.alternativesTitle, { color: theme.colors.primary }]}>
          Before you go...
        </Text>
        <Text variant="bodyMedium" style={[styles.alternativesText, { color: theme.colors.onSurfaceVariant }]}>
          Consider these alternatives:{'\n'}
          • Temporarily disable notifications{'\n'}
          • Update your privacy settings{'\n'}
          • Contact our support team{'\n'}
          • Take a break and return later
        </Text>
        
        <Button
          mode="outlined"
          onPress={() => {}}
          style={styles.contactButton}
          textColor={theme.colors.primary}
          buttonColor="transparent"
        >
          Contact Support
        </Button>
      </View>

      <View style={styles.submitSection}>
        <Button
          mode="contained"
          onPress={handleDeactivate}
          disabled={!confirmDeactivation || !password || loading}
          style={[styles.deactivateButton, !confirmDeactivation && styles.disabledButton]}
          loading={loading}
          buttonColor={theme.colors.error}
          textColor={theme.colors.onError}
        >
          Deactivate Account
        </Button>
        
        <Button
          mode="text"
          onPress={() => {}}
          style={styles.cancelButton}
          textColor={theme.colors.primary}
        >
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  warningSection: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  warningTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  warningText: {
    lineHeight: 20,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    marginBottom: 16,
  },
  radioItem: {
    paddingVertical: 4,
  },
  radioContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioLabel: {
    marginLeft: 8,
  },
  otherReasonInput: {
    marginTop: 8,
  },
  passwordInput: {
    marginTop: 8,
  },
  checkboxItem: {
    paddingVertical: 0,
  },
  alternativesSection: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  alternativesTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  alternativesText: {
    lineHeight: 20,
    marginBottom: 16,
  },
  contactButton: {
    alignSelf: 'flex-start',
  },
  submitSection: {
    padding: 16,
    paddingBottom: 32,
  },
  deactivateButton: {
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButton: {
    marginTop: 8,
  },
});

export default DeactivateAccountScreen; 
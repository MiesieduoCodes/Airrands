import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { Text, Button, Card, Portal, Modal, TextInput, HelperText } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { db, storage } from '../../config/firebase';
import firebase from 'firebase/compat/app';

interface VerificationScreenProps {
  navigation: any;
  route: {
    params: {
      userRole: 'seller' | 'runner';
    };
  };
}

const VerificationScreen: React.FC<VerificationScreenProps> = ({ navigation, route }) => {
  const { userRole } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();
  const [ninImage, setNinImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload your NIN card.');
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        setNinImage(result.assets?.[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileName = `verifications/${user?.uid}/${Date.now()}.jpg`;
      const storageRef = storage.ref().child(fileName);
      
      await storageRef.put(blob);
      const downloadURL = await storageRef.getDownloadURL();
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  const handleSubmit = async () => {
    if (!ninImage) {
      Alert.alert('Error', 'Please upload your NIN card image.');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload image to Firebase Storage
      const imageURL = await uploadImage(ninImage);

      // Save verification data to Firestore
      const verificationData = {
        userId: user.uid,
        userRole,
        ninImageURL: imageURL,
        status: 'pending',
        submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
        reviewedAt: null,
        reviewerNotes: null,
      };

      await db.collection('verifications').add(verificationData);

      // Update user profile with verification status
      await db.collection('users').doc(user.uid).update({
        verificationStatus: 'pending',
        verificationData: {
          status: 'pending',
          submittedAt: new Date().toISOString(),
        },
      });

      Alert.alert('Verification Submitted', 'Your NIN verification has been submitted successfully. You will be notified once it is reviewed.', [
          {
            text: 'OK', onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting verification:', error);
      Alert.alert('Error', 'Failed to submit verification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.header}>
              <MaterialCommunityIcons 
                name="shield-check" 
                size={48} 
                color={theme.colors.primary} 
              />
              <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
                NIN Verification
              </Text>
              <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                Please upload a clear photo of your NIN card for verification
              </Text>
            </View>

            <View style={styles.uploadSection}>
              {ninImage ? (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: ninImage }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={[styles.changeButton, { backgroundColor: theme.colors.primary }]}
                    onPress={pickImage}
                  >
                    <Text style={[styles.changeButtonText, { color: theme.colors.onPrimary }]}>
                      Change Image
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadButton, { borderColor: theme.colors.outline }]}
                  onPress={pickImage}
                >
                  <MaterialCommunityIcons 
                    name="camera-plus" 
                    size={48} 
                    color={theme.colors.primary} 
                  />
                  <Text style={[styles.uploadText, { color: theme.colors.primary }]}>
                    Upload NIN Card
                  </Text>
                  <Text style={[styles.uploadSubtext, { color: theme.colors.onSurfaceVariant }]}>
                    Tap to select from gallery
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.infoSection}>
              <Text variant="titleMedium" style={[styles.infoTitle, { color: theme.colors.onSurface }]}>
                Important Information
              </Text>
              <View style={styles.infoList}>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                  <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
                    Ensure the NIN card is clearly visible
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                  <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
                    All text should be readable
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                  <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
                    Verification takes 24-48 hours
                  </Text>
                </View>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!ninImage || isSubmitting}
              style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
            >
              Submit Verification
            </Button>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadSection: {
    marginBottom: 24,
  },
  uploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 14,
  },
  imagePreview: {
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  changeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  changeButtonText: {
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 24,
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  submitButton: {
    borderRadius: 12,
    height: 48,
  },
});

export default VerificationScreen;
 
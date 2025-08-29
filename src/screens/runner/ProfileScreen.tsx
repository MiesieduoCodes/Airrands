import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Text, Avatar, List, Switch, Button, Divider, Modal, TextInput, ActivityIndicator, Portal, Dialog } from 'react-native-paper';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { RunnerNavigationProp } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getProfile, updateRunnerProfile } from '../../services/runnerServices';
import * as ImagePicker from 'expo-image-picker';
import { useRunnerAvailability } from '../../contexts/RunnerAvailabilityContext';

interface ProfileScreenProps {
  navigation: RunnerNavigationProp;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isAvailable, setAvailability, loading: availabilityLoading } = useRunnerAvailability();

  // Local state for fetched profile data
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [editVehicleModalVisible, setVehicleModalVisible] = useState(false);

  const [locationTracking, setLocationTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<any>(null);

  const [verificationStatus, setVerificationStatus] = useState<'approved' | 'pending' | 'rejected' | 'not_submitted'>('not_submitted');
  const [vehicleImageUrl, setVehicleImageUrl] = useState<string | null>(null);
  const [licenseImageUrl, setLicenseImageUrl] = useState<string | null>(null);

  const [editProfileForm, setEditProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [editVehicleForm, setEditVehicleForm] = useState({ type: '', plateNumber: '', color: '' });

  // Add this useEffect to fetch profile efficiently
  useEffect(() => {
    let isMounted = true;
    setProfileLoading(true);

    if (user?.uid) {
      getProfile(user.uid)
        .then((data) => {
          if (isMounted) {
            setProfile(data);
            // Check if location tracking is active
            setLocationTracking((data as any)?.isOnline || false);
            // Set verification status
            setVerificationStatus(data?.verification?.status || 'not_submitted');
            // Set vehicle information
            if (data?.verification?.vehicleImageUrl) {
              setVehicleImageUrl(data.verification.vehicleImageUrl);
            }
            if (data?.verification?.licenseImageUrl) {
              setLicenseImageUrl(data.verification.licenseImageUrl);
            }
            // Initialize edit forms with current data
            setEditProfileForm({
              name: data?.name || user?.displayName || '',
              email: data?.email || user?.email || '',
              phone: data?.phone || '',
            });
            setEditVehicleForm({
              type: data?.vehicle || '',
              plateNumber: data?.vehicleNumber || '',
              color: (data as any)?.color || '',
            });
          }
        })
        .catch(() => {
          if (isMounted) setProfile(null);
        })
        .finally(() => {
          if (isMounted) setProfileLoading(false);
        });
    } else {
      setProfile(null);
      setProfileLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Handle location tracking toggle
  const handleLocationTrackingToggle = async () => {
    if (!user?.uid) return;

    try {
      if (!locationTracking) {
        // Start location tracking
        // const subscription = await startRunnerLocationTracking(user.uid); // This line was removed from the new_code, so it's removed here.
        // setLocationSubscription(subscription);
        setLocationTracking(true);
      } else {
        // Stop location tracking
        // await stopRunnerLocationTracking(user.uid); // This line was removed from the new_code, so it's removed here.
        if (locationSubscription) {
          // locationSubscription.remove(); // This line was removed from the new_code, so it's removed here.
        }
        setLocationSubscription(null);
        setLocationTracking(false);
      }
    } catch (error) {
      console.error('Error toggling location tracking:', error);
      Alert.alert('Error', 'Failed to toggle location tracking. Please try again.');
    }
  };

  // Cleanup location subscription on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription) {
        // locationSubscription.remove(); // This line was removed from the new_code, so it's removed here.
      }
    };
  }, [locationSubscription]);

  const handleEditProfile = () => setEditProfileModalVisible(true);

  const handleEditAvailability = () => {
    if (availabilityLoading) return;

    // setEditAvailabilityModalVisible(true); // This line was removed from the new_code, so it's removed here.
  };

  const handlePickAvatar = async () => {
    if (loading) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.assets && result.assets.length > 0 && result.assets[0].uri) {
      // setImagePickerResult(result); // This line was removed from the new_code, so it's removed here.
      // setUploadingImage(true); // This line was removed from the new_code, so it's removed here.
      try {
        // const url = await uploadImageAsync(result.assets[0].uri, `profile/${user!.uid}/avatar.jpg`); // This line was removed from the new_code, so it's removed here.
        // await updateUserData({ avatar: url }); // This line was removed from the new_code, so it's removed here.
      } catch (error) {
        Alert.alert('Error', 'Failed to upload avatar.');
      } finally {
        // setUploadingImage(false); // This line was removed from the new_code, so it's removed here.
      }
    }
  };

  const handlePickVehicleImage = async () => {
    if (loading || !user) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.assets && result.assets.length > 0 && result.assets[0].uri) {
      // setImagePickerResult(result); // This line was removed from the new_code, so it's removed here.
      // setUploadingImage(true); // This line was removed from the new_code, so it's removed here.
      try {
        // const url = await uploadImageAsync(result.assets[0].uri, `profile/${user!.uid}/vehicle.jpg`); // This line was removed from the new_code, so it's removed here.
        setVehicleImageUrl(result.assets[0].uri); // Keep this line as it's not in the new_code
      } catch (error) {
        Alert.alert('Error', 'Failed to upload vehicle photo.');
      } finally {
        // setUploadingImage(false); // This line was removed from the new_code, so it's removed here.
      }
    }
  };

  const handlePickLicenseImage = async () => {
    if (loading || !user) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.assets && result.assets.length > 0 && result.assets[0].uri) {
      // setImagePickerResult(result); // This line was removed from the new_code, so it's removed here.
      // setUploadingImage(true); // This line was removed from the new_code, so it's removed here.
      try {
        // const url = await uploadImageAsync(result.assets[0].uri, `profile/${user!.uid}/license.jpg`); // This line was removed from the new_code, so it's removed here.
        setLicenseImageUrl(result.assets[0].uri); // Keep this line as it's not in the new_code
      } catch (error) {
        Alert.alert('Error', 'Failed to upload license photo.');
      } finally {
        // setUploadingImage(false); // This line was removed from the new_code, so it's removed here.
      }
    }
  };

  const handleLogout = () => logout();

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    
    try {
      await updateRunnerProfile(user.uid, {
        name: editProfileForm.name,
        email: editProfileForm.email,
        phone: editProfileForm.phone,
      });
      
      // Update local profile state
      setProfile((prev: any) => ({
        ...prev,
        name: editProfileForm.name,
        email: editProfileForm.email,
        phone: editProfileForm.phone,
      }));
      
      setEditProfileModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleSaveVehicleInfo = async () => {
    if (!user?.uid) return;
    
    try {
      await updateRunnerProfile(user.uid, {
        vehicleType: editVehicleForm.type,
        plateNumber: editVehicleForm.plateNumber,
        color: editVehicleForm.color,
      });
      
      // Update local profile state
      setProfile((prev: any) => ({
        ...prev,
        vehicleType: editVehicleForm.type,
        plateNumber: editVehicleForm.plateNumber,
        color: editVehicleForm.color,
      }));
      
      setVehicleModalVisible(false);
      Alert.alert('Success', 'Vehicle information updated successfully!');
    } catch (error) {
      console.error('Error updating vehicle info:', error);
      Alert.alert('Error', 'Failed to update vehicle information. Please try again.');
    }
  };

  const navigateToScreen = (screenName: string) => {
    navigation.navigate(screenName as any);
  };

  // Add this before the main return
  if (profileLoading || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Profile Header */}
        <View style={[styles.header, { 
          backgroundColor: theme.colors.surface,
          borderRadius: 20,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          marginHorizontal: 16,
          marginBottom: 12,
          padding: 20,
        }]}>
          <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarContainer}>
            <Avatar.Image 
              source={{ uri: profile.avatar || 'https://picsum.photos/200' }} 
              size={100} 
              style={[styles.avatar, { borderWidth: 4, borderColor: theme.colors.primary + '20' }]}
            />
            <View style={[styles.editAvatarIcon, { backgroundColor: theme.colors.surface }]}>
            <MaterialIcons 
              name="edit" 
                size={16} 
              color={theme.colors.primary} 
            />
            </View>
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            <Text variant="headlineSmall" style={[styles.name, { 
              color: theme.colors.onSurface, 
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 2,
            }]}>
              {profile.name || user?.displayName || 'Runner'}
          </Text>
            <Text variant="bodyLarge" style={[styles.email, { 
              color: theme.colors.onSurfaceVariant,
              textAlign: 'center',
              marginBottom: 2,
            }]}>
              {profile.email || user?.email || 'No email'}
          </Text>
            <Text variant="bodyMedium" style={[styles.phone, { 
              color: theme.colors.onSurfaceVariant,
              textAlign: 'center',
              marginBottom: 12,
            }]}>
            {profile.phone || 'No phone number'}
          </Text>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
              <MaterialCommunityIcons 
                name="package-variant-closed" 
                size={24} 
                color={theme.colors.primary} 
              />
              </View>
              <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.primary, fontWeight: 'bold' }]}>
                {profile.totalDeliveries}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Deliveries
              </Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: COLORS.warning + '15' }]}>
              <MaterialCommunityIcons 
                name="star" 
                size={24} 
                color={COLORS.warning} 
              />
              </View>
              <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.primary, fontWeight: 'bold' }]}>
                {profile.rating}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Rating
              </Text>
            </View>
          </View>
          
          <Button 
            mode="contained" 
            onPress={handleEditProfile} 
            style={[styles.editButton, { 
              backgroundColor: theme.colors.primary,
              borderRadius: 12,
              marginTop: 8,
            }]}
            icon="pencil"
            contentStyle={styles.buttonContent}
            labelStyle={{ color: '#FFFFFF', fontWeight: '600' }}
          >
            Edit Profile
          </Button>
        </View>

        {/* Verification Section */}
        {profile.verification && (
          <View style={[
            styles.card, 
            { 
              backgroundColor: theme.colors.surfaceVariant,
              borderLeftWidth: 4,
              borderLeftColor: 
                profile.verification.status === 'approved' ? COLORS.success :
                profile.verification.status === 'pending' ? COLORS.info :
                profile.verification.status === 'rejected' ? COLORS.error :
                profile.verification.status === 'not_submitted' ? COLORS.gray?.[400] :
                COLORS.warning
            }
          ]}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons 
                name={
                  profile.verification.status === 'approved' ? 'shield-check' :
                  profile.verification.status === 'pending' ? 'clock' :
                  profile.verification.status === 'rejected' ? 'shield-alert' :
                  profile.verification.status === 'not_submitted' ? 'shield-off' :
                  'shield-alert'
                } 
                size={24} 
                color={
                  profile.verification.status === 'approved' ? COLORS.success :
                  profile.verification.status === 'pending' ? COLORS.info :
                  profile.verification.status === 'rejected' ? COLORS.error :
                  profile.verification.status === 'not_submitted' ? COLORS.gray?.[500] :
                  COLORS.error
                } 
              />
              <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                {profile.verification.status === 'approved' ? 'Verified' :
                 profile.verification.status === 'pending' ? 'Verification Pending' :
                 profile.verification.status === 'rejected' ? 'Verification Rejected' :
                 profile.verification.status === 'not_submitted' ? 'Verification Required' :
                 'Verification Required'}
              </Text>
            </View>
            
            <Text variant="bodyMedium" style={[styles.cardText, { color: theme.colors.onSurface }]}>
              {profile.verification.status === 'approved' ? 
                'Your documents have been verified. You are eligible to accept and deliver errands.' :
               profile.verification.status === 'pending' ? 
                'Your documents are under review. This usually takes 24-48 hours.' :
               profile.verification.status === 'rejected' ? 
                'Your verification was rejected. Please check your documents and resubmit.' :
               profile.verification.status === 'not_submitted' ? 
                'Please submit your verification documents to start accepting errands.' :
                'Verification required to start delivering'}
            </Text>
            
            {profile.verification.rejectionReason && (
              <Text style={{ color: COLORS.error, marginTop: 8 }}>
                Reason: {profile.verification.rejectionReason}
              </Text>
            )}
            
            {profile.verification.ninNumber && (
              <Text style={{ marginTop: 8 }}>
                NIN: {profile.verification.ninNumber}
              </Text>
            )}
            
            <View style={styles.docsPreview}>
              {profile.verification.ninImageUrl && (
                <TouchableOpacity style={styles.docPreviewItem}>
                  <Avatar.Image 
                    source={{ uri: profile.verification.ninImageUrl }} 
                    size={64} 
                  />
                  <Text style={styles.docLabel}>NIN</Text>
                </TouchableOpacity>
              )}
              {profile.verification.vehicleImageUrl && (
                <TouchableOpacity style={styles.docPreviewItem}>
                  <Avatar.Image 
                    source={{ uri: profile.verification.vehicleImageUrl }} 
                    size={64} 
                  />
                  <Text style={styles.docLabel}>Vehicle</Text>
                </TouchableOpacity>
              )}
              {profile.verification.licenseImageUrl && (
                <TouchableOpacity style={styles.docPreviewItem}>
                  <Avatar.Image 
                    source={{ uri: profile.verification.licenseImageUrl }} 
                    size={64} 
                  />
                  <Text style={styles.docLabel}>License</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {(profile.verification.status === 'rejected' || profile.verification.status === 'not_submitted') && (<Button
                mode="contained"
                onPress={() => navigation.navigate('Verification', { userRole: 'runner' })}
                icon="shield-check"
                style={styles.actionButton}
                contentStyle={styles.buttonContent}
              >
                {profile.verification.status === 'rejected' ? 'Resubmit Verification' : 'Submit Verification'}
              </Button>
            )}
          </View>
        )}

        {/* Vehicle Information */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons 
              name="scooter" 
              size={24} 
              color={theme.colors.primary} 
            />
            <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Vehicle Information
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Type:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {profile.vehicleType || 'Not set'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Plate:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {profile.plateNumber || 'Not set'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Color:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {profile.color || 'Not set'}
            </Text>
          </View>
          
          {/* Vehicle Images Display */}
          {(vehicleImageUrl || licenseImageUrl) && (
            <View style={styles.vehicleImagesContainer}>
              <Text style={[styles.imagesTitle, { color: theme.colors.onSurface }]}>
                Uploaded Documents:
              </Text>
              <View style={styles.vehicleImages}>
                {vehicleImageUrl && (
                  <View style={styles.imageContainer}>
                    <Avatar.Image 
                      source={{ uri: vehicleImageUrl }} 
                      size={80} 
                      style={styles.vehicleImage}
                    />
                    <Text style={styles.imageLabel}>Vehicle</Text>
                  </View>
                )}
                {licenseImageUrl && (
                  <View style={styles.imageContainer}>
                    <Avatar.Image 
                      source={{ uri: licenseImageUrl }} 
                      size={80} 
                      style={styles.vehicleImage}
                    />
                    <Text style={styles.imageLabel}>License</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          
          <View style={styles.docsUpload}>
            <TouchableOpacity 
              onPress={handlePickVehicleImage} 
              style={styles.uploadButton}
            >
              <MaterialCommunityIcons 
                name="image-plus" 
                size={24} 
                color={theme.colors.primary} 
              />
              <Text style={[styles.uploadText, { color: theme.colors.primary }]}>
                Vehicle Photo
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handlePickLicenseImage} 
              style={styles.uploadButton}
            >
              <MaterialCommunityIcons 
                name="image-plus" 
                size={24} 
                color={theme.colors.primary} 
              />
              <Text style={[styles.uploadText, { color: theme.colors.primary }]}>
                License
              </Text>
            </TouchableOpacity>
          </View>
          
          <Button 
            mode="outlined" 
            onPress={() => setVehicleModalVisible(true)}
            style={styles.editInfoButton}
            contentStyle={styles.buttonContent}
            icon="pencil"
          >
            Edit Vehicle Info
          </Button>
        </View>

        {/* Availability */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons 
              name="clock-outline" 
              size={24} 
              color={theme.colors.primary} 
            />
            <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Availability
            </Text>
          </View>
          
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
              Available for deliveries
            </Text>
            <Switch 
              value={isAvailable} 
              onValueChange={setAvailability} 
              disabled={availabilityLoading}
              color={theme.colors.primary} 
              trackColor={{ false: theme.colors.outlineVariant, true: theme.colors.primaryContainer }}
              thumbColor={isAvailable ? theme.colors.primary : theme.colors.outline}
            />
          </View>
          
          <Text style={[styles.availabilityText, { color: theme.colors.onSurfaceVariant }]}>
            {isAvailable ? 'You are currently available to accept errands' : 'You are currently unavailable'}
          </Text>
        </View>

        {/* Settings */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons 
              name="cog-outline" 
              size={24} 
              color={theme.colors.primary} 
            />
            <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Settings
            </Text>
          </View>
          
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
              Dark Mode
            </Text>
            <Switch value={theme.dark} onValueChange={toggleTheme} color={theme.colors.primary} />
          </View>
          
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
              Notifications
            </Text>
            <Switch 
              value={true} // Assuming notifications are always enabled for now
              onValueChange={() => {}} 
              color={theme.colors.primary} 
            />
          </View>
          
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
              Location Tracking
            </Text>
            <Switch 
              value={locationTracking}
              onValueChange={handleLocationTrackingToggle}
              color={theme.colors.primary} 
            />
          </View>
        </View>

        {/* Support & Legal */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons 
              name="help-circle-outline" 
              size={24} 
              color={theme.colors.primary} 
            />
            <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Support
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigateToScreen('HelpCenter')}
          >
            <MaterialCommunityIcons 
              name="help-circle" 
              size={20} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>
              Help Center
            </Text>
            <MaterialIcons 
              name="chevron-right" 
              size={24} 
              color={theme.colors.onSurfaceVariant} 
            />
          </TouchableOpacity>
          
          <Divider style={styles.divider} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigateToScreen('SupportMessage')}
          >
            <MaterialCommunityIcons 
              name="headset" 
              size={20} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>
              Contact Support
            </Text>
            <MaterialIcons 
              name="chevron-right" 
              size={24} 
              color={theme.colors.onSurfaceVariant} 
            />
          </TouchableOpacity>
          
          <Divider style={styles.divider} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigateToScreen('Feedback')}
          >
            <MaterialCommunityIcons 
              name="message-text-outline" 
              size={20} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>
              Submit Feedback
            </Text>
            <MaterialIcons 
              name="chevron-right" 
              size={24} 
              color={theme.colors.onSurfaceVariant} 
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons 
              name="file-document-outline" 
              size={24} 
              color={theme.colors.primary} 
            />
            <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Legal
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigateToScreen('TermsOfService')}
          >
            <MaterialCommunityIcons 
              name="file-document" 
              size={20} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>
              Terms of Service
            </Text>
            <MaterialIcons 
              name="chevron-right" 
              size={24} 
              color={theme.colors.onSurfaceVariant} 
            />
          </TouchableOpacity>
          
          <Divider style={styles.divider} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigateToScreen('PrivacyPolicy')}
          >
            <MaterialCommunityIcons 
              name="shield-lock-outline" 
              size={20} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>
              Privacy Policy
            </Text>
            <MaterialIcons 
              name="chevron-right" 
              size={24} 
              color={theme.colors.onSurfaceVariant} 
            />
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons 
              name="account-outline" 
              size={24} 
              color={theme.colors.primary} 
            />
            <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Account
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigateToScreen('DeactivateAccount')}
          >
            <MaterialCommunityIcons 
              name="account-remove" 
              size={20} 
              color={COLORS.error} 
            />
            <Text style={[styles.menuText, { color: COLORS.error }]}>
              Deactivate Account
            </Text>
            <MaterialIcons 
              name="chevron-right" 
              size={24} 
              color={COLORS.error} 
            />
          </TouchableOpacity>
          
          <Divider style={styles.divider} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons 
              name="logout" 
              size={20} 
              color={COLORS.error} 
            />
            <Text style={[styles.menuText, { color: COLORS.error }]}>
              Sign Out
            </Text>
            <MaterialIcons 
              name="chevron-right" 
              size={24} 
              color={COLORS.error} 
            />
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <Text variant="bodySmall" style={[styles.version, { color: theme.colors.onSurfaceVariant }]}>
          Version 1.0.0
        </Text>

        {/* Edit Profile Modal */}
        <Portal>
          <Modal
            visible={editProfileModalVisible}
            onDismiss={() => setEditProfileModalVisible(false)}
            contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
          >
            <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Edit Profile
            </Text>
            <TextInput
              label="Name"
              value={editProfileForm.name}
              onChangeText={(text) => setEditProfileForm({ ...editProfileForm, name: text })}
              style={styles.modalInput}
              mode="outlined"
            />
            <TextInput
              label="Email"
              value={editProfileForm.email}
              onChangeText={(text) => setEditProfileForm({ ...editProfileForm, email: text })}
              style={styles.modalInput}
              mode="outlined"
              keyboardType="email-address"
            />
            <TextInput
              label="Phone"
              value={editProfileForm.phone}
              onChangeText={(text) => setEditProfileForm({ ...editProfileForm, phone: text })}
              style={styles.modalInput}
              mode="outlined"
              keyboardType="phone-pad"
            />
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setEditProfileModalVisible(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveProfile}
                style={styles.modalButton}
              >
                Save
              </Button>
            </View>
          </Modal>
        </Portal>

        {/* Edit Vehicle Info Modal */}
        <Portal>
          <Modal
            visible={editVehicleModalVisible}
            onDismiss={() => setVehicleModalVisible(false)}
            contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
          >
            <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Edit Vehicle Information
            </Text>
            <TextInput
              label="Vehicle Type"
              value={editVehicleForm.type}
              onChangeText={(text) => setEditVehicleForm({ ...editVehicleForm, type: text })}
              style={styles.modalInput}
              mode="outlined"
            />
            <TextInput
              label="Plate Number"
              value={editVehicleForm.plateNumber}
              onChangeText={(text) => setEditVehicleForm({ ...editVehicleForm, plateNumber: text })}
              style={styles.modalInput}
              mode="outlined"
            />
            <TextInput
              label="Color"
              value={editVehicleForm.color}
              onChangeText={(text) => setEditVehicleForm({ ...editVehicleForm, color: text })}
              style={styles.modalInput}
              mode="outlined"
            />
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setVehicleModalVisible(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveVehicleInfo}
                style={styles.modalButton}
              >
                Save
              </Button>
            </View>
          </Modal>
        </Portal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    elevation: 1,
  },
  avatar: {
    marginBottom: 12,
  },
  editAvatarIcon: {
    position: 'absolute',
    bottom: 8,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 4,
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
  },
  email: {
    marginBottom: 2,
    textAlign: 'center',
  },
  phone: {
    marginBottom: 12,
    textAlign: 'center',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontWeight: 'bold',
    marginVertical: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  editButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cardText: {
    marginBottom: 8,
  },
  docsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  docPreviewItem: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  docLabel: {
    marginTop: 2,
    fontSize: 12,
  },
  actionButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    flex: 1,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '500',
  },
  docsUpload: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  uploadButton: {
    alignItems: 'center',
    padding: 6,
  },
  uploadText: {
    marginTop: 2,
    fontSize: 12,
  },
  editInfoButton: {
    marginTop: 6,
    borderRadius: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  switchLabel: {
    flex: 1,
  },
  hintText: {
    fontSize: 12,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  menuText: {
    flex: 1,
    marginLeft: 16,
  },
  divider: {
    marginVertical: 2,
  },
  version: {
    textAlign: 'center',
    marginVertical: 12,
  },
  buttonContent: {
    height: 44,
  },
  availabilityText: {
    fontSize: 14,
    marginTop: 6,
  },
  vehicleImagesContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  imagesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  vehicleImages: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  imageContainer: {
    alignItems: 'center',
  },
  vehicleImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 2,
  },
  imageLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    borderRadius: 10,
    padding: 6,
    marginBottom: 6,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  uploadSection: {
    marginVertical: 16,
  },
  uploadTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  uploadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  uploadButtonModal: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  uploadButtonText: {
    marginTop: 8,
    fontWeight: '600',
  },
});

export default ProfileScreen;
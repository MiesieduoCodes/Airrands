import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, PermissionsAndroid, Platform, Linking } from 'react-native';
import { Text, Avatar, List, Switch, Button, Divider, Card, Chip, Portal, Modal, TextInput } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { BuyerNavigationProp, BuyerTabParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Animatable from 'react-native-animatable';
import { getProfile, updateProfile, getOrders } from '../../services/buyerServices';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { User } from 'firebase/auth';
import { useFocusEffect } from '@react-navigation/native';

interface ProfileData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  memberSince: string;
  notifications: boolean;
  locationServices: boolean;
}

interface ProfileScreenProps {
  navigation: BuyerNavigationProp;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [userAvatar, setUserAvatar] = useState('https://picsum.photos/200');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme, theme } = useTheme();

  // Function to check and sync permission status
  const checkAndSyncPermissions = async () => {
    if (!user?.uid) return;
    
    try {
      // Check notification permission status
      const notificationStatus = await Notifications.getPermissionsAsync();
      const notificationEnabled = notificationStatus.status === 'granted';
      
      // Check location permission status
      const locationStatus = await Location.getForegroundPermissionsAsync();
      const locationEnabled = locationStatus.status === 'granted';
      
      // Update state to reflect actual permission status
      setNotifications(notificationEnabled);
      setLocationServices(locationEnabled);
      
      // Update profile in database to match actual permissions
      await updateProfile(user.uid, {
        notifications: notificationEnabled,
        locationServices: locationEnabled
      });
      
      // Update profile state
      setProfile((prev: ProfileData | null) => prev ? {
        ...prev,
        notifications: notificationEnabled,
        locationServices: locationEnabled
      } : null);
      
    } catch (error) {
      console.error('Error checking permission status:', error);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    Promise.all([
      getProfile(user.uid),
      getOrders(user.uid),
    ])
      .then(([profileData, ordersData]) => {
        // Create default profile if none exists
        const defaultProfile: ProfileData = {
          name: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          phone: '',
          avatar: 'https://picsum.photos/200',
          memberSince: (user as any).metadata?.creationTime ? new Date((user as any).metadata.creationTime).toLocaleDateString() : new Date().toLocaleDateString(),
          notifications: true,
          locationServices: true,
        };
        
        // Convert backend profile data to our ProfileData type
        let finalProfile: ProfileData;
        if (profileData && typeof profileData === 'object' && 'id' in profileData) {
          finalProfile = {
            id: profileData.id,
            name: (profileData as any).name || (profileData as any).displayName || user.displayName || user.email?.split('@')[0] || 'User',
            email: (profileData as any).email || user.email || '',
            phone: (profileData as any).phone || '',
            avatar: (profileData as any).avatar || (profileData as any).photoURL || 'https://picsum.photos/200',
            memberSince: (profileData as any).memberSince || ((user as any).metadata?.creationTime ? new Date((user as any).metadata.creationTime).toLocaleDateString() : new Date().toLocaleDateString()),
            notifications: (profileData as any).notifications !== false,
            locationServices: (profileData as any).locationServices !== false,
          };
        } else {
          finalProfile = defaultProfile;
        }
        setProfile(finalProfile);
        setNotifications(finalProfile.notifications);
        setLocationServices(finalProfile.locationServices);
        setRecentOrders(ordersData || []);
      })
      .catch(e => {
        console.error('Failed to fetch profile/orders:', e);
        // Set default profile on error
        const defaultProfile: ProfileData = {
          name: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          phone: '',
          avatar: 'https://picsum.photos/200',
          memberSince: (user as any).metadata?.creationTime ? new Date((user as any).metadata.creationTime).toLocaleDateString() : new Date().toLocaleDateString(),
          notifications: true,
          locationServices: true,
        };
        setProfile(defaultProfile);
        setNotifications(true);
        setLocationServices(true);
        setRecentOrders([]);
      })
      .finally(() => {
        setLoading(false);
        // Check and sync permissions after loading
        checkAndSyncPermissions();
      });
  }, [user?.uid]);

  // Check permissions when screen comes into focus (e.g., returning from settings)
  useFocusEffect(React.useCallback(() => {
      if (user?.uid && !loading) {
        checkAndSyncPermissions();
      }
    }, [user?.uid, loading])
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user || !user.uid) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.error }}>User not available. Please log in again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.error }}>Profile data not available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const userData = {
    name: profile?.name || user.displayName || user.email?.split('@')[0] || 'User',
    email: profile?.email || user.email || '',
    phone: profile?.phone || '',
    avatar: profile?.avatar || userAvatar,
    memberSince: profile?.memberSince || ((user as any).metadata?.creationTime ? new Date((user as any).metadata.creationTime).toLocaleDateString() : new Date().toLocaleDateString()),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'in_progress': return COLORS.info;
      case 'delivered': return COLORS.success;
      default: return COLORS.gray?.[500];
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  const handleLogout = () => logout();
  
  const handleNotificationToggle = async (value: boolean) => {
    if (!user?.uid) return;
    
    if (value) {
      // Check current permission status
      const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        // Permission already granted, just update the switch
        try {
          await updateProfile(user.uid, { notifications: true });
          setNotifications(true);
          setProfile((prev: ProfileData | null) => prev ? { ...prev, notifications: true } : null);
          Alert.alert('Success', 'Notifications are already enabled!');
        } catch (error) {
          console.error('Failed to update notification settings:', error);
          Alert.alert('Error', 'Failed to update notification settings.');
        }
        return;
      }
      
      if (!canAskAgain) {
        // Can't ask again, show settings alert
        Alert.alert('Permission Required', 'Please enable notifications in your device settings to receive order updates and messages.', [
            { text: 'Cancel', style: 'cancel' }, 
            { text: 'Settings', onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          ]
        );
        return;
      }
      
      // Request permission
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable notifications in your device settings to receive order updates and messages.', [
            { text: 'Cancel', style: 'cancel' }, 
            { text: 'Settings', onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          ]
        );
        return;
      }

      // Permission granted, update the switch and save to database
      try {
        await updateProfile(user.uid, { notifications: true });
        setNotifications(true);
        setProfile((prev: ProfileData | null) => prev ? { ...prev, notifications: true } : null);
        Alert.alert('Success', 'Notifications enabled successfully!');
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings.');
      }
    } else {
      // Disable notifications
      try {
        // Show alert explaining that user needs to manually disable notifications
        Alert.alert('Notifications', 'To completely disable notifications, please go to your device settings and turn off notifications for Airrands.', [
            { text: 'Cancel', style: 'cancel' }, 
            { 
              text: 'Open Settings', onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        
        // Clear all scheduled notifications
        await Notifications.cancelAllScheduledNotificationsAsync();
        
        // Update database to reflect user's preference
        await updateProfile(user.uid, { notifications: false });
        setNotifications(false);
        setProfile((prev: ProfileData | null) => prev ? { ...prev, notifications: false } : null);
        
      } catch (error) {
        console.error('Failed to disable notifications:', error);
        Alert.alert('Error', 'Failed to disable notifications.');
      }
    }
  };
  
  const handleLocationToggle = async (value: boolean) => {
    if (!user?.uid) return;
    
    if (value) {
      // Check current permission status
      const { status: existingStatus, canAskAgain } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'granted') {
        // Permission already granted, just update the switch
        try {
          await updateProfile(user.uid, { locationServices: true });
          setLocationServices(true);
          setProfile((prev: ProfileData | null) => prev ? { ...prev, locationServices: true } : null);
          Alert.alert('Success', 'Location services are already enabled!');
        } catch (error) {
          console.error('Failed to update location settings:', error);
          Alert.alert('Error', 'Failed to update location settings.');
        }
        return;
      }
      
      if (!canAskAgain) {
        // Can't ask again, show settings alert
        Alert.alert('Permission Required', 'Please enable location services in your device settings to find nearby stores and track deliveries.', [
            { text: 'Cancel', style: 'cancel' }, 
            { text: 'Settings', onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          ]
        );
        return;
      }
      
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable location services in your device settings to find nearby stores and track deliveries.', [
            { text: 'Cancel', style: 'cancel' }, 
            { text: 'Settings', onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          ]
        );
        return;
      }

      // Permission granted, update the switch and save to database
      try {
        await updateProfile(user.uid, { locationServices: true });
        setLocationServices(true);
        setProfile((prev: ProfileData | null) => prev ? { ...prev, locationServices: true } : null);
        Alert.alert('Success', 'Location services enabled successfully!');
    } catch (error) {
      console.error('Failed to update location settings:', error);
      Alert.alert('Error', 'Failed to update location settings.');
      }
    } else {
      // Disable location services
      try {
        // Show alert explaining that user needs to manually disable location
        Alert.alert('Location Services', 'To completely disable location access, please go to your device settings and turn off location for Airrands.', [
            { text: 'Cancel', style: 'cancel' }, 
            { 
              text: 'Open Settings', onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        
        // Update database to reflect user's preference
        await updateProfile(user.uid, { locationServices: false });
        setLocationServices(false);
        setProfile((prev: ProfileData | null) => prev ? { ...prev, locationServices: false } : null);
        
      } catch (error) {
        console.error('Failed to disable location services:', error);
        Alert.alert('Error', 'Failed to disable location services.');
      }
    }
  };
  const handleEditProfile = () => {
    setEditForm({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
    });
    setEditProfileModal(true);
  };
  const handleViewOrderHistory = () => navigation.navigate('Orders');
  const handleContactSupport = async () => {
    try {
      // For support chat, we'll use a special support user ID
      // In a real app, this would be a dedicated support user or system
      const supportUserId = 'support_system'; // This should be configured in your app
      
      const { getOrCreateChat } = await import('../../services/chatService');
      const chatResult = await getOrCreateChat(supportUserId);
      
      navigation.navigate('Chat', {
        chatId: chatResult.chatId,
        chatName: 'Support',
        chatAvatar: '',
        chatRole: 'support',
      });
    } catch (error) {
      console.error('Error creating support chat:', error);
      Alert.alert('Error', 'Failed to contact support. Please try again.');
    }
  };
  const handleFeedback = () => navigation.navigate('Feedback');
  const handleHelpCenter = () => navigation.navigate('HelpCenter');
  const handleDeleteAccount = () => navigation.navigate('DeactivateAccount');

  const handleProfilePictureChange = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const imageUri = result.assets?.[0].uri;
        
        // Upload image to Firebase Storage
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const imageRef = ref(storage, `profile-pictures/${user.uid}`);
        await uploadBytes(imageRef, blob);
        const downloadURL = await getDownloadURL(imageRef);

        // Update profile with new avatar URL
        const updatedProfile: ProfileData = {
          ...profile!,
          avatar: downloadURL,
        };
        
        await updateProfile(user.uid, { avatar: downloadURL });
        setProfile(updatedProfile);
        setUserAvatar(downloadURL);
        
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    try {
      // If user changed avatar, upload it first
      let avatarURL = userData.avatar;
      if (userAvatar !== userData.avatar) {
        try {
          const response = await fetch(userAvatar);
          const blob = await response.blob();
          
          const fileName = `avatars/${user.uid}/${Date.now()}.jpg`;
          const storageRef = ref(storage, fileName);
          
          await uploadBytes(storageRef, blob);
          avatarURL = await getDownloadURL(storageRef);
        } catch (error) {
          console.error('Error uploading avatar:', error);
          Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
          return;
        }
      }

      // Update profile with new data including avatar URL
      const updatedProfile: ProfileData = {
        id: profile!.id,
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        avatar: avatarURL,
        memberSince: profile!.memberSince,
        notifications: profile!.notifications,
        locationServices: profile!.locationServices,
      };

      await updateProfile(user.uid, updatedProfile);
      setProfile({ ...profile, ...updatedProfile });
      setUserAvatar(avatarURL);
      setEditProfileModal(false);
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (e) {
      console.error('Failed to update profile:', e);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  return (<SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Animatable.View animation="fadeInDown" duration={500}>
          <View style={[styles.profileHeader, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.avatarSection}>
              <TouchableOpacity 
                style={styles.avatarContainer} 
                onPress={handleProfilePictureChange}
              >
                <Avatar.Image 
                  source={{ uri: userData.avatar }} 
                  size={120} 
                  style={[styles.avatar, { borderColor: theme.colors.primary }]}
                />
                <View style={[styles.editIcon, { backgroundColor: theme.colors.primary }]}>
                  <MaterialIcons name="camera-alt" size={18} color={theme.colors.onPrimary} />
                </View>
              </TouchableOpacity>
              <Text variant="headlineMedium" style={[styles.name, { color: theme.colors.onSurface }]}>
                {userData.name}
              </Text>
              <Text variant="bodyLarge" style={[styles.email, { color: theme.colors.onSurfaceVariant }]}>
                {userData.email}
              </Text>
              <View style={styles.memberInfo}>
                <MaterialCommunityIcons 
                  name="calendar-account" 
                  size={16} 
                  color={theme.colors.onSurfaceVariant} 
                />
              <Text variant="bodySmall" style={[styles.memberSince, { color: theme.colors.onSurfaceVariant }]}>
                Member since {userData.memberSince}
              </Text>
              </View>
            </View>
          </View>
        </Animatable.View>

        {/* Quick Actions */}
        <Animatable.View animation="fadeInUp" delay={100} duration={500}>
          <View style={[styles.quickActionsContainer, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity 
              style={[styles.quickActionCard, { backgroundColor: theme.colors.primaryContainer }]}
              onPress={handleEditProfile}
            >
              <MaterialCommunityIcons 
                name="account-edit" 
                size={24} 
                color={ '#000000' } 
              />
              <Text style={[styles.quickActionText, { color: '#000000' }]}>
              Edit Profile
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickActionCard, { backgroundColor: theme.colors.secondaryContainer }]}
              onPress={handleViewOrderHistory}
            >
              <MaterialCommunityIcons 
                name="history" 
                size={24} 
                color={'#000000'} 
              />
              <Text style={[styles.quickActionText, { color: '#000000' }]}>
              Orders
              </Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>

        {/* App Preferences */}
        <Animatable.View animation="fadeInUp" delay={200} duration={500}>
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons 
                name="cog" 
                size={20} 
                color={theme.colors.primary} 
              />
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              App Preferences
            </Text>
            </View>
            
            <List.Item
              title="Dark Mode"
              description="Switch between light and dark theme"
              titleStyle={[styles.listItemTitle, { color: theme.colors.onSurface }]}
              descriptionStyle={[styles.listItemDescription, { color: theme.colors.onSurfaceVariant }]}
              left={props => <List.Icon {...props} icon="theme-light-dark" color={theme.colors.primary} />}
              right={() => (
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  color={theme.colors.primary}
                />
              )}
              style={styles.listItem}
            />
            
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
            
            <List.Item
              title="Notifications"
              description="Receive app notifications"
              titleStyle={[styles.listItemTitle, { color: theme.colors.onSurface }]}
              descriptionStyle={[styles.listItemDescription, { color: theme.colors.onSurfaceVariant }]}
              left={props => <List.Icon {...props} icon="bell" color={theme.colors.primary} />}
              right={() => (
                <Switch
                  value={notifications}
                  onValueChange={handleNotificationToggle}
                  color={theme.colors.primary}
                />
              )}
              style={styles.listItem}
            />
            
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
            
            <List.Item
              title="Location Services"
              description="Allow access to your location"
              titleStyle={[styles.listItemTitle, { color: theme.colors.onSurface }]}
              descriptionStyle={[styles.listItemDescription, { color: theme.colors.onSurfaceVariant }]}
              left={props => <List.Icon {...props} icon="map-marker" color={theme.colors.primary} />}
              right={() => (
                <Switch
                  value={locationServices}
                  onValueChange={handleLocationToggle}
                  color={theme.colors.primary}
                />
              )}
              style={styles.listItem}
            />
          </View>
        </Animatable.View>

        {/* Help & Support */}
        <Animatable.View animation="fadeInUp" delay={300} duration={500}>
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons 
                name="help-circle" 
                size={20} 
                color={theme.colors.primary} 
              />
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Help & Support
            </Text>
            </View>
            
            <List.Item
              title="Help Center"
              description="Find answers to common questions"
              titleStyle={[styles.listItemTitle, { color: theme.colors.onSurface }]}
              descriptionStyle={[styles.listItemDescription, { color: theme.colors.onSurfaceVariant }]}
              left={props => <List.Icon {...props} icon="help-circle" color={theme.colors.primary} />}
              onPress={handleHelpCenter}
              right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
              style={styles.listItem}
            />
            
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
            
            <List.Item
              title="Contact Support"
              description="Get help from our support team"
              titleStyle={[styles.listItemTitle, { color: theme.colors.onSurface }]}
              descriptionStyle={[styles.listItemDescription, { color: theme.colors.onSurfaceVariant }]}
              left={props => <List.Icon {...props} icon="message-text" color={theme.colors.primary} />}
              onPress={handleContactSupport}
              right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
              style={styles.listItem}
            />
            
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
            
            <List.Item
              title="Feedback"
              description="Share your experience with us"
              titleStyle={[styles.listItemTitle, { color: theme.colors.onSurface }]}
              descriptionStyle={[styles.listItemDescription, { color: theme.colors.onSurfaceVariant }]}
              left={props => <List.Icon {...props} icon="star" color={theme.colors.primary} />}
              onPress={handleFeedback}
              right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
              style={styles.listItem}
            />
          </View>
        </Animatable.View>

        {/* Privacy & Legal */}
        <Animatable.View animation="fadeInUp" delay={350} duration={500}>
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons 
                name="shield-check" 
                size={20} 
                color={theme.colors.primary} 
              />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Privacy & Legal
              </Text>
            </View>
            
            <List.Item
              title="Privacy Policy"
              description="How we collect and use your data"
              titleStyle={[styles.listItemTitle, { color: theme.colors.onSurface }]}
              descriptionStyle={[styles.listItemDescription, { color: theme.colors.onSurfaceVariant }]}
              left={props => <List.Icon {...props} icon="shield-account" color={theme.colors.primary} />}
              onPress={() => navigation.navigate('PrivacyPolicy')}
              right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
              style={styles.listItem}
            />
            
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
            
            <List.Item
              title="Terms of Service"
              description="Our terms and conditions"
              titleStyle={[styles.listItemTitle, { color: theme.colors.onSurface }]}
              descriptionStyle={[styles.listItemDescription, { color: theme.colors.onSurfaceVariant }]}
              left={props => <List.Icon {...props} icon="file-document" color={theme.colors.primary} />}
              onPress={() => navigation.navigate('TermsOfService')}
              right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
              style={styles.listItem}
            />
            
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
            
          </View>
        </Animatable.View>

        {/* Account Actions */}
        <Animatable.View animation="fadeInUp" delay={400} duration={500}>
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons 
                name="account-cog" 
                size={20} 
                color={theme.colors.primary} 
              />
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Account
            </Text>
            </View>
            
            <List.Item
              title="Delete Account"
              description="Permanently delete your account and data"
              titleStyle={[styles.listItemTitle, { color: theme.colors.error }]}
              descriptionStyle={[styles.listItemDescription, { color: theme.colors.onSurfaceVariant }]}
              left={props => <List.Icon {...props} icon="delete" color={theme.colors.error} />}
              onPress={handleDeleteAccount}
              right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
              style={styles.listItem}
            />
            
            <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
            
            <List.Item
              title="Sign Out"
              description="Log out of your account"
              titleStyle={[styles.listItemTitle, { color: theme.colors.error }]}
              descriptionStyle={[styles.listItemDescription, { color: theme.colors.onSurfaceVariant }]}
              left={props => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
              onPress={handleLogout}
              style={styles.listItem}
            />
          </View>
        </Animatable.View>

            
            <List.Item
              title="Version"
              description="1.0.0"
              titleStyle={[styles.listItemTitle, { color: theme.colors.onSurface, textAlign: 'center' }]}
              descriptionStyle={[styles.listItemDescription, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}
              style={[styles.listItem, { alignItems: 'center', justifyContent: 'center', paddingBottom: 23 }]}
            />
            


      </ScrollView>

      {/* Edit Profile Modal */}
      <Portal>
        <Modal
          visible={editProfileModal}
          onDismiss={() => setEditProfileModal(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            Edit Profile
          </Text>
          
          <TextInput
            label="Full Name"
            value={editForm.name}
            onChangeText={(text) => setEditForm({ ...editForm, name: text })}
            style={styles.modalInput}
            mode="outlined"
          />
          
          <TextInput
            label="Email"
            value={editForm.email}
            onChangeText={(text) => setEditForm({ ...editForm, email: text })}
            style={styles.modalInput}
            mode="outlined"
            keyboardType="email-address"
          />
          
          <TextInput
            label="Phone Number"
            value={editForm.phone}
            onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
            style={styles.modalInput}
            mode="outlined"
            keyboardType="phone-pad"
          />
          
          <View style={styles.modalActions}>
            <Button 
              mode="outlined" 
              onPress={() => setEditProfileModal(false)}
              style={styles.modalButton}
              textColor={theme.colors.primary}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSaveProfile}
              style={styles.modalButton}
              buttonColor={theme.colors.primary}
              textColor={theme.colors.onPrimary}
            >
              Save Changes
            </Button>
          </View>
        </Modal>
      </Portal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 20,

  },
  profileHeader: {
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    borderWidth: 3,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    marginBottom: 4,
    textAlign: 'center',
  },
  memberSince: {
    opacity: 0.7,
    textAlign: 'center',
    marginLeft: 4,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  versionInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  listItem: {
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  listItemDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    marginVertical: 4,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});

export default ProfileScreen;
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView, Dimensions, Platform, StatusBar} from 'react-native';
import { Text, Avatar, List, Switch, Button, Chip, Surface, Modal, Portal} from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { SellerNavigationProp } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { getProfile, updateSellerProfile, startLocationTracking, stopLocationTracking, uploadProfilePicture } from '../../services/sellerServices';
import BusinessSettings from '../../components/BusinessSettings';
import * as ImagePicker from 'expo-image-picker';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');

interface ProfileScreenProps {
  navigation: SellerNavigationProp;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState(true);
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme, theme } = useTheme();

  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [businessSettingsModal, setBusinessSettingsModal] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<any>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const profileData = await getProfile(user.uid);
        setBusinessData(profileData);
        setLocationTracking((profileData as any)?.isOnline || false);
      } catch (e) {
        console.error('Failed to fetch seller profile:', e);
        setBusinessData({
          name: user.displayName || 'Business Name',
          email: user.email || '',
          phone: '',
          address: 'Address not set',
          description: 'No description available',
          coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
          rating: 0,
          reviews: 0,
          totalSales: 0,
          isOpen: false,
          categories: []
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user?.uid]);

  const handleLocationTrackingToggle = async () => {
    if (!user?.uid) return;

    try {
      if (!locationTracking) {
        const subscription = await startLocationTracking(user.uid);
        setLocationSubscription(subscription);
        setLocationTracking(true);
      } else {
        await stopLocationTracking(user.uid);
        if (locationSubscription) {
          locationSubscription.remove();
        }
        setLocationSubscription(null);
        setLocationTracking(false);
      }
    } catch (error) {
      console.error('Error toggling location tracking:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [locationSubscription]);

  const navigateToScreen = (screenName: 'HelpCenter' | 'Feedback' | 'SupportMessage' | 'TermsOfService' | 'PrivacyPolicy' | 'DeactivateAccount') => {
    navigation.navigate(screenName);
  };

  const handleLogout = () => {
    logout();
  };

  const pickProfilePicture = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const imageUri = result.assets?.[0].uri;
        if (user?.uid) {
          const uploadedUrl = await uploadProfilePicture(user.uid, imageUri);
          setBusinessData((prev: any) => ({
            ...prev,
            avatar: uploadedUrl,
          }));
        }
      }
    } catch (error) {
      console.error('Error picking profile picture:', error);
    }
  };

  const transformToBusinessProfile = () => {
    return {
      name: businessData.name || '',
      description: businessData.description || '',
      address: businessData.address || '',
      phone: businessData.phone || '',
      email: businessData.email || '',
      website: businessData.website || '',
      logo: businessData.avatar || '',
      coverImage: businessData.coverImage || '',
      gallery: businessData.gallery || [],
      categories: businessData.categories || [],
      processingTime: 30,
      acceptsCash: true,
      acceptsCard: true,
      acceptsMobileMoney: true,
    };
  };

  const defaultOperatingHours = [
    { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '22:00', isSpecialHours: false },
    { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '22:00', isSpecialHours: false },
    { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '22:00', isSpecialHours: false },
    { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '22:00', isSpecialHours: false },
    { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '22:00', isSpecialHours: false },
    { day: 'Saturday', isOpen: true, openTime: '09:00', closeTime: '22:00', isSpecialHours: false },
    { day: 'Sunday', isOpen: true, openTime: '09:00', closeTime: '22:00', isSpecialHours: false },
  ];

  const handleProfileChange = async (updatedProfile: any) => {
    if (!user?.uid) return;
    try {
      await updateSellerProfile(user.uid, updatedProfile);
      setBusinessData((prev: any) => ({
        ...prev,
        ...updatedProfile,
      }));
      setBusinessSettingsModal(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleOperatingHoursChange = async (updatedHours: any[]) => {
    if (!user?.uid) return;
    try {
      await updateSellerProfile(user.uid, { operatingHours: updatedHours });
      setBusinessData((prev: any) => ({
        ...prev,
        operatingHours: updatedHours,
      }));
    } catch (error) {
      console.error('Error updating operating hours:', error);
    }
  };

  const renderRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <MaterialIcons 
            key={i}
            name="star" 
            size={16} 
            color={COLORS.primary} 
          />
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <MaterialIcons 
            key={i} 
            name="star-half" 
            size={16} 
            color={COLORS.primary} 
          />
        );
      } else {
        stars.push(
          <MaterialIcons 
            key={i} 
            name="star-outline" 
            size={16} 
            color={COLORS.primary} 
          />
        );
      }
    }
    
    return stars;
  };

  if (loading || !businessData) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Animatable.View animation="fadeIn" duration={800} style={styles.loadingContent}>
          <MaterialCommunityIcons 
            name="store" 
            size={64} 
            color={theme.colors.primary} 
          />
          <Text variant="titleMedium" style={[styles.loadingText, { color: theme.colors.onSurface }]}>
            Loading profile...
          </Text>
        </Animatable.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent"
        translucent={true}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Business Header */}
        <Animatable.View animation="fadeInDown" duration={800} style={styles.coverContainer}>
          <Image 
            source={{ uri: businessData.coverImage }} 
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.darkOverlay} />
          
          <View style={styles.businessOverlay}>
            <View style={styles.businessAvatarContainer}>
              <TouchableOpacity onPress={pickProfilePicture} style={styles.avatarTouchable}>
                <Avatar.Image
                  source={{ uri: businessData.avatar }}
                  size={88}
                  style={styles.businessAvatar}
                />
                <View style={[styles.editAvatarButton, { backgroundColor: theme.colors.primary }]}>
                  <MaterialIcons name="edit" size={16} color="white" />
                </View>
              </TouchableOpacity>
              <Chip 
                mode={businessData.isOpen ? 'flat' : 'outlined'}
                style={[styles.statusChip, { 
                  backgroundColor: businessData.isOpen ? COLORS.success : 'transparent',
                  borderColor: businessData.isOpen ? 'transparent' : theme.colors.outline
                }]}
                textStyle={{ color: businessData.isOpen ? 'white' : theme.colors.outline }}
              >
                {businessData.isOpen ? 'Open' : 'Closed'}
              </Chip>
            </View>
            
            <View style={styles.businessBasicInfo}>
              <Text 
                variant="headlineSmall" 
                style={[styles.businessName, { color: '#fff' }]}
                numberOfLines={1}
              >
                {businessData.name}
              </Text>
              <View style={styles.ratingContainer}>
                {renderRatingStars(businessData.rating)}
                <Text 
                  variant="bodyMedium" 
                  style={[styles.ratingText, { color: 'rgba(255,255,255,0.8)' }]}
                >
                  {businessData.rating} ({businessData.reviews} reviews)
                </Text>
              </View>
            </View>
          </View>
        </Animatable.View>

        {/* Quick Stats */}
        <Animatable.View animation="fadeInUp" delay={200} duration={600} style={styles.statsContainer}>
          <Surface style={[styles.statsCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="currency-ngn" size={24} color={theme.colors.primary} />
              <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.primary }]}>
                {businessData.totalSales?.toLocaleString() || '0'}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Total Sales
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="star" size={24} color={theme.colors.primary} />
              <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.primary }]}>
                {businessData.rating || '0.0'}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Rating
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="message-text" size={24} color={theme.colors.primary} />
              <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.primary }]}>
                {businessData.reviews || '0'}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Reviews
              </Text>
            </View>
          </Surface>
        </Animatable.View>

        {/* Business Information */}
        <Animatable.View animation="fadeInUp" delay={400} duration={600} style={styles.sectionContainer}>
          <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Business Information
              </Text>
              <Button
                mode="text"
                onPress={() => setBusinessSettingsModal(true)}
                icon="pencil"
                textColor={theme.colors.primary}
              >
                Edit
              </Button>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={[styles.infoText, { color: theme.colors.onSurface }]}>
                {businessData.address}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="email" size={20} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={[styles.infoText, { color: theme.colors.onSurface }]}>
                {businessData.email}
              </Text>
            </View>
            
            <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
              {businessData.description}
            </Text>
          </Surface>
        </Animatable.View>

        {/* Categories */}
        <Animatable.View animation="fadeInUp" delay={500} duration={600} style={styles.sectionContainer}>
          <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Categories
              </Text>
              <Button
                mode="text"
                onPress={() => navigation.navigate('Products')}
                icon="plus"
                textColor={theme.colors.primary}
              >
                Manage
              </Button>
            </View>
            
            <View style={styles.categoriesContainer}>
              {businessData.categories?.map((category: string) => (
                <Chip
                  key={category}
                  mode="outlined"
                  style={[styles.categoryChip, { borderColor: theme.colors.primary }]}
                  textStyle={{ color: theme.colors.primary }}
                >
                  {category}
                </Chip>
              ))}
              {(!businessData.categories || businessData.categories.length === 0) && (
                <Text variant="bodySmall" style={[styles.emptyCategories, { color: theme.colors.onSurfaceVariant }]}>
                  No categories added yet
                </Text>
              )}
            </View>
          </Surface>
        </Animatable.View>

        {/* Quick Actions */}
        <Animatable.View animation="fadeInUp" delay={600} duration={600} style={styles.sectionContainer}>
          <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Quick Actions
            </Text>
            
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={[styles.actionCard, { backgroundColor: theme.colors.surfaceVariant }]}
                onPress={() => navigation.navigate('Products')}
              >
                <MaterialCommunityIcons name="food" size={32} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={[styles.actionText, { color: theme.colors.onSurface }]}>
                  Manage Menu
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionCard, { backgroundColor: theme.colors.surfaceVariant }]}
                onPress={() => navigation.navigate('Orders')}
              >
                <MaterialCommunityIcons name="clipboard-list" size={32} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={[styles.actionText, { color: theme.colors.onSurface }]}>
                  View Orders
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionCard, { backgroundColor: theme.colors.surfaceVariant }]}
                onPress={() => navigation.navigate('Messages')}
              >
                <MaterialCommunityIcons name="message" size={32} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={[styles.actionText, { color: theme.colors.onSurface }]}>
                  Messages
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionCard, { backgroundColor: theme.colors.surfaceVariant }]}
                onPress={() => setBusinessSettingsModal(true)}
              >
                <MaterialCommunityIcons name="cog" size={32} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={[styles.actionText, { color: theme.colors.onSurface }]}>
                  Settings
                </Text>
              </TouchableOpacity>
            </View>
          </Surface>
        </Animatable.View>

        {/* Verification Section */}
        {businessData.verificationStatus === 'not_submitted' && (<Animatable.View animation="fadeInUp" delay={700} duration={600} style={styles.sectionContainer}>
            <Surface style={[styles.verificationCard, { backgroundColor: COLORS.warning + '15' }]} elevation={1}>
              <MaterialCommunityIcons name="shield-alert" size={24} color={COLORS.warning} />
              <Text variant="bodyMedium" style={[styles.verificationText, { color: theme.colors.onSurface }]}>
                NIN verification required to start selling
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Verification', { userRole: 'seller' })}
                icon="shield-check"
                style={[styles.verificationButton, { backgroundColor: COLORS.warning }]}
              >
                Verify NIN
              </Button>
            </Surface>
          </Animatable.View>
        )}

        {businessData.verificationStatus === 'rejected' && (<Animatable.View animation="fadeInUp" delay={700} duration={600} style={styles.sectionContainer}>
            <Surface style={[styles.verificationCard, { backgroundColor: COLORS.error + '15' }]} elevation={1}>
              <MaterialCommunityIcons name="shield-cross" size={24} color={COLORS.error} />
              <Text variant="bodyMedium" style={[styles.verificationText, { color: theme.colors.onSurface }]}>
                NIN verification was rejected
              </Text>
              <Text variant="bodySmall" style={[styles.verificationSubtext, { color: theme.colors.onSurfaceVariant }]}>
                Please check your details and try again
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Verification', { userRole: 'seller' })}
                icon="shield-refresh"
                style={[styles.verificationButton, { backgroundColor: COLORS.error }]}
              >
                Try Again
              </Button>
            </Surface>
          </Animatable.View>
        )}

        {businessData.verificationStatus === 'pending' && (
          <Animatable.View animation="fadeInUp" delay={700} duration={600} style={styles.sectionContainer}>
            <Surface style={[styles.verificationCard, { backgroundColor: COLORS.info + '15' }]} elevation={1}>
              <MaterialCommunityIcons name="clock" size={24} color={COLORS.info} />
              <Text variant="bodyMedium" style={[styles.verificationText, { color: theme.colors.onSurface }]}>
                NIN verification is being reviewed
              </Text>
              <Text variant="bodySmall" style={[styles.verificationSubtext, { color: theme.colors.onSurfaceVariant }]}>
                This usually takes 24-48 hours
              </Text>
            </Surface>
          </Animatable.View>
        )}

        {businessData.verificationStatus === 'approved' && (
          <Animatable.View animation="fadeInUp" delay={700} duration={600} style={styles.sectionContainer}>
            <Surface style={[styles.verificationCard, { backgroundColor: COLORS.success + '15' }]} elevation={1}>
              <MaterialCommunityIcons name="shield-check" size={24} color={COLORS.success} />
              <Text variant="bodyMedium" style={[styles.verificationText, { color: theme.colors.onSurface }]}>
                NIN verification approved
              </Text>
            </Surface>
          </Animatable.View>
        )}

        {/* Settings Section */}
        <Animatable.View animation="fadeInUp" delay={800} duration={600} style={styles.sectionContainer}>
          <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Settings
            </Text>
            
            <List.Item
              title="Dark Mode"
              titleStyle={{ color: theme.colors.onSurface }}
              left={props => <List.Icon {...props} icon="theme-light-dark" color={theme.colors.primary} />}
              right={() => (
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  color={theme.colors.primary}
                />
              )}
            />
            
            <List.Item
              title="Notifications"
              titleStyle={{ color: theme.colors.onSurface }}
              left={props => <List.Icon {...props} icon="bell" color={theme.colors.primary} />}
              right={() => (
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  color={theme.colors.primary}
                />
              )}
            />

            <List.Item
              title="Location Tracking"
              titleStyle={{ color: theme.colors.onSurface }}
              left={props => <List.Icon {...props} icon="map-marker" color={theme.colors.primary} />}
              right={() => (
                <Switch
                  value={locationTracking}
                  onValueChange={handleLocationTrackingToggle}
                  color={theme.colors.primary}
                />
              )}
            />
          </Surface>
        </Animatable.View>

        {/* Support Section */}
        <Animatable.View animation="fadeInUp" delay={900} duration={600} style={styles.sectionContainer}>
          <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Support
            </Text>
            
            <List.Item
              title="Help Center"
              titleStyle={{ color: theme.colors.onSurface }}
              left={props => <List.Icon {...props} icon="help-circle" color={theme.colors.primary} />}
              onPress={() => navigateToScreen('HelpCenter')}
            />
            
            <List.Item
              title="Contact Support"
              titleStyle={{ color: theme.colors.onSurface }}
              left={props => <List.Icon {...props} icon="headset" color={theme.colors.primary} />}
              onPress={() => navigateToScreen('SupportMessage')}
            />
            
            <List.Item
              title="Submit Feedback"
              titleStyle={{ color: theme.colors.onSurface }}
              left={props => <List.Icon {...props} icon="message-text" color={theme.colors.primary} />}
              onPress={() => navigateToScreen('Feedback')}
            />
            
          </Surface>
        </Animatable.View>

        {/* Legal Section */}
        <Animatable.View animation="fadeInUp" delay={1000} duration={600} style={styles.sectionContainer}>
          <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Legal
            </Text>
            
            <List.Item
              title="Terms of Service"
              titleStyle={{ color: theme.colors.onSurface }}
              left={props => <List.Icon {...props} icon="file-document" color={theme.colors.primary} />}
              onPress={() => navigateToScreen('TermsOfService')}
            />
            
            <List.Item
              title="Privacy Policy"
              titleStyle={{ color: theme.colors.onSurface }}
              left={props => <List.Icon {...props} icon="shield-check" color={theme.colors.primary} />}
              onPress={() => navigateToScreen('PrivacyPolicy')}
            />
          </Surface>
        </Animatable.View>

        {/* Account Section */}
        <Animatable.View animation="fadeInUp" delay={1100} duration={600} style={styles.sectionContainer}>
          <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Account
            </Text>
            
            <List.Item
              title="Deactivate Account"
              titleStyle={{ color: theme.colors.error }}
              left={props => <List.Icon {...props} icon="account-remove" color={theme.colors.error} />}
              onPress={() => navigateToScreen('DeactivateAccount')}
            />
            
            <List.Item
              title="Sign Out"
              titleStyle={{ color: theme.colors.error }}
              left={props => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
              onPress={handleLogout}
            />
          </Surface>
        </Animatable.View>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={[styles.version, { color: theme.colors.onSurfaceVariant }]}>
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Business Settings Modal */}
      <Portal>
        <Modal
          visible={businessSettingsModal}
          onDismiss={() => setBusinessSettingsModal(false)}
          contentContainerStyle={[styles.businessSettingsModal, { backgroundColor: theme.colors.surface }]}
        >
          <BusinessSettings
            profile={transformToBusinessProfile()}
            operatingHours={defaultOperatingHours}
            onProfileChange={handleProfileChange}
            onOperatingHoursChange={handleOperatingHoursChange}
            onClose={() => setBusinessSettingsModal(false)}
          />
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  coverContainer: {
    height: 200,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  businessOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  businessAvatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  avatarTouchable: {
    position: 'relative',
  },
  businessAvatar: {
    backgroundColor: 'transparent',
  },
  statusChip: {
    borderRadius: 16,
  },
  businessBasicInfo: {
    marginTop: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 8,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 20,
  },
  profileSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  businessEmail: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 8,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  verificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E9ECEF',
    marginHorizontal: 16,
  },
  sectionContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: '#1A1A1A',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  infoIcon: {
    marginRight: 12,
    color: '#007AFF',
  },
  infoText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 1,
  },
  description: {
    marginTop: 12,
    lineHeight: 22,
    color: '#6C757D',
    fontSize: 14,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  categoryChip: {
    margin: 4,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  emptyCategories: {
    fontStyle: 'italic',
    marginTop: 8,
    color: '#6C757D',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    width: (width - 88) / 2,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    marginBottom: 8,
    color: '#007AFF',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1A1A1A',
  },
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  verificationIcon: {
    color: '#856404',
  },
  // verificationText: {
  //   flex: 1,
  //   marginLeft: 12,
  //   fontWeight: '600',
  //   color: '#856404',
  // },
  verificationButton: {
    marginLeft: 16,
    backgroundColor: '#856404',
    borderRadius: 12,
  },
  verificationSubtext: {
    marginLeft: 12,
    marginTop: 4,
    fontSize: 12,
    color: '#856404',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  version: {
    fontWeight: '400',
    color: '#6C757D',
    fontSize: 14,
  },
  businessSettingsModal: {
    margin: 20,
    borderRadius: 20,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  locationToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    marginBottom: 20,
  },
  locationToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  locationToggleSubtext: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C757D',
  },
  // },
  // loadingContent: {
  //   alignItems: 'center',
  //   justifyContent: 'center',
  // },
  // scrollView: {
  //   flex: 1,
  // },
  // coverContainer: {
  //   height: 200,
  //   width: '100%',
  //   position: 'relative',
  // },
  // coverImage: {
  //   width: '100%',
  //   height: '100%',
  // },
  // darkOverlay: {
  //   position: 'absolute',
  //   top: 0,
  //   left: 0,
  //   right: 0,
  //   bottom: 0,
  //   backgroundColor: 'rgba(0,0,0,0.4)',
  // },
  // businessOverlay: {
  //   position: 'absolute',
  //   bottom: 0,
  //   left: 0,
  //   right: 0,
  //   padding: 16,
  // },
  // businessAvatarContainer: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'space-between',
  //   marginBottom: 12,
  // },
  // avatarTouchable: {
  //   position: 'relative',
  // },
  // businessAvatar: {
  //   backgroundColor: 'transparent',
  // },
  // statusChip: {
  //   borderRadius: 16,
  // },
  // businessBasicInfo: {
  //   marginTop: 8,
  // },
  // ratingContainer: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   marginTop: 4,
  // },
  // ratingText: {
  //   marginLeft: 8,
  // },
  // statsCard: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-around',
  //   padding: 16,
  //   borderRadius: 16,
  // },
  // statNumber: {
  //   fontSize: 24,
  //   fontWeight: 'bold',
  //   marginVertical: 4,
  // },
});

export default ProfileScreen; 

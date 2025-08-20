import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Text, Button, TextInput, Switch, Chip, IconButton, Portal, Modal, SegmentedButtons, HelperText, Surface, Divider, ProgressBar } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { validateField, ValidationRule } from '../utils/validation';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

interface OperatingHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  isSpecialHours: boolean;
}

interface BusinessProfile {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  coverImage: string;
  gallery: string[];
  categories: string[];
  processingTime: number;
  acceptsCash: boolean;
  acceptsCard: boolean;
  acceptsMobileMoney: boolean;
}

interface BusinessFormData {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  processingTime: string;
  acceptsCash: boolean;
  acceptsCard: boolean;
  acceptsMobileMoney: boolean;
  logo?: string;
  coverImage?: string;
  gallery?: string[];
}

interface BusinessSettingsProps {
  profile: BusinessProfile;
  operatingHours: OperatingHours[];
  onProfileChange: (profile: BusinessProfile) => void;
  onOperatingHoursChange: (hours: OperatingHours[]) => void;
  onClose: () => void;
}

const BusinessSettings: React.FC<BusinessSettingsProps> = (props: BusinessSettingsProps) => {
  const { profile, operatingHours, onProfileChange, onOperatingHoursChange, onClose } = props;
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [hoursModalVisible, setHoursModalVisible] = useState(false);
  const [galleryModalVisible, setGalleryModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<OperatingHours | null>(null);
  
  const [profileFormData, setProfileFormData] = useState<BusinessFormData & { gallery: string[] }>({
    gallery: profile.gallery || [],
    name: profile.name,
    description: profile.description,
    address: profile.address,
    phone: profile.phone,
    email: profile.email,
    website: profile.website,
    processingTime: profile.processingTime.toString(),
    acceptsCash: profile.acceptsCash,
    acceptsCard: profile.acceptsCard,
    acceptsMobileMoney: profile.acceptsMobileMoney,
  });

  const [hoursFormData, setHoursFormData] = useState({
    isOpen: true,
    openTime: '09:00',
    closeTime: '22:00',
    isSpecialHours: false,
  });

  const [errors, setErrors] = useState<{ [key: string]: Array<string> }>({
    name: [],
    description: [],
    address: [],
    phone: [],
    email: [],
    website: [],
    processingTime: [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  const validationRules: Record<string, ValidationRule> = {
    name: {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    description: {
      minLength: 10,
      maxLength: 500
    },
    address: {
      required: true,
      minLength: 10,
      maxLength: 200
    },
    phone: {
      required: true,
      phone: true
    },
    email: {
      required: true,
      email: true
    },
    website: {
      url: true
    },
    processingTime: {
      numeric: true,
      custom: (value: string) => {
        const num = parseInt(value);
        if (num < 5 || num > 180) {
          return 'Processing time must be between 5 and 180 minutes';
        }
        return null;
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string[]> = {};

    Object.keys(validationRules).forEach(field => {
      const value = profileFormData?.[field as keyof typeof profileFormData];
      if (typeof value === 'string') {
        const rules = validationRules[field];
        if (rules) {
          const result = validateField(value, rules);
          newErrors[field] = result.errors;
        }
      }
    });

    setErrors(newErrors);
    return Object.values(newErrors).every(errorArray => errorArray.length === 0);
  };

  const handleFieldChange = (field: keyof BusinessFormData, value: string) => {
    setProfileFormData((prev) => ({ ...prev, [field]: value }));
    
    if (errors?.[field]?.length) {
      setErrors((prev) => ({ ...prev, [field]: [] }));
    }
  };

  const hasFieldError = (field: string): boolean => {
    return Array.isArray(errors[field]) && errors[field].length > 0;
  };
  
  const getFieldError = (field: string): string => {
    const fieldErrors = errors[field];
    return Array.isArray(fieldErrors) && fieldErrors.length > 0 ? fieldErrors[0] : '';
  };

  

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
    'Friday', 'Saturday', 'Sunday'
  ];

  const pickImage = async (type: 'logo' | 'cover' | 'gallery') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : type === 'cover' ? [16, 9] : [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const imageUri = result.assets?.[0].uri;
        
        if (type === 'logo') {
          setProfileFormData(prev => ({ ...prev, logo: imageUri }));
        } else if (type === 'cover') {
          setProfileFormData(prev => ({ ...prev, coverImage: imageUri }));
        } else if (type === 'gallery') {
          setProfileFormData(prev => ({ 
            ...prev, 
            gallery: [...(prev.gallery || []), imageUri] 
          }));
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeGalleryImage = (index: number) => {
    setProfileFormData(prev => ({
      ...prev, gallery: prev.gallery.filter((_, i) => i !== index)
    }));
  };

  const handleEditHours = (day: OperatingHours) => {
    setSelectedDay(day);
    setHoursFormData({
      isOpen: day.isOpen,
      openTime: day.openTime,
      closeTime: day.closeTime,
      isSpecialHours: day.isSpecialHours,
    });
    setHoursModalVisible(true);
  };

  const handleSaveHours = () => {
    if (selectedDay) {
      const updatedHours = operatingHours.map(hour => 
        hour.day === selectedDay.day 
          ? { ...hour, ...hoursFormData }
          : hour
      );
      onOperatingHoursChange(updatedHours);
      setHoursModalVisible(false);
      setSelectedDay(null);
    }
  };

  const getCurrentStatus = () => {
    const now = new Date();
    const currentDay = daysOfWeek?.[now.getDay() === 0 ? 6 : now.getDay() - 1];
    const currentTime = now.toTimeString().slice(0, 5);
    
    const todayHours = operatingHours.find(hour => hour.day === currentDay);
    if (!todayHours || !todayHours.isOpen) return 'Closed';
    
    if (currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime) {
      return 'Open';
    }
    
    return 'Closed';
  };

  const handleSaveProfile = async (updatedProfile: BusinessProfile) => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving.');
      return;
    }

    setIsSaving(true);
    setSaveProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSaveProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      await onProfileChange(updatedProfile);
      
      setSaveProgress(100);
      setTimeout(() => {
        setIsSaving(false);
        setSaveProgress(0);
        onClose();
        Alert.alert('Success', 'Profile updated successfully!');
      }, 500);

    } catch (error) {
      setIsSaving(false);
      setSaveProgress(0);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (<View style={styles.tabContent}>
            <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Basic Information
              </Text>
              
              <View style={styles.formGrid}>
                <View style={styles.formRow}>
                  <TextInput
                    label="Business Name"
                    value={profileFormData.name}
                    onChangeText={(text) => handleFieldChange('name', text)}
                    mode="outlined"
                    style={styles.formInput}
                    error={hasFieldError('name')}
                    left={<TextInput.Icon icon="store" />}
                  />
                  {hasFieldError('name') && (
                    <HelperText type="error" visible={true}>
                      {getFieldError('name')}
                    </HelperText>
                  )}
                </View>

                <View style={styles.formRow}>
                  <TextInput
                    label="Description"
                    value={profileFormData.description}
                    onChangeText={(text) => handleFieldChange('description', text)}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    style={styles.formInput}
                    error={hasFieldError('description')}
                    left={<TextInput.Icon icon="text" />}
                  />
                  {hasFieldError('description') && (
                    <HelperText type="error" visible={true}>
                      {getFieldError('description')}
                    </HelperText>
                  )}
                </View>

                <View style={styles.formRow}>
                  <TextInput
                    label="Address"
                    value={profileFormData.address}
                    onChangeText={(text) => handleFieldChange('address', text)}
                    mode="outlined"
                    style={styles.formInput}
                    error={hasFieldError('address')}
                    left={<TextInput.Icon icon="map-marker" />}
                  />
                  {hasFieldError('address') && (
                    <HelperText type="error" visible={hasFieldError('address')}>
                      {getFieldError('address')}
                    </HelperText>
                  )}
                </View>

                <View style={styles.formRow}>
                  <TextInput
                    label="Phone"
                    value={profileFormData.phone}
                    onChangeText={(text) => handleFieldChange('phone', text)}
                    mode="outlined"
                    style={styles.formInput}
                    error={hasFieldError('phone')}
                    left={<TextInput.Icon icon="phone" />}
                    keyboardType="phone-pad"
                  />
                  {hasFieldError('phone') && (
                    <HelperText type="error" visible={hasFieldError('phone')}>
                      {getFieldError('phone')}
                    </HelperText>
                  )}
                </View>

                <View style={styles.formRow}>
                  <TextInput
                    label="Email"
                    value={profileFormData.email}
                    onChangeText={(text) => handleFieldChange('email', text)}
                    mode="outlined"
                    style={styles.formInput}
                    error={hasFieldError('email')}
                    left={<TextInput.Icon icon="email" />}
                    keyboardType="email-address"
                  />
                  {hasFieldError('email') && (
                    <HelperText type="error" visible={hasFieldError('email')}>
                      {getFieldError('email')}
                    </HelperText>
                  )}
                </View>

                <View style={styles.formRow}>
                  <TextInput
                    label="Website (Optional)"
                    value={profileFormData.website}
                    onChangeText={(text) => handleFieldChange('website', text)}
                    mode="outlined"
                    style={styles.formInput}
                    error={hasFieldError('website')}
                    left={<TextInput.Icon icon="web" />}
                    keyboardType="url"
                  />
                  {hasFieldError('website') && (
                    <HelperText type="error" visible={hasFieldError('website')}>
                      {getFieldError('website')}
                    </HelperText>
                  )}
                </View>

                <View style={styles.formRow}>
                  <TextInput
                    label="Processing Time (minutes)"
                    value={profileFormData.processingTime}
                    onChangeText={(text) => handleFieldChange('processingTime', text)}
                    mode="outlined"
                    style={styles.formInput}
                    error={hasFieldError('processingTime')}
                    left={<TextInput.Icon icon="clock" />}
                    keyboardType="numeric"
                  />
                  {hasFieldError('processingTime') && (
                    <HelperText type="error" visible={hasFieldError('processingTime')}>
                      {getFieldError('processingTime')}
                    </HelperText>
                  )}
                </View>
              </View>
            </Surface>

            <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Business Images
              </Text>
              
              <View style={styles.imagesSection}>
                <TouchableOpacity 
                  style={[styles.imageUploadCard, { borderColor: theme.colors.primary }]}
                  onPress={() => pickImage('logo')}
                >
                  <Image 
                    source={{ uri: profileFormData.logo || profile.logo }} 
                    style={styles.uploadedImage}
                  />
                  <View style={styles.imageOverlay}>
                    <MaterialIcons name="edit" size={24} color="white" />
                    <Text style={styles.imageOverlayText}>Logo</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.imageUploadCard, { borderColor: theme.colors.primary }]}
                  onPress={() => pickImage('cover')}
                >
                  <Image 
                    source={{ uri: profileFormData.coverImage || profile.coverImage }} 
                    style={styles.uploadedImage}
                  />
                  <View style={styles.imageOverlay}>
                    <MaterialIcons name="edit" size={24} color="white" />
                    <Text style={styles.imageOverlayText}>Cover</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Button
                mode="outlined"
                onPress={() => setGalleryModalVisible(true)}
                icon="image-multiple"
                style={styles.galleryButton}
              >
                Manage Gallery ({profileFormData.gallery?.length || 0} images)
              </Button>
            </Surface>
          </View>
        );

      case 'hours':
        return (
          <View style={styles.tabContent}>
            <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
              <View style={styles.hoursHeader}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Operating Hours
                </Text>
                <Text variant="bodySmall" style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  Current Status: {getCurrentStatus()}
                </Text>
              </View>
              
              <View style={styles.hoursGrid}>
                {operatingHours.map(day => (<TouchableOpacity
                    key={day.day}
                    style={[styles.hourCard, { 
                      backgroundColor: day.isOpen ? COLORS.success + '15' : theme.colors.surface 
                    }]}
                    onPress={() => handleEditHours(day)}
                  >
                    <View style={styles.hourCardHeader}>
                      <Text variant="bodyMedium" style={[styles.dayText, { color: theme.colors.onSurface }]}>
                        {day.day}
                      </Text>
                      <Chip 
                        mode={day.isOpen ? 'flat' : 'outlined'}
                        style={[styles.statusChip, { 
                          backgroundColor: day.isOpen ? COLORS.success : 'transparent',
                          borderColor: day.isOpen ? 'transparent' : theme.colors.outline
                        }]}
                        textStyle={{ color: day.isOpen ? 'white' : theme.colors.outline }}
                      >
                        {day.isOpen ? 'Open' : 'Closed'}
                      </Chip>
                    </View>
                    
                    {day.isOpen && (
                      <View style={styles.hourCardContent}>
                        <Text variant="bodySmall" style={[styles.timeText, { color: theme.colors.onSurfaceVariant }]}>
                          {day.openTime} - {day.closeTime}
                        </Text>
                        {day.isSpecialHours && (
                          <Chip mode="outlined" style={styles.specialHoursChip}>
                            Special Hours
                          </Chip>
                        )}
                      </View>
                    )}
                    
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => handleEditHours(day)}
                      iconColor={theme.colors.primary}
                      style={styles.editHourButton}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </Surface>
          </View>
        );

      case 'payment':
        return (<View style={styles.tabContent}>
            <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Payment Methods
              </Text>
              
              <View style={styles.paymentMethods}>
                <View style={styles.paymentMethod}>
                  <View style={styles.paymentMethodInfo}>
                    <MaterialCommunityIcons name="cash" size={24} color={COLORS.success} />
                    <Text variant="bodyLarge" style={[styles.paymentMethodText, { color: theme.colors.onSurface }]}>
                      Cash Payment
                    </Text>
                  </View>
                  <Switch
                    value={profileFormData.acceptsCash}
                    onValueChange={(value) => setProfileFormData(prev => ({ ...prev, acceptsCash: value }))}
                    color={COLORS.success}
                  />
                </View>

                <Divider style={styles.paymentDivider} />

                <View style={styles.paymentMethod}>
                  <View style={styles.paymentMethodInfo}>
                    <MaterialCommunityIcons name="credit-card" size={24} color={COLORS.info} />
                    <Text variant="bodyLarge" style={[styles.paymentMethodText, { color: theme.colors.onSurface }]}>
                      Card Payment
                    </Text>
                  </View>
                  <Switch
                    value={profileFormData.acceptsCard}
                    onValueChange={(value) => setProfileFormData(prev => ({ ...prev, acceptsCard: value }))}
                    color={COLORS.info}
                  />
                </View>

                <Divider style={styles.paymentDivider} />

                <View style={styles.paymentMethod}>
                  <View style={styles.paymentMethodInfo}>
                    <MaterialCommunityIcons name="cellphone" size={24} color={COLORS.warning} />
                    <Text variant="bodyLarge" style={[styles.paymentMethodText, { color: theme.colors.onSurface }]}>
                      Mobile Money
                    </Text>
                  </View>
                  <Switch
                    value={profileFormData.acceptsMobileMoney}
                    onValueChange={(value) => setProfileFormData(prev => ({ ...prev, acceptsMobileMoney: value }))}
                    color={COLORS.warning}
                  />
                </View>
              </View>
            </Surface>
          </View>
        );

      default:
        return null;
    }
  };

  return (<View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text variant="headlineSmall" style={[styles.headerTitle, { color: 'white' }]}>
          Business Settings
        </Text>
        <IconButton
          icon="close"
          size={24}
          onPress={() => onClose()}
          iconColor="white"
        />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'profile', label: 'Profile', icon: 'account' },
            { value: 'hours', label: 'Hours', icon: 'clock' },
            { value: 'payment', label: 'Payment', icon: 'credit-card' },
          ]}
          style={styles.tabButtons}
        />
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        {isSaving && (
          <View style={styles.saveProgress}>
            <ProgressBar progress={saveProgress / 100} color={theme.colors.primary} />
            <Text variant="bodySmall" style={[styles.saveProgressText, { color: theme.colors.onSurfaceVariant }]}>
              Saving... {saveProgress}%
            </Text>
          </View>
        )}
        
        <Button
          mode="contained"
          onPress={() => handleSaveProfile({
            ...profile,
            ...profileFormData,
            processingTime: parseInt(profileFormData.processingTime),
          })}
          disabled={isSaving}
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          icon="content-save"
          loading={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </View>

      {/* Operating Hours Modal */}
      <Portal>
        <Modal
          visible={hoursModalVisible}
          onDismiss={() => setHoursModalVisible(false)}
          contentContainerStyle={[styles.hoursModal, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.fullScreenContainer}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Edit {selectedDay?.day} Hours
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setHoursModalVisible(false)}
              iconColor={theme.colors.onSurfaceVariant}
            />
          </View>
          
          <View style={styles.hoursForm}>
            <View style={styles.hoursFormRow}>
              <Text variant="bodyMedium" style={[styles.formLabel, { color: theme.colors.onSurface }]}>
                Open on {selectedDay?.day}?
              </Text>
              <Switch
                value={hoursFormData.isOpen}
                onValueChange={(value) => setHoursFormData(prev => ({ ...prev, isOpen: value }))}
                color={theme.colors.primary}
              />
            </View>
            
            {hoursFormData.isOpen && (<>
                <View style={styles.hoursFormRow}>
                  <Text variant="bodyMedium" style={[styles.formLabel, { color: theme.colors.onSurface }]}>
                    Opening Time
                  </Text>
                  <TextInput
                    value={hoursFormData.openTime}
                    onChangeText={(text) => setHoursFormData(prev => ({ ...prev, openTime: text }))}
                    mode="outlined"
                    style={styles.timeInput}
                    left={<TextInput.Icon icon="clock-outline" />}
                  />
                </View>
                
                <View style={styles.hoursFormRow}>
                  <Text variant="bodyMedium" style={[styles.formLabel, { color: theme.colors.onSurface }]}>
                    Closing Time
                  </Text>
                  <TextInput
                    value={hoursFormData.closeTime}
                    onChangeText={(text) => setHoursFormData(prev => ({ ...prev, closeTime: text }))}
                    mode="outlined"
                    style={styles.timeInput}
                    left={<TextInput.Icon icon="clock-outline" />}
                  />
                </View>
                
                <View style={styles.hoursFormRow}>
                  <Text variant="bodyMedium" style={[styles.formLabel, { color: theme.colors.onSurface }]}>
                    Special Hours
                  </Text>
                  <Switch
                    value={hoursFormData.isSpecialHours}
                    onValueChange={(value) => setHoursFormData(prev => ({ ...prev, isSpecialHours: value }))}
                    color={theme.colors.primary}
                  />
                </View>
              </>
            )}
          </View>
          
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setHoursModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveHours}
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
            >
              Save Hours
            </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Gallery Modal */}
      <Portal>
        <Modal
          visible={galleryModalVisible}
          onDismiss={() => setGalleryModalVisible(false)}
          contentContainerStyle={[styles.galleryModal, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.fullScreenContainer}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Gallery Management
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setGalleryModalVisible(false)}
              iconColor={theme.colors.onSurfaceVariant}
            />
          </View>
          
          <ScrollView style={styles.galleryContent} showsVerticalScrollIndicator={false}>
            <View style={styles.galleryGrid}>
              {profileFormData.gallery?.map((image, index) => (<View key={index} style={styles.galleryItem}>
                  <Image source={{ uri: image }} style={styles.galleryImage} />
                  <IconButton
                    icon="close-circle"
                    size={24}
                    onPress={() => removeGalleryImage(index)}
                    iconColor={COLORS.error}
                    style={styles.removeGalleryButton}
                  />
                </View>
              ))}
              
              <TouchableOpacity 
                style={[styles.addGalleryButton, { borderColor: theme.colors.primary }]}
                onPress={() => pickImage('gallery')}
              >
                <MaterialIcons name="add-photo-alternate" size={32} color={theme.colors.primary} />
                <Text style={[styles.addGalleryText, { color: theme.colors.primary }]}>
                  Add Image
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  hoursHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Default background
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 5,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  tabContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  tabButtons: {
    backgroundColor: 'transparent',
  },
  tabButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContent: {
    marginBottom: 16,
  },
  sectionCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionSubtitle: {
    marginTop: 4,
  },
  formGrid: {
    gap: 16,
  },
  formRow: {
    gap: 8,
  },
  formInput: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  imagesSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  imageUploadCard: {
    width: (width - 48 - 12) / 2, // Adjust for gap
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlayText: {
    color: 'white',
    marginTop: 8,
  },
  galleryButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  hoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  hourCard: {
    width: (width - 48 - 12) / 2, // Adjust for gap
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  hourCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayText: {
    fontWeight: 'bold',
  },
  statusChip: {
    borderRadius: 8,
  },
  hourCardContent: {
    marginTop: 8,
  },
  timeText: {
    fontWeight: '600',
  },
  specialHoursChip: {
    marginTop: 8,
    borderRadius: 8,
  },
  editHourButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  paymentMethods: {
    gap: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentMethodText: {
    fontWeight: '600',
  },
  paymentDivider: {
    marginVertical: 12,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  saveProgress: {
    width: '100%',
    marginBottom: 16,
    alignItems: 'center',
  },
  saveProgressText: {
    marginTop: 8,
  },
  saveButton: {
    borderRadius: 8,
    width: '100%',
  },
  hoursModal: {
    width: '100%',
    height: '100%',
    margin: 0,
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  hoursForm: {
    gap: 16,
  },
  hoursFormRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formLabel: {
    fontWeight: '600',
  },
  timeInput: {
    flex: 1,
    borderRadius: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    borderRadius: 8,
  },
  galleryModal: {
    width: '100%',
    height: '100%',
    margin: 0,
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    padding: 20,
  },
  galleryContent: {
    paddingHorizontal: 10,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  galleryItem: {
    position: 'relative',
    width: (width - 48 - 12) / 2, // Adjust for gap
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeGalleryButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  addGalleryButton: {
    width: (width - 48 - 12) / 2, // Adjust for gap
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  addGalleryText: {
    marginTop: 8,
    fontSize: 12,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
});

export default BusinessSettings; 
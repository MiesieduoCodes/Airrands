import React, { useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { 
  Modal, 
  Portal, 
  Text, 
  TextInput, 
  Button, 
  Chip,
  Divider,
  IconButton,
  Snackbar,
} from 'react-native-paper';
import { COLORS } from '../constants/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import * as Location from 'expo-location';
import { haversineDistance, geocodeLocation, isWithinNigeria, calculateDistanceAndPrice } from '../utils/distance';
import { db } from '../config/firebase';
import firebase from 'firebase/compat/app';
import { useAuth } from '../contexts/AuthContext';

interface ErrandRequestModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (errandData: ErrandRequestData) => void;
  onPaymentRequired?: (errandData: ErrandRequestData, amount: number) => void;
  loading?: boolean;
}

interface ErrandRequestData {
  title: string;
  description: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  budget: string;
  pickupLocation: string;
  dropoffLocation: string;
  estimatedTime: string;
}

const ErrandRequestModal: React.FC<ErrandRequestModalProps> = ({
  visible, onDismiss, onSubmit, onPaymentRequired, loading = false
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [formData, setFormData] = useState<ErrandRequestData>({
    title: '',
    description: '',
    category: '',
    urgency: 'medium',
    budget: '',
    pickupLocation: '',
    dropoffLocation: '',
    estimatedTime: '',
  });

  const [errors, setErrors] = useState<Partial<ErrandRequestData>>({});
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [calculating, setCalculating] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const categories = [
    'Grocery Shopping',
    'Food Delivery',
    'Package Pickup',
    'Document Delivery',
    'Pharmacy',
    'Laundry',
    'Other',
  ];

  const urgencyOptions = [
    { value: 'low', label: 'Low', icon: 'clock-outline', color: COLORS.success },
    { value: 'medium', label: 'Medium', icon: 'clock', color: COLORS.warning },
    { value: 'high', label: 'High', icon: 'clock-alert', color: COLORS.error },
  ];

  const validateForm = () => {
    const newErrors: Partial<ErrandRequestData> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Title cannot exceed 100 characters';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.trim().length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.pickupLocation.trim()) {
      newErrors.pickupLocation = 'Pickup location is required';
    } else if (formData.pickupLocation.trim().length < 5) {
      newErrors.pickupLocation = 'Pickup location must be at least 5 characters';
    }
    
    if (!formData.dropoffLocation.trim()) {
      newErrors.dropoffLocation = 'Dropoff location is required';
    } else if (formData.dropoffLocation.trim().length < 5) {
      newErrors.dropoffLocation = 'Dropoff location must be at least 5 characters';
    }
    
    if (!formData.budget.trim()) {
      newErrors.budget = 'Price is required';
    } else {
      const budgetNum = parseFloat(formData.budget);
      if (isNaN(budgetNum) || budgetNum < 500) {
        newErrors.budget = 'Price must be at least ₦500';
      } else if (budgetNum > 50000) {
        newErrors.budget = 'Price cannot exceed ₦50,000';
      }
    }

    // Check if locations are the same
    if (formData.pickupLocation.trim().toLowerCase() === formData.dropoffLocation.trim().toLowerCase()) {
      newErrors.dropoffLocation = 'Pickup and dropoff locations cannot be the same';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: keyof ErrandRequestData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      setIsSubmitting(true);
      try {
        // Save to Firebase first
        const saved = await saveErrandToFirebase(formData);
        
        if (saved) {
          // If payment callback is provided, trigger payment flow
          if (onPaymentRequired) {
            const amount = parseFloat(formData.budget);
            onPaymentRequired(formData, amount);
          } else {
            // Fallback to original submit behavior
            onSubmit(formData);
          }
          
          // Reset form
          setFormData({
            title: '',
            description: '',
            category: '',
            urgency: 'medium',
            budget: '',
            pickupLocation: '',
            dropoffLocation: '',
            estimatedTime: '',
          });
          setErrors({});
          setDistance(null);
          
          // Show success message
          setSnackbarMessage('Errand request submitted successfully!');
          setSnackbarVisible(true);
          
          // Close modal after success
          setTimeout(() => {
            onDismiss();
          }, 1500);
        }
      } catch (error) {
        setSnackbarMessage('Failed to submit errand. Please try again.');
        setSnackbarVisible(true);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const isFormValid = () => {
    return formData.title.trim() && 
           formData.description.trim() && 
           formData.category && 
           formData.pickupLocation.trim() && 
           formData.dropoffLocation.trim() && 
           formData.budget.trim();
  };

  // Save errand data to Firebase
  const saveErrandToFirebase = async (errandData: ErrandRequestData) => {
    if (!user?.uid) {
      setSnackbarMessage('User not authenticated. Please log in again.');
      setSnackbarVisible(true);
      return false;
    }

    try {
      // Get coordinates for both locations using enhanced geocoding
      const [pickupCoords, dropoffCoords] = await Promise.all([
        geocodeLocation(errandData.pickupLocation),
        geocodeLocation(errandData.dropoffLocation),
      ]);

      if (!pickupCoords || !dropoffCoords) {
        setSnackbarMessage('Could not find coordinates for one or both locations. Please check the addresses.');
        setSnackbarVisible(true);
        return false;
      }

      const pickupCoordinates = {
        latitude: pickupCoords.latitude,
        longitude: pickupCoords.longitude,
      };

      const dropoffCoordinates = {
        latitude: dropoffCoords.latitude,
        longitude: dropoffCoords.longitude,
      };

      const errandDoc = {
        ...errandData,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || 'Unknown User',
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        distance: distance || 0,
        pickupCoordinates,
        dropoffCoordinates,
        runnerId: null,
        runnerName: null,
        runnerImage: null,
        acceptedAt: null,
        completedAt: null,
        paymentStatus: 'pending',
        paymentReference: null,
        urgency: errandData.urgency,
        category: errandData.category,
        estimatedTime: errandData.estimatedTime || null,
      };

      await db.collection('errands').add(errandDoc);
      return true;
    } catch (error) {
      setSnackbarMessage('Failed to save errand. Please try again.');
      setSnackbarVisible(true);
      return false;
    }
  };

  // Add effect to calculate distance and price when locations change
  React.useEffect(() => {
    const calculateDistanceAndPrice = async () => {
      setGeoError(null);
      if (
        formData.pickupLocation.trim() &&
        formData.dropoffLocation.trim()
      ) {
        setCalculating(true);
        try {
          // Use enhanced geocoding function
          const [pickupCoords, dropoffCoords] = await Promise.all([
            geocodeLocation(formData.pickupLocation),
            geocodeLocation(formData.dropoffLocation),
          ]);
          
          if (!pickupCoords || !dropoffCoords) {
            let errorMessage = 'Could not find one or both locations. ';
            if (!pickupCoords && !dropoffCoords) {
              errorMessage += 'Please check both pickup and dropoff addresses. Try adding more specific details like street name, area, or landmark.';
            } else if (!pickupCoords) {
              errorMessage += 'Could not find pickup location. Please check the pickup address and try adding more specific details.';
            } else {
              errorMessage += 'Could not find dropoff location. Please check the dropoff address and try adding more specific details.';
            }
            setGeoError(errorMessage);
            setDistance(null);
            setFormData((prev) => ({ ...prev, budget: '' }));
            setCalculating(false);
            return;
          }
          
          // Validate coordinates are within Nigeria bounds
          const isPickupValid = isWithinNigeria(pickupCoords.latitude, pickupCoords.longitude);
          const isDropoffValid = isWithinNigeria(dropoffCoords.latitude, dropoffCoords.longitude);
          
          if (!isPickupValid || !isDropoffValid) {
            setGeoError('Locations must be within Bayelsa State. Please check the addresses.');
            setDistance(null);
            setFormData((prev) => ({ ...prev, budget: '' }));
            setCalculating(false);
            return;
          }
          
          // Calculate distance and price with enhanced validation
          const dist = haversineDistance(
            pickupCoords.latitude,
            pickupCoords.longitude,
            dropoffCoords.latitude,
            dropoffCoords.longitude
          );
          const price = Math.round(dist * 1000); // ₦1000 per km
          const isValid = dist > 0 && dist <= 50; // Max 50km for errands
          
          // Validate reasonable distance (max 50km for errands)
          if (!isValid) {
            setGeoError('Distance is too far (max 50km). Please choose closer locations.');
            setDistance(null);
            setFormData((prev) => ({ ...prev, budget: '' }));
            setCalculating(false);
            return;
          }
          
          setDistance(dist);
          // Use calculated price from enhanced function
          setFormData((prev) => ({ ...prev, budget: price.toString() }));
        } catch (e) {
          setGeoError('Failed to calculate distance. Please check your internet connection and try again.');
          setDistance(null);
          setFormData((prev) => ({ ...prev, budget: '' }));
        } finally {
          setCalculating(false);
        }
      } else {
        setDistance(null);
        setFormData((prev) => ({ ...prev, budget: '' }));
      }
    };
    
    // Add debounce to avoid too many API calls
    const timeoutId = setTimeout(calculateDistanceAndPrice, 1000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.pickupLocation, formData.dropoffLocation]);

  return (<Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <ScrollView 
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
                    Request Errand
                  </Text>
                  <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                    Tell us what you need help with
                  </Text>
                </View>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={onDismiss}
                  style={styles.closeButton}
                  iconColor={theme.colors.onSurfaceVariant}
                />
              </View>

              <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

              {/* Form */}
              <View style={styles.formSection}>
                {/* Title */}
                <TextInput
                  label="Errand Title"
                  value={formData.title}
                  onChangeText={(text) => handleFieldChange('title', text)}
                  mode="outlined"
                  style={styles.input}
                  error={!!errors?.title}
                  placeholder="e.g., Pick up groceries from Shoprite"
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={theme.colors.primary}
                  theme={{ 
                    roundness: 8,
                    colors: {
                      primary: theme.colors.primary,
                      placeholder: theme.colors.onSurfaceVariant,
                      text: theme.colors.onSurface,
                      background: theme.colors.surfaceVariant,
                    }
                  }}
                  editable={!loading}
                />

                {/* Description */}
                <TextInput
                  label="Description"
                  value={formData.description}
                  onChangeText={(text) => handleFieldChange('description', text)}
                  mode="outlined"
                  style={[styles.input, styles.descriptionInput]}
                  error={!!errors?.description}
                  placeholder="Provide detailed description of what you need..."
                  multiline
                  numberOfLines={4}
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={theme.colors.primary}
                  theme={{ 
                    roundness: 8,
                    colors: {
                      primary: theme.colors.primary,
                      placeholder: theme.colors.onSurfaceVariant,
                      text: theme.colors.onSurface,
                      background: theme.colors.surfaceVariant,
                    }
                  }}
                  editable={!loading}
                />

                {/* Category */}
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Category
                </Text>
                <View style={styles.chipContainer}>
                  {categories.map((category) => (<Chip
                      key={category}
                      selected={formData.category === category}
                      onPress={() => handleFieldChange('category', category)}
                      style={[
                        styles.chip,
                        { 
                          backgroundColor: formData.category === category 
                            ? theme.colors.primary 
                            : theme.colors.surfaceVariant,
                          borderColor: theme.colors.outline
                        }
                      ]}
                      textStyle={{
                        color: formData.category === category 
                          ? theme.colors.onPrimary 
                          : theme.colors.onSurface
                      }}
                      disabled={loading}
                    >
                      {category}
                    </Chip>
                  ))}
                </View>

                {/* Urgency */}
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Urgency
                </Text>
                <View style={styles.urgencyContainer}>
                  {urgencyOptions.map((option, idx) => (<Chip
                      key={option.value}
                      icon={option.icon}
                      selected={formData.urgency === option.value}
                      onPress={() => handleFieldChange('urgency', option.value as any)}
                      style={[
                        styles.urgencyChip,
                        { 
                          backgroundColor: formData.urgency === option.value 
                            ? option.color 
                            : theme.colors.surfaceVariant,
                          borderColor: theme.colors.outline
                        },
                        idx !== urgencyOptions.length - 1 && { marginRight: 8 }
                      ]}
                      textStyle={{ 
                        color: formData.urgency === option.value 
                          ? theme.colors.onPrimary 
                          : theme.colors.onSurface
                      }}
                      disabled={loading}
                    >
                      {option.label}
                    </Chip>
                  ))}
                </View>

                {/* Pickup Location */}
                <TextInput
                  label="Pickup Location"
                  value={formData.pickupLocation}
                  onChangeText={(text) => handleFieldChange('pickupLocation', text)}
                  mode="outlined"
                  style={styles.input}
                  error={!!errors?.pickupLocation}
                  placeholder="e.g., Yenagoa Main Market or 123 Okutukutu, Yenagoa"
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={theme.colors.primary}
                  theme={{ 
                    roundness: 8,
                    colors: {
                      primary: theme.colors.primary,
                      placeholder: theme.colors.onSurfaceVariant,
                      text: theme.colors.onSurface,
                      background: theme.colors.surfaceVariant,
                    }
                  }}
                  editable={!loading}
                />

                {/* Dropoff Location */}
                <TextInput
                  label="Dropoff Location"
                  value={formData.dropoffLocation}
                  onChangeText={(text) => handleFieldChange('dropoffLocation', text)}
                  mode="outlined"
                  style={styles.input}
                  error={!!errors?.dropoffLocation}
                  placeholder="e.g., 456 Kpansia, Yenagoa or Niger Delta University, Amassoma"
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={theme.colors.primary}
                  theme={{ 
                    roundness: 8,
                    colors: {
                      primary: theme.colors.primary,
                      placeholder: theme.colors.onSurfaceVariant,
                      text: theme.colors.onSurface,
                      background: theme.colors.surfaceVariant,
                    }
                  }}
                  editable={!loading}
                />

                {/* Address Tips */}
                <View style={styles.tipsContainer}>
                  <MaterialCommunityIcons name="lightbulb-outline" size={16} color={theme.colors.primary} />
                  <Text style={[styles.tipsText, { color: theme.colors.onSurfaceVariant }]}>
                    Tip: Include street name, area, or landmark for better results (e.g., "123 Okutukutu, Yenagoa")
                  </Text>
                </View>

                {/* Distance and Price Info */}
                {calculating && (
                  <View style={styles.calculatingContainer}>
                    <MaterialCommunityIcons name="loading" size={16} color={theme.colors.primary} />
                    <Text style={{ color: theme.colors.primary, marginLeft: 8 }}>Calculating distance and price...</Text>
                  </View>
                )}
                {geoError && (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={16} color={theme.colors.error} />
                    <Text style={{ color: theme.colors.error, marginLeft: 8, flex: 1 }}>{geoError}</Text>
                  </View>
                )}
                {distance !== null && !calculating && !geoError && (
                  <View style={styles.distanceContainer}>
                    <MaterialCommunityIcons name="map-marker-distance" size={16} color={theme.colors.primary} />
                    <Text style={{ color: theme.colors.primary, marginLeft: 8 }}>
                      Distance: {distance.toFixed(2)} km | Price: ₦{formData.budget}
                    </Text>
                  </View>
                )}
                {/* Budget (auto-filled, read-only) */}
                <TextInput
                  label="Price"
                  value={formData.budget}
                  mode="outlined"
                  style={styles.input}
                  error={!!errors?.budget}
                  placeholder="Auto-calculated based on distance"
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={theme.colors.primary}
                  theme={{ 
                    roundness: 8,
                    colors: {
                      primary: theme.colors.primary,
                      placeholder: theme.colors.onSurfaceVariant,
                      text: theme.colors.onSurface,
                      background: theme.colors.surfaceVariant,
                    }
                  }}
                />

                {/* Estimated Time */}
                <TextInput
                  label="Estimated Time (optional)"
                  value={formData.estimatedTime}
                  onChangeText={(text) => handleFieldChange('estimatedTime', text)}
                  mode="outlined"
                  style={styles.input}
                  placeholder="e.g., 1 hour"
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={theme.colors.primary}
                  theme={{ 
                    roundness: 8,
                    colors: {
                      primary: theme.colors.primary,
                      placeholder: theme.colors.onSurfaceVariant,
                      text: theme.colors.onSurface,
                      background: theme.colors.surfaceVariant,
                    }
                  }}
                  editable={!loading}
                />

                {/* Submit Button */}
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={[
                    styles.submitButton, 
                    { 
                      backgroundColor: isFormValid() 
                        ? theme.colors.primary 
                        : theme.colors.surfaceDisabled,
                    }
                  ]}
                  disabled={!isFormValid() || loading || isSubmitting}
                  loading={loading || isSubmitting}
                  labelStyle={{ color: theme.colors.onPrimary }}
                >
                  {loading || isSubmitting ? 'Sending...' : 'Request Errand'}
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      
      {/* Success/Error Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: theme.colors.primary }}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  modalContent: {
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
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingBottom: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  closeButton: {
    marginLeft: 16,
    marginTop: 4,
  },
  divider: {
    marginHorizontal: 24,
  },
  formSection: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    marginBottom: 16,
  },
  descriptionInput: {
    minHeight: 100,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    margin: 4,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    borderWidth: 1,
  },
  urgencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  urgencyChip: {
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    borderWidth: 1,
  },
  submitButton: {
    borderRadius: 8,
    marginTop: 8,
    elevation: 0,
  },
  calculatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tipsText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default ErrandRequestModal;
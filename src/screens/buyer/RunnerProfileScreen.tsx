import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text, Button, Card, Avatar, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { RootNavigationProp } from '../../navigation/types';
import { getRunnerProfile, requestErrand } from '../../services/buyerServices';
import { useAuth } from '../../contexts/AuthContext';
import ErrandRequestModal from '../../components/ErrandRequestModal';
import { COLORS } from '../../constants/colors';
// @ts-ignore
const PaystackWebView = require('react-native-paystack-webview').default;
import Constants from 'expo-constants';
import { PAYSTACK_PUBLIC_KEY } from '../../config/paystack';

interface RunnerProfileScreenProps {
  navigation: RootNavigationProp;
  route: {
    params: {
      runnerId: string;
      runnerName: string;
    };
  };
}

interface Runner {
  id: string;
  name: string;
  image: string;
  rating: number;
  deliveries: number;
  phone: string;
  vehicle: string;
  vehicleNumber: string;
  status: 'available' | 'busy' | 'offline';
  experience: string;
  specialties: string[];
  averageDeliveryTime: string;
  totalEarnings: number;
  email?: string;
  verification?: {
    status: 'approved' | 'pending' | 'rejected';
    rejectionReason?: string;
    ninNumber?: string;
    ninImageUrl?: string;
    vehicleImageUrl?: string;
    licenseImageUrl?: string;
  };
}

const RunnerProfileScreen: React.FC<RunnerProfileScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  if (!user) {
    return <ActivityIndicator />; // or a loading spinner
  }

  const { runnerId, runnerName } = route.params;
  const [runner, setRunner] = useState<Runner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showErrandRequestModal, setShowErrandRequestModal] = useState(false);
  const [showPaystack, setShowPaystack] = useState(false);
  const [pendingErrand, setPendingErrand] = useState<any>(null);
  const [paystackTxnRef, setPaystackTxnRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchRunnerProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRunnerProfile(runnerId);
        setRunner(data as Runner || null);
      } catch (e) {
        setError('Failed to load runner profile.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchRunnerProfile();
  }, [runnerId]);

  const getStatusColor = (status: Runner['status']) => {
    switch (status) {
      case 'available': return COLORS.success;
      case 'busy': return COLORS.warning;
      case 'offline': return COLORS.gray[500];
      default: return COLORS.gray[500];
    }
  };

  const handleMessageRunner = async () => {
    if (!runner || !user?.uid) return;
    
    try {
      const { getOrCreateChat } = await import('../../services/chatService');
      const { chatId, isNew } = await getOrCreateChat(runner.id);
      
      navigation.navigate('Chat', {
        chatId,
        chatName: runner.name,
        chatAvatar: runner.image,
        chatRole: 'runner',
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  const handleRequestErrand = () => {
    setShowErrandRequestModal(true);
  };

  const handleErrandSubmit = async (errandData: any) => {
    if (!runner || !user?.uid) return;
    // Transform data to match runner UI expectations
    const structuredErrand = {
      title: errandData.title,
      description: errandData.description,
      category: errandData.category,
      urgency: errandData.urgency,
      distance: errandData.distance || '',
      estimatedTime: errandData.estimatedTime || '',
      fee: Number(errandData.budget),
      store: {
        name: 'Pickup',
        address: errandData.pickupLocation,
        phone: '',
        latitude: null,
        longitude: null,
      },
      customer: {
        name: user.displayName || 'Customer',
        address: errandData.dropoffLocation,
        phone: '',
        email: user.email || '',
        latitude: null,
        longitude: null,
      },
      items: [
        { name: errandData.description, quantity: 1 }
      ],
      status: 'available',
      runnerId: '',
      runnerName: '',
      createdAt: new Date().toISOString(),
    };
    setPendingErrand(structuredErrand);
    // Generate a unique reference for Paystack
    const ref = `ERRAND_${user.uid}_${Date.now()}`;
    setPaystackTxnRef(ref);
    setShowPaystack(true);
    setShowErrandRequestModal(false);
  };

  const handlePaystackSuccess = async (response: any) => {
    setShowPaystack(false);
    if (!pendingErrand || !runner || !user?.uid) return;
    try {
      await requestErrand(runner.id, user.uid, pendingErrand);
      setPendingErrand(null);
      Alert.alert('Success', 'Your errand request has been submitted and paid for!');
    } catch (e) {
      Alert.alert('Error', 'Payment succeeded but failed to create errand. Please contact support.');
    }
  };

  const handlePaystackCancel = () => {
    setShowPaystack(false);
    setPendingErrand(null);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16, color: theme.colors.onSurface }}>Loading runner profile...</Text>
      </View>
    );
  }

  if (error || !runner) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <MaterialIcons name="error-outline" size={40} color={theme.colors.error} />
        <Text style={{ marginTop: 16, color: theme.colors.error }}>{error || 'Runner not found'}</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.avatarContainer}>
          <Avatar.Image 
            source={{ uri: runner.image || 'https://i.imgur.com/T3zF9bJ.png' }} 
            size={100}
            style={styles.avatar}
          />
          {runner.verification?.status === 'approved' && (
            <View style={[styles.verificationBadge, { backgroundColor: COLORS.success }]}>
              <MaterialCommunityIcons name="shield-check" size={16} color="white" />
            </View>
          )}
        </View>
        
        <View style={styles.profileInfo}>
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
            {runner.name}
          </Text>
          
          <View style={styles.statusBadge}>
            <View 
              style={[
                styles.statusDot, 
                { backgroundColor: getStatusColor(runner.status) }
              ]} 
            />
            <Text style={{ color: theme.colors.onSurfaceVariant, textTransform: 'capitalize' }}>
              {runner.status === 'available' ? 'Available for delivery' : 
               runner.status === 'busy' ? 'Currently on delivery' : 'Offline'}
            </Text>
          </View>
          
          <View style={styles.ratingContainer}>
            <MaterialCommunityIcons name="star" size={20} color={COLORS.warning} />
            <Text style={{ color: theme.colors.onSurface, marginLeft: 4 }}>
              {typeof runner.rating === 'number' ? runner.rating.toFixed(1) : 'N/A'} ({runner.deliveries} deliveries)
            </Text>
          </View>

          {runner.verification?.status === 'approved' && (
            <View style={styles.verificationText}>
              <MaterialCommunityIcons name="shield-check" size={16} color={COLORS.success} />
              <Text style={{ color: COLORS.success, marginLeft: 4, fontWeight: '500' }}>
                Verified Runner
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Stats */}
      <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="chart-line" size={24} color={theme.colors.primary} />
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Performance Overview
            </Text>
          </View>
          
          <Divider style={{ marginVertical: 8 }} />
          
          <View style={styles.metricsContainer}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
                {runner.deliveries}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>
                Deliveries
              </Text>
            </View>
            
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
                {runner.averageDeliveryTime || 'N/A'}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>
                Avg. Time
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
                {runner.vehicle || 'Bike'}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>
                Vehicle
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Contact Info Section */}
      <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-details" size={24} color={theme.colors.primary} />
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Contact Information
            </Text>
          </View>
          
          <Divider style={{ marginVertical: 8 }} />
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="phone" size={20} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>
              {runner.phone || 'Not provided'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email" size={20} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>
              {runner.email || 'Not provided'}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Vehicle Info Section */}
      <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="scooter" size={24} color={theme.colors.primary} />
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Vehicle Information
            </Text>
          </View>
          
          <Divider style={{ marginVertical: 8 }} />
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Type:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {runner.vehicle || 'Not specified'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>Plate Number:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
              {runner.vehicleNumber || 'Not specified'}
            </Text>
          </View>
          
          {runner.verification?.vehicleImageUrl && (
            <TouchableOpacity 
              style={styles.imagePreview}
              onPress={() => (navigation as any).navigate('ImagePreview', { uri: runner.verification?.vehicleImageUrl })}
            >
              <Avatar.Image 
                source={{ uri: runner.verification.vehicleImageUrl }} 
                size={80} 
                style={styles.docImage}
              />
              <Text style={[styles.docLabel, { color: theme.colors.onSurfaceVariant }]}>Vehicle Photo</Text>
            </TouchableOpacity>
          )}
        </Card.Content>
      </Card>

      {/* Specialties */}
      {runner.specialties && runner.specialties.length > 0 && (
        <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="star-circle" size={24} color={theme.colors.primary} />
              <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Specialties
              </Text>
            </View>
            
            <Divider style={{ marginVertical: 8 }} />
            
            <View style={styles.chipsContainer}>
              {runner.specialties.map((specialty, index) => (
                <Chip 
                  key={index} 
                  mode="outlined" 
                  style={[styles.chip, { borderColor: theme.colors.outline }]}
                  textStyle={{ color: theme.colors.onSurface }}
                >
                  {specialty}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Verification Status - Only show if not approved */}
      {runner.verification && runner.verification.status !== 'approved' && (
        <Card style={[
          styles.sectionCard, 
          { 
            backgroundColor: theme.colors.surface,
            borderLeftWidth: 4,
            borderLeftColor: runner.verification.status === 'pending' 
              ? COLORS.warning 
              : COLORS.error
          }
        ]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons 
                name="shield-alert" 
                size={24} 
                color={COLORS.warning} 
              />
              <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Verification Status
              </Text>
            </View>
            
            <Divider style={{ marginVertical: 8 }} />
            
            <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>
              {runner.verification.status === 'pending'
                ? 'Verification is currently pending review.'
                : 'Verification was not approved.'}
            </Text>
            
            {runner.verification.rejectionReason && (
              <Text style={[styles.infoText, { color: theme.colors.error }]}>
                Reason: {runner.verification.rejectionReason}
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          icon="message"
          onPress={handleMessageRunner}
          style={[styles.actionButton, { borderColor: theme.colors.primary }]}
          labelStyle={{ color: theme.colors.primary }}
          contentStyle={styles.buttonContent}
        >
          Message
        </Button>
        
        <Button
          mode="contained"
          icon="run"
          onPress={handleRequestErrand}
          style={styles.actionButton}
          contentStyle={styles.buttonContent}
          disabled={runner.status !== 'available'}
        >
          Request Errand
        </Button>
      </View>

      <ErrandRequestModal 
        visible={showErrandRequestModal} 
        onDismiss={() => setShowErrandRequestModal(false)} 
        onSubmit={handleErrandSubmit}
        loading={submitting}
      />
      {showPaystack && pendingErrand && (
        <PaystackWebView
          paystackKey={PAYSTACK_PUBLIC_KEY}
          amount={Number(pendingErrand.budget)}
          billingEmail={user.email}
          billingName={user.displayName || 'User'}
          activityIndicatorColor="#000"
          onSuccess={handlePaystackSuccess}
          onCancel={handlePaystackCancel}
          reference={paystackTxnRef}
          autoStart={true}
          channels={["card", "bank", "ussd"]}
          currency="NGN"
          description={`Payment for errand: ${pendingErrand.title}`}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 45,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatar: {
    marginRight: 20,
  },
  verificationBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  verificationText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoText: {
    marginLeft: 8,
  },
  infoLabel: {
    width: 120,
  },
  infoValue: {
    flex: 1,
  },
  documentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  docPreview: {
    alignItems: 'center',
    margin: 8,
  },
  docImage: {
    backgroundColor: 'transparent',
  },
  docLabel: {
    marginTop: 4,
    fontSize: 12,
  },
  imagePreview: {
    alignItems: 'center',
    marginTop: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 4,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  buttonContent: {
    height: 48,
  },
});

export default RunnerProfileScreen;
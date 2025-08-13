import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Animated, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Text, Card, Avatar, Button, Chip, Searchbar, Badge, ActivityIndicator, Divider } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { RootNavigationProp } from '../../navigation/types';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { getRunners, getRunnerAvailability, requestRunner } from '../../services/buyerServices';
import { useAuth } from '../../contexts/AuthContext';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

interface Runner {
  id: string;
  name: string;
  rating: number;
  deliveries: number;
  image: string;
  status: 'available' | 'busy' | 'offline';
  vehicle: string;
  experience: string;
  specialties: string[];
  averageDeliveryTime: string;
  distance: string;
  hourlyRate?: number;
  isVerified?: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  lastActive?: string;
  languages?: string[];
  bio?: string;
}

interface Specialty {
  id: string;
  name: string;
  icon: string;
}

interface RunnersScreenProps {
  navigation: RootNavigationProp;
}

const specialties: Specialty[] = [
  { id: 'all', name: 'All', icon: 'view-grid' },
  { id: 'food', name: 'Food', icon: 'food' },
  { id: 'grocery', name: 'Groceries', icon: 'cart' },
  { id: 'express', name: 'Express', icon: 'lightning-bolt' },
  { id: 'package', name: 'Packages', icon: 'package-variant' },
  { id: 'errand', name: 'Errands', icon: 'run-fast' },
];

const RunnersScreen: React.FC<RunnersScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'available' | 'busy' | 'offline'>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'deliveries' | 'experience' | 'rate'>('rating');
  const [activeTab, setActiveTab] = useState<'all' | 'available' | 'busy'>('all');
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [requestingRunner, setRequestingRunner] = useState<string | null>(null);

  // Get user location for distance calculation
  const getUserLocation = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      }
  }, []);

  const loadRunners = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Get user location first
      await getUserLocation();

      // Fetch runners with real-time availability
      const runnersData = await getRunners();
      const availabilityData = await getRunnerAvailability();

      // Merge runners data with availability data
      const enhancedRunners = runnersData.map((runner: any) => {
        const availability = availabilityData.find((av: any) => av.runnerId === runner.id);
        const distance = userLocation ? calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          runner.currentLocation?.latitude || 0,
          runner.currentLocation?.longitude || 0
        ) : runner.distance || 'Unknown';

        return {
          id: runner.id || Math.random().toString(),
          name: runner.name || runner.displayName || 'Unknown Runner',
          rating: typeof runner.rating === 'number' ? runner.rating :
                 typeof runner.rating === 'string' ? parseFloat(runner.rating) || 4.0 : 4.0,
          deliveries: typeof runner.deliveries === 'number' ? runner.deliveries :
                     typeof runner.deliveries === 'string' ? parseInt(runner.deliveries) || 0 : 0,
          image: runner.image || runner.photoURL || runner.avatar || 'https://i.imgur.com/T3zF9bJ.png',
          status: availability?.status || runner.status || 'available',
          vehicle: runner.vehicle || runner.vehicleType || 'Motorcycle',
          experience: runner.experience || runner.yearsOfExperience || '2',
          specialties: runner.specialties || runner.specialization || ['Food Delivery', 'Express Delivery'],
          averageDeliveryTime: runner.averageDeliveryTime || runner.deliveryTime || '15-20 min',
          distance: distance,
          hourlyRate: runner.hourlyRate || runner.rate || 15,
          isVerified: runner.isVerified || runner.verified || false,
          currentLocation: runner.currentLocation,
          lastActive: runner.lastActive || runner.lastSeen,
          languages: runner.languages || ['English'],
          bio: runner.bio || runner.description,
        };
      });

      setRunners(enhancedRunners);
    } catch (e) {
      setError('Failed to load runners. Please try again.');
      console.error('Error loading runners:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userLocation]);

  useEffect(() => {
    loadRunners();
  }, [loadRunners]);

  const onRefresh = useCallback(() => {
    loadRunners(true);
  }, [loadRunners]);

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  };

  // Filter and sort logic
  const filteredRunners = runners.filter((runner) => {
    const matchesSearch = runner.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeTab === 'all' || runner.status === activeTab;
    const matchesSpecialty = selectedSpecialty === 'all' || 
                            (runner.specialties && runner.specialties.some(s => 
                              s.toLowerCase().includes(selectedSpecialty.toLowerCase())
                            ));
    return matchesSearch && matchesStatus && matchesSpecialty;
  });

  const sortedRunners = [...filteredRunners].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'distance':
        const distA = parseFloat(a.distance.replace(/[^\d.]/g, ''));
        const distB = parseFloat(b.distance.replace(/[^\d.]/g, ''));
        return distA - distB;
      case 'deliveries':
        return b.deliveries - a.deliveries;
      case 'experience':
        return parseInt(b.experience) - parseInt(a.experience);
      case 'rate':
        return (a.hourlyRate || 0) - (b.hourlyRate || 0);
      default:
        return 0;
    }
  });

  const getStatusColor = (status: Runner['status']) => {
    switch (status) {
      case 'available': return '#4CAF50';
      case 'busy': return '#FF9800';
      case 'offline': return '#9E9E9E';
      default: return theme.colors.outline;
    }
  };

  const getVehicleIcon = (vehicle: string) => {
    switch (vehicle.toLowerCase()) {
      case 'motorcycle': return 'motorbike';
      case 'bicycle': return 'bike';
      case 'car': return 'car';
      case 'scooter': return 'scooter';
      default: return 'car';
    }
  };

  const handleRunnerPress = (runner: Runner) => {
    navigation.navigate('RunnerProfile', { 
      runnerId: runner.id, 
      runnerName: runner.name 
    });
  };

  const handleRequestRunner = async (runner: Runner) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to request a runner.');
      return;
    }

    setRequestingRunner(runner.id);
    
    try {
      const result = await requestRunner(user.uid, runner.id);
      Alert.alert(
        'Request Sent!',
        `Your request has been sent to ${runner.name}. They will respond shortly.`,
        [
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to request runner. Please try again.');
    } finally {
      setRequestingRunner(null);
    }
  };

  const renderSpecialtyIcon = (specialty: string) => {
    const specialtyData = specialties.find(s => s.id === specialty.toLowerCase());
    return specialtyData?.icon || 'tag';
  };

  return (<View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Enhanced Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            Available Runners
          </Text>
          <Text variant="bodySmall" style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {sortedRunners.length} runner{sortedRunners.length !== 1 ? 's' : ''} available
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <MaterialCommunityIcons name="refresh" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Enhanced Search Bar */}
      <Animatable.View 
        animation="fadeInDown"
        duration={500}
        style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}
      >
        <Searchbar
          placeholder="Search runners by name or specialty..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
          iconColor={theme.colors.onSurfaceVariant}
          inputStyle={{ color: theme.colors.onSurface }}
          elevation={2}
        />
      </Animatable.View>

      {/* Enhanced Status Tabs */}
      <Animatable.View 
        animation="fadeInUp" 
        delay={100}
        duration={500}
        style={styles.tabContainer}
      >
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {(['all', 'available', 'busy'] as const).map((tab) => {
            const count = runners.filter(r => tab === 'all' || r.status === tab).length;
            return (<TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton, activeTab === tab && { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text 
                  style={[
                    styles.tabText,
                    activeTab === tab && { color: theme.colors.onPrimary }
                  ]}
                >
                  {tab === 'all' ? 'All' : tab === 'available' ? 'Available' : 'Busy'}
                </Text>
                <View style={[
                  styles.tabBadge,
                  activeTab === tab 
                    ? { backgroundColor: theme.colors.onPrimary } 
                    : { backgroundColor: theme.colors.surfaceVariant }
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    activeTab === tab 
                      ? { color: theme.colors.primary } 
                      : { color: theme.colors.onSurfaceVariant }
                  ]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animatable.View>

      {/* Enhanced Specialties Filter */}
      <Animatable.View 
        animation="fadeInUp" 
        delay={200}
        duration={500}
        style={styles.chipContainer}
      >
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
        >
          {specialties.map((specialty: Specialty) => (<Chip
              key={specialty.id}
              mode={selectedSpecialty === specialty.id ? 'flat' : 'outlined'}
              onPress={() => setSelectedSpecialty(specialty.id)}
              style={[
                styles.specialtyChip,
                selectedSpecialty === specialty.id && { 
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.primary 
                }
              ]}
              textStyle={[
                styles.chipText,
                selectedSpecialty === specialty.id && { color: theme.colors.onPrimary }
              ]}
              icon={selectedSpecialty === specialty.id ? specialty.icon : undefined}
            >
              {specialty.name}
            </Chip>
          ))}
        </ScrollView>
      </Animatable.View>

      {/* Enhanced Sort Options */}
      <Animatable.View 
        animation="fadeInUp" 
        delay={300}
        duration={500}
        style={[styles.sortContainer, { backgroundColor: theme.colors.surface }]}
      >
        <Text style={[styles.sortLabel, { color: theme.colors.onSurfaceVariant }]}>
          Sort by:
        </Text>
        <View style={styles.sortButtons}>
          {[
            { key: 'rating', icon: 'star', label: 'Rating' },
            { key: 'distance', icon: 'map-marker-distance', label: 'Distance' },
            { key: 'deliveries', icon: 'package-variant', label: 'Deliveries' },
            { key: 'experience', icon: 'clock-outline', label: 'Experience' },
            { key: 'rate', icon: 'currency-usd', label: 'Rate' },
          ].map((sortOption) => (<TouchableOpacity
              key={sortOption.key}
              style={[
                styles.sortButton, sortBy === sortOption.key && { backgroundColor: theme.colors.primaryContainer }
              ]}
              onPress={() => setSortBy(sortOption.key as any)}
            >
              <MaterialCommunityIcons 
                name={sortOption.icon as any} 
                size={16} 
                color={sortBy === sortOption.key ? theme.colors.primary : theme.colors.onSurfaceVariant} 
              />
              <Text style={[
                styles.sortButtonText,
                sortBy === sortOption.key && { color: theme.colors.primary }
              ]}>
                {sortOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animatable.View>

      {/* Enhanced Runners List */}
      <Animatable.View 
        animation="fadeInUp" 
        delay={400}
        duration={500}
        style={styles.runnersContainer}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
              Loading runners...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={40} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
            <Button mode="contained" onPress={onRefresh} style={styles.retryButton}>
              Try Again
            </Button>
          </View>
        ) : sortedRunners.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="run-fast" size={40} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              No runners found
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
              Try adjusting your filters or search terms
            </Text>
          </View>
        ) : (<ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.runnersScrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          >
            {sortedRunners.map((runner, index: number) => (
              <Animatable.View
                key={runner.id}
                animation="fadeInUp"
                delay={index * 100}
                duration={500}
              >
                <Card style={[styles.runnerCard, { backgroundColor: theme.colors.surface }]}>
                  <Card.Content>
                    <View style={styles.runnerHeader}>
                      <View style={styles.runnerInfo}>
                        <View style={styles.avatarContainer}>
                          <Avatar.Image source={{ uri: runner.image }} size={60} />
                          {runner.isVerified && (
                            <View style={[styles.verifiedBadge, { backgroundColor: theme.colors.primary }]}>
                              <MaterialCommunityIcons name="check" size={12} color="white" />
                            </View>
                          )}
                        </View>
                        <View style={styles.runnerDetails}>
                          <Text variant="titleMedium" style={[styles.runnerName, { color: theme.colors.onSurface }]}>
                            {runner.name}
                          </Text>
                          <View style={styles.runnerStats}>
                            <View style={styles.statItem}>
                              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                              <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                                {runner.rating > 0 ? runner.rating.toFixed(1) : 'No rating'}
                              </Text>
                            </View>
                            <View style={styles.statItem}>
                              <MaterialCommunityIcons name="package-variant" size={16} color={theme.colors.primary} />
                              <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                                {runner.deliveries}
                              </Text>
                            </View>
                            <View style={styles.statItem}>
                              <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.primary} />
                              <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                                {runner.averageDeliveryTime}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <View style={styles.runnerStatus}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(runner.status) }]} />
                        <Text style={[styles.statusText, { color: theme.colors.onSurfaceVariant }]}>
                          {runner.status}
                        </Text>
                        {runner.hourlyRate && (
                          <Text style={[styles.rateText, { color: theme.colors.primary }]}>
                            ₦{runner.hourlyRate}/hr
                          </Text>
                        )}
                      </View>
                    </View>

                    <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

                    <View style={styles.runnerFooter}>
                      <View style={styles.runnerSpecialties}>
                        {runner.specialties?.slice(0, 3).map((specialty: string, idx: number) => (
                          <Chip
                            key={idx}
                            mode="outlined" 
                            style={[styles.specialtyChip, { borderColor: theme.colors.outline }]}
                            textStyle={{ color: theme.colors.onSurfaceVariant }}
                            icon={renderSpecialtyIcon(specialty)}
                          >
                            {specialty}
                          </Chip>
                        ))}
                        {runner.specialties && runner.specialties.length > 3 && (
                          <Text style={[styles.moreText, { color: theme.colors.onSurfaceVariant }]}>
                            +{runner.specialties.length - 3} more
                          </Text>
                        )}
                      </View>
                      <View style={styles.runnerActions}>
                        <View style={styles.vehicleInfo}>
                          <MaterialCommunityIcons 
                            name={getVehicleIcon(runner.vehicle) as any} 
                            size={20} 
                            color={theme.colors.primary} 
                          />
                          <Text style={[styles.vehicleText, { color: theme.colors.onSurfaceVariant }]}>
                            {runner.vehicle}
                          </Text>
                        </View>
                        <View style={styles.actionButtons}>
                          <Button
                            mode="outlined"
                            onPress={() => handleRunnerPress(runner)}
                            style={[styles.viewButton, { borderColor: theme.colors.primary }]}
                            textColor={theme.colors.primary}
                            icon="account"
                            compact
                          >
                            Profile
                          </Button>
                          <Button
                            mode="contained"
                            onPress={() => handleRequestRunner(runner)}
                            style={[styles.bookButton, { 
                              backgroundColor: runner.status === 'available' ? theme.colors.primary : theme.colors.outline 
                            }]}
                            buttonColor={runner.status === 'available' ? theme.colors.primary : theme.colors.outline}
                            loading={requestingRunner === runner.id}
                            disabled={requestingRunner !== null || runner.status !== 'available'}
                            icon={runner.status === 'available' ? 'phone' : 'clock-outline'}
                            compact
                          >
                            {requestingRunner === runner.id ? 'Requesting...' : 
                             runner.status === 'available' ? 'Request' : 'Busy'}
                          </Button>
                        </View>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              </Animatable.View>
            ))}
          </ScrollView>
        )}
      </Animatable.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  refreshButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    borderRadius: 12,
  },
  tabContainer: {
    paddingVertical: 8,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    position: 'relative',
    minWidth: 80,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  tabBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  chipContainer: {
    paddingVertical: 8,
  },
  chipScrollContent: {
    paddingHorizontal: 16,
  },
  specialtyChip: {
    marginRight: 8,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  sortLabel: {
    fontSize: 14,
    marginRight: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
    borderRadius: 8,
  },
  sortButtonText: {
    fontSize: 12,
    marginLeft: 4,
  },
  runnersContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    textAlign: 'center',
  },
  runnersScrollContent: {
    padding: 16,
  },
  runnerCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  runnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  runnerInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  runnerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  runnerName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  runnerStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
  runnerStatus: {
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    textTransform: 'capitalize',
  },
  rateText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  divider: {
    marginVertical: 8,
  },
  runnerFooter: {
    paddingTop: 8,
  },
  runnerSpecialties: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  moreText: {
    fontSize: 12,
    marginLeft: 4,
    alignSelf: 'center',
  },
  runnerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 12,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  viewButton: {
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 80,
    height: 36,
  },
  bookButton: {
    borderRadius: 12,
    minWidth: 100,
    height: 36,
    elevation: 2,
  },
});

export default RunnersScreen;
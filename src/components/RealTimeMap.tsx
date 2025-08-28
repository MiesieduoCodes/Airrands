import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Alert, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import MapView, { 
  Marker, 
  Polyline, 
  PROVIDER_DEFAULT, 
  Region,
  Callout,
  Circle
} from 'react-native-maps';
import { useTheme } from '../contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { 
  RealTimeLocationTracker, 
  getRegionForCoordinates, 
  calculateDistance,
  getDirections 
} from '../utils/maps';

const { width, height } = Dimensions.get('window');

interface MapMarker {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description?: string;
  type: 'store' | 'runner' | 'customer' | 'pickup' | 'delivery' | 'user';
  data?: any;
  onPress?: () => void;
}

interface Route {
  origin: {
    latitude: number;
    longitude: number;
  };
  destination: {
    latitude: number;
    longitude: number;
  };
  points: Array<{
    latitude: number;
    longitude: number;
  }>;
  distance?: number;
  duration?: number;
}

interface RealTimeMapProps {
  markers: MapMarker[];
  routes?: Route[];
  initialRegion?: Region;
  showUserLocation?: boolean;
  showCompass?: boolean;
  showScale?: boolean;
  zoomEnabled?: boolean;
  scrollEnabled?: boolean;
  rotateEnabled?: boolean;
  pitchEnabled?: boolean;
  onMarkerPress?: (marker: MapMarker) => void;
  onMapPress?: (event: any) => void;
  onRegionChange?: (region: Region) => void;
  style?: any;
  height?: number;
  realTimeUpdates?: boolean;
  updateInterval?: number;
  onLocationUpdate?: (location: { latitude: number; longitude: number }) => void;
}

const RealTimeMap: React.FC<RealTimeMapProps> = ({
  markers,
  routes = [],
  initialRegion,
  showUserLocation = true,
  showCompass = true,
  showScale = true,
  zoomEnabled = true,
  scrollEnabled = true,
  rotateEnabled = true,
  pitchEnabled = true,
  onMarkerPress,
  onMapPress,
  onRegionChange,
  style,
  height = 300,
  realTimeUpdates = false,
  updateInterval = 10000,
  onLocationUpdate
}) => {
  const { theme } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | undefined>(initialRegion);
  const [isMapReady, setIsMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [routePolylines, setRoutePolylines] = useState<any[]>([]);
  
  const locationTracker = useRef<RealTimeLocationTracker | null>(null);

  // Get user location
  const getUserLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to show your location on the map.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(newLocation);
      
      if (onLocationUpdate) {
        onLocationUpdate(newLocation);
      }

      // Set initial region if not provided
      if (!initialRegion && !mapRegion) {
        const region = {
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setMapRegion(region);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error getting user location:', error);
      setLoading(false);
    }
  }, [initialRegion, mapRegion, onLocationUpdate]);

  // Start real-time location tracking
  const startLocationTracking = useCallback(async () => {
    if (!realTimeUpdates) return;

    locationTracker.current = new RealTimeLocationTracker((location) => {
      setUserLocation(location);
      if (onLocationUpdate) {
        onLocationUpdate(location);
      }
    });

    locationTracker.current.setUpdateInterval(updateInterval);
    await locationTracker.current.startTracking();
  }, [realTimeUpdates, updateInterval, onLocationUpdate]);

  // Stop location tracking
  const stopLocationTracking = useCallback(() => {
    if (locationTracker.current) {
      locationTracker.current.stopTracking();
    }
  }, []);

  // Calculate routes
  const calculateRoutes = useCallback(async () => {
    if (routes.length === 0) return;

    try {
      const polylines = await Promise.all(
        routes.map(async (route) => {
          const directions = await getDirections(route.origin, route.destination);
          if (directions) {
            return {
              id: `${route.origin.latitude}-${route.origin.longitude}-${route.destination.latitude}-${route.destination.longitude}`,
              coordinates: directions.points,
              distance: directions.distance,
              duration: directions.duration,
            };
          }
          return null;
        })
      );

      setRoutePolylines(polylines.filter(Boolean));
    } catch (error) {
      console.error('Error calculating routes:', error);
    }
  }, [routes]);

  // Fit map to show all markers
  const fitMapToMarkers = useCallback(() => {
    if (!mapRef.current || markers.length === 0) return;

    const coordinates = markers.map(marker => marker.coordinate);
    if (userLocation) {
      coordinates.push(userLocation);
    }

    const region = getRegionForCoordinates(coordinates, 0.05);
    mapRef.current.animateToRegion(region, 1000);
  }, [markers, userLocation]);

  // Handle marker press
  const handleMarkerPress = useCallback((marker: MapMarker) => {
    if (onMarkerPress) {
      onMarkerPress(marker);
    }
  }, [onMarkerPress]);

  // Get marker icon based on type
  const getMarkerIcon = useCallback((type: string) => {
    switch (type) {
      case 'store':
        return 'store';
      case 'runner':
        return 'bike';
      case 'customer':
        return 'account';
      case 'pickup':
        return 'package-variant';
      case 'delivery':
        return 'truck-delivery';
      case 'user':
        return 'account-circle';
      default:
        return 'map-marker';
    }
  }, []);

  // Get marker color based on type
  const getMarkerColor = useCallback((type: string) => {
    switch (type) {
      case 'store':
        return theme.colors.primary;
      case 'runner':
        return theme.colors.secondary;
      case 'customer':
        return theme.colors.tertiary;
      case 'pickup':
        return theme.colors.error;
      case 'delivery':
        return theme.colors.primary;
      case 'user':
        return theme.colors.primary;
      default:
        return theme.colors.outline;
    }
  }, [theme.colors]);

  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  useEffect(() => {
    if (realTimeUpdates) {
      startLocationTracking();
    }

    return () => {
      stopLocationTracking();
    };
  }, [realTimeUpdates, startLocationTracking, stopLocationTracking]);

  useEffect(() => {
    calculateRoutes();
  }, [calculateRoutes]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { height: height as number }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: height as number }, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={mapRegion}
        region={mapRegion}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={true}
        showsCompass={showCompass}
        showsScale={showScale}
        zoomEnabled={zoomEnabled}
        scrollEnabled={scrollEnabled}
        rotateEnabled={rotateEnabled}
        pitchEnabled={pitchEnabled}
        onMapReady={() => setIsMapReady(true)}
        onPress={onMapPress ? (event) => onMapPress(event.nativeEvent.coordinate) : undefined}
        onRegionChangeComplete={onRegionChange}
        loadingEnabled={true}
        minZoomLevel={10}
        maxZoomLevel={20}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            description="You are here"
          >
            <View style={[styles.userMarker, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons 
                name="account-circle" 
                size={24} 
                color="white" 
              />
            </View>
          </Marker>
        )}

        {/* Custom markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            onPress={() => handleMarkerPress(marker)}
          >
            <View style={[styles.markerContainer, { backgroundColor: getMarkerColor(marker.type) }]}>
              <MaterialCommunityIcons 
                name={getMarkerIcon(marker.type) as any} 
                size={20} 
                color="white" 
              />
            </View>
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{marker.title}</Text>
                {marker.description && (
                  <Text style={styles.calloutDescription}>{marker.description}</Text>
                )}
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Route polylines */}
        {routePolylines.map((polyline) => (
          <Polyline
            key={polyline.id}
            coordinates={polyline.coordinates}
            strokeColor={theme.colors.primary}
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        ))}
      </MapView>

      {/* Map controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.colors.surface }]}
          onPress={fitMapToMarkers}
        >
          <MaterialCommunityIcons 
            name="crosshairs-gps" 
            size={20} 
            color={theme.colors.onSurface} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  userMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calloutContainer: {
    padding: 8,
    minWidth: 120,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 12,
    color: '#666',
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'column',
    gap: 8,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});

export default RealTimeMap;

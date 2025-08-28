import { PRODUCTION_CONFIG } from '../config/production';
import * as polyline from '@mapbox/polyline';
import * as Location from 'expo-location';

interface Location {
  latitude: number;
  longitude: number;
}

interface RouteResponse {
  points: Location[];
  distance: number;
  duration: number;
}

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// Enhanced real-time location tracking
export class RealTimeLocationTracker {
  private locationSubscription: Location.LocationSubscription | null = null;
  private isTracking = false;
  private updateInterval = 10000; // 10 seconds
  private onLocationUpdate?: (location: Location) => void;

  constructor(onLocationUpdate?: (location: Location) => void) {
    this.onLocationUpdate = onLocationUpdate;
  }

  async startTracking(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const location: Location = {
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
      };

      if (this.onLocationUpdate) {
        this.onLocationUpdate(location);
      }

      // Start watching location
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: this.updateInterval,
          distanceInterval: 5, // Update every 5 meters
        },
        (newLocation) => {
          const location: Location = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };
          if (this.onLocationUpdate) {
            this.onLocationUpdate(location);
          }
        }
      );

      this.isTracking = true;
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  }

  stopTracking() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.isTracking = false;
  }

  isActive(): boolean {
    return this.isTracking;
  }

  setUpdateInterval(interval: number) {
    this.updateInterval = interval;
  }
}

// Enhanced directions with real-time traffic
export async function getDirections(
  origin: Location, 
  destination: Location,
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
): Promise<RouteResponse | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=${mode}&key=${PRODUCTION_CONFIG.GOOGLE_MAPS_API_KEY}&alternatives=true&traffic_model=best_guess&departure_time=now`
    );

    const json = await response.json();

    if (!json.routes || !json.routes[0]) {
      throw new Error('No route found');
    }

    // Get the best route (usually the first one)
    const route = json.routes[0].legs[0];
    const points = polyline.decode(json.routes[0].overview_polyline.points)
      .map((point: number[]) => ({
        latitude: point[0],
        longitude: point[1]
      }));

    return {
      points,
      distance: route.distance.value / 1000, // Convert to kilometers
      duration: route.duration.value / 60 // Convert to minutes
    };
  } catch (error) {
    console.error('Error fetching directions:', error);
    return null;
  }
}

// Get real-time traffic information
export async function getTrafficInfo(origin: Location, destination: Location): Promise<any> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.latitude},${origin.longitude}&destinations=${destination.latitude},${destination.longitude}&key=${PRODUCTION_CONFIG.GOOGLE_MAPS_API_KEY}&departure_time=now&traffic_model=best_guess`
    );

    const json = await response.json();
    return json;
  } catch (error) {
    console.error('Error fetching traffic info:', error);
    return null;
  }
}

// Enhanced region calculation with padding
export function getRegionForCoordinates(points: Location[], padding: number = 0.02): MapRegion {
  if (points.length === 0) {
    return {
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }

  // Get bounding box for all points
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;

  points.forEach(point => {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  });

  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;

  const deltaLat = Math.max((maxLat - minLat) + padding, 0.01);
  const deltaLng = Math.max((maxLng - minLng) + padding, 0.01);

  return {
    latitude: midLat,
    longitude: midLng,
    latitudeDelta: deltaLat,
    longitudeDelta: deltaLng,
  };
}

// Calculate distance between two points using Haversine formula
export function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
  const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Enhanced ETA calculation with traffic consideration
export const calculateETA = (distanceKm: number, trafficFactor: number = 1.0): string => {
  const averageSpeedKmh = 15; // Average delivery speed in km/h
  const adjustedSpeed = averageSpeedKmh / trafficFactor;
  const timeHours = distanceKm / adjustedSpeed;
  const timeMinutes = Math.round(timeHours * 60);

  if (timeMinutes < 60) {
    return `${timeMinutes} minutes`;
  } else {
    const hours = Math.floor(timeMinutes / 60);
    const minutes = timeMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
};

// Get nearby places (stores, restaurants, etc.)
export async function getNearbyPlaces(
  location: Location, 
  radius: number = 5000, 
  type: string = 'restaurant'
): Promise<any[]> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=${radius}&type=${type}&key=${PRODUCTION_CONFIG.GOOGLE_MAPS_API_KEY}`
    );

    const json = await response.json();
    return json.results || [];
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    return [];
  }
}

// Get place details
export async function getPlaceDetails(placeId: string): Promise<any> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,formatted_address,geometry,opening_hours,formatted_phone_number,website,reviews&key=${PRODUCTION_CONFIG.GOOGLE_MAPS_API_KEY}`
    );

    const json = await response.json();
    return json.result;
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
}

// Geocoding: Convert address to coordinates
export async function geocodeAddress(address: string): Promise<Location | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${PRODUCTION_CONFIG.GOOGLE_MAPS_API_KEY}`
    );

    const json = await response.json();
    
    if (json.results && json.results[0]) {
      const { lat, lng } = json.results[0].geometry.location;
      return { latitude: lat, longitude: lng };
    }
    
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

// Reverse geocoding: Convert coordinates to address
export async function reverseGeocode(location: Location): Promise<string | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.latitude},${location.longitude}&key=${PRODUCTION_CONFIG.GOOGLE_MAPS_API_KEY}`
    );

    const json = await response.json();
    
    if (json.results && json.results[0]) {
      return json.results[0].formatted_address;
    }
    
    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}

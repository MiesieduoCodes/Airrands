import { PRODUCTION_CONFIG } from '../config/production';
import * as polyline from '@mapbox/polyline';

interface Location {
  latitude: number;
  longitude: number;
}

interface RouteResponse {
  points: Location[];
  distance: number;
  duration: number;
}

export async function getDirections(origin: Location, destination: Location): Promise<RouteResponse | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${PRODUCTION_CONFIG.GOOGLE_MAPS_API_KEY}`
    );

    const json = await response.json();

    if (!json.routes[0]) {
      throw new Error('No route found');
    }

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

export function getRegionForCoordinates(points: Location[]) {
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

  const deltaLat = (maxLat - minLat) + 0.02; // Add padding
  const deltaLng = (maxLng - minLng) + 0.02;

  return {
    latitude: midLat,
    longitude: midLng,
    latitudeDelta: deltaLat,
    longitudeDelta: deltaLng
  };
}

export function calculateETA(distance: number, averageSpeed: number = 30): string {
  // averageSpeed in km/h
  const timeInHours = distance / averageSpeed;
  const timeInMinutes = Math.round(timeInHours * 60);
  
  if (timeInMinutes < 1) {
    return 'Less than a minute';
  } else if (timeInMinutes === 1) {
    return '1 minute';
  } else if (timeInMinutes < 60) {
    return `${timeInMinutes} minutes`;
  } else {
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
}

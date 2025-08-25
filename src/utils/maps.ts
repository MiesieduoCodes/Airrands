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

// maps.ts
export const calculateETA = (distanceKm: number): string => {
  const averageSpeedKmh = 15; // Average delivery speed in km/h
  const timeHours = distanceKm / averageSpeedKmh;
  const timeMinutes = Math.round(timeHours * 60);

  if (timeMinutes < 60) {
    return `${timeMinutes} minutes`;
  } else {
    const hours = Math.floor(timeMinutes / 60);
    const minutes = timeMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
};

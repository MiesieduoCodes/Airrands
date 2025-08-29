// Enhanced Haversine formula to calculate the distance between two coordinates in kilometers
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Enhanced input validation
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    console.warn('Invalid coordinates provided to haversineDistance:', { lat1, lon1, lat2, lon2 });
    return 0;
  }
  
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Radius of the Earth in km
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

// Format distance for display
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else {
    return `${distance.toFixed(1)}km`;
  }
}

// Calculate distance between two points and format it
export function calculateAndFormatDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): string {
  const distance = haversineDistance(lat1, lon1, lat2, lon2);
  return formatDistance(distance);
}

// Enhanced coordinate validation
export function isValidCoordinate(lat: number, lon: number): boolean {
  return !isNaN(lat) && !isNaN(lon) && 
         isFinite(lat) && isFinite(lon) &&
         lat >= -90 && lat <= 90 && 
         lon >= -180 && lon <= 180;
}

// Validate coordinates are within Bayelsa State bounds (centered on Yenagoa)
export function isWithinNigeria(lat: number, lon: number): boolean {
  // Bayelsa State bounds: approximately 4.5-5.5°N, 5.5-6.5°E
  // Yenagoa coordinates: 4.9247°N, 6.2642°E
  return lat >= 4.0 && lat <= 6.0 && lon >= 5.0 && lon <= 7.0;
}

// Enhanced geocoding with better error handling - tries multiple methods
export async function geocodeLocation(address: string): Promise<{latitude: number, longitude: number} | null> {
  try {
    // Clean and normalize the address
    const cleanAddress = address.trim();
    if (!cleanAddress) {
      return null;
    }

    // Try different address formats
    const addressVariations = [
      cleanAddress,
      `${cleanAddress}, Yenagoa, Bayelsa, Nigeria`,
      `${cleanAddress}, Bayelsa, Nigeria`,
      `${cleanAddress}, Nigeria`,
      cleanAddress.replace(/,/g, ' '), // Remove commas
    ];

    // First try Google Maps API with different variations
    for (const addressVariation of addressVariations) {
      const googleResult = await geocodeWithGoogle(addressVariation);
      if (googleResult) {
        return googleResult;
      }
    }
    
    // Fallback to Expo geocoding with original address
    const Location = await import('expo-location');
    const results = await Location.geocodeAsync(cleanAddress);
    
    if (results.length === 0) {
      console.warn('No geocoding results for address:', cleanAddress);
      return null;
    }
    
    const result = results[0];
    if (!isValidCoordinate(result.latitude, result.longitude)) {
      console.warn('Invalid coordinates from geocoding:', result);
      return null;
    }
    
    return {
      latitude: result.latitude,
      longitude: result.longitude
    };
  } catch (error) {
    console.error('Geocoding error for address:', address, error);
    return null;
  }
}

// Google Maps geocoding function
async function geocodeWithGoogle(address: string): Promise<{latitude: number, longitude: number} | null> {
  try {
    // Get Google Maps API key from config
    const { PRODUCTION_CONFIG } = await import('../config/production');
    
    if (!PRODUCTION_CONFIG.GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not found, falling back to Expo geocoding');
      return null;
    }
    
    // Add Bayelsa context to improve results
    const addressWithContext = address.includes('Nigeria') ? address : `${address}, Bayelsa, Nigeria`;
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressWithContext)}&key=${PRODUCTION_CONFIG.GOOGLE_MAPS_API_KEY}&region=ng&components=administrative_area:Bayelsa|country:Nigeria`
    );

    const json = await response.json();
    
    if (json.results && json.results.length > 0) {
      const { lat, lng } = json.results[0].geometry.location;
      
      if (isValidCoordinate(lat, lng)) {
        return {
          latitude: lat,
          longitude: lng
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Google geocoding error:', error);
    return null;
  }
}

// Calculate distance and price with enhanced validation
export function calculateDistanceAndPrice(
  pickupLat: number, 
  pickupLon: number, 
  dropoffLat: number, 
  dropoffLon: number,
  pricePerKm: number = 1000
): { distance: number; price: number; isValid: boolean } {
  const distance = haversineDistance(pickupLat, pickupLon, dropoffLat, dropoffLon);
  const price = Math.round(distance * pricePerKm);
  const isValid = distance > 0 && distance <= 50; // Max 50km for errands
  
  return { distance, price, isValid };
}

// Get location display name from coordinates (reverse geocoding)
export async function getLocationName(lat: number, lon: number): Promise<string> {
  try {
    const Location = await import('expo-location');
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    
    if (results.length > 0) {
      const result = results[0];
      return `${result.street || ''} ${result.city || ''} ${result.region || ''}`.trim() || 'Unknown Location';
    }
    
    return 'Unknown Location';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return 'Unknown Location';
  }
} 
// Production Configuration
// Update these URLs with your actual production domains

export const PRODUCTION_CONFIG = {
  // Socket.io Server URL - Your Railway domain
  SOCKET_URL: 'https://airrands-production.up.railway.app',
  
  // API Endpoints
  API_BASE_URL: 'https://airrands-production.up.railway.app/api',
  
  // Payment Configuration
  PAYSTACK_PUBLIC_KEY: 'pk_live_your_actual_production_key_here', // Replace with your actual production PayStack key
  
  // Google Maps API Key (if different for production)
  GOOGLE_MAPS_API_KEY: 'your_google_maps_api_key_here',
  
  // Firebase Configuration (if different for production)
  FIREBASE_CONFIG: {
    // Your production Firebase config here
  },
  
  // Feature Flags
  FEATURES: {
    REAL_TIME_TRACKING: true,
    PUSH_NOTIFICATIONS: true,
    PAYMENT_PROCESSING: true,
    LOCATION_SERVICES: true,
  },
  
  // App Settings
  APP_SETTINGS: {
    LOCATION_UPDATE_INTERVAL: 15000, // 15 seconds
    SOCKET_RECONNECTION_ATTEMPTS: 5,
    SOCKET_TIMEOUT: 10000,
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  }
}; 